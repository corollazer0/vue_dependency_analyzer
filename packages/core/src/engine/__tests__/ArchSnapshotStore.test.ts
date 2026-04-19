// Phase 11-6 — F12 architecture snapshot store.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { ArchSnapshotStore, diffSnapshots } from '../ArchSnapshotStore.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

function node(id: string, kind: GraphNode['kind'] = 'ts-module'): GraphNode {
  return { id, kind, label: id, filePath: `/${id}.ts`, metadata: {} };
}
function edge(id: string, source: string, target: string, kind: GraphEdge['kind'] = 'imports'): GraphEdge {
  return { id, source, target, kind, metadata: {} };
}

describe('ArchSnapshotStore (Phase 11-6)', () => {
  let projectRoot: string;
  let store: ArchSnapshotStore;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'vda-arch-'));
    store = new ArchSnapshotStore(projectRoot);
  });
  afterEach(() => {
    store.close();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('snapshot persists by-kind counts and a hub sample', () => {
    const g = new DependencyGraph();
    g.addNode(node('A', 'spring-controller'));
    g.addNode(node('B', 'spring-service'));
    g.addNode(node('C', 'spring-service'));
    g.addEdge(edge('e1', 'A', 'B', 'spring-injects'));
    g.addEdge(edge('e2', 'A', 'C', 'spring-injects'));
    g.addEdge(edge('e3', 'C', 'B', 'spring-injects'));

    const snap = store.snapshot('v1', g, '2026-04-19T00:00:00Z');
    expect(snap.summary.nodeCount).toBe(3);
    expect(snap.summary.edgeCount).toBe(3);
    expect(snap.byKind.nodesByKind['spring-controller']).toBe(1);
    expect(snap.byKind.nodesByKind['spring-service']).toBe(2);
    expect(snap.byKind.edgesByKind['spring-injects']).toBe(3);
    // B has fan-in 2 (highest), C has 1, A has 0 → A excluded (fanIn 0)
    expect(snap.summary.hubSampleIds[0]).toBe('B');
  });

  it('list returns snapshots ordered by takenAt', () => {
    const g = new DependencyGraph();
    g.addNode(node('A'));
    store.snapshot('v1', g, '2026-04-01T00:00:00Z');
    store.snapshot('v3', g, '2026-04-03T00:00:00Z');
    store.snapshot('v2', g, '2026-04-02T00:00:00Z');
    const labels = store.list().map(s => s.label);
    expect(labels).toEqual(['v1', 'v2', 'v3']);
  });

  it('diff identifies added / removed / changed kinds and totals delta', () => {
    const g1 = new DependencyGraph();
    g1.addNode(node('A', 'spring-controller'));
    g1.addNode(node('B', 'spring-service'));
    g1.addEdge(edge('e1', 'A', 'B', 'spring-injects'));
    store.snapshot('before', g1);

    const g2 = new DependencyGraph();
    g2.addNode(node('A', 'spring-controller'));
    g2.addNode(node('B', 'spring-service'));
    g2.addNode(node('C', 'spring-service'));
    g2.addNode(node('D', 'mybatis-mapper'));
    g2.addEdge(edge('e1', 'A', 'B', 'spring-injects'));
    g2.addEdge(edge('e2', 'A', 'C', 'spring-injects'));
    store.snapshot('after', g2);

    const diff = store.diff('before', 'after');
    expect(diff).toBeDefined();
    expect(diff!.totalsDelta).toEqual({ nodes: 2, edges: 1 });
    // mybatis-mapper went 0 → 1 (added kind)
    expect(diff!.addedKinds.find(a => a.kind === 'mybatis-mapper')!.count).toBe(1);
    // spring-service went 1 → 2 (changed)
    const ssChange = diff!.changedKinds.find(c => c.kind === 'spring-service')!;
    expect(ssChange.from).toBe(1);
    expect(ssChange.to).toBe(2);
    expect(ssChange.delta).toBe(1);
  });

  it('returns null when either snapshot label is missing', () => {
    expect(store.diff('missing-1', 'missing-2')).toBeNull();
  });

  it('diffSnapshots is exported as a pure helper for in-memory diffs', () => {
    const ts = '2026-04-19T00:00:00Z';
    const a = {
      label: 'a', takenAt: ts,
      byKind: { nodesByKind: { 'ts-module': 5 }, edgesByKind: {} },
      summary: { nodeCount: 5, edgeCount: 0, hubSampleIds: ['x'] },
    };
    const b = {
      label: 'b', takenAt: ts,
      byKind: { nodesByKind: { 'ts-module': 3, 'vue-component': 2 }, edgesByKind: {} },
      summary: { nodeCount: 5, edgeCount: 0, hubSampleIds: ['x', 'y'] },
    };
    const d = diffSnapshots(a, b);
    expect(d.changedKinds.find(c => c.kind === 'ts-module')!.delta).toBe(-2);
    expect(d.addedKinds.find(c => c.kind === 'vue-component')!.count).toBe(2);
    expect(d.newHubs).toEqual(['y']);
    expect(d.goneHubs).toEqual([]);
  });
});
