import { DependencyGraph } from '../graph/DependencyGraph.js';
import { reachableFrom } from '../graph/query.js';
import type { GraphNode } from '../graph/types.js';

export interface ImpactResult {
  nodeId: string;
  label: string;
  directDependents: GraphNode[];
  transitiveDependents: GraphNode[];
  totalImpact: number;
}

export function analyzeImpact(graph: DependencyGraph, nodeId: string, maxDepth: number = Infinity): ImpactResult {
  const node = graph.getNode(nodeId);
  if (!node) {
    return {
      nodeId,
      label: 'unknown',
      directDependents: [],
      transitiveDependents: [],
      totalImpact: 0,
    };
  }

  // Direct dependents (nodes that directly depend on this node)
  const directDependents = graph.getNeighbors(nodeId, 'in');

  // Transitive dependents (all nodes reachable via reverse traversal)
  const transitiveIds = reachableFrom(graph, nodeId, 'in', maxDepth);
  const transitiveDependents = Array.from(transitiveIds)
    .map(id => graph.getNode(id)!)
    .filter(Boolean);

  return {
    nodeId,
    label: node.label,
    directDependents,
    transitiveDependents,
    totalImpact: transitiveDependents.length,
  };
}
