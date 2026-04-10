import { DependencyGraph } from '../graph/DependencyGraph.js';
import { reachableFrom } from '../graph/query.js';
import type { GraphNode } from '../graph/types.js';
import { resolve } from 'path';

export interface ChangeImpact {
  changedFiles: string[];
  changedNodes: GraphNode[];
  directImpact: GraphNode[];
  transitiveImpact: GraphNode[];
  affectedEndpoints: GraphNode[];
  affectedTables: GraphNode[];
  summary: {
    changed: number;
    direct: number;
    transitive: number;
    endpoints: number;
    tables: number;
  };
}

/**
 * Analyze the impact of changed files on the dependency graph.
 * @param graph - The dependency graph
 * @param changedFiles - Relative file paths that were changed
 * @param projectRoot - Project root to resolve relative paths
 */
export function analyzeChangeImpact(
  graph: DependencyGraph,
  changedFiles: string[],
  projectRoot?: string,
): ChangeImpact {
  // Map changed files to graph nodes
  const changedNodeIds = new Set<string>();
  const changedNodes: GraphNode[] = [];

  for (const file of changedFiles) {
    const absPath = projectRoot ? resolve(projectRoot, file) : file;
    // Try both absolute and relative path
    const nodes = graph.getNodesByFile(absPath);
    if (nodes.length === 0 && projectRoot) {
      // Also try with the relative path directly
      const relNodes = graph.getNodesByFile(file);
      for (const n of relNodes) {
        if (!changedNodeIds.has(n.id)) {
          changedNodeIds.add(n.id);
          changedNodes.push(n);
        }
      }
    }
    for (const n of nodes) {
      if (!changedNodeIds.has(n.id)) {
        changedNodeIds.add(n.id);
        changedNodes.push(n);
      }
    }
  }

  // Find all impacted nodes (reverse traversal — who depends on changed nodes)
  const directIds = new Set<string>();
  const transitiveIds = new Set<string>();

  for (const nodeId of changedNodeIds) {
    // Direct dependents (1-hop)
    for (const edge of graph.getInEdges(nodeId)) {
      if (!changedNodeIds.has(edge.source)) {
        directIds.add(edge.source);
      }
    }

    // Transitive dependents (all reachable via 'in' direction)
    const reachable = reachableFrom(graph, nodeId, 'in');
    for (const id of reachable) {
      if (!changedNodeIds.has(id) && !directIds.has(id)) {
        transitiveIds.add(id);
      }
    }
  }

  const directImpact = Array.from(directIds).map(id => graph.getNode(id)!).filter(Boolean);
  const transitiveImpact = Array.from(transitiveIds).map(id => graph.getNode(id)!).filter(Boolean);

  // All impacted nodes (changed + direct + transitive)
  const allImpactedIds = new Set([...changedNodeIds, ...directIds, ...transitiveIds]);
  const allImpacted = Array.from(allImpactedIds).map(id => graph.getNode(id)!).filter(Boolean);

  // Filter for specific kinds
  const affectedEndpoints = allImpacted.filter(n => n.kind === 'spring-endpoint');
  const affectedTables = allImpacted.filter(n => n.kind === 'db-table');

  return {
    changedFiles,
    changedNodes,
    directImpact,
    transitiveImpact,
    affectedEndpoints,
    affectedTables,
    summary: {
      changed: changedNodes.length,
      direct: directImpact.length,
      transitive: transitiveImpact.length,
      endpoints: affectedEndpoints.length,
      tables: affectedTables.length,
    },
  };
}
