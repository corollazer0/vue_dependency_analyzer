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
  /**
   * Phase 10-4 — when set, this record was renamed FROM `previousId`
   * in the comparison snapshot. Computed by `SignatureStore.diff` from
   * the file-rename heuristic (same simple className, same field name,
   * paired 1:1). Not persisted — only present on records returned by
   * `diff()`. BreakingChangeDetector reads this to suppress spurious
   * B1 (DTO field removed) reports when the field actually moved with
   * its parent class.
   */
  previousId?: string;
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
  /**
   * Phase 10-4 — pairs flagged by the rename heuristic (same simple
   * className, same field name, both lists shrink by exactly one). Each
   * pair STILL appears in `removed[]` and `added[]` so callers that don't
   * understand renames behave as before; the after-record carries
   * `previousId = before.id` so opt-in callers (BreakingChangeDetector)
   * can pair them in O(1).
   */
  renamed: Array<{ before: SignatureRecord; after: SignatureRecord }>;
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

    // Phase 10-4 — rename heuristic. Pairs (removed, added) where the simple
    // className and field name match 1:1 (any other count means we can't
    // disambiguate so we leave them as separate added/removed entries). Only
    // applies to dto-field records — endpoints already pair on stable
    // controllerFqn#method, db-columns on table.column.
    const renamed = pairRenamedDtoFields(removed, added);
    return { beforeLabel, afterLabel, added, removed, modified, renamed };
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Phase 10-4 — pair `(removed, added)` dto-field records that look like a
 * file-rename: same simple className + same field name, exactly one pair on
 * each side. The rule is intentionally strict — overloaded matches (2+
 * candidates) stay split because we can't tell which old field maps to which
 * new one. The resulting pairs mutate the *added* records to carry
 * `previousId = removed.id` so consumers can opt in by reading one field.
 *
 * Pure function (exported for unit tests); does not touch the database.
 */
export function pairRenamedDtoFields(
  removed: SignatureRecord[],
  added: SignatureRecord[],
): Array<{ before: SignatureRecord; after: SignatureRecord }> {
  function simpleKey(r: SignatureRecord): string | null {
    if (r.kind !== 'dto-field') return null;
    // id format: `${fqn}#${fieldName}` where fqn is `pkg.sub.ClassName`.
    const hash = r.id.lastIndexOf('#');
    if (hash === -1) return null;
    const fqn = r.id.slice(0, hash);
    const fieldName = r.id.slice(hash + 1);
    const lastDot = fqn.lastIndexOf('.');
    const simpleClass = lastDot === -1 ? fqn : fqn.slice(lastDot + 1);
    return `${simpleClass}#${fieldName}`;
  }

  const removedByKey = new Map<string, SignatureRecord[]>();
  for (const r of removed) {
    const k = simpleKey(r);
    if (!k) continue;
    const list = removedByKey.get(k) ?? [];
    list.push(r);
    removedByKey.set(k, list);
  }
  const addedByKey = new Map<string, SignatureRecord[]>();
  for (const a of added) {
    const k = simpleKey(a);
    if (!k) continue;
    const list = addedByKey.get(k) ?? [];
    list.push(a);
    addedByKey.set(k, list);
  }

  const pairs: Array<{ before: SignatureRecord; after: SignatureRecord }> = [];
  for (const [k, removedCands] of removedByKey) {
    if (removedCands.length !== 1) continue;
    const addedCands = addedByKey.get(k);
    if (!addedCands || addedCands.length !== 1) continue;
    const before = removedCands[0];
    const after = addedCands[0];
    // Skip when the fqn is the same — that's not a rename, it would have
    // appeared in `modified[]` (or be a noop).
    if (before.id === after.id) continue;
    after.previousId = before.id;
    pairs.push({ before, after });
  }
  return pairs;
}
