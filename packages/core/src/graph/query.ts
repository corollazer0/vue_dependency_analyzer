import type { NodeKind, EdgeKind, GraphNode, GraphEdge } from './types.js';
import { DependencyGraph } from './DependencyGraph.js';

export function filterByKind(
  graph: DependencyGraph,
  nodeKinds?: NodeKind[],
  edgeKinds?: EdgeKind[],
): DependencyGraph {
  const filtered = new DependencyGraph();

  const nodeKindSet = nodeKinds ? new Set(nodeKinds) : null;
  const edgeKindSet = edgeKinds ? new Set(edgeKinds) : null;

  for (const node of graph.getAllNodes()) {
    if (!nodeKindSet || nodeKindSet.has(node.kind)) {
      filtered.addNode(node);
    }
  }

  for (const edge of graph.getAllEdges()) {
    if (!edgeKindSet || edgeKindSet.has(edge.kind)) {
      if (filtered.hasNode(edge.source) && filtered.hasNode(edge.target)) {
        filtered.addEdge(edge);
      }
    }
  }

  return filtered;
}

export function reachableFrom(
  graph: DependencyGraph,
  nodeId: string,
  direction: 'out' | 'in' | 'both' = 'out',
  maxDepth: number = Infinity,
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);

    const edges =
      direction === 'out'
        ? graph.getOutEdges(id)
        : direction === 'in'
          ? graph.getInEdges(id)
          : [...graph.getOutEdges(id), ...graph.getInEdges(id)];

    for (const edge of edges) {
      const nextId = direction === 'in' ? edge.source : direction === 'out' ? edge.target : (edge.source === id ? edge.target : edge.source);
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, depth: depth + 1 });
      }
    }
  }

  visited.delete(nodeId); // exclude the start node
  return visited;
}

export function impactOf(
  graph: DependencyGraph,
  nodeId: string,
  maxDepth: number = Infinity,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const reachable = reachableFrom(graph, nodeId, 'in', maxDepth);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const id of reachable) {
    const node = graph.getNode(id);
    if (node) nodes.push(node);
  }

  for (const edge of graph.getAllEdges()) {
    if (reachable.has(edge.source) || reachable.has(edge.target) || edge.source === nodeId || edge.target === nodeId) {
      if (
        (reachable.has(edge.source) || edge.source === nodeId) &&
        (reachable.has(edge.target) || edge.target === nodeId)
      ) {
        edges.push(edge);
      }
    }
  }

  return { nodes, edges };
}

export function findPaths(
  graph: DependencyGraph,
  from: string,
  to: string,
  maxDepth: number = 10,
): string[][] {
  const paths: string[][] = [];

  function dfs(current: string, path: string[], depth: number): void {
    if (depth > maxDepth) return;
    if (current === to) {
      paths.push([...path]);
      return;
    }
    for (const edge of graph.getOutEdges(current)) {
      if (!path.includes(edge.target)) {
        path.push(edge.target);
        dfs(edge.target, path, depth + 1);
        path.pop();
      }
    }
  }

  dfs(from, [from], 0);
  return paths;
}

export function subgraphAround(
  graph: DependencyGraph,
  nodeId: string,
  depth: number = 2,
): DependencyGraph {
  const reachableOut = reachableFrom(graph, nodeId, 'out', depth);
  const reachableIn = reachableFrom(graph, nodeId, 'in', depth);
  const allIds = new Set([nodeId, ...reachableOut, ...reachableIn]);

  const sub = new DependencyGraph();
  for (const id of allIds) {
    const node = graph.getNode(id);
    if (node) sub.addNode(node);
  }
  for (const edge of graph.getAllEdges()) {
    if (allIds.has(edge.source) && allIds.has(edge.target)) {
      sub.addEdge(edge);
    }
  }
  return sub;
}
