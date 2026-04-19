import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode } from '../graph/types.js';
import {
  collectEntrypoints,
  reachableFromEntrypoints,
  type EntrypointSource,
} from './EntrypointCollector.js';

// Phase 7b-1 — entrypoint-aware dead-code detection.
//
// `findOrphanNodes` (legacy) only flagged nodes with no edges in OR
// out — it missed entire branches of the graph that *could* be traced
// but are unreachable from any external trigger. `findDeadNodes` is
// the entrypoint-aware replacement: anything that the EntrypointCollector
// can't reach via forward DFS is dead code.

const NEVER_DEAD = new Set([
  // Virtual / synthetic nodes are not real artifacts the user can delete.
  'vue-event',
  'spring-event',
  // Schema endpoints — DB tables are externally owned, not dead even
  // if no current code reads them (e.g. legacy / write-only audit tables).
  'db-table',
  // Mapper statements get included implicitly with their mapper.
  'mybatis-statement',
]);

export interface DeadCodeReport {
  /** Entry points the walker started from. */
  entrypoints: EntrypointSource[];
  /** Every node id reachable from any entrypoint via forward DFS. */
  reachable: Set<string>;
  /** Nodes that are not reachable AND not on the never-dead allowlist. */
  dead: GraphNode[];
}

export function findDeadNodes(
  graph: DependencyGraph,
  opts?: { entrypoints?: EntrypointSource[] },
): DeadCodeReport {
  const entrypoints = opts?.entrypoints ?? collectEntrypoints(graph);
  const reachable = reachableFromEntrypoints(graph, entrypoints);
  const dead: GraphNode[] = [];
  for (const node of graph.nodesIter()) {
    if (reachable.has(node.id)) continue;
    if (NEVER_DEAD.has(node.kind)) continue;
    dead.push(node);
  }
  return { entrypoints, reachable, dead };
}
