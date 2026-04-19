#!/usr/bin/env node
// Phase 5-2 end-to-end harness CLI.
//
//   tsx src/cli/harness.ts [--fixture path] [--web-ui-dist path]
//                          [--filter-kind vue-component] [--port 0]
//                          [--out-json bench-report.json]
//
// If the fixture path is absent, auto-generates a 5K synthetic fixture in a
// temp file. If the web-ui dist is missing, exits with a hint to build it.
//
// Exits non-zero only on harness error. Gate pass/fail decisions happen in
// the caller (phase3 bench doc, CI workflow) — the CLI just reports numbers.
import { resolve, join, dirname } from 'path';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { generateSyntheticGraph } from '../syntheticFixture.js';
import { startHarnessServer } from '../harness/server.js';
import { runMeasurement } from '../harness/measure.js';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[key] = next; i++; }
      else out[key] = 'true';
    }
  }
  return out;
}

function log(msg: string) { process.stderr.write(`[harness] ${msg}\n`); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(import.meta.dirname, '..', '..', '..', '..');
  const webUiDist = resolve(args['web-ui-dist'] ?? join(repoRoot, 'packages', 'web-ui', 'dist'));
  const filterKind = args['filter-kind'] ?? 'vue-component';
  const port = args.port ? parseInt(args.port, 10) : 0;

  if (!existsSync(join(webUiDist, 'index.html'))) {
    log(`web-ui dist missing at ${webUiDist}`);
    log('hint: npx -w @vda/web-ui run build');
    process.exit(2);
  }

  // Fixture: use the supplied path or generate a fresh 5K into a temp dir.
  let fixturePath = args.fixture;
  if (!fixturePath) {
    const nodeCount = args.nodes ? parseInt(args.nodes, 10) : 5000;
    const tmpDir = mkdtempSync(join(tmpdir(), 'vda-harness-'));
    fixturePath = join(tmpDir, `synthetic-${nodeCount}.json`);
    const graph = generateSyntheticGraph({ nodeCount, seed: 0x5EED });
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, JSON.stringify(graph));
    log(`generated ${nodeCount}-node fixture at ${fixturePath}`);
  } else {
    fixturePath = resolve(fixturePath);
  }

  log(`starting harness server on port ${port === 0 ? '(auto)' : port}`);
  const server = await startHarnessServer({ fixturePath, webUiDist, port });
  log(`serving http://127.0.0.1:${server.port}/?harness=1`);

  try {
    const result = await runMeasurement({
      baseUrl: `http://127.0.0.1:${server.port}`,
      filterKind,
    });
    const report = {
      fixture: fixturePath,
      webUiDist,
      gate: {
        // Phase 3 gate: 5K initial render <2s (G1), filter <200ms (G2).
        G1_firstPaintMs: result.firstPaintMs,
        G1_budget: 2000,
        G1_verdict: result.firstPaintMs < 2000 ? 'MET' : 'NOT MET',
        G2_filterMs: result.filterMs,
        G2_budget: 200,
        G2_verdict: result.filterMs < 200 ? 'MET' : 'NOT MET',
      },
      result,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    if (args['out-json']) {
      writeFileSync(resolve(args['out-json']), JSON.stringify(report, null, 2));
      log(`wrote ${args['out-json']}`);
    }
    log(`G1=${result.firstPaintMs}ms (${report.gate.G1_verdict})  G2=${result.filterMs}ms (${report.gate.G2_verdict})`);
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  process.stderr.write(`[harness] error: ${err instanceof Error ? err.stack ?? err.message : err}\n`);
  process.exit(1);
});
