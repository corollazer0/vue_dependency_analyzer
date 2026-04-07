import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { findCircularDependencies } from '../CircularDependencyAnalyzer.js';
import { findOrphanNodes, findUnusedComponents, findUnusedEndpoints } from '../OrphanDetector.js';
import { calculateComplexity, findHubs } from '../ComplexityScorer.js';
import { analyzeImpact } from '../ImpactAnalyzer.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

function makeNode(id: string, kind: GraphNode['kind'] = 'vue-component', filePath = '/test'): GraphNode {
  return { id, kind, label: id, filePath, metadata: {} };
}

function makeEdge(source: string, target: string, kind: GraphEdge['kind'] = 'imports'): GraphEdge {
  return { id: `${source}:${kind}:${target}`, source, target, kind, metadata: {} };
}

describe('CircularDependencyAnalyzer', () => {
  it('should detect circular dependencies', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'C'));
    graph.addEdge(makeEdge('C', 'A'));

    const cycles = findCircularDependencies(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toHaveLength(3);
  });

  it('should return empty for acyclic graphs', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'C'));

    const cycles = findCircularDependencies(graph);
    expect(cycles).toHaveLength(0);
  });

  it('should detect multiple cycles', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addNode(makeNode('D'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'A'));
    graph.addEdge(makeEdge('C', 'D'));
    graph.addEdge(makeEdge('D', 'C'));

    const cycles = findCircularDependencies(graph);
    expect(cycles).toHaveLength(2);
  });
});

describe('OrphanDetector', () => {
  it('should find orphan nodes', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));

    const orphans = findOrphanNodes(graph);
    expect(orphans.map(n => n.id)).toEqual(['C']);
  });

  it('should find unused components', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A', 'vue-component'));
    graph.addNode(makeNode('B', 'vue-component'));
    graph.addEdge(makeEdge('A', 'B', 'uses-component'));

    const unused = findUnusedComponents(graph);
    // A has no incoming uses-component edges
    expect(unused.map(n => n.id)).toContain('A');
    expect(unused.map(n => n.id)).not.toContain('B');
  });

  it('should find unused endpoints', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('E1', 'spring-endpoint'));
    graph.addNode(makeNode('E2', 'spring-endpoint'));
    graph.addNode(makeNode('C', 'api-call-site'));
    graph.addEdge(makeEdge('C', 'E1', 'api-call'));

    const unused = findUnusedEndpoints(graph);
    expect(unused.map(n => n.id)).toEqual(['E2']);
  });
});

describe('ComplexityScorer', () => {
  it('should calculate fan-in/fan-out correctly', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addNode(makeNode('D'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('A', 'C'));
    graph.addEdge(makeEdge('A', 'D'));
    graph.addEdge(makeEdge('B', 'D'));
    graph.addEdge(makeEdge('C', 'D'));

    const scores = calculateComplexity(graph);
    const scoreA = scores.find(s => s.nodeId === 'A')!;
    expect(scoreA.fanOut).toBe(3);
    expect(scoreA.fanIn).toBe(0);

    const scoreD = scores.find(s => s.nodeId === 'D')!;
    expect(scoreD.fanIn).toBe(3);
    expect(scoreD.fanOut).toBe(0);
  });

  it('should find hubs', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('HUB'));
    for (let i = 0; i < 6; i++) {
      graph.addNode(makeNode(`N${i}`));
      graph.addEdge(makeEdge(`N${i}`, 'HUB'));
    }

    const hubs = findHubs(graph, 5);
    expect(hubs).toHaveLength(1);
    expect(hubs[0].nodeId).toBe('HUB');
  });
});

describe('ImpactAnalyzer', () => {
  it('should analyze impact of a node', () => {
    const graph = new DependencyGraph();
    // A -> B -> C -> D
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addNode(makeNode('D'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'C'));
    graph.addEdge(makeEdge('C', 'D'));

    const impact = analyzeImpact(graph, 'D');
    expect(impact.directDependents.map(n => n.id)).toEqual(['C']);
    expect(impact.totalImpact).toBe(3); // A, B, C
  });

  it('should respect maxDepth', () => {
    const graph = new DependencyGraph();
    graph.addNode(makeNode('A'));
    graph.addNode(makeNode('B'));
    graph.addNode(makeNode('C'));
    graph.addEdge(makeEdge('A', 'B'));
    graph.addEdge(makeEdge('B', 'C'));

    const impact = analyzeImpact(graph, 'C', 1);
    expect(impact.totalImpact).toBe(1); // only B
  });
});
