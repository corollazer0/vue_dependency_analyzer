import { mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import Database, { type Database as DatabaseType, type Statement } from 'better-sqlite3';
import { DependencyGraph } from '../graph/DependencyGraph.js';

// Phase 8-1 — Signature snapshot store.
//
// Captures a per-snapshot view of the graph's stable surface (DTOs,
// endpoints, db-table columns) so Phase 8-2 / 8-3 / 8-4 can detect
// breaking changes by diffing two snapshots.
//
// Stable IDs (per plan §2 row 8-1, R1):
//   * DTO field   = `${fqn}#${fieldName}`
//   * endpoint    = `${controllerFqn}#${methodName}` (path is *not* in the
//                   id — path renames are themselves a tracked change)
//   * db column   = `${tableName}.${columnName}`  (schema prefix is
//                   normalised away via `dbDefaultSchema` if set)
//
// Hash input isolation policy (per plan §2 row 8-1):
//   The signature hash is computed *only* from the node's own metadata
//   fields — never from neighbour edges or in/out degree. This keeps
//   the Phase 0 "<5% edge drift" gate from leaking false positives:
//   adding an unrelated edge to the graph must not flip a DTO field's
//   signature.

export type SignatureKind = 'dto-field' | 'endpoint' | 'db-column';

export interface SignatureRecord {
  /** Stable id per kind (see header). */
  id: string;
  kind: SignatureKind;
  /** SHA-256 of the canonical metadata payload. */
  hash: string;
  /** Pre-hash payload — kept so diff() can show *what* changed. */
  metadata: Record<string, unknown>;
  sourceFile?: string;
}

export interface SignatureSet {
  label: string;
  records: Map<string, SignatureRecord>;
}

export interface SignatureDiff {
  beforeLabel: string;
  afterLabel: string;
  added: SignatureRecord[];
  removed: SignatureRecord[];
  modified: { before: SignatureRecord; after: SignatureRecord }[];
}

export interface SignatureStoreOptions {
  /** Optional schema prefix to strip from db column ids. */
  dbDefaultSchema?: string;
  /** Override file path; default `<projectRoot>/.vda-cache/signatures.sqlite`. */
  filePath?: string;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS signatures (
    snapshot_label TEXT NOT NULL,
    id             TEXT NOT NULL,
    kind           TEXT NOT NULL,
    hash           TEXT NOT NULL,
    metadata_json  TEXT NOT NULL,
    source_file    TEXT,
    PRIMARY KEY (snapshot_label, id)
  );
  CREATE INDEX IF NOT EXISTS idx_signatures_label ON signatures(snapshot_label);
`;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function normaliseSchema(name: string, defaultSchema: string | undefined): string {
  if (!defaultSchema) return name;
  const prefix = defaultSchema.endsWith('.') ? defaultSchema : `${defaultSchema}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export class SignatureStore {
  private db: DatabaseType;
  private opts: SignatureStoreOptions;

  private stmtUpsert!: Statement;
  private stmtDelete!: Statement;
  private stmtSelectAll!: Statement;
  private stmtCount!: Statement;

  constructor(projectRoot: string, opts: SignatureStoreOptions = {}) {
    this.opts = opts;
    const cacheDir = join(projectRoot, '.vda-cache');
    mkdirSync(cacheDir, { recursive: true });
    this.db = new Database(opts.filePath ?? join(cacheDir, 'signatures.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA);
    this.stmtUpsert = this.db.prepare(
      'INSERT INTO signatures (snapshot_label, id, kind, hash, metadata_json, source_file) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(snapshot_label, id) DO UPDATE SET hash = excluded.hash, metadata_json = excluded.metadata_json, source_file = excluded.source_file',
    );
    this.stmtDelete = this.db.prepare('DELETE FROM signatures WHERE snapshot_label = ?');
    this.stmtSelectAll = this.db.prepare(
      'SELECT id, kind, hash, metadata_json, source_file FROM signatures WHERE snapshot_label = ?',
    );
    this.stmtCount = this.db.prepare(
      'SELECT COUNT(*) AS n FROM signatures WHERE snapshot_label = ?',
    );
  }

  /** Walk the graph and emit one row per surface element. */
  collect(graph: DependencyGraph): SignatureRecord[] {
    const records: SignatureRecord[] = [];
    for (const node of graph.nodesIter()) {
      switch (node.kind) {
        case 'spring-dto': {
          const fqn = (node.metadata.fqn as string | undefined) ?? node.label;
          const fields = (node.metadata.fields as Array<Record<string, unknown>> | undefined) ?? [];
          for (const f of fields) {
            const name = f.name as string | undefined;
            if (!name) continue;
            const meta = {
              typeRef: f.typeRef ?? f.type ?? null,
              nullable: f.nullable ?? null,
              jsonName: f.jsonName ?? null,
            };
            records.push({
              id: `${fqn}#${name}`,
              kind: 'dto-field',
              hash: sha256(canonicalJson(meta)),
              metadata: meta,
              sourceFile: node.filePath || undefined,
            });
          }
          break;
        }
        case 'spring-endpoint': {
          const md = node.metadata as Record<string, unknown>;
          const fqnFromController = (md.controllerFqn as string | undefined) ?? '';
          const handlerMethod = (md.handlerMethod as string | undefined) ?? '';
          // Fallback id — Java parser doesn't always thread the
          // controller's FQN through; use the controller node's
          // filePath component when handler is known.
          const id = fqnFromController && handlerMethod
            ? `${fqnFromController}#${handlerMethod}`
            : `endpoint:${md.httpMethod}:${md.path}`;
          const meta = {
            httpMethod: md.httpMethod ?? null,
            path: md.path ?? null,
            returnType: md.returnType ?? null,
            paramTypes: md.paramTypes ?? null,
          };
          records.push({
            id,
            kind: 'endpoint',
            hash: sha256(canonicalJson(meta)),
            metadata: meta,
            sourceFile: node.filePath || undefined,
          });
          break;
        }
        case 'db-table': {
          const md = node.metadata as Record<string, unknown>;
          const tableName = (md.tableName as string | undefined) ?? node.label;
          const columns = (md.columns as Array<Record<string, unknown>> | undefined) ?? [];
          if (columns.length === 0) {
            // No column metadata yet — emit one record per table so
            // table-removal still surfaces in B4.
            const id = normaliseSchema(tableName, this.opts.dbDefaultSchema);
            records.push({
              id,
              kind: 'db-column',
              hash: sha256(canonicalJson({ table: id })),
              metadata: { table: id, columns: [] },
              sourceFile: node.filePath || undefined,
            });
            break;
          }
          for (const c of columns) {
            const name = c.name as string | undefined;
            if (!name) continue;
            const tableId = normaliseSchema(tableName, this.opts.dbDefaultSchema);
            const meta = { type: c.type ?? null, jdbcType: c.jdbcType ?? null };
            records.push({
              id: `${tableId}.${name}`,
              kind: 'db-column',
              hash: sha256(canonicalJson(meta)),
              metadata: meta,
              sourceFile: node.filePath || undefined,
            });
          }
          break;
        }
      }
    }
    return records;
  }

  /** Persist a snapshot under `label` (overwrites any previous rows). */
  snapshot(label: string, graph: DependencyGraph): SignatureRecord[] {
    const records = this.collect(graph);
    const tx = this.db.transaction((rows: SignatureRecord[]) => {
      this.stmtDelete.run(label);
      for (const r of rows) {
        this.stmtUpsert.run(
          label,
          r.id,
          r.kind,
          r.hash,
          canonicalJson(r.metadata),
          r.sourceFile ?? null,
        );
      }
    });
    tx(records);
    return records;
  }

  load(label: string): SignatureSet {
    const records = new Map<string, SignatureRecord>();
    for (const row of this.stmtSelectAll.all(label) as Array<{
      id: string;
      kind: SignatureKind;
      hash: string;
      metadata_json: string;
      source_file: string | null;
    }>) {
      records.set(row.id, {
        id: row.id,
        kind: row.kind,
        hash: row.hash,
        metadata: JSON.parse(row.metadata_json),
        sourceFile: row.source_file ?? undefined,
      });
    }
    return { label, records };
  }

  count(label: string): number {
    return ((this.stmtCount.get(label) as { n: number }) ?? { n: 0 }).n;
  }

  diff(beforeLabel: string, afterLabel: string): SignatureDiff {
    const before = this.load(beforeLabel).records;
    const after = this.load(afterLabel).records;
    const added: SignatureRecord[] = [];
    const removed: SignatureRecord[] = [];
    const modified: SignatureDiff['modified'] = [];
    for (const [id, b] of before) {
      const a = after.get(id);
      if (!a) removed.push(b);
      else if (a.hash !== b.hash) modified.push({ before: b, after: a });
    }
    for (const [id, a] of after) {
      if (!before.has(id)) added.push(a);
    }
    return { beforeLabel, afterLabel, added, removed, modified };
  }

  close(): void {
    this.db.close();
  }
}
