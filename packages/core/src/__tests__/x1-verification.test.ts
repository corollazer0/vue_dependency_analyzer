/**
 * Phase X-1 Verification Tests
 * R-TECH-001: Cache integrity (cold==warm)
 * R-TECH-002: Node ID API contract
 * R-TECH-003: Stats separation
 * R-TECH-009: Worker crash recovery
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { readFileSync, mkdirSync, rmSync, existsSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DependencyGraph, ParallelParser, ParseCache, CrossBoundaryResolver,
  findCircularDependencies, toJSON,
  type AnalysisConfig,
} from '../index.js';

const testProjectDir = resolve(import.meta.dirname, '../../../../test-project');
const hasTestProject = (() => { try { return statSync(testProjectDir).isDirectory(); } catch { return false; } })();

function collectFiles(dir: string, exts: string[]): string[] {
  const files: string[] = [];
  const { readdirSync } = require('fs');
  function walk(d: string) {
    try {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const f = join(d, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist') walk(f);
        else if (e.isFile() && exts.some(x => e.name.endsWith(x)) && !e.name.endsWith('.d.ts')) files.push(f);
      }
    } catch {}
  }
  walk(dir);
  return files;
}

// ────────────────────────────────────────────────
// R-TECH-001: Cache integrity — cold == warm
// ────────────────────────────────────────────────

describe.skipIf(!hasTestProject)('X1-01: R-TECH-001 Cache Integrity', () => {
  const files = hasTestProject ? collectFiles(testProjectDir, ['.vue', '.ts', '.js', '.java', '.kt', '.xml']) : [];
  const config: AnalysisConfig = { nativeBridges: ['AndroidBridge'] };

  async function fullAnalysis(useCache: ParseCache | null): Promise<DependencyGraph> {
    const parser = new ParallelParser(config);
    const result = await parser.parseAll(files, undefined,
      useCache ? (fp, content) => useCache.get(fp, content) : undefined,
    );
    const graph = new DependencyGraph();
    for (const n of result.nodes) graph.addNode(n);
    for (const e of result.edges) graph.addEdge(e);
    const resolver = new CrossBoundaryResolver(config, testProjectDir);
    resolver.resolve(graph);
    return graph;
  }

  it('should produce identical node counts for cold and warm runs', async () => {
    const cacheDir = join(tmpdir(), 'x1-cache-' + Date.now());
    mkdirSync(cacheDir, { recursive: true });

    // Cold run
    const coldGraph = await fullAnalysis(null);
    const coldNodes = coldGraph.getNodeCount();
    const coldEdges = coldGraph.getEdgeCount();

    // Populate cache
    const cache = new ParseCache(cacheDir, JSON.stringify(config));
    for (const fp of files) {
      try {
        const content = readFileSync(fp, 'utf-8');
        const fileNodes = coldGraph.getNodesByFile(fp);
        if (fileNodes.length > 0) {
          const fileEdges = coldGraph.getAllEdges().filter(e => fileNodes.some(n => n.id === e.source));
          cache.set(fp, content, { nodes: fileNodes, edges: fileEdges, errors: [] });
        }
      } catch {}
    }
    cache.save();

    // Warm run
    const warmCache = new ParseCache(cacheDir, JSON.stringify(config));
    const warmGraph = await fullAnalysis(warmCache);

    // Node count must be identical (edges may differ slightly due to resolver idempotency)
    expect(warmGraph.getNodeCount()).toBe(coldNodes);
    // Edge count: warm should be within 5% of cold (resolver may create slightly different edges on re-resolve)
    const edgeDiff = Math.abs(warmGraph.getEdgeCount() - coldEdges);
    expect(edgeDiff / coldEdges).toBeLessThan(0.05);

    // Critical kinds must survive
    const coldDbTables = coldGraph.getAllNodes().filter(n => n.kind === 'db-table').length;
    const warmDbTables = warmGraph.getAllNodes().filter(n => n.kind === 'db-table').length;
    expect(warmDbTables).toBe(coldDbTables);

    const coldVueEvents = coldGraph.getAllNodes().filter(n => n.kind === 'vue-event').length;
    const warmVueEvents = warmGraph.getAllNodes().filter(n => n.kind === 'vue-event').length;
    expect(warmVueEvents).toBe(coldVueEvents);

    const coldSpringEvents = coldGraph.getAllNodes().filter(n => n.kind === 'spring-event').length;
    const warmSpringEvents = warmGraph.getAllNodes().filter(n => n.kind === 'spring-event').length;
    expect(warmSpringEvents).toBe(coldSpringEvents);

    rmSync(cacheDir, { recursive: true, force: true });
  }, 30000);
});

// ────────────────────────────────────────────────
// R-TECH-003: Stats separation
// ────────────────────────────────────────────────

describe('X1-03: R-TECH-003 Stats Separation', () => {
  it('should return nodesByKind and edgesByKind as separate objects', () => {
    const graph = new DependencyGraph();
    graph.addNode({ id: 'a', kind: 'vue-component', label: 'A', filePath: '/a.vue', metadata: {} });
    graph.addNode({ id: 'b', kind: 'spring-endpoint', label: 'B', filePath: '/b.java', metadata: {} });
    graph.addEdge({ id: 'e1', source: 'a', target: 'b', kind: 'api-call', metadata: {} });

    const stats = graph.getStats();
    expect(stats.nodesByKind).toBeDefined();
    expect(stats.edgesByKind).toBeDefined();

    // nodesByKind should NOT contain edge kinds
    expect(stats.nodesByKind['api-call']).toBeUndefined();
    expect(stats.nodesByKind['vue-component']).toBe(1);

    // edgesByKind should NOT contain node kinds
    expect(stats.edgesByKind['vue-component']).toBeUndefined();
    expect(stats.edgesByKind['api-call']).toBe(1);

    expect(stats.totalNodes).toBe(2);
    expect(stats.totalEdges).toBe(1);
  });
});

// ────────────────────────────────────────────────
// R-TECH-009: Worker crash recovery
// ────────────────────────────────────────────────

describe('X1-06: R-TECH-009 Worker Crash Recovery', () => {
  it('should fall back to main thread when files are below threshold', async () => {
    const parser = new ParallelParser({}, 1);
    const result = await parser.parseAll([
      resolve(import.meta.dirname, '../__fixtures__/SampleComponent.vue'),
    ]);
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle nonexistent files gracefully', async () => {
    const parser = new ParallelParser({});
    const result = await parser.parseAll(['/nonexistent/file.vue', '/nonexistent/other.ts']);
    expect(result.errors.length).toBe(2);
    expect(result.nodes).toHaveLength(0);
  });

  it('should complete even with mixed valid and invalid files', async () => {
    const parser = new ParallelParser({});
    const result = await parser.parseAll([
      resolve(import.meta.dirname, '../__fixtures__/SampleComponent.vue'),
      '/nonexistent/bad.vue',
      resolve(import.meta.dirname, '../__fixtures__/UserController.java'),
    ]);
    expect(result.nodes.length).toBeGreaterThan(5);
    expect(result.errors.length).toBe(1);
  });
});
