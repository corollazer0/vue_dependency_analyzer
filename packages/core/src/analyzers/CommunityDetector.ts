import { UndirectedGraph } from 'graphology';
// graphology-communities-louvain is a CJS package whose .d.ts re-exports the algorithm
// only as `export default`. Under Node16 ESM resolution that exposes the API on the
// namespace's `.default` slot. We import the namespace and pick the right shape at
// runtime — covers both the synthetic-default (real ESM) and CJS module.exports cases.
import * as louvainNs from 'graphology-communities-louvain';
import type { DetailedLouvainOutput, LouvainOptions } from 'graphology-communities-louvain';
import type { DependencyGraph } from '../graph/DependencyGraph.js';

interface LouvainAPI {
  detailed(graph: UndirectedGraph, options?: LouvainOptions): DetailedLouvainOutput;
}
const louvain: LouvainAPI =
  (louvainNs as unknown as { default?: LouvainAPI }).default ??
  (louvainNs as unknown as LouvainAPI);

export interface CommunityDetectionOptions {
  /**
   * Louvain resolution parameter.
   *  - 1.0 (default) is the classical modularity formulation.
   *  - >1.0 produces more, smaller communities (useful when the graph is
   *    dense and the default partition collapses to a handful of giant
   *    communities — typical for small services).
   *  - <1.0 produces fewer, larger communities.
   */
  resolution?: number;
  /** Optional deterministic RNG (test fixtures use this for stable IDs). */
  rng?: () => number;
}

export interface CommunityResult {
  /** node id → community index (0..count-1, dense). */
  communities: Map<string, number>;
  /** number of detected communities */
  count: number;
  /** modularity score of the partition (higher = better separation) */
  modularity: number;
}

/**
 * Phase 3-1 — Louvain community detection on the dependency graph.
 *
 * The dependency graph is directed for analysis (A imports B ≠ B imports A),
 * but for *clustering* we want undirected coupling: if A imports B and B
 * emits an event A listens to, those two should land in the same community.
 * So we project to an undirected graph and coalesce parallel edges into a
 * single weighted edge (weight = number of original edges between the pair).
 * Self-loops carry no clustering signal and are dropped.
 *
 * The result is consumed by the Phase 3-2 cluster endpoint as the mid-zoom
 * grouping (replacing the directory-prefix grouping that ignored cross-tree
 * coupling).
 */
export function detectCommunities(
  graph: DependencyGraph,
  options: CommunityDetectionOptions = {},
): CommunityResult {
  const ug = new UndirectedGraph<{ weight?: number }, { weight: number }>({
    allowSelfLoops: false,
  });

  for (const node of graph.nodesIter()) {
    ug.addNode(node.id);
  }

  for (const edge of graph.edgesIter()) {
    if (edge.source === edge.target) continue;
    if (!ug.hasNode(edge.source) || !ug.hasNode(edge.target)) continue;
    const [u, v] = edge.source < edge.target
      ? [edge.source, edge.target]
      : [edge.target, edge.source];
    if (ug.hasEdge(u, v)) {
      const cur = ug.getEdgeAttribute(u, v, 'weight') as number | undefined;
      ug.setEdgeAttribute(u, v, 'weight', (cur ?? 0) + 1);
    } else {
      ug.addUndirectedEdge(u, v, { weight: 1 });
    }
  }

  if (ug.order === 0) {
    return { communities: new Map(), count: 0, modularity: 0 };
  }

  // size === 0 means no edges — every node is its own community. The Louvain
  // implementation handles this but returns modularity NaN; short-circuit so
  // callers always see a finite number.
  if (ug.size === 0) {
    const communities = new Map<string, number>();
    let i = 0;
    for (const id of ug.nodes()) communities.set(id, i++);
    return { communities, count: communities.size, modularity: 0 };
  }

  const detailed = louvain.detailed(ug, {
    getEdgeWeight: 'weight',
    resolution: options.resolution ?? 1.0,
    rng: options.rng,
  });

  const communities = new Map<string, number>();
  for (const [nodeId, communityIndex] of Object.entries(detailed.communities)) {
    communities.set(nodeId, communityIndex);
  }

  return {
    communities,
    count: detailed.count,
    modularity: detailed.modularity,
  };
}

/**
 * Invert the node→community map into community→nodes.
 * Bucket order matches first-seen node order (insertion order of communities Map).
 */
export function groupNodesByCommunity(
  result: CommunityResult,
): Map<number, string[]> {
  const out = new Map<number, string[]>();
  for (const [nodeId, c] of result.communities) {
    let bucket = out.get(c);
    if (!bucket) { bucket = []; out.set(c, bucket); }
    bucket.push(nodeId);
  }
  return out;
}
