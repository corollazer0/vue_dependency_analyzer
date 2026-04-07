import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { ApiCallLinker } from '../ApiCallLinker.js';
import { NativeBridgeLinker } from '../NativeBridgeLinker.js';
import type { GraphNode } from '../../graph/types.js';

describe('ApiCallLinker', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();

    // Add spring endpoints
    graph.addNode({
      id: 'spring-endpoint:GET:/api/users',
      kind: 'spring-endpoint',
      label: 'GET /api/users',
      filePath: '/UserController.java',
      metadata: { httpMethod: 'GET', path: '/api/users' },
    });
    graph.addNode({
      id: 'spring-endpoint:POST:/api/users',
      kind: 'spring-endpoint',
      label: 'POST /api/users',
      filePath: '/UserController.java',
      metadata: { httpMethod: 'POST', path: '/api/users' },
    });
    graph.addNode({
      id: 'spring-endpoint:GET:/api/users/{id}',
      kind: 'spring-endpoint',
      label: 'GET /api/users/{id}',
      filePath: '/UserController.java',
      metadata: { httpMethod: 'GET', path: '/api/users/{id}' },
    });
  });

  it('should link exact URL matches', () => {
    graph.addNode({
      id: 'api-call:/comp.vue:10',
      kind: 'api-call-site',
      label: 'GET /api/users',
      filePath: '/comp.vue',
      metadata: { url: '/api/users', httpMethod: 'GET' },
    });

    const linker = new ApiCallLinker();
    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].target).toBe('spring-endpoint:GET:/api/users');
  });

  it('should match path parameters (:id vs {id})', () => {
    graph.addNode({
      id: 'api-call:/comp.vue:20',
      kind: 'api-call-site',
      label: 'GET /api/users/:id',
      filePath: '/comp.vue',
      metadata: { url: '/api/users/:id', httpMethod: 'GET' },
    });

    const linker = new ApiCallLinker();
    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].target).toBe('spring-endpoint:GET:/api/users/{id}');
  });

  it('should match template literal params', () => {
    graph.addNode({
      id: 'api-call:/comp.vue:30',
      kind: 'api-call-site',
      label: 'GET /api/users/:param',
      filePath: '/comp.vue',
      metadata: { url: '/api/users/:param', httpMethod: 'GET' },
    });

    const linker = new ApiCallLinker();
    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
  });

  it('should respect HTTP method matching', () => {
    graph.addNode({
      id: 'api-call:/comp.vue:40',
      kind: 'api-call-site',
      label: 'POST /api/users',
      filePath: '/comp.vue',
      metadata: { url: '/api/users', httpMethod: 'POST' },
    });

    const linker = new ApiCallLinker();
    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].target).toBe('spring-endpoint:POST:/api/users');
  });

  it('should strip apiBaseUrl prefix', () => {
    graph.addNode({
      id: 'api-call:/comp.vue:50',
      kind: 'api-call-site',
      label: 'GET http://localhost:8080/api/users',
      filePath: '/comp.vue',
      metadata: { url: 'http://localhost:8080/api/users', httpMethod: 'GET' },
    });

    const linker = new ApiCallLinker('http://localhost:8080');
    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
  });

  it('should not match different paths', () => {
    graph.addNode({
      id: 'api-call:/comp.vue:60',
      kind: 'api-call-site',
      label: 'GET /api/products',
      filePath: '/comp.vue',
      metadata: { url: '/api/products', httpMethod: 'GET' },
    });

    const linker = new ApiCallLinker();
    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(0);
  });
});

describe('NativeBridgeLinker', () => {
  it('should create bridge and method nodes from native-call edges', () => {
    const graph = new DependencyGraph();

    graph.addNode({
      id: 'vue:/comp.vue',
      kind: 'vue-component',
      label: 'Comp',
      filePath: '/comp.vue',
      metadata: {},
    });

    graph.addEdge({
      id: 'vue:/comp.vue:native-call:AndroidBridge.showToast',
      source: 'vue:/comp.vue',
      target: 'native:AndroidBridge.showToast',
      kind: 'native-call',
      metadata: { interfaceName: 'AndroidBridge', methodName: 'showToast' },
    });

    const linker = new NativeBridgeLinker();
    const result = linker.link(graph);

    expect(result.nodes).toHaveLength(2); // bridge + method
    const bridgeNode = graph.getNode('native-bridge:AndroidBridge');
    expect(bridgeNode).toBeDefined();
    expect(bridgeNode!.kind).toBe('native-bridge');
    expect((bridgeNode!.metadata as any).platform).toBe('android');

    const methodNode = graph.getNode('native-method:AndroidBridge.showToast');
    expect(methodNode).toBeDefined();
    expect(methodNode!.kind).toBe('native-method');
  });
});
