import { DependencyGraph } from '../graph/DependencyGraph.js';

export function findCircularDependencies(graph: DependencyGraph): string[][] {
  // Tarjan's SCC algorithm
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const sccs: string[][] = [];

  function strongConnect(nodeId: string): void {
    indices.set(nodeId, index);
    lowLinks.set(nodeId, index);
    index++;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const edge of graph.getOutEdges(nodeId)) {
      const target = edge.target;
      if (!indices.has(target)) {
        strongConnect(target);
        lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId)!, indices.get(target)!));
      }
    }

    if (lowLinks.get(nodeId) === indices.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);

      // Only report SCCs with more than 1 node (actual cycles)
      if (scc.length > 1) {
        sccs.push(scc.reverse());
      }
    }
  }

  for (const node of graph.getAllNodes()) {
    if (!indices.has(node.id)) {
      strongConnect(node.id);
    }
  }

  return sccs;
}
