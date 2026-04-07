import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode } from '../graph/types.js';

export function findOrphanNodes(graph: DependencyGraph): GraphNode[] {
  return graph.getAllNodes().filter(node => {
    const inEdges = graph.getInEdges(node.id);
    const outEdges = graph.getOutEdges(node.id);
    return inEdges.length === 0 && outEdges.length === 0;
  });
}

export function findUnusedComponents(graph: DependencyGraph): GraphNode[] {
  return graph.getAllNodes().filter(node => {
    if (node.kind !== 'vue-component') return false;
    // A component is "unused" if nothing references it (no incoming uses-component or route-renders edges)
    const inEdges = graph.getInEdges(node.id);
    return !inEdges.some(e =>
      e.kind === 'uses-component' || e.kind === 'route-renders'
    );
  });
}

export function findUnusedEndpoints(graph: DependencyGraph): GraphNode[] {
  return graph.getAllNodes().filter(node => {
    if (node.kind !== 'spring-endpoint') return false;
    // An endpoint is "unused" if no api-call edge points to it
    const inEdges = graph.getInEdges(node.id);
    return !inEdges.some(e => e.kind === 'api-call');
  });
}
