import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';

// Phase 7a-10 — closes legacy T4-03.
//
// E2E spawn the built CLI against the real test-project fixture and
// assert (a) it exits 0, (b) it emits a parseable graph JSON when run
// with `--json`, and (c) the textual report contains the headline
// counts. The build artifact under `dist/bin/vda.js` is a hard
// dependency — turbo's `build` runs before `test`, so it must exist
// when this file executes.

const repoRoot = resolve(import.meta.dirname, '../../../..');
const cliBin = resolve(repoRoot, 'packages/cli/dist/bin/vda.js');
const testProject = resolve(repoRoot, 'test-project');
const hasFixture = existsSync(testProject);
const hasCliBuild = existsSync(cliBin);

function runCli(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync(process.execPath, [cliBin, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    // Default maxBuffer = 1 MB; the test-project JSON dump is ~5-10 MB.
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status };
}

describe.skipIf(!hasFixture || !hasCliBuild)('vda CLI E2E (Phase 7a-10)', () => {
  beforeAll(() => {
    // Sanity: the built binary should be a non-empty file.
    expect(statSync(cliBin).size).toBeGreaterThan(0);
  });

  it('vda --version exits 0 and prints the package version', () => {
    const r = runCli(['--version']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('vda analyze <dir> --json emits a parseable graph (T4-03)', () => {
    const r = runCli(['analyze', testProject, '--json', '--no-cache']);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);

    // The header banner is on stdout too — strip everything before the
    // first `{` so JSON.parse is happy.
    const firstBrace = r.stdout.indexOf('{');
    expect(firstBrace).toBeGreaterThanOrEqual(0);
    const json = JSON.parse(r.stdout.slice(firstBrace));

    expect(Array.isArray(json.nodes)).toBe(true);
    expect(Array.isArray(json.edges)).toBe(true);
    expect(json.nodes.length).toBeGreaterThan(50);
    expect(json.edges.length).toBeGreaterThan(50);

    // Node-kind diversity sanity — at least vue + spring + db buckets present.
    const kinds = new Set(json.nodes.map((n: any) => n.kind));
    for (const k of ['vue-component', 'spring-controller', 'db-table', 'spring-dto']) {
      expect(kinds.has(k), `expected ${k} in node kinds`).toBe(true);
    }
  });

  it('vda analyze <dir> textual report shows node + edge counts', () => {
    const r = runCli(['analyze', testProject, '--no-cache']);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/Nodes:\s+\d+/);
    expect(r.stdout).toMatch(/Edges:\s+\d+/);
    expect(r.stdout).toMatch(/Node Types:/);
    expect(r.stdout).toMatch(/Edge Types:/);
  });
});
