import { DependencyGraph } from '../graph/DependencyGraph.js';
import { findCircularDependencies } from './CircularDependencyAnalyzer.js';
import type { GraphNode } from '../graph/types.js';

// Phase 9-7 — F9 Complexity anti-pattern classifier.
//
// Layered on top of the existing fan-in / fan-out scorer. Each tag's
// threshold is overridable via `.vdarc.json complexityThresholds` so
// projects can dial sensitivity without recompiling the engine.

export type AntiPatternTag = 'god-object' | 'entry-hub' | 'utility-sink' | 'cyclic-cluster';

export interface ComplexityThresholds {
  /** god-object: fan-out >= this AND lineCount >= and packageCount >= */
  godObjectFanOut?: number;
  godObjectLineCount?: number;
  godObjectPackageCount?: number;
  /** entry-hub: fan-in >= this AND fan-out <= entryHubFanOutMax */
  entryHubFanIn?: number;
  entryHubFanOutMax?: number;
  /** utility-sink: fan-in >= this AND fan-out === 0 */
  utilitySinkFanIn?: number;
  /** cyclic-cluster: SCC member with fan-in>=N AND fan-out>=N */
  cyclicClusterMinFan?: number;
}

const DEFAULT_THRESHOLDS: Required<ComplexityThresholds> = {
  godObjectFanOut: 10,
  godObjectLineCount: 400,
  godObjectPackageCount: 3,
  entryHubFanIn: 10,
  entryHubFanOutMax: 2,
  utilitySinkFanIn: 8,
  cyclicClusterMinFan: 3,
};

export interface AntiPatternResult {
  byNodeId: Map<string, AntiPatternTag[]>;
  totals: { byTag: Record<AntiPatternTag, number> };
  suggestions: Record<AntiPatternTag, string>;
}

export interface ClassifyOptions {
  thresholds?: ComplexityThresholds;
}

const SUGGESTIONS: Record<AntiPatternTag, string> = {
  'god-object': 'Split into sub-domains; the high fan-out + size + package spread indicates this module is doing too much.',
  'entry-hub': 'Likely an intentional facade. Leave as-is unless it grows logic; treat the high fan-in as an architectural anchor.',
  'utility-sink': 'Pure utility module — keep observation only. Watch for divergent helpers leaking unrelated concerns.',
  'cyclic-cluster': 'Resolve the cycle: extract a shared interface, invert one direction, or move shared state into a separate module.',
};

function metaNumber(node: GraphNode, key: string, fallback = 0): number {
  const v = (node.metadata as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : fallback;
}

export function classifyAntiPatterns(
  graph: DependencyGraph,
  opts: ClassifyOptions = {},
): AntiPatternResult {
  const t = { ...DEFAULT_THRESHOLDS, ...opts.thresholds };
  const byNodeId = new Map<string, AntiPatternTag[]>();
  const totals: Record<AntiPatternTag, number> = {
    'god-object': 0,
    'entry-hub': 0,
    'utility-sink': 0,
    'cyclic-cluster': 0,
  };

  function tag(nodeId: string, t: AntiPatternTag) {
    if (!byNodeId.has(nodeId)) byNodeId.set(nodeId, []);
    const list = byNodeId.get(nodeId)!;
    if (!list.includes(t)) {
      list.push(t);
      totals[t] += 1;
    }
  }

  // Pre-compute fan-in / fan-out for every node (single pass).
  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  for (const node of graph.nodesIter()) {
    fanIn.set(node.id, graph.getInEdges(node.id).length);
    fanOut.set(node.id, graph.getOutEdges(node.id).length);
  }

  // Tags 1-3 — local heuristics on the per-node metadata.
  for (const node of graph.nodesIter()) {
    const fi = fanIn.get(node.id) ?? 0;
    const fo = fanOut.get(node.id) ?? 0;
    const lines = metaNumber(node, 'lineCount', 0);
    const pkgs = metaNumber(node, 'packageCount', 0);

    if (fo >= t.godObjectFanOut && lines >= t.godObjectLineCount && pkgs >= t.godObjectPackageCount) {
      tag(node.id, 'god-object');
    }
    if (fi >= t.entryHubFanIn && fo <= t.entryHubFanOutMax) {
      tag(node.id, 'entry-hub');
    }
    if (fi >= t.utilitySinkFanIn && fo === 0) {
      tag(node.id, 'utility-sink');
    }
  }

  // Tag 4 — Tarjan SCC members with sufficient fan.
  // findCircularDependencies returns each SCC > 1 as a list of ids.
  const sccs = findCircularDependencies(graph);
  for (const scc of sccs) {
    if (scc.length < 2) continue;
    for (const id of scc) {
      const fi = fanIn.get(id) ?? 0;
      const fo = fanOut.get(id) ?? 0;
      if (fi >= t.cyclicClusterMinFan && fo >= t.cyclicClusterMinFan) {
        tag(id, 'cyclic-cluster');
      }
    }
  }

  return { byNodeId, totals: { byTag: totals }, suggestions: SUGGESTIONS };
}
