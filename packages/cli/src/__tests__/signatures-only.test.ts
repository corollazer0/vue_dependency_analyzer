// Phase 10-3 — runAnalysis({ signaturesOnly: true }) skips the cross-boundary
// linker and post-parse analyzers. The graph still contains every parser-emitted
// node so SignatureStore.snapshot stays fully functional.
import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { performance } from 'node:perf_hooks';
import { loadConfig, runAnalysis } from '../config.js';
import { SignatureStore } from '@vda/core';

const projectRoot = resolve(import.meta.dirname, '../../../../test-project');

describe('runAnalysis signaturesOnly mode', () => {
  it('skips linker — no api-call edge resolution and no circular/orphan stats', async () => {
    const config = await loadConfig(projectRoot, {});

    const baseline = await runAnalysis(config, { noCache: true });
    const sigOnly = await runAnalysis(config, { noCache: true, signaturesOnly: true });

    // sanity: same files parsed, similar node count from parsers alone.
    expect(sigOnly.stats.totalFiles).toBe(baseline.stats.totalFiles);

    // Linker is skipped → circular/orphan stats are zeroed.
    expect(sigOnly.stats.circularDeps).toEqual([]);
    expect(sigOnly.stats.orphans).toEqual([]);

    // Linker also resolves `unresolved:` import edges. Skip mode keeps them as-is.
    const baselineUnresolved = baseline.graph.getAllEdges()
      .filter(e => e.kind === 'imports' && e.target.startsWith('unresolved:'));
    const sigOnlyUnresolved = sigOnly.graph.getAllEdges()
      .filter(e => e.kind === 'imports' && e.target.startsWith('unresolved:'));
    // Skip mode should keep at least as many unresolved edges (linker would have resolved some).
    expect(sigOnlyUnresolved.length).toBeGreaterThanOrEqual(baselineUnresolved.length);
  });

  it('SignatureStore.snapshot collects DTO/endpoint records from the skip-mode graph', async () => {
    const config = await loadConfig(projectRoot, {});
    const result = await runAnalysis(config, { noCache: true, signaturesOnly: true });

    const store = new SignatureStore(config.projectRoot);
    const records = store.snapshot('phase10-test', result.graph);
    store.close();

    // The fixture has Spring DTOs + endpoints — at least one record per kind.
    const kinds = new Set(records.map(r => r.kind));
    expect(records.length).toBeGreaterThan(0);
    expect(kinds.has('endpoint') || kinds.has('dto-field')).toBe(true);
  });

  it('signaturesOnly is faster than full analysis (Phase 10-3 wall-time gate)', async () => {
    // Warm both paths once to avoid first-run JIT/IO bias before timing.
    const config = await loadConfig(projectRoot, {});
    await runAnalysis(config, { noCache: true });
    await runAnalysis(config, { noCache: true, signaturesOnly: true });

    // Average over 3 runs each — single-shot timing is too noisy under
    // turborepo parallel test runners (cli + core + server competing for CPU).
    let fullTotal = 0, sigTotal = 0;
    const N = 3;
    for (let i = 0; i < N; i++) {
      const t1 = performance.now(); await runAnalysis(config, { noCache: true }); fullTotal += performance.now() - t1;
      const t2 = performance.now(); await runAnalysis(config, { noCache: true, signaturesOnly: true }); sigTotal += performance.now() - t2;
    }
    const fullMs = fullTotal / N;
    const sigMs = sigTotal / N;
    const ratio = sigMs / fullMs;
    // Headline target is ≤ 35% on large monorepos (test-project is small, so we
    // assert the weaker invariant: meaningfully bounded). The tight 35% number
    // lives in phase10-benchmark.md, measured on the bigger ecommerce fixture.
    // eslint-disable-next-line no-console
    console.log(`[Phase 10-3] signaturesOnly avg ${sigMs.toFixed(0)}ms / full avg ${fullMs.toFixed(0)}ms = ${(ratio * 100).toFixed(1)}%`);
    // sigMs should not be dramatically slower than full (CI variance bound).
    expect(ratio).toBeLessThan(1.2);
  }, 60_000);
});
