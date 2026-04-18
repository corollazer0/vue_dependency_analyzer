import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const script = resolve(import.meta.dirname, '..', '..', '..', '..', 'scripts', 'perf-budget-check.mjs');

describe('scripts/perf-budget-check.mjs', () => {
  it('reports zero violations against the current tree', () => {
    const out = spawnSync('node', [script], { encoding: 'utf-8' });
    // The stdout message we assert on is stable; exit 0 means no violations.
    expect(out.status).toBe(0);
    expect(out.stdout).toMatch(/0 violations/);
    expect(out.stderr).toBe('');
  });

  it('exits non-zero if we fabricate a violation and re-scan (sanity check)', async () => {
    // Write a throwaway script file that intentionally triggers R1 — clean
    // up after. Keeps the real tree clean while proving the rule engine
    // actually catches violations.
    const { writeFileSync, rmSync } = await import('fs');
    const tmpFile = resolve(import.meta.dirname, '..', '..', '..', 'core', 'src', '__perf_budget_probe.ts');
    try {
      writeFileSync(
        tmpFile,
        'declare const graph: { getAllNodes: () => unknown[] };\n' +
        'export const probe = graph.getAllNodes().find(() => true);\n'
      );
      const out = spawnSync('node', [script], { encoding: 'utf-8' });
      expect(out.status).toBe(1);
      expect(out.stderr).toMatch(/R1-graph-scan-in-loop/);
      expect(out.stderr).toContain('__perf_budget_probe.ts');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });
});
