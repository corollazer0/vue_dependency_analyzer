import { describe, it, expect } from 'vitest';
import { generateSyntheticGraph } from '../syntheticFixture.js';
import type { NodeKind } from '@vda/core';

describe('generateSyntheticGraph', () => {
  it('hits target node count and returns non-empty edges', () => {
    const g = generateSyntheticGraph({ nodeCount: 500, seed: 1 });
    expect(g.nodes.length).toBe(500);
    expect(g.edges.length).toBeGreaterThan(100);
    for (const n of g.nodes) {
      expect(n.id).toBeDefined();
      expect(n.kind).toBeDefined();
      expect(n.filePath).toBeDefined();
    }
    for (const e of g.edges) {
      expect(e.source).toBeDefined();
      expect(e.target).toBeDefined();
      expect(e.kind).toBeDefined();
    }
  });

  it('produces byte-deterministic output for same seed', () => {
    const a = generateSyntheticGraph({ nodeCount: 400, seed: 42 });
    const b = generateSyntheticGraph({ nodeCount: 400, seed: 42 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces different graphs for different seeds', () => {
    const a = generateSyntheticGraph({ nodeCount: 400, seed: 1 });
    const b = generateSyntheticGraph({ nodeCount: 400, seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    // Node count must stay stable regardless of seed
    expect(a.nodes.length).toBe(b.nodes.length);
  });

  it('covers every configured node kind at the 5K target', () => {
    const g = generateSyntheticGraph({ nodeCount: 5000, seed: 0x5EED });
    const kindCounts = new Map<NodeKind, number>();
    for (const n of g.nodes) kindCounts.set(n.kind, (kindCounts.get(n.kind) ?? 0) + 1);
    // Required kinds (ratio > 0 in defaults)
    const required: NodeKind[] = [
      'vue-component', 'ts-module', 'vue-composable', 'pinia-store',
      'api-call-site', 'spring-controller', 'spring-endpoint',
      'spring-service', 'mybatis-mapper', 'mybatis-statement', 'db-table',
    ];
    for (const k of required) expect(kindCounts.get(k) ?? 0).toBeGreaterThan(0);
    expect(g.nodes.length).toBe(5000);
  });

  it('every edge references valid node ids', () => {
    const g = generateSyntheticGraph({ nodeCount: 800, seed: 7 });
    const nodeIds = new Set(g.nodes.map(n => n.id));
    for (const e of g.edges) {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
      expect(e.source).not.toBe(e.target);
    }
  });

  it('power-law degree creates hub nodes', () => {
    const g = generateSyntheticGraph({ nodeCount: 2000, seed: 9, avgOutDegree: 4 });
    const inDeg = new Map<string, number>();
    for (const e of g.edges) inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    const degrees = [...inDeg.values()].sort((a, b) => b - a);
    // Top 1% should be at least 3× the median — a weak but real long-tail check.
    const topP1 = degrees[Math.floor(degrees.length * 0.01)];
    const median = degrees[Math.floor(degrees.length * 0.5)];
    expect(topP1).toBeGreaterThanOrEqual(median * 3);
  });

  it('uniform (powerLaw=false) flattens the degree distribution', () => {
    const g = generateSyntheticGraph({ nodeCount: 2000, seed: 9, avgOutDegree: 4, powerLaw: false });
    const inDeg = new Map<string, number>();
    for (const e of g.edges) inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    const degrees = [...inDeg.values()].sort((a, b) => b - a);
    const topP1 = degrees[Math.floor(degrees.length * 0.01)];
    const median = degrees[Math.floor(degrees.length * 0.5)];
    // Uniform distribution keeps top/median ratio small. Loose bound on purpose
    // because the edge-rule weights also skew kinds.
    expect(topP1).toBeLessThan(median * 6);
  });
});
