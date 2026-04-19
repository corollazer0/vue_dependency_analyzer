import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { classifyAntiPatterns } from '../AntiPatternClassifier.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

// Phase 9-7 TDD per briefing §3.
//
// Each test wires the minimum graph shape that the corresponding tag's
// rule fires on, then asserts the tag is attached. Thresholds match
// the plan §1-2 defaults; per-test overrides exercise 9-8.

function node(id: string, kind: GraphNode['kind'], label = id, metadata: Record<string, unknown> = {}): GraphNode {
  return { id, kind, label, filePath: `/${id}.ts`, metadata };
}

function edge(id: string, source: string, target: string, kind: GraphEdge['kind'] = 'imports'): GraphEdge {
  return { id, source, target, kind, metadata: {} };
}

function buildHub(targetId: string, fanIn: number, fanOut: number, fileLines = 50, packages = 1): DependencyGraph {
  const g = new DependencyGraph();
  g.addNode(node(targetId, 'ts-module', targetId, { lineCount: fileLines, packageCount: packages }));
  for (let i = 0; i < fanIn; i++) {
    const sid = `src-${i}`;
    g.addNode(node(sid, 'ts-module'));
    g.addEdge(edge(`in-${i}`, sid, targetId));
  }
  for (let i = 0; i < fanOut; i++) {
    const tid = `tgt-${i}`;
    g.addNode(node(tid, 'ts-module'));
    g.addEdge(edge(`out-${i}`, targetId, tid));
  }
  return g;
}

describe('AntiPatternClassifier (Phase 9-7)', () => {
  it('flags `god-object` when fan-out ≥ 10 AND lineCount ≥ 400 AND packageCount ≥ 3', () => {
    const g = buildHub('god', /*in*/3, /*out*/12, /*lines*/450, /*packages*/4);
    const result = classifyAntiPatterns(g);
    const tags = result.byNodeId.get('god') ?? [];
    expect(tags).toContain('god-object');
  });

  it('does NOT flag god-object when lineCount is under threshold', () => {
    const g = buildHub('not-god', 3, 12, /*lines*/200, 4);
    const result = classifyAntiPatterns(g);
    const tags = result.byNodeId.get('not-god') ?? [];
    expect(tags).not.toContain('god-object');
  });

  it('flags `entry-hub` when fan-in ≥ 10 AND fan-out ≤ 2', () => {
    const g = buildHub('hub', 12, 1);
    const result = classifyAntiPatterns(g);
    expect(result.byNodeId.get('hub') ?? []).toContain('entry-hub');
  });

  it('flags `utility-sink` when fan-in ≥ 8 AND fan-out = 0', () => {
    const g = buildHub('util', 8, 0);
    const result = classifyAntiPatterns(g);
    expect(result.byNodeId.get('util') ?? []).toContain('utility-sink');
  });

  it('flags `cyclic-cluster` for SCC members with fan-in/out ≥ 3', () => {
    const g = new DependencyGraph();
    // Three-node SCC where each node has fanIn ≥ 3 and fanOut ≥ 3
    // (cross-connect with extras to satisfy the threshold).
    for (const id of ['a', 'b', 'c']) g.addNode(node(id, 'ts-module'));
    g.addEdge(edge('a-b', 'a', 'b'));
    g.addEdge(edge('b-c', 'b', 'c'));
    g.addEdge(edge('c-a', 'c', 'a'));
    // Pad fanIn / fanOut to 3 each.
    for (const id of ['a', 'b', 'c']) {
      for (let i = 0; i < 2; i++) {
        const ex = `${id}-extra-${i}`;
        g.addNode(node(ex, 'ts-module'));
        g.addEdge(edge(`${id}-in-${i}`, ex, id));
        g.addEdge(edge(`${id}-out-${i}`, id, ex));
      }
    }
    const result = classifyAntiPatterns(g);
    expect(result.byNodeId.get('a') ?? []).toContain('cyclic-cluster');
    expect(result.byNodeId.get('b') ?? []).toContain('cyclic-cluster');
    expect(result.byNodeId.get('c') ?? []).toContain('cyclic-cluster');
  });

  it('honors per-tag thresholds from `complexityThresholds` override (Phase 9-8)', () => {
    const g = buildHub('hub2', 6, 1);
    // Default entry-hub threshold = 10 → not flagged.
    expect(classifyAntiPatterns(g).byNodeId.get('hub2') ?? []).not.toContain('entry-hub');
    // Override the threshold to 5 → flagged.
    const lowered = classifyAntiPatterns(g, {
      thresholds: { entryHubFanIn: 5 },
    });
    expect(lowered.byNodeId.get('hub2') ?? []).toContain('entry-hub');
  });

  it('totals.byTag aggregates correctly (suggested-action included)', () => {
    const g = buildHub('hub', 12, 1);
    const result = classifyAntiPatterns(g);
    expect(result.totals.byTag['entry-hub']).toBeGreaterThanOrEqual(1);
    const action = result.byNodeId.get('hub')!;
    expect(action.length).toBeGreaterThan(0);
    expect(result.suggestions['entry-hub']).toMatch(/intentional facade|leave as-is|leave it alone/i);
  });
});
