import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../DependencyGraph.js';
import { filterByKind, reachableFrom, impactOf, findPaths, subgraphAround } from '../query.js';
import { toJSON, fromJSON, toDot } from '../serializer.js';
import type { GraphNode, GraphEdge } from '../types.js';

function makeNode(id: string, kind: GraphNode['kind'] = 'vue-component', filePath = '/test.vue'): GraphNode {
  return { id, kind, label: id, filePath, metadata: {} };
}

function makeEdge(source: string, target: string, kind: GraphEdge['kind'] = 'imports'): GraphEdge {
  return { id: `${source}:${kind}:${target}`, source, target, kind, metadata: {} };
}

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  it('should add and retrieve nodes', () => {
    const node = makeNode('A');
    graph.addNode(node);
    expect(graph.getNode('A')).toEqual(node);
    expect(graph.getNodeCount()).toBe(1);
    expect(graph.hasNode('A')).toBe(true);
  });

  it('should add and retrieve edges', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    const edge = makeEdge('A', 'B');
    graph.addEdge(edge);
    expect(graph.getEdge(edge.id)).toEqual(edge);
    expect(graph.getEdgeCount()).toBe(1);
  });

  it('should return out/in edges', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('A', 'C'));
    graph.addEdge(makeEdge('B', 'C'));

    expect(graph.getOutEdges('A')).toHaveLength(2);
    expect(graph.getInEdges('C')).toHaveLength(2);
    expect(graph.getInEdges('A')).toHaveLength(0);
  });

  it('should return neighbors', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('C', 'A'));

    const outNeighbors = graph.getNeighbors('A', 'out');
    expect(outNeighbors.map(n => n.id)).toEqual(['B']);

    const inNeighbors = graph.getNeighbors('A', 'in');
    expect(inNeighbors.map(n => n.id)).toEqual(['C']);

    const bothNeighbors = graph.getNeighbors('A', 'both');
    expect(bothNeighbors.map(n => n.id).sort()).toEqual(['B', 'C']);
  });

  it('should remove node and its edges', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'C'));

    graph.removeNode('B');
    expect(graph.hasNode('B')).toBe(false);
    expect(graph.getEdgeCount()).toBe(0);
    expect(graph.getOutEdges('A')).toHaveLength(0);
  });

  it('should remove by file path', () => {
    graph.addNode(makeNode('A', 'vue-component', '/a.vue'));
    graph.addNode(makeNode('B', 'vue-component', '/a.vue'));
    graph.addNode(makeNode('C', 'vue-component', '/b.vue'));
    graph.addEdge(makeEdge('A', 'C'));

    graph.removeByFile('/a.vue');
    expect(graph.getNodeCount()).toBe(1);
    expect(graph.hasNode('C')).toBe(true);
    expect(graph.getEdgeCount()).toBe(0);
  });

  // Phase 2-7
  it('removeByFile should return the 1-hop dependent file paths', () => {
    graph.addNode(makeNode('A', 'vue-component', '/a.vue'));
    graph.addNode(makeNode('B', 'vue-component', '/b.vue'));
    graph.addNode(makeNode('C', 'vue-component', '/c.vue'));
    graph.addNode(makeNode('D', 'vue-component', '/a.vue')); // sibling in /a.vue
    // /b.vue and /c.vue both import /a.vue (B→A, C→A); D→A is intra-file
    graph.addEdge(makeEdge('B', 'A'));
    graph.addEdge(makeEdge('C', 'A'));
    graph.addEdge(makeEdge('D', 'A'));

    const dependents = graph.removeByFile('/a.vue').sort();
    expect(dependents).toEqual(['/b.vue', '/c.vue']);
    // Intra-file edges (D→A) must not surface as a dependent — D was removed too.
    expect(graph.hasNode('D')).toBe(false);
  });

  it('removeByFile should return empty list when the file has no nodes', () => {
    expect(graph.removeByFile('/missing.vue')).toEqual([]);
  });

  it('removeByFile should not return the same dependent twice', () => {
    graph.addNode(makeNode('A', 'vue-component', '/a.vue'));
    graph.addNode(makeNode('B', 'vue-component', '/b.vue'));
    graph.addEdge(makeEdge('A', 'B', 'imports'));
    graph.addEdge(makeEdge('A', 'B', 'uses-component'));

    const deps = graph.removeByFile('/b.vue');
    expect(deps).toEqual(['/a.vue']);
  });

  it('should merge graphs', () => {
    graph.addNode(makeNode('A'));
    const other = new DependencyGraph();
    other.addNode(makeNode('B'));
    other.addEdge(makeEdge('A', 'B'));

    graph.merge(other);
    expect(graph.getNodeCount()).toBe(2);
    expect(graph.getEdgeCount()).toBe(1);
  });

  // Phase 2-4
  it('should index edges by kind and keep the index in sync on remove', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B', 'imports'));
    graph.addEdge(makeEdge('A', 'C', 'imports'));
    graph.addEdge(makeEdge('B', 'C', 'uses-store'));

    expect(graph.getEdgesByKind('imports')).toHaveLength(2);
    expect(graph.getEdgesByKind('uses-store')).toHaveLength(1);
    expect(graph.getEdgesByKind('api-call')).toHaveLength(0);

    // Remove a node and confirm the index drops both endpoint-bearing edges
    graph.removeNode('A');
    expect(graph.getEdgesByKind('imports')).toHaveLength(0);
    expect(graph.getEdgesByKind('uses-store')).toHaveLength(1);

    // Direct edge removal also keeps the index honest
    const remaining = graph.getEdgesByKind('uses-store')[0];
    graph.removeEdge(remaining.id);
    expect(graph.getEdgesByKind('uses-store')).toHaveLength(0);
  });

  it('should expose O(1) in/out-degree counts', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('A', 'C'));
    graph.addEdge(makeEdge('C', 'B'));

    expect(graph.getOutDegree('A')).toBe(2);
    expect(graph.getOutDegree('B')).toBe(0);
    expect(graph.getInDegree('B')).toBe(2);
    expect(graph.getInDegree('A')).toBe(0);
    expect(graph.getInDegree('missing')).toBe(0);
    expect(graph.getOutDegree('missing')).toBe(0);
  });

  it('re-adding the same edge id should not double-count in the kind index', () => {
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    const e = makeEdge('A', 'B', 'imports');
    graph.addEdge(e);
    graph.addEdge(e);
    graph.addEdge(e);
    expect(graph.getEdgesByKind('imports')).toHaveLength(1);
    expect(graph.getEdgeCount()).toBe(1);
  });

  it('should get stats', () => {
    graph.addNode(makeNode('A', 'vue-component'));
    graph.addNode(makeNode('B', 'pinia-store'));
    graph.addEdge(makeEdge('A', 'B', 'uses-store'));

    const stats = graph.getStats();
    expect(stats.nodesByKind['vue-component']).toBe(1);
    expect(stats.nodesByKind['pinia-store']).toBe(1);
    expect(stats.edgesByKind['uses-store']).toBe(1);
    expect(stats.totalNodes).toBe(2);
    expect(stats.totalEdges).toBe(1);
  });
});

describe('query', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
    // A -> B -> C -> D
    //      B -> E
    graph.addNode(makeNode('A', 'vue-component'));
    graph.addNode(makeNode('B', 'vue-composable'));
    graph.addNode(makeNode('C', 'pinia-store'));
    graph.addNode(makeNode('D', 'spring-endpoint'));
    graph.addNode(makeNode('E', 'ts-module'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'C'));
    graph.addEdge(makeEdge('C', 'D', 'api-call'));
    graph.addEdge(makeEdge('B', 'E'));
  });

  it('filterByKind should filter nodes', () => {
    const filtered = filterByKind(graph, ['vue-component', 'vue-composable']);
    expect(filtered.getNodeCount()).toBe(2);
    expect(filtered.getEdgeCount()).toBe(1); // A -> B
  });

  it('filterByKind should filter edges', () => {
    const filtered = filterByKind(graph, undefined, ['api-call']);
    expect(filtered.getNodeCount()).toBe(5);
    expect(filtered.getEdgeCount()).toBe(1); // C -> D
  });

  it('reachableFrom should find downstream nodes', () => {
    const reachable = reachableFrom(graph, 'A', 'out');
    expect(reachable).toEqual(new Set(['B', 'C', 'D', 'E']));
  });

  it('reachableFrom should respect maxDepth', () => {
    const reachable = reachableFrom(graph, 'A', 'out', 1);
    expect(reachable).toEqual(new Set(['B']));
  });

  it('reachableFrom should find upstream nodes', () => {
    const reachable = reachableFrom(graph, 'D', 'in');
    expect(reachable).toEqual(new Set(['A', 'B', 'C']));
  });

  it('impactOf should return affected nodes and edges', () => {
    const result = impactOf(graph, 'C');
    expect(result.nodes.map(n => n.id).sort()).toEqual(['A', 'B']);
  });

  it('findPaths should find all paths', () => {
    const paths = findPaths(graph, 'A', 'D');
    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual(['A', 'B', 'C', 'D']);
  });

  // Phase 10-1
  it('findPaths reverse mode should walk in-edges from `from` toward `to`', () => {
    // forward A→B→C→D; reverse from D→…→A walks in-edges
    const paths = findPaths(graph, 'D', 'A', { direction: 'reverse' });
    expect(paths).toHaveLength(1);
    // Path lists ids visited starting at `from`; each step is a real graph edge.
    expect(paths[0]).toEqual(['D', 'C', 'B', 'A']);
  });

  // Phase 10-1 — contract freeze: response shape (paths[][]) is identical between
  // direction=forward and direction=reverse so any consumer (server, UI) can
  // ignore direction in result handling.
  it('findPaths reverse and forward return the same response shape', () => {
    const forward = findPaths(graph, 'A', 'D', { direction: 'forward' });
    const reverse = findPaths(graph, 'D', 'A', { direction: 'reverse' });
    expect(Array.isArray(forward)).toBe(true);
    expect(Array.isArray(reverse)).toBe(true);
    expect(forward.every(p => Array.isArray(p) && p.every(s => typeof s === 'string'))).toBe(true);
    expect(reverse.every(p => Array.isArray(p) && p.every(s => typeof s === 'string'))).toBe(true);
  });

  it('subgraphAround should extract local subgraph', () => {
    const sub = subgraphAround(graph, 'B', 1);
    expect(sub.getNodeCount()).toBe(4); // A, B, C, E
    expect(sub.hasNode('D')).toBe(false);
  });
});

describe('serializer', () => {
  it('should round-trip JSON serialization', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addEdge(makeEdge('A', 'B'));

    const json = toJSON(graph);
    const restored = fromJSON(json);
    expect(restored.getNodeCount()).toBe(2);
    expect(restored.getEdgeCount()).toBe(1);
    expect(restored.getNode('A')?.label).toBe('A');
  });

  it('should generate DOT format', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A', 'vue-component'));
    graph.addNode(makeNode('B', 'spring-endpoint'));
    graph.addEdge(makeEdge('A', 'B', 'api-call'));

    const dot = toDot(graph);
    expect(dot).toContain('digraph VDA');
    expect(dot).toContain('"A"');
    expect(dot).toContain('"B"');
    expect(dot).toContain('api-call');
  });
});
