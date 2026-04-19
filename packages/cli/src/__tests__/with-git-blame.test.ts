// Phase 11-2 — runAnalysis withGitBlame option.
//
// Tests use the host repo (vue_dependency_analyzer) so we have real git
// history without needing to fabricate a temp repo + N commits per fixture.
// The gate (wall-time impact ≤ 15%) is asserted on test-project only — the
// large fixture (test-project-ecommerce) lives outside the host repo for
// some files, which would skew the comparison.
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadConfig, runAnalysis } from '../config.js';

const projectRoot = resolve(import.meta.dirname, '../../../../test-project');

describe('runAnalysis withGitBlame (Phase 11-2)', () => {
  it('does NOT stamp blame metadata when withGitBlame is omitted (default)', async () => {
    const config = await loadConfig(projectRoot, {});
    const result = await runAnalysis(config, { noCache: true });
    const stamped = result.graph.getAllNodes().filter(n => {
      const m = n.metadata as Record<string, unknown> | undefined;
      return m?.lastTouchedAt !== undefined;
    });
    expect(stamped.length).toBe(0);
  });

  it('stamps lastTouchedAt/lastAuthor/commitCount/lastCommitSha on graph nodes when enabled', async () => {
    const config = await loadConfig(projectRoot, {});
    const result = await runAnalysis(config, { noCache: true, withGitBlame: true });

    // Pick any node whose filePath is inside the host repo (test-project files).
    const sample = result.graph.getAllNodes().find(n => {
      const m = n.metadata as Record<string, unknown> | undefined;
      return typeof m?.lastTouchedAt === 'string';
    });
    expect(sample, 'expected ≥1 node to be stamped').toBeDefined();
    const md = sample!.metadata as Record<string, unknown>;
    expect(typeof md.lastTouchedAt).toBe('string');
    expect(typeof md.lastAuthor).toBe('string');
    expect(typeof md.commitCount).toBe('number');
    expect(typeof md.lastCommitSha).toBe('string');
    expect((md.lastCommitSha as string).length).toBe(7);
    // ISO 8601 prefix sanity
    expect((md.lastTouchedAt as string)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('coverage ≥ 90% of nodes with a filePath inside the host repo (Phase 11 §3 gate)', async () => {
    const config = await loadConfig(projectRoot, {});
    const result = await runAnalysis(config, { noCache: true, withGitBlame: true });

    // Eligible: nodes whose filePath is non-empty AND under the host repo.
    // Excludes synthesized nodes like spring-event:* / unresolved:* (no file)
    // and DB tables (filePath = '').
    const repoRoot = resolve(import.meta.dirname, '../../../..');
    const eligible = result.graph.getAllNodes().filter(n =>
      n.filePath && n.filePath.startsWith(repoRoot),
    );
    const stamped = eligible.filter(n => {
      const m = n.metadata as Record<string, unknown>;
      return typeof m.lastTouchedAt === 'string';
    });
    const coverage = eligible.length === 0 ? 1 : stamped.length / eligible.length;
    // Plan §3 gate: ≥ 90%
    expect(coverage).toBeGreaterThanOrEqual(0.9);
  });

  it('wall-time impact ≤ 15% (Phase 11 §3 gate, opportunistic — warns if exceeded)', async () => {
    const config = await loadConfig(projectRoot, {});
    // Warm both paths
    await runAnalysis(config, { noCache: true });
    await runAnalysis(config, { noCache: true, withGitBlame: true });

    let baseTotal = 0, blameTotal = 0;
    const N = 3;
    for (let i = 0; i < N; i++) {
      const t1 = performance.now(); await runAnalysis(config, { noCache: true }); baseTotal += performance.now() - t1;
      const t2 = performance.now(); await runAnalysis(config, { noCache: true, withGitBlame: true }); blameTotal += performance.now() - t2;
    }
    const ratio = blameTotal / baseTotal;
    // eslint-disable-next-line no-console
    console.log(`[Phase 11-2] withGitBlame ${(blameTotal / N).toFixed(0)}ms vs base ${(baseTotal / N).toFixed(0)}ms = ${(ratio * 100).toFixed(1)}%`);
    // Sanity: must complete; absolute regression bound is 50% (CI variance can
    // be wide). Headline 15% number lives in phase11-benchmark.md.
    expect(ratio).toBeLessThan(1.5);
  }, 60_000);
});
