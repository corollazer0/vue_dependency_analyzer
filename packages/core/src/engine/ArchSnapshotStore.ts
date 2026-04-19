import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database, { type Database as DatabaseType, type Statement } from 'better-sqlite3';
import { DependencyGraph } from '../graph/DependencyGraph.js';

// Phase 11-6 — F12 architecture snapshot store.
//
// Captures a per-snapshot architectural shape (counts by node/edge kind +
// a sample of hubs) so Phase 11-8 `vda diff` can compare two timepoints
// without re-running parsers. Co-tenant with SignatureStore in
// `.vda-cache/`, but its own sqlite file so the schemas stay independent.
//
// Storage shape (R3 in plan §4 — keep snapshot files small):
//   snapshots(label TEXT PRIMARY KEY, taken_at TEXT, by_kind_json TEXT,
//             summary_json TEXT)
// `by_kind_json` = { nodesByKind: {...}, edgesByKind: {...} }
// `summary_json` = { nodeCount, edgeCount, hubSampleIds }

export interface ArchSnapshotByKind {
  nodesByKind: Record<string, number>;
  edgesByKind: Record<string, number>;
}

export interface ArchSnapshotSummary {
  nodeCount: number;
  edgeCount: number;
  /** Up to N node ids with the highest fan-in, persisted to keep diff
   *  output focused on the architecture's load-bearing pieces. */
  hubSampleIds: string[];
}

export interface ArchSnapshot {
  label: string;
  takenAt: string;
  byKind: ArchSnapshotByKind;
  summary: ArchSnapshotSummary;
}

export interface ArchSnapshotDiff {
  fromLabel: string;
  toLabel: string;
  /** New node kinds that appeared, with their count in toLabel. */
  addedKinds: Array<{ kind: string; count: number }>;
  /** Kinds that disappeared (count went to 0). */
  removedKinds: Array<{ kind: string; was: number }>;
  /** Kinds whose count changed (Δ != 0). */
  changedKinds: Array<{ kind: string; from: number; to: number; delta: number }>;
  /** Edge-kind diffs in the same shape. */
  addedEdgeKinds: Array<{ kind: string; count: number }>;
  removedEdgeKinds: Array<{ kind: string; was: number }>;
  changedEdgeKinds: Array<{ kind: string; from: number; to: number; delta: number }>;
  /** Node ids that newly appeared in the to-snapshot's hub sample. */
  newHubs: string[];
  /** Node ids that fell out of the hub sample. */
  goneHubs: string[];
  totalsDelta: { nodes: number; edges: number };
}

export interface ArchSnapshotStoreOptions {
  /** Override file path; default `<projectRoot>/.vda-cache/snapshots.sqlite`. */
  filePath?: string;
  /** How many top-fan-in node ids to persist per snapshot. Default 50. */
  hubSampleSize?: number;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS snapshots (
    label         TEXT PRIMARY KEY,
    taken_at      TEXT NOT NULL,
    by_kind_json  TEXT NOT NULL,
    summary_json  TEXT NOT NULL
  );
`;

export class ArchSnapshotStore {
  private db: DatabaseType;
  private opts: Required<Pick<ArchSnapshotStoreOptions, 'hubSampleSize'>>;
  private stmtUpsert!: Statement;
  private stmtSelect!: Statement;
  private stmtDelete!: Statement;
  private stmtList!: Statement;

  constructor(projectRoot: string, opts: ArchSnapshotStoreOptions = {}) {
    this.opts = { hubSampleSize: opts.hubSampleSize ?? 50 };
    const cacheDir = join(projectRoot, '.vda-cache');
    mkdirSync(cacheDir, { recursive: true });
    this.db = new Database(opts.filePath ?? join(cacheDir, 'snapshots.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA);
    this.stmtUpsert = this.db.prepare(
      'INSERT INTO snapshots (label, taken_at, by_kind_json, summary_json) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(label) DO UPDATE SET taken_at = excluded.taken_at, by_kind_json = excluded.by_kind_json, summary_json = excluded.summary_json',
    );
    this.stmtSelect = this.db.prepare(
      'SELECT label, taken_at, by_kind_json, summary_json FROM snapshots WHERE label = ?',
    );
    this.stmtDelete = this.db.prepare('DELETE FROM snapshots WHERE label = ?');
    this.stmtList = this.db.prepare(
      'SELECT label, taken_at FROM snapshots ORDER BY taken_at',
    );
  }

  /** Snapshot the current graph under `label`. Replaces any prior row. */
  snapshot(label: string, graph: DependencyGraph, takenAt = new Date().toISOString()): ArchSnapshot {
    const stats = graph.getStats();
    const hubScored: Array<{ id: string; fanIn: number }> = [];
    for (const node of graph.getAllNodes()) {
      const fanIn = graph.getInEdges(node.id).length;
      if (fanIn > 0) hubScored.push({ id: node.id, fanIn });
    }
    hubScored.sort((a, b) => b.fanIn - a.fanIn);
    const hubSampleIds = hubScored.slice(0, this.opts.hubSampleSize).map(h => h.id);

    const byKind: ArchSnapshotByKind = {
      nodesByKind: stats.nodesByKind,
      edgesByKind: stats.edgesByKind,
    };
    const summary: ArchSnapshotSummary = {
      nodeCount: stats.totalNodes,
      edgeCount: stats.totalEdges,
      hubSampleIds,
    };
    this.stmtUpsert.run(label, takenAt, JSON.stringify(byKind), JSON.stringify(summary));
    return { label, takenAt, byKind, summary };
  }

  load(label: string): ArchSnapshot | null {
    const row = this.stmtSelect.get(label) as
      | { label: string; taken_at: string; by_kind_json: string; summary_json: string }
      | undefined;
    if (!row) return null;
    return {
      label: row.label,
      takenAt: row.taken_at,
      byKind: JSON.parse(row.by_kind_json),
      summary: JSON.parse(row.summary_json),
    };
  }

  list(): Array<{ label: string; takenAt: string }> {
    return (this.stmtList.all() as Array<{ label: string; taken_at: string }>).map(r => ({
      label: r.label,
      takenAt: r.taken_at,
    }));
  }

  remove(label: string): void {
    this.stmtDelete.run(label);
  }

  /**
   * Diff two snapshots. Pure function over loaded snapshots — no graph
   * needed. Returns added / removed / changed kind buckets plus the hub
   * sample delta.
   */
  diff(fromLabel: string, toLabel: string): ArchSnapshotDiff | null {
    const from = this.load(fromLabel);
    const to = this.load(toLabel);
    if (!from || !to) return null;
    return diffSnapshots(from, to);
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Pure-function diff between two snapshots — exposed so consumers can
 * diff in-memory snapshots without a database round-trip (used by the
 * server route in 11-9).
 */
export function diffSnapshots(from: ArchSnapshot, to: ArchSnapshot): ArchSnapshotDiff {
  function bucketDiff(
    fromMap: Record<string, number>,
    toMap: Record<string, number>,
  ): {
    added: Array<{ kind: string; count: number }>;
    removed: Array<{ kind: string; was: number }>;
    changed: Array<{ kind: string; from: number; to: number; delta: number }>;
  } {
    const added: Array<{ kind: string; count: number }> = [];
    const removed: Array<{ kind: string; was: number }> = [];
    const changed: Array<{ kind: string; from: number; to: number; delta: number }> = [];
    const allKinds = new Set([...Object.keys(fromMap), ...Object.keys(toMap)]);
    for (const k of allKinds) {
      const a = fromMap[k] ?? 0;
      const b = toMap[k] ?? 0;
      if (a === 0 && b > 0) added.push({ kind: k, count: b });
      else if (a > 0 && b === 0) removed.push({ kind: k, was: a });
      else if (a !== b) changed.push({ kind: k, from: a, to: b, delta: b - a });
    }
    return { added, removed, changed };
  }

  const nodeDiff = bucketDiff(from.byKind.nodesByKind, to.byKind.nodesByKind);
  const edgeDiff = bucketDiff(from.byKind.edgesByKind, to.byKind.edgesByKind);

  const fromHubs = new Set(from.summary.hubSampleIds);
  const toHubs = new Set(to.summary.hubSampleIds);
  const newHubs: string[] = [];
  const goneHubs: string[] = [];
  for (const id of toHubs) if (!fromHubs.has(id)) newHubs.push(id);
  for (const id of fromHubs) if (!toHubs.has(id)) goneHubs.push(id);

  return {
    fromLabel: from.label,
    toLabel: to.label,
    addedKinds: nodeDiff.added,
    removedKinds: nodeDiff.removed,
    changedKinds: nodeDiff.changed,
    addedEdgeKinds: edgeDiff.added,
    removedEdgeKinds: edgeDiff.removed,
    changedEdgeKinds: edgeDiff.changed,
    newHubs,
    goneHubs,
    totalsDelta: {
      nodes: to.summary.nodeCount - from.summary.nodeCount,
      edges: to.summary.edgeCount - from.summary.edgeCount,
    },
  };
}
