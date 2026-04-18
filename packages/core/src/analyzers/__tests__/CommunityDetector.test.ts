import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { detectCommunities, groupNodesByCommunity } from '../CommunityDetector.js';
import type { GraphNode, GraphEdge, NodeKind, EdgeKind } from '../../graph/types.js';

function n(id: string, kind: NodeKind = 'vue-component'): GraphNode {
  return { id, kind, label: id, filePath: `/${id}`, metadata: {} };
}
function e(s: string, t: string, kind: EdgeKind = 'imports'): GraphEdge {
  return { id: `${s}:${kind}:${t}`, source: s, target: t, kind, metadata: {} };
}

// Deterministic LCG so tests are reproducible across machines/runs.
function lcg(seed = 1): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

describe('CommunityDetector', () => {
  it('returns empty result for an empty graph', () => {
    const r = detectCommunities(new DependencyGraph());
    expect(r.communities.size).toBe(0);
    expect(r.count).toBe(0);
    expect(r.modularity).toBe(0);
  });

  it('assigns one community per node when there are no edges', () => {
    const g = new DependencyGraph();
    g.addNode(n('A'));
    g.addNode(n('B'));
    g.addNode(n('C'));
    const r = detectCommunities(g);
    expect(r.count).toBe(3);
    // Modularity is undefined on edge-less graphs — we surface 0 as the well-defined floor.
    expect(r.modularity).toBe(0);
    expect(new Set(r.communities.values()).size).toBe(3);
  });

  it('separates two disconnected cliques into two communities', () => {
    const g = new DependencyGraph();
    // Clique 1: A-B-C
    for (const id of ['A', 'B', 'C']) g.addNode(n(id));
    g.addEdge(e('A', 'B'));
    g.addEdge(e('B', 'C'));
    g.addEdge(e('C', 'A'));
    // Clique 2: X-Y-Z
    for (const id of ['X', 'Y', 'Z']) g.addNode(n(id));
    g.addEdge(e('X', 'Y'));
    g.addEdge(e('Y', 'Z'));
    g.addEdge(e('Z', 'X'));

    const r = detectCommunities(g, { rng: lcg(42) });
    expect(r.count).toBe(2);
    expect(r.communities.get('A')).toBe(r.communities.get('B'));
    expect(r.communities.get('A')).toBe(r.communities.get('C'));
    expect(r.communities.get('X')).toBe(r.communities.get('Y'));
    expect(r.communities.get('X')).toBe(r.communities.get('Z'));
    expect(r.communities.get('A')).not.toBe(r.communities.get('X'));
  });

  it('coalesces parallel directed edges into a single weighted undirected edge', () => {
    // Two strongly connected pairs A-B and C-D with multiple parallel edges
    // each, plus a single bridge B-C. Louvain should still split into two
    // communities because the intra-pair weight (3) dominates the bridge (1).
    const g = new DependencyGraph();
    for (const id of ['A', 'B', 'C', 'D']) g.addNode(n(id));
    g.addEdge(e('A', 'B', 'imports'));
    g.addEdge(e('A', 'B', 'uses-component'));
    g.addEdge(e('B', 'A', 'emits-event'));
    g.addEdge(e('C', 'D', 'imports'));
    g.addEdge(e('C', 'D', 'uses-component'));
    g.addEdge(e('D', 'C', 'emits-event'));
    g.addEdge(e('B', 'C', 'imports')); // bridge

    const r = detectCommunities(g, { rng: lcg(7), resolution: 1.0 });
    expect(r.count).toBeGreaterThanOrEqual(2);
    expect(r.communities.get('A')).toBe(r.communities.get('B'));
    expect(r.communities.get('C')).toBe(r.communities.get('D'));
    expect(r.communities.get('A')).not.toBe(r.communities.get('C'));
    expect(r.modularity).toBeGreaterThan(0);
  });

  it('ignores self-loops without throwing', () => {
    const g = new DependencyGraph();
    g.addNode(n('A'));
    g.addNode(n('B'));
    g.addEdge(e('A', 'A'));
    g.addEdge(e('A', 'B'));
    const r = detectCommunities(g);
    expect(r.communities.size).toBe(2);
  });

  it('groupNodesByCommunity inverts the mapping', () => {
    const g = new DependencyGraph();
    for (const id of ['A', 'B', 'C']) g.addNode(n(id));
    g.addEdge(e('A', 'B'));
    g.addEdge(e('B', 'C'));
    g.addEdge(e('C', 'A'));
    const r = detectCommunities(g, { rng: lcg(1) });
    const grouped = groupNodesByCommunity(r);
    let total = 0;
    for (const ids of grouped.values()) total += ids.length;
    expect(total).toBe(3);
  });
});
