import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { analyzeChangeImpact } from '../ChangeImpactAnalyzer.js';

function addNode(graph: DependencyGraph, id: string, kind: any, filePath: string, label?: string) {
  graph.addNode({ id, kind, label: label || id.split(':').pop() || id, filePath, metadata: {} });
}

function addEdge(graph: DependencyGraph, source: string, target: string, kind: any) {
  graph.addEdge({ id: `${source}:${kind}:${target}`, source, target, kind, metadata: {} });
}

describe('ChangeImpactAnalyzer', () => {
  it('should map changed files to graph nodes', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'vue:Login', 'vue-component', '/project/src/Login.vue');
    addNode(graph, 'vue:Home', 'vue-component', '/project/src/Home.vue');

    const impact = analyzeChangeImpact(graph, ['/project/src/Login.vue']);

    expect(impact.changedNodes).toHaveLength(1);
    expect(impact.changedNodes[0].id).toBe('vue:Login');
  });

  it('should find direct dependents', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'store:auth', 'pinia-store', '/project/src/stores/auth.ts');
    addNode(graph, 'vue:Login', 'vue-component', '/project/src/Login.vue');
    addNode(graph, 'vue:Home', 'vue-component', '/project/src/Home.vue');
    addEdge(graph, 'vue:Login', 'store:auth', 'uses-store');
    addEdge(graph, 'vue:Home', 'store:auth', 'uses-store');

    const impact = analyzeChangeImpact(graph, ['/project/src/stores/auth.ts']);

    expect(impact.summary.changed).toBe(1);
    expect(impact.summary.direct).toBe(2); // Login and Home depend on auth store
    expect(impact.directImpact.map(n => n.id).sort()).toEqual(['vue:Home', 'vue:Login']);
  });

  it('should find transitive dependents', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'svc:UserService', 'spring-service', '/project/UserService.java');
    addNode(graph, 'ctrl:UserCtrl', 'spring-controller', '/project/UserController.java');
    addNode(graph, 'ep:GET/users', 'spring-endpoint', '/project/UserController.java', 'GET /api/users');
    addNode(graph, 'api:getUsers', 'api-call-site', '/project/src/api.ts');
    addEdge(graph, 'ctrl:UserCtrl', 'svc:UserService', 'spring-injects');
    addEdge(graph, 'ep:GET/users', 'ctrl:UserCtrl', 'api-serves');
    addEdge(graph, 'api:getUsers', 'ep:GET/users', 'api-call');

    const impact = analyzeChangeImpact(graph, ['/project/UserService.java']);

    expect(impact.summary.changed).toBe(1);
    expect(impact.summary.direct).toBe(1); // ctrl directly depends
    expect(impact.summary.transitive).toBeGreaterThan(0); // ep and api transitively
  });

  it('should identify affected endpoints and tables', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'mapper:UserMapper', 'mybatis-mapper', '/project/UserMapper.xml');
    addNode(graph, 'table:users', 'db-table', '', 'users');
    addNode(graph, 'ep:GET/users', 'spring-endpoint', '/project/UserController.java', 'GET /api/users');
    addNode(graph, 'svc:UserSvc', 'spring-service', '/project/UserService.java');
    addEdge(graph, 'mapper:UserMapper', 'table:users', 'reads-table');
    addEdge(graph, 'svc:UserSvc', 'mapper:UserMapper', 'spring-injects');
    addEdge(graph, 'ep:GET/users', 'svc:UserSvc', 'api-serves');

    // Change the service
    const impact = analyzeChangeImpact(graph, ['/project/UserService.java']);

    expect(impact.affectedEndpoints.length).toBeGreaterThanOrEqual(1);
    expect(impact.affectedEndpoints[0].label).toContain('GET /api/users');
  });

  it('should handle files with no matching nodes', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'vue:App', 'vue-component', '/project/src/App.vue');

    const impact = analyzeChangeImpact(graph, ['/project/README.md']);

    expect(impact.changedNodes).toHaveLength(0);
    expect(impact.summary.changed).toBe(0);
    expect(impact.summary.direct).toBe(0);
  });

  it('should resolve relative paths with projectRoot', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'vue:Login', 'vue-component', '/project/src/Login.vue');

    const impact = analyzeChangeImpact(graph, ['src/Login.vue'], '/project');

    expect(impact.changedNodes).toHaveLength(1);
  });
});
