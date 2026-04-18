#!/usr/bin/env node
// Phase 5-5 — lightweight performance-budget lint.
//
// Runs as part of `npm test` (via the root workspace) and flags a small,
// high-value set of patterns known to produce O(n^2)/O(n*m) hotspots or
// sync I/O on a request path. The rule set is intentionally tight so the
// current tree has zero violations — it exists to stop *new* regressions,
// not to retrofit-audit the entire codebase.
//
// Rules:
//   R1  `getAllNodes().find/.some/.every` or `getAllEdges().find/.some/.every`
//       — forces an O(n) scan per call; canonical inner-loop foot-gun.
//
//   R2  `readFileSync` inside a per-request route handler file
//       (`packages/server/src/routes/*Routes.ts`, excluding healthRoutes.ts).
//       Route handlers run on the request thread — sync file I/O blocks it.
//
//   R3  `JSON.parse(JSON.stringify(...))` deep-clone anywhere under `src/`
//       — slow, allocs garbage proportional to payload size, and drops
//       class instances / Map / Set. Prefer explicit mapping or
//       `structuredClone` for graph-sized payloads.
//
// Usage:
//   node scripts/perf-budget-check.mjs           # lint
//   node scripts/perf-budget-check.mjs --list    # also print every match,
//                                                # not just violations
//
// Exits 1 on any violation.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SRC_ROOTS = [
  'packages/core/src',
  'packages/server/src',
  'packages/cli/src',
  'packages/bench/src',
];
// Scope rule R2 to the per-request route files.
const ROUTE_DIR = 'packages/server/src/routes';
const ROUTE_FILE_RE = /Routes\.ts$/;
const ROUTE_FILE_EXEMPT = new Set(['healthRoutes.ts']);

const rules = [
  {
    id: 'R1-graph-scan-in-loop',
    description: '`getAllNodes()/`getAllEdges().find/.some/.every` forces an O(n) scan; use an index instead.',
    regex: /\b(getAllNodes|getAllEdges)\(\)\s*\.\s*(find|some|every)\b/g,
    scope: (relPath) => !relPath.includes('/__tests__/') && !relPath.includes('/__fixtures__/'),
  },
  {
    id: 'R2-readFileSync-in-request-handler',
    description: '`readFileSync` inside a per-request route handler blocks the event loop.',
    regex: /\breadFileSync\b/g,
    scope: (relPath) => {
      if (!relPath.startsWith(ROUTE_DIR + '/')) return false;
      const base = relPath.slice(ROUTE_DIR.length + 1);
      if (ROUTE_FILE_EXEMPT.has(base)) return false;
      return ROUTE_FILE_RE.test(base);
    },
  },
  {
    id: 'R3-json-deep-clone',
    description: 'Deep-clone via `JSON.parse(JSON.stringify(...))` — prefer structured cloning or explicit shape copy.',
    regex: /JSON\s*\.\s*parse\s*\(\s*JSON\s*\.\s*stringify\s*\(/g,
    scope: (relPath) => !relPath.includes('/__tests__/') && !relPath.includes('/__fixtures__/'),
  },
];

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return acc; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      walk(full, acc);
    } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

const files = [];
for (const sr of SRC_ROOTS) files.push(...walk(join(ROOT, sr)));

const violations = [];
for (const file of files) {
  const relPath = relative(ROOT, file);
  const src = readFileSync(file, 'utf-8');
  for (const rule of rules) {
    if (!rule.scope(relPath)) continue;
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(src)) !== null) {
      // eslint-disable-next-line no-useless-escape
      const upTo = src.slice(0, m.index);
      const line = upTo.split('\n').length;
      violations.push({ rule: rule.id, description: rule.description, file: relPath, line, match: m[0] });
    }
  }
}

if (violations.length === 0) {
  process.stdout.write(`✓ perf-budget-check: 0 violations across ${files.length} files\n`);
  process.exit(0);
}

process.stderr.write(`✗ perf-budget-check: ${violations.length} violation(s)\n\n`);
for (const v of violations) {
  process.stderr.write(`  [${v.rule}] ${v.file}:${v.line}\n`);
  process.stderr.write(`    ${v.match}\n`);
  process.stderr.write(`    — ${v.description}\n\n`);
}
process.exit(1);
