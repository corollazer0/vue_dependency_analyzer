import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database, { type Database as DatabaseType, type Statement } from 'better-sqlite3';
import type { SqlColumn } from '../parsers/sql/SqlDdlParser.js';

// Phase 13-7 — schema snapshot store.
//
// Co-tenant in `.vda-cache/` with the other sqlite stores (signatures,
// snapshots) but its own file (`schema.sqlite`) so contracts stay
// independent. Per-row = (label, table) — a snapshot is the union of all
// rows under one label.

export interface SchemaSnapshotRow {
  label: string;
  table: string;
  columns: SqlColumn[];
  takenAt: string;
}

export interface SchemaDiff {
  fromLabel: string;
  toLabel: string;
  /** Tables that exist in `to` but not in `from`. */
  addedTables: Array<{ table: string; columns: SqlColumn[] }>;
  /** Tables that disappeared. */
  removedTables: Array<{ table: string; was: SqlColumn[] }>;
  /** Per-table column-level diff for tables present in both. */
  changedTables: Array<{
    table: string;
    addedColumns: SqlColumn[];
    removedColumns: SqlColumn[];
    changedColumns: Array<{ name: string; from: SqlColumn; to: SqlColumn }>;
  }>;
}

export interface SchemaSnapshotStoreOptions {
  filePath?: string;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS schema_tables (
    label        TEXT NOT NULL,
    table_name   TEXT NOT NULL,
    columns_json TEXT NOT NULL,
    taken_at     TEXT NOT NULL,
    PRIMARY KEY (label, table_name)
  );
  CREATE INDEX IF NOT EXISTS idx_schema_label ON schema_tables(label);
`;

export class SchemaSnapshotStore {
  private db: DatabaseType;
  private stmtUpsert!: Statement;
  private stmtDeleteLabel!: Statement;
  private stmtSelectLabel!: Statement;
  private stmtListLabels!: Statement;

  constructor(projectRoot: string, opts: SchemaSnapshotStoreOptions = {}) {
    const cacheDir = join(projectRoot, '.vda-cache');
    mkdirSync(cacheDir, { recursive: true });
    this.db = new Database(opts.filePath ?? join(cacheDir, 'schema.sqlite'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA);
    this.stmtUpsert = this.db.prepare(
      'INSERT INTO schema_tables (label, table_name, columns_json, taken_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(label, table_name) DO UPDATE SET columns_json = excluded.columns_json, taken_at = excluded.taken_at',
    );
    this.stmtDeleteLabel = this.db.prepare('DELETE FROM schema_tables WHERE label = ?');
    this.stmtSelectLabel = this.db.prepare(
      'SELECT label, table_name, columns_json, taken_at FROM schema_tables WHERE label = ?',
    );
    this.stmtListLabels = this.db.prepare(
      'SELECT label, MIN(taken_at) AS taken_at, COUNT(*) AS table_count FROM schema_tables GROUP BY label ORDER BY taken_at',
    );
  }

  /** Persist a snapshot label. Replaces any prior rows under `label`. */
  snapshot(label: string, tables: Map<string, SqlColumn[]>, takenAt = new Date().toISOString()): SchemaSnapshotRow[] {
    const rows: SchemaSnapshotRow[] = [];
    const tx = this.db.transaction(() => {
      this.stmtDeleteLabel.run(label);
      for (const [table, columns] of tables) {
        this.stmtUpsert.run(label, table, JSON.stringify(columns), takenAt);
        rows.push({ label, table, columns: columns.map(c => ({ ...c })), takenAt });
      }
    });
    tx();
    return rows;
  }

  load(label: string): Map<string, SqlColumn[]> {
    const rows = this.stmtSelectLabel.all(label) as Array<{ table_name: string; columns_json: string }>;
    const out = new Map<string, SqlColumn[]>();
    for (const r of rows) out.set(r.table_name, JSON.parse(r.columns_json));
    return out;
  }

  list(): Array<{ label: string; takenAt: string; tableCount: number }> {
    return (this.stmtListLabels.all() as Array<{ label: string; taken_at: string; table_count: number }>).map(r => ({
      label: r.label,
      takenAt: r.taken_at,
      tableCount: r.table_count,
    }));
  }

  diff(fromLabel: string, toLabel: string): SchemaDiff | null {
    const a = this.load(fromLabel);
    const b = this.load(toLabel);
    if (a.size === 0 && b.size === 0) return null;
    return diffSchemas(fromLabel, toLabel, a, b);
  }

  close(): void {
    this.db.close();
  }
}

/** Pure-function diff so callers can compare in-memory tables (used by 13-9). */
export function diffSchemas(
  fromLabel: string,
  toLabel: string,
  from: Map<string, SqlColumn[]>,
  to: Map<string, SqlColumn[]>,
): SchemaDiff {
  const addedTables: SchemaDiff['addedTables'] = [];
  const removedTables: SchemaDiff['removedTables'] = [];
  const changedTables: SchemaDiff['changedTables'] = [];
  const allTables = new Set([...from.keys(), ...to.keys()]);
  for (const table of allTables) {
    const a = from.get(table);
    const b = to.get(table);
    if (!a && b) { addedTables.push({ table, columns: b }); continue; }
    if (a && !b) { removedTables.push({ table, was: a }); continue; }
    if (!a || !b) continue;
    // Both sides present — column-level diff.
    const aByName = new Map(a.map(c => [c.name, c]));
    const bByName = new Map(b.map(c => [c.name, c]));
    const addedColumns: SqlColumn[] = [];
    const removedColumns: SqlColumn[] = [];
    const changedColumns: Array<{ name: string; from: SqlColumn; to: SqlColumn }> = [];
    for (const [name, col] of bByName) if (!aByName.has(name)) addedColumns.push(col);
    for (const [name, col] of aByName) if (!bByName.has(name)) removedColumns.push(col);
    for (const [name, ac] of aByName) {
      const bc = bByName.get(name);
      if (!bc) continue;
      if (ac.type !== bc.type || ac.nullable !== bc.nullable || ac.default !== bc.default) {
        changedColumns.push({ name, from: ac, to: bc });
      }
    }
    if (addedColumns.length || removedColumns.length || changedColumns.length) {
      changedTables.push({ table, addedColumns, removedColumns, changedColumns });
    }
  }
  return { fromLabel, toLabel, addedTables, removedTables, changedTables };
}
