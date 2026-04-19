import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DependencyGraph } from '../graph/DependencyGraph.js';

// Phase 7b-5 — F7 waiver mechanism.
//
// Two sources for a waiver:
//
//   1. `.vdaignore` lines:
//        <rule-id> <target> [reason=<text>] [until=<YYYY-MM-DD>] [file=<path>]
//      Example:
//        deny-direct controller→repository reason=TICKET-123 until=2026-12-31
//      Phase 8-8 will add `breaking <code> file=<path> reason=… until=…`
//      with no parser changes here (the format is "rule-id token then
//      free-form k=v pairs").
//
//   2. Inline source comment:
//        // vda:ignore <rule-id> <target> reason=<text> until=<date>
//      The hosting file is implicitly the target unless `file=` is set.
//
// Cross-phase contract (briefing §5): the public surface
// (`Waiver`, `WaiverEngine`, `loadWaivers`, `isWaived`) is frozen for
// Phase 8 consumption — extend by adding new rule-id strings, never by
// renaming the fields below.

export interface Waiver {
  ruleId: string;
  target: string;
  reason?: string;
  /** YYYY-MM-DD; absent = perpetual. */
  expires?: string;
  /** Optional file scope. */
  file?: string;
  /** Bookkeeping only — where the waiver came from. */
  source: { kind: 'vdaignore' | 'inline'; path: string; line: number };
}

export interface WaiverMatchInput {
  ruleId: string;
  /** Per-rule arbitrary identifier — e.g. `controller→repository`,
   *  `signature/UserDto#email`, `breaking/B1`. */
  target: string;
  /** Optional file the violation is anchored to. */
  file?: string;
}

const KV = /(\w+)=([^\s]+)/g;

function parseLine(line: string, source: Waiver['source']): Waiver | null {
  // Drop comments after the directive. e.g. `# trailing comment`
  const stripped = line.replace(/\s+#.*$/, '').trim();
  if (!stripped || stripped.startsWith('#')) return null;
  const tokens = stripped.split(/\s+/);
  if (tokens.length < 2) return null;
  const [ruleId, target, ...rest] = tokens;

  let reason: string | undefined;
  let expires: string | undefined;
  let file: string | undefined;
  for (const t of rest) {
    KV.lastIndex = 0;
    const m = KV.exec(t);
    if (!m) continue;
    if (m[1] === 'reason') reason = m[2];
    else if (m[1] === 'until') expires = m[2];
    else if (m[1] === 'file') file = m[2];
  }
  return { ruleId, target, reason, expires, file, source };
}

const INLINE_DIRECTIVE = /\/\/\s*vda:ignore\s+(.+)$/;

export class WaiverEngine {
  private waivers: Waiver[] = [];

  /** Load every waiver source the project exposes. */
  load(projectRoot: string, graph: DependencyGraph): void {
    this.waivers = [];

    const vdaignore = resolve(projectRoot, '.vdaignore');
    if (existsSync(vdaignore)) {
      const content = readFileSync(vdaignore, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const w = parseLine(lines[i], { kind: 'vdaignore', path: '.vdaignore', line: i + 1 });
        if (w) this.waivers.push(w);
      }
    }

    // Inline `// vda:ignore` directives — read each unique source file once.
    const seenFiles = new Set<string>();
    for (const node of graph.nodesIter()) {
      const fp = node.filePath;
      if (!fp || seenFiles.has(fp)) continue;
      seenFiles.add(fp);
      if (!existsSync(fp)) continue;
      let content: string;
      try {
        content = readFileSync(fp, 'utf-8');
      } catch {
        continue;
      }
      if (!content.includes('vda:ignore')) continue;
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const m = INLINE_DIRECTIVE.exec(lines[i]);
        if (!m) continue;
        const w = parseLine(m[1], { kind: 'inline', path: fp, line: i + 1 });
        if (!w) continue;
        // Inline directives default to scoping to the hosting file.
        if (!w.file) w.file = fp;
        this.waivers.push(w);
      }
    }
  }

  /** Provided so tests can inject waivers without I/O. */
  setForTest(waivers: Waiver[]): void {
    this.waivers = waivers;
  }

  list(): Waiver[] {
    return this.waivers.slice();
  }

  /**
   * Match a violation against the loaded waivers. Today's date is
   * injected so the call is deterministic in tests; production callers
   * should pass `new Date().toISOString().slice(0, 10)`.
   */
  isWaived(violation: WaiverMatchInput, today: string): { waived: boolean; waiver?: Waiver } {
    for (const w of this.waivers) {
      if (w.ruleId !== violation.ruleId) continue;
      if (w.target !== violation.target) continue;
      if (w.file && violation.file && w.file !== violation.file) continue;
      if (w.expires && w.expires < today) continue; // expired
      return { waived: true, waiver: w };
    }
    return { waived: false };
  }
}

export function loadWaivers(projectRoot: string, graph: DependencyGraph): WaiverEngine {
  const eng = new WaiverEngine();
  eng.load(projectRoot, graph);
  return eng;
}
