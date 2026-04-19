import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode } from '../graph/types.js';

// Phase 7b-1 — public API consumed by 7b-1 Dead-Code Detector and
// Phase 9-3 (Feature Slice). The reachability walk for both reuses
// `collectEntrypoints` + `reachableFromEntrypoints` so the rules for
// "what counts as an externally-triggered surface" stay in one place.
//
// Cross-phase contract (briefing §5): export shape (`EntrypointSource`,
// `collectEntrypoints`, `reachableFromEntrypoints`) is frozen for
// Phase 9. Add new reasons by extending the union; do not rename.

export type EntrypointReason =
  | 'spring-controller'        // @RestController / @Controller — HTTP surface
  | 'spring-scheduled'         // @Scheduled-method-bearing service
  | 'spring-event-listener'    // service with incoming `listens-event`
  | 'vue-router-route'         // declared router file
  | 'app-entry'                // top-level entry module (main.ts / index.ts)
  | 'cli-bin'                  // bin entry script
  | 'native-bridge';           // edge of the system — calls flow inward

export interface EntrypointSource {
  node: GraphNode;
  reason: EntrypointReason;
}

const APP_ENTRY_BASENAMES = new Set([
  'main.ts', 'main.js', 'index.ts', 'index.js', 'app.ts', 'app.js',
]);

function isUnderEntryPath(filePath: string): boolean {
  // src/main.ts, src/index.ts, packages/x/src/main.ts, etc.
  // Avoid false positives like `pages/index.ts` by requiring `src/` parent
  // OR a project-root-relative `main.ts`.
  const normalized = filePath.replace(/\\/g, '/');
  const base = normalized.split('/').pop() ?? '';
  if (!APP_ENTRY_BASENAMES.has(base)) return false;
  return /\/src\/[^/]+$/.test(normalized) || /^[^/]+\.(ts|js)$/.test(normalized);
}

export function collectEntrypoints(graph: DependencyGraph): EntrypointSource[] {
  const out: EntrypointSource[] = [];
  const seen = new Set<string>();
  function add(node: GraphNode, reason: EntrypointReason): void {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    out.push({ node, reason });
  }

  // Pre-index incoming `listens-event` edges so the per-node check is O(1)
  // instead of O(|E|) on each iteration.
  const hasIncomingListens = new Set<string>();
  for (const e of graph.edgesByKindIter('listens-event')) {
    hasIncomingListens.add(e.target);
  }

  for (const node of graph.nodesIter()) {
    switch (node.kind) {
      case 'spring-controller':
        add(node, 'spring-controller');
        break;
      case 'spring-service':
        if (node.metadata.hasScheduled === true) add(node, 'spring-scheduled');
        else if (hasIncomingListens.has(node.id)) add(node, 'spring-event-listener');
        break;
      case 'vue-router-route':
        add(node, 'vue-router-route');
        break;
      case 'native-bridge':
        add(node, 'native-bridge');
        break;
      case 'ts-module':
        if (isUnderEntryPath(node.filePath)) add(node, 'app-entry');
        else if (node.filePath.includes('/bin/')) add(node, 'cli-bin');
        break;
    }
  }

  return out;
}

// Edges that should NOT be followed for reachability. `dto-flows`
// connects nodes that share a DTO type — useful for traversal queries
// but not a "X depends on Y" relationship for liveness.
const NON_REACHABILITY_KINDS = new Set([
  'dto-flows',
  'api-implements', // reverse alias of api-serves; following both double-walks
]);

export function reachableFromEntrypoints(
  graph: DependencyGraph,
  entrypoints: EntrypointSource[],
): Set<string> {
  const visited = new Set<string>();
  const stack: string[] = [];
  for (const ep of entrypoints) {
    if (!visited.has(ep.node.id)) {
      visited.add(ep.node.id);
      stack.push(ep.node.id);
    }
  }

  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const e of graph.getOutEdges(id)) {
      if (NON_REACHABILITY_KINDS.has(e.kind)) continue;
      if (visited.has(e.target)) continue;
      visited.add(e.target);
      stack.push(e.target);
    }
  }

  return visited;
}
