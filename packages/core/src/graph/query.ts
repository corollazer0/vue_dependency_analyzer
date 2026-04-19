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
  // Index-based queue (Array.shift is O(n), which made BFS O(n^2)).
  const queueIds: string[] = [nodeId];
  const queueDepths: number[] = [0];
  let head = 0;

  while (head < queueIds.length) {
    const id = queueIds[head];
    const depth = queueDepths[head];
    head++;
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
        queueIds.push(nextId);
        queueDepths.push(depth + 1);
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

export type PathDirection = 'forward' | 'reverse';

export interface FindPathsOptions {
  maxDepth?: number;
  edgeKinds?: string[];
  /** Cap total paths returned to avoid exponential blowup on hub-heavy graphs. */
  maxResults?: number;
  /**
   * forward (default): walk out-edges from `from` to `to`.
   * reverse: walk in-edges from `from` to `to` — answers "who can reach `from`?
   * starting at the consumer side". Returned paths still read source→target order:
   * each step is a real edge in the graph (target → source of an in-edge).
   */
  direction?: PathDirection;
}

/** Default cap on paths returned from findPaths. Guards against pathological graphs. */
export const DEFAULT_FIND_PATHS_CAP = 100;

export function findPaths(
  graph: DependencyGraph,
  from: string,
  to: string,
  maxDepthOrOpts: number | FindPathsOptions = 10,
): string[][] {
  const opts = typeof maxDepthOrOpts === 'number'
    ? { maxDepth: maxDepthOrOpts }
    : maxDepthOrOpts;
  const maxDepth = opts.maxDepth ?? 10;
  const maxResults = opts.maxResults ?? DEFAULT_FIND_PATHS_CAP;
  const edgeKindSet = opts.edgeKinds ? new Set(opts.edgeKinds) : null;
  const direction: PathDirection = opts.direction ?? 'forward';
  const paths: string[][] = [];
  // Set tracks membership in O(1); array preserves order for the final path copy.
  const onPath = new Set<string>([from]);

  function dfs(current: string, path: string[], depth: number): boolean {
    if (paths.length >= maxResults) return true; // cap reached, stop exploring
    if (depth > maxDepth) return false;
    if (current === to) {
      paths.push([...path]);
      return paths.length >= maxResults;
    }
    const edges = direction === 'forward'
      ? graph.getOutEdges(current)
      : graph.getInEdges(current);
    for (const edge of edges) {
      if (edgeKindSet && !edgeKindSet.has(edge.kind)) continue;
      const next = direction === 'forward' ? edge.target : edge.source;
      if (onPath.has(next)) continue;
      onPath.add(next);
      path.push(next);
      const done = dfs(next, path, depth + 1);
      path.pop();
      onPath.delete(next);
      if (done) return true;
    }
    return false;
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
