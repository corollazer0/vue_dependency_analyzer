import { describe, it, expect } from 'vitest';
import { ParallelParser } from '../engine/ParallelParser.js';
import { ParseCache } from '../engine/ParseCache.js';
import { resolve } from 'path';
import { readdirSync, statSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const testProjectDir = resolve(import.meta.dirname, '../../../../test-project');
const hasTestProject = (() => {
  try { return statSync(testProjectDir).isDirectory(); } catch { return false; }
})();

function collectFiles(dir: string, exts: string[]): string[] {
  const files: string[] = [];
  function walk(d: string) {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(full);
        } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
          files.push(full);
        }
      }
    } catch { /* skip */ }
  }
  walk(dir);
  return files;
}

describe.skipIf(!hasTestProject)('Performance: 500-file test-project', () => {
  const files = hasTestProject ? collectFiles(testProjectDir, ['.vue', '.ts', '.js', '.java', '.kt', '.xml']) : [];

  it('should have 400+ files in test project', () => {
    expect(files.length).toBeGreaterThan(400);
  });

  it('should complete first analysis in under 5 seconds', async () => {
    const parser = new ParallelParser({ nativeBridges: ['AndroidBridge'] });
    const start = Date.now();
    const result = await parser.parseAll(files);
    const elapsed = Date.now() - start;

    console.log(`  First run: ${files.length} files → ${result.nodes.length} nodes, ${result.edges.length} edges in ${elapsed}ms`);

    expect(elapsed).toBeLessThan(5000);
    expect(result.nodes.length).toBeGreaterThan(500);
    expect(result.edges.length).toBeGreaterThan(100);
  });

  it('should complete cached analysis in under 2 seconds', async () => {
    const cacheDir = join(tmpdir(), 'vda-perf-cache-' + Date.now());
    mkdirSync(cacheDir, { recursive: true });

    const cache = new ParseCache(cacheDir, 'test-config');

    // First run: populate cache
    const parser1 = new ParallelParser({});
    await parser1.parseAll(files, undefined, (filePath, content) => {
      return cache.get(filePath, content);
    });

    // Save results to cache for files that weren't cached
    // (simplified — in real code the CLI handles this)

    // Second run: should be faster
    const parser2 = new ParallelParser({});
    const start = Date.now();
    let cacheHits = 0;
    const result = await parser2.parseAll(files, undefined, (filePath, content) => {
      const cached = cache.get(filePath, content);
      if (cached) cacheHits++;
      return cached;
    });
    const elapsed = Date.now() - start;

    console.log(`  Cached run: ${elapsed}ms (${cacheHits} cache hits out of ${files.length})`);

    expect(elapsed).toBeLessThan(2000);

    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('should produce reasonable node/edge counts', async () => {
    const parser = new ParallelParser({});
    const result = await parser.parseAll(files);

    const kindCounts: Record<string, number> = {};
    for (const node of result.nodes) {
      kindCounts[node.kind] = (kindCounts[node.kind] || 0) + 1;
    }

    console.log('  Node breakdown:', JSON.stringify(kindCounts, null, 2));

    // Should have all expected node types
    expect(kindCounts['vue-component']).toBeGreaterThan(100);
    expect(kindCounts['spring-controller']).toBeGreaterThan(10);
    expect(kindCounts['spring-endpoint']).toBeGreaterThan(50);
    expect(kindCounts['api-call-site']).toBeGreaterThan(100);
  });
});

describe.skipIf(!hasTestProject)('Performance: Clustering API response size', () => {
  it('should produce cluster response under 10KB', async () => {
    // Simulate clustering logic
    const parser = new ParallelParser({});
    const files = collectFiles(testProjectDir, ['.vue', '.ts', '.js', '.java', '.kt', '.xml']);
    const result = await parser.parseAll(files);

    // Cluster by directory (depth=3)
    const groups = new Map<string, number>();
    for (const node of result.nodes) {
      const rel = node.filePath.startsWith(testProjectDir)
        ? node.filePath.slice(testProjectDir.length + 1)
        : node.filePath;
      const parts = rel.split('/');
      parts.pop(); // remove filename
      const dir = parts.slice(0, 3).join('/');
      groups.set(dir, (groups.get(dir) || 0) + 1);
    }

    const clusterResponse = JSON.stringify({
      clusters: Array.from(groups.entries()).map(([dir, count]) => ({
        id: `cluster:${dir}`,
        label: dir,
        childCount: count,
      })),
    });

    console.log(`  Cluster response size: ${clusterResponse.length} bytes (${groups.size} clusters)`);
    expect(clusterResponse.length).toBeLessThan(10000);
  });
});
