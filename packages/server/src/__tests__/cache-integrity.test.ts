import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnalysisEngine } from '../engine.js';
import { resolve } from 'path';
import { mkdtempSync, cpSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Regression guard for Phase 6 P1: warm-cache analysis used to drop db-table
// nodes (cold=10, warm=0) because the cache-save loop in engine.ts filtered
// `result.edges` by a nested `fileNodes.some(...)` per file, which combined
// with the synthetic-node filePath quirk in MyBatis meant some kinds were
// never persisted. The fix routes fresh-parse output through
// `ParallelParseResult.parsedFileEntries`, preserving per-file attribution
// directly from the parser. This test reruns the same project twice against
// a shared cache directory and asserts node-kind counts match exactly.

const fixturesDir = resolve(import.meta.dirname, '../../../core/src/__fixtures__');

function countByKind(engine: AnalysisEngine): Record<string, number> {
  // @ts-expect-error — reaching into private graph for a structural assertion.
  const graph = engine.graph;
  const counts: Record<string, number> = {};
  for (const node of graph.getAllNodes()) {
    counts[node.kind] = (counts[node.kind] ?? 0) + 1;
  }
  return counts;
}

describe('Cache integrity — warm vs cold db-table parity (Phase 0-6)', () => {
  let workDir: string;

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'vda-cache-integrity-'));
    cpSync(fixturesDir, workDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('produces identical node-kind counts on cold and warm runs', async () => {
    // Cold: no cache on disk yet.
    const cold = new AnalysisEngine(workDir, {}, false);
    await cold.initialize();
    const coldCounts = countByKind(cold);

    // Warm: new engine instance hits the on-disk .vda-cache written by cold run.
    const warm = new AnalysisEngine(workDir, {}, false);
    await warm.initialize();
    const warmCounts = countByKind(warm);

    expect(warmCounts).toEqual(coldCounts);

    // Critical: db-table nodes must not disappear on warm cache.
    // This fixture has UserMapper.xml with SQL referencing users table.
    if ((coldCounts['db-table'] ?? 0) > 0) {
      expect(warmCounts['db-table']).toBe(coldCounts['db-table']);
    }
  }, 30_000);
});
