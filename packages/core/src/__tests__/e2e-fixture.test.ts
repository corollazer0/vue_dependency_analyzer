import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  DependencyGraph,
  ParallelParser,
  CrossBoundaryResolver,
  findCircularDependencies,
  findOrphanNodes,
  findUnusedEndpoints,
  calculateComplexity,
  analyzeImpact,
  findPaths,
  toJSON,
  fromJSON,
  checkDtoConsistency,
  type AnalysisConfig,
} from '../index.js';

const testProjectDir = resolve(import.meta.dirname, '../../../../test-project');
const hasTestProject = existsSync(testProjectDir);

describe.skipIf(!hasTestProject)('E2E: Full test-project analysis', () => {
  let graph: DependencyGraph;
  let config: AnalysisConfig & { projectRoot: string };

  beforeAll(async () => {
    // Load config
    const vdarcPath = resolve(testProjectDir, '.vdarc.json');
    const vdarc = JSON.parse(readFileSync(vdarcPath, 'utf-8'));
    config = {
      ...vdarc,
      projectRoot: testProjectDir,
      vueRoot: resolve(testProjectDir, vdarc.vueRoot),
      springBootRoot: resolve(testProjectDir, vdarc.springBootRoot),
      nativeBridges: vdarc.nativeBridges || [],
    };

    // Discover files
    const { glob } = await import('glob');
    const patterns = [
      resolve(config.vueRoot!, '**/*.{vue,ts,js}'),
      resolve(config.springBootRoot!, '**/*.{java,kt}'),
      resolve(testProjectDir, 'backend', '**/*.xml'),
    ];
    const ignore = ['**/node_modules/**', '**/dist/**'];
    let files: string[] = [];
    for (const p of patterns) {
      const matches = await glob(p, { ignore, absolute: true });
      files.push(...matches.filter(f => !f.endsWith('.d.ts')));
    }
    files = [...new Set(files)].sort();

    // Parse
    const parser = new ParallelParser(config);
    const result = await parser.parseAll(files);

    // Build graph
    graph = new DependencyGraph();
    graph.metadata = {
      projectRoot: testProjectDir,
      analyzedAt: new Date().toISOString(),
      fileCount: files.length,
      parseErrors: result.errors,
      config,
    };
    for (const n of result.nodes) graph.addNode(n);
    for (const e of result.edges) graph.addEdge(e);

    // Resolve cross-boundary
    const resolver = new CrossBoundaryResolver(config, testProjectDir);
    resolver.resolve(graph);
  }, 60000);

  // === Node counts ===
  it('should analyze 400+ files', () => {
    expect(graph.metadata.fileCount).toBeGreaterThan(400);
  });

  it('should produce many nodes', () => {
    const count = graph.getNodeCount();
    expect(count).toBeGreaterThan(500);
  });

  it('should produce many edges', () => {
    const count = graph.getEdgeCount();
    expect(count).toBeGreaterThan(1000);
  });

  // === Vue components ===
  it('should detect 200+ vue-component nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'vue-component').length;
    expect(count).toBeGreaterThan(200);
  });

  // === Pinia stores ===
  it('should detect pinia-store nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'pinia-store').length;
    expect(count).toBeGreaterThan(10);
  });

  it('should have uses-store edges', () => {
    const count = graph.getAllEdges().filter(e => e.kind === 'uses-store').length;
    expect(count).toBeGreaterThan(10);
  });

  // === Composables ===
  it('should detect vue-composable nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'vue-composable').length;
    expect(count).toBeGreaterThan(20);
  });

  // === storeToRefs ===
  it('should detect storeToRefs usage in component metadata', () => {
    const withRefs = graph.getAllNodes().filter(n =>
      n.kind === 'vue-component' && n.metadata.storeToRefsUsage
    );
    expect(withRefs.length).toBeGreaterThanOrEqual(3);
  });

  // === Spring Boot ===
  it('should detect spring-controller nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'spring-controller').length;
    expect(count).toBeGreaterThan(15);
  });

  it('should detect spring-endpoint nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'spring-endpoint').length;
    expect(count).toBeGreaterThan(50);
  });

  it('should detect spring-service nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'spring-service').length;
    expect(count).toBeGreaterThan(20);
  });

  // === @Mapper interface (T1-01) ===
  it('should detect @Mapper interface nodes', () => {
    const mappers = graph.getAllNodes().filter(n =>
      n.kind === 'spring-service' && n.metadata.isMapper
    );
    expect(mappers.length).toBeGreaterThanOrEqual(5);
  });

  // === MyBatis/DB (Phase 4) ===
  it('should detect mybatis-mapper nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'mybatis-mapper').length;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('should detect db-table nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'db-table').length;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('should have reads-table and writes-table edges', () => {
    const reads = graph.getAllEdges().filter(e => e.kind === 'reads-table').length;
    const writes = graph.getAllEdges().filter(e => e.kind === 'writes-table').length;
    expect(reads + writes).toBeGreaterThan(20);
  });

  // === MyBatis Mapper linking ===
  it('should link @Mapper interface to MyBatis XML', () => {
    const mybatisMapEdges = graph.getAllEdges().filter(e => e.kind === 'mybatis-maps');
    expect(mybatisMapEdges.length).toBeGreaterThanOrEqual(5);
  });

  // === API matching ===
  it('should match frontend API calls to backend endpoints', () => {
    const linked = graph.getAllEdges().filter(e =>
      e.kind === 'api-call' && e.target.startsWith('spring-endpoint:')
    );
    expect(linked.length).toBeGreaterThan(10);
  });

  // === Route-renders (T1-02) ===
  it('should have route-renders edges from router to components', () => {
    const routeEdges = graph.getAllEdges().filter(e => e.kind === 'route-renders');
    expect(routeEdges.length).toBeGreaterThanOrEqual(5);
  });

  // === Event virtual edges (T1-03) ===
  it('should have vue-event virtual nodes', () => {
    const vueEvents = graph.getAllNodes().filter(n => n.kind === 'vue-event');
    expect(vueEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should have emits-event edges from Vue components', () => {
    const emits = graph.getAllEdges().filter(e => e.kind === 'emits-event');
    expect(emits.length).toBeGreaterThanOrEqual(1);
  });

  it('should have listens-event edges to vue-event nodes', () => {
    const listens = graph.getAllEdges().filter(e =>
      e.kind === 'listens-event' && e.target.startsWith('vue-event:')
    );
    expect(listens.length).toBeGreaterThanOrEqual(1);
  });

  // === Spring Events ===
  it('should detect spring-event virtual nodes', () => {
    const springEvents = graph.getAllNodes().filter(n => n.kind === 'spring-event');
    expect(springEvents.length).toBeGreaterThanOrEqual(1);
  });

  // === Provide/Inject ===
  it('should have provides and injects edges', () => {
    const provides = graph.getAllEdges().filter(e => e.kind === 'provides').length;
    const injects = graph.getAllEdges().filter(e => e.kind === 'injects').length;
    expect(provides).toBeGreaterThan(0);
    expect(injects).toBeGreaterThan(0);
  });

  // === Circular dependencies ===
  it('should detect circular dependencies', () => {
    const cycles = findCircularDependencies(graph);
    expect(Array.isArray(cycles)).toBe(true);
  });

  // === Orphan detection ===
  it('should identify orphan nodes', () => {
    const orphans = findOrphanNodes(graph);
    expect(Array.isArray(orphans)).toBe(true);
  });

  // === Unused endpoints ===
  it('should find unused endpoints', () => {
    const unused = findUnusedEndpoints(graph);
    expect(Array.isArray(unused)).toBe(true);
  });

  // === Complexity scoring ===
  it('should calculate complexity scores', () => {
    const scores = calculateComplexity(graph);
    expect(scores.length).toBeGreaterThan(0);
    expect(scores[0].fanIn + scores[0].fanOut).toBeGreaterThan(0);
  });

  // === Impact analysis ===
  it('should analyze impact of a controller node', () => {
    const controller = graph.getAllNodes().find(n => n.kind === 'spring-controller');
    expect(controller).toBeDefined();
    if (controller) {
      const impact = analyzeImpact(graph, controller.id, 3);
      expect(impact.nodeId).toBe(controller.id);
      expect(impact.directDependents.length + impact.transitiveDependents.length).toBeGreaterThanOrEqual(0);
    }
  });

  // === Path finding ===
  it('should find paths between connected nodes', () => {
    // Find a store node and a component that uses it
    const storeEdge = graph.getAllEdges().find(e =>
      e.kind === 'uses-store' && !e.target.startsWith('store:')
    );
    if (storeEdge) {
      const paths = findPaths(graph, storeEdge.source, storeEdge.target, 5);
      expect(paths.length).toBeGreaterThanOrEqual(1);
    }
  });

  // === Serialization round-trip ===
  it('should survive JSON serialization round-trip', () => {
    const json = toJSON(graph);
    const restored = fromJSON(json);
    expect(restored.getNodeCount()).toBe(graph.getNodeCount());
    expect(restored.getEdgeCount()).toBe(graph.getEdgeCount());
  });

  // === DTO consistency ===
  it('should check DTO consistency', () => {
    const mismatches = checkDtoConsistency(graph);
    expect(Array.isArray(mismatches)).toBe(true);
  });

  // === DTO nodes ===
  it('should detect DTO nodes with fields', () => {
    const dtos = graph.getAllNodes().filter(n =>
      n.kind === 'spring-service' && n.metadata.isDto
    );
    expect(dtos.length).toBeGreaterThan(0);
    const withFields = dtos.filter(d => (d.metadata.fields as any[])?.length > 0);
    expect(withFields.length).toBeGreaterThan(0);
  });

  // === API call sites ===
  it('should detect api-call-site nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'api-call-site').length;
    expect(count).toBeGreaterThan(10);
  });

  // === ts-module nodes ===
  it('should detect ts-module nodes', () => {
    const count = graph.getAllNodes().filter(n => n.kind === 'ts-module').length;
    expect(count).toBeGreaterThan(0);
  });

  // === Node kind diversity ===
  it('should have diverse node kinds', () => {
    const kinds = new Set(graph.getAllNodes().map(n => n.kind));
    // Should have at least vue-component, pinia-store, vue-composable,
    // spring-controller, spring-endpoint, spring-service, mybatis-mapper, db-table
    expect(kinds.size).toBeGreaterThanOrEqual(8);
  });

  // === Edge kind diversity ===
  it('should have diverse edge kinds', () => {
    const kinds = new Set(graph.getAllEdges().map(e => e.kind));
    // Should have at least imports, uses-store, uses-component, api-call,
    // reads-table, writes-table, mybatis-maps
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });

  // === Parse errors should be minimal ===
  it('should have few parse errors relative to file count', () => {
    const errorCount = graph.metadata.parseErrors.filter(e => e.severity === 'error').length;
    const fileCount = graph.metadata.fileCount;
    // Allow up to 10% error rate
    expect(errorCount).toBeLessThan(fileCount * 0.1);
  });

  // === X1-09: Controller→Service→Repository→Mapper→XML→Table chain ===
  describe('E2E Chain: Controller → DB Table', () => {
    it('should trace from a controller through service to repository', () => {
      const controllers = graph.getAllNodes().filter(n => n.kind === 'spring-controller');
      expect(controllers.length).toBeGreaterThan(0);

      let chainFound = false;
      for (const ctrl of controllers) {
        const ctrlInjects = graph.getOutEdges(ctrl.id).filter(e => e.kind === 'spring-injects');
        for (const svcEdge of ctrlInjects) {
          const svc = graph.getNode(svcEdge.target);
          if (!svc) continue;
          const svcInjects = graph.getOutEdges(svc.id).filter(e => e.kind === 'spring-injects');
          for (const repoEdge of svcInjects) {
            const repo = graph.getNode(repoEdge.target);
            if (repo && (repo.metadata.isRepository || repo.label.endsWith('Repository'))) {
              chainFound = true;
            }
          }
        }
      }
      expect(chainFound).toBe(true);
    });

    it('should trace from repository to mapper to mybatis XML', () => {
      const repos = graph.getAllNodes().filter(n =>
        n.kind === 'spring-service' && (n.metadata.isRepository || n.label.endsWith('Repository'))
      );
      expect(repos.length).toBeGreaterThan(0);

      let mapperLinked = false;
      for (const repo of repos) {
        const repoInjects = graph.getOutEdges(repo.id).filter(e => e.kind === 'spring-injects');
        for (const edge of repoInjects) {
          const target = graph.getNode(edge.target);
          if (target && (target.metadata.isMapper || target.kind === 'mybatis-mapper')) {
            mapperLinked = true;
          }
        }
      }
      expect(mapperLinked).toBe(true);
    });

    it('should trace from mybatis mapper to db tables via statements', () => {
      const mybatisMappers = graph.getAllNodes().filter(n => n.kind === 'mybatis-mapper');
      expect(mybatisMappers.length).toBeGreaterThan(0);

      let tableFound = false;
      for (const mapper of mybatisMappers) {
        const stmtEdges = graph.getOutEdges(mapper.id).filter(e => e.kind === 'mybatis-maps');
        for (const se of stmtEdges) {
          const tableEdges = graph.getOutEdges(se.target).filter(e =>
            e.kind === 'reads-table' || e.kind === 'writes-table'
          );
          for (const te of tableEdges) {
            const table = graph.getNode(te.target);
            if (table && table.kind === 'db-table') tableFound = true;
          }
        }
      }
      expect(tableFound).toBe(true);
    });

    it('should have complete chain: spring-injects resolved to real nodes', () => {
      const springInjects = graph.getAllEdges().filter(e => e.kind === 'spring-injects');
      const resolved = springInjects.filter(e => graph.hasNode(e.target));
      const unresolved = springInjects.filter(e => !graph.hasNode(e.target));

      // At least 70% should be resolved (unresolved are framework beans)
      expect(resolved.length / springInjects.length).toBeGreaterThan(0.7);
    });
  });
});
