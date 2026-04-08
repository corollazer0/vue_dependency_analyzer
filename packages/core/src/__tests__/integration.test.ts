import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  DependencyGraph,
  VueSfcParser,
  TsFileParser,
  JavaFileParser,
  MyBatisXmlParser,
  CrossBoundaryResolver,
  ParallelParser,
  ParseCache,
  findCircularDependencies,
  findOrphanNodes,
  calculateComplexity,
  analyzeImpact,
  findPaths,
  toJSON,
  fromJSON,
} from '../index.js';

const fixturesDir = resolve(import.meta.dirname, '../__fixtures__');

describe('Integration: Full Pipeline', () => {
  let graph: DependencyGraph;

  beforeAll(() => {
    graph = new DependencyGraph();
    graph.metadata.projectRoot = fixturesDir;

    const parsers = [new VueSfcParser(), new TsFileParser(), new JavaFileParser(), new MyBatisXmlParser()];
    const files = [
      { path: resolve(fixturesDir, 'SampleComponent.vue'), parser: parsers[0] },
      { path: resolve(fixturesDir, 'useAuth.ts'), parser: parsers[1] },
      { path: resolve(fixturesDir, 'stores/userStore.ts'), parser: parsers[1] },
      { path: resolve(fixturesDir, 'UserController.java'), parser: parsers[2] },
      { path: resolve(fixturesDir, 'UserMapper.xml'), parser: parsers[3] },
    ];

    const config = { nativeBridges: ['AndroidBridge'] };

    for (const { path, parser } of files) {
      const content = readFileSync(path, 'utf-8');
      const result = parser.parse(path, content, config);
      for (const node of result.nodes) graph.addNode(node);
      for (const edge of result.edges) graph.addEdge(edge);
    }

    // Run cross-boundary resolution
    const resolver = new CrossBoundaryResolver(config, fixturesDir);
    resolver.resolve(graph);
  });

  // ─── Journey 1: Node/Edge Count ───

  it('should have expected number of nodes', () => {
    expect(graph.getNodeCount()).toBeGreaterThan(15);
  });

  it('should have expected number of edges', () => {
    expect(graph.getEdgeCount()).toBeGreaterThan(20);
  });

  // ─── Journey 2: Vue internal dependencies ───

  it('should detect vue-component nodes', () => {
    const vueNodes = graph.getAllNodes().filter(n => n.kind === 'vue-component');
    expect(vueNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect pinia-store node', () => {
    const stores = graph.getAllNodes().filter(n => n.kind === 'pinia-store');
    expect(stores.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect composable node', () => {
    const composables = graph.getAllNodes().filter(n => n.kind === 'vue-composable');
    expect(composables.length).toBeGreaterThanOrEqual(1);
  });

  it('should have uses-store edges', () => {
    const storeEdges = graph.getAllEdges().filter(e => e.kind === 'uses-store');
    expect(storeEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('should have uses-composable edges', () => {
    const compEdges = graph.getAllEdges().filter(e => e.kind === 'uses-composable');
    expect(compEdges.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Journey 3: Vue → Spring Boot API matching ───

  it('should detect spring endpoints', () => {
    const endpoints = graph.getAllNodes().filter(n => n.kind === 'spring-endpoint');
    expect(endpoints.length).toBeGreaterThanOrEqual(5);
  });

  it('should detect API call sites', () => {
    const apiCalls = graph.getAllNodes().filter(n => n.kind === 'api-call-site');
    expect(apiCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('should have API call → endpoint linked edges', () => {
    const apiCallEdges = graph.getAllEdges().filter(
      e => e.kind === 'api-call' && e.target.startsWith('spring-endpoint:')
    );
    expect(apiCallEdges.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Journey 4: MyBatis → DB Table ───

  it('should detect mybatis-mapper node', () => {
    const mappers = graph.getAllNodes().filter(n => n.kind === 'mybatis-mapper');
    expect(mappers.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect db-table nodes', () => {
    const tables = graph.getAllNodes().filter(n => n.kind === 'db-table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('should have reads-table/writes-table edges', () => {
    const readEdges = graph.getAllEdges().filter(e => e.kind === 'reads-table');
    const writeEdges = graph.getAllEdges().filter(e => e.kind === 'writes-table');
    expect(readEdges.length + writeEdges.length).toBeGreaterThanOrEqual(3);
  });

  // ─── Journey 5: Native bridge ───

  it('should detect native-bridge node', () => {
    expect(graph.hasNode('native-bridge:AndroidBridge')).toBe(true);
  });

  it('should detect native-method node', () => {
    expect(graph.hasNode('native-method:AndroidBridge.showToast')).toBe(true);
  });

  // ─── Journey 6: Provide/Inject ───

  it('should have provides/injects edges', () => {
    const provides = graph.getAllEdges().filter(e => e.kind === 'provides');
    const injects = graph.getAllEdges().filter(e => e.kind === 'injects');
    expect(provides.length).toBeGreaterThanOrEqual(1);
    expect(injects.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Journey 7: Analyzers ───

  it('should run circular dependency analysis', () => {
    const cycles = findCircularDependencies(graph);
    expect(Array.isArray(cycles)).toBe(true);
  });

  it('should find orphan nodes', () => {
    const orphans = findOrphanNodes(graph);
    expect(Array.isArray(orphans)).toBe(true);
  });

  it('should calculate complexity', () => {
    const scores = calculateComplexity(graph);
    expect(scores.length).toBeGreaterThan(0);
    expect(scores[0]).toHaveProperty('fanIn');
    expect(scores[0]).toHaveProperty('fanOut');
  });

  // ─── Journey 8: Serialization ───

  it('should round-trip JSON serialization', () => {
    const json = toJSON(graph);
    const restored = fromJSON(json);
    expect(restored.getNodeCount()).toBe(graph.getNodeCount());
    expect(restored.getEdgeCount()).toBe(graph.getEdgeCount());
  });
});

describe('Integration: ParallelParser with Fixtures', () => {
  it('should parse all fixtures in parallel', async () => {
    const files = [
      resolve(fixturesDir, 'SampleComponent.vue'),
      resolve(fixturesDir, 'useAuth.ts'),
      resolve(fixturesDir, 'stores/userStore.ts'),
      resolve(fixturesDir, 'UserController.java'),
      resolve(fixturesDir, 'UserMapper.xml'),
    ];

    const parser = new ParallelParser({ nativeBridges: ['AndroidBridge'] });
    const result = await parser.parseAll(files);

    expect(result.nodes.length).toBeGreaterThan(15);
    expect(result.edges.length).toBeGreaterThan(10);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
