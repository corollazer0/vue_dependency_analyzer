import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseSqlDdl, type SqlColumn, type SqlDdlOp } from './SqlDdlParser.js';

// Phase 13-4 — Flyway migration sequence parser.
//
// Flyway naming convention: `V<version>__<description>.sql` where version
// is a dotted number (e.g. `V1__init.sql`, `V2.1__add_email.sql`,
// `V10__rename_user_id.sql`). We sort files by parsed version + name and
// apply each in order to derive the *cumulative* table shape.
//
// Strict version sorting is essential because Flyway's own contract is
// "apply in order"; lexical sort of `V10` vs `V2` would be wrong.

export interface FlywayMigrationFile {
  filePath: string;
  version: string;        // dotted, as parsed from the filename
  description: string;
  ops: SqlDdlOp[];
}

export interface FlywaySnapshot {
  /** Migrations in apply order. */
  migrations: FlywayMigrationFile[];
  /** Cumulative table shape after applying every migration. */
  tables: Map<string, SqlColumn[]>;
}

/**
 * Discover and apply every `V<version>__<desc>.sql` under `dir`.
 * Returns the cumulative tables map. Subdirectories are scanned
 * recursively so projects can group migrations under domain folders.
 */
export function readFlywayMigrations(dir: string): FlywaySnapshot {
  const root = resolve(dir);
  const files: FlywayMigrationFile[] = [];

  function walk(d: string): void {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      const abs = join(d, name);
      let st;
      try { st = statSync(abs); } catch { continue; }
      if (st.isDirectory()) { walk(abs); continue; }
      if (!st.isFile()) continue;
      const m = name.match(/^V([\d.]+)__([\w-]+)\.sql$/i);
      if (!m) continue;
      const sql = readFileSync(abs, 'utf-8');
      files.push({
        filePath: abs,
        version: m[1],
        description: m[2],
        ops: parseSqlDdl(sql),
      });
    }
  }
  walk(root);

  files.sort((a, b) => compareVersion(a.version, b.version) || a.filePath.localeCompare(b.filePath));
  return { migrations: files, tables: applyMigrations(files) };
}

/** Apply an ordered migration list and return the cumulative table shape. */
export function applyMigrations(files: FlywayMigrationFile[]): Map<string, SqlColumn[]> {
  const tables = new Map<string, SqlColumn[]>();
  for (const f of files) {
    for (const op of f.ops) {
      switch (op.kind) {
        case 'create-table':
          tables.set(op.table, op.columns.map(c => ({ ...c })));
          break;
        case 'add-column': {
          const cols = tables.get(op.table) ?? [];
          if (!cols.some(c => c.name === op.column.name)) cols.push({ ...op.column });
          tables.set(op.table, cols);
          break;
        }
        case 'drop-column': {
          const cols = tables.get(op.table);
          if (cols) tables.set(op.table, cols.filter(c => c.name !== op.column));
          break;
        }
        case 'modify-column': {
          const cols = tables.get(op.table);
          if (cols) {
            const i = cols.findIndex(c => c.name === op.column.name);
            if (i >= 0) cols[i] = { ...cols[i], ...op.column };
          }
          break;
        }
        case 'rename-column': {
          const cols = tables.get(op.table);
          if (cols) {
            const i = cols.findIndex(c => c.name === op.from);
            if (i >= 0) cols[i] = { ...cols[i], name: op.to };
          }
          break;
        }
        case 'drop-table':
          tables.delete(op.table);
          break;
      }
    }
  }
  return tables;
}

function compareVersion(a: string, b: string): number {
  const ap = a.split('.').map(s => parseInt(s, 10));
  const bp = b.split('.').map(s => parseInt(s, 10));
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i++) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
