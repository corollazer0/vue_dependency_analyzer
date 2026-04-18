import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import Database, { type Database as DatabaseType, type Statement } from 'better-sqlite3';
import type { GraphNode, GraphEdge, ParseError, ParseResult } from '../graph/types.js';

interface CacheRow {
  filePath: string;
  contentHash: string;
  payload: string;
  timestamp: number;
}

const CACHE_VERSION = 2; // bumped: JSON → SQLite layout

/**
 * Persistent parse cache backed by better-sqlite3 (WAL mode).
 *
 * Single-writer constraint (R1): only the main thread may instantiate a
 * non-readonly cache. Worker threads should pass `{ readonly: true }` to
 * avoid contention. WAL mode is enabled so concurrent readers don't block
 * the writer.
 */
export class ParseCache {
  private db: DatabaseType;
  private cacheDir: string;
  private cacheFile: string;
  private configHash: string;
  private readonly: boolean;

  // Prepared statements (compiled once, reused)
  private stmtGet!: Statement<[string]>;
  private stmtUpsert!: Statement<[string, string, string, number]>;
  private stmtDelete!: Statement<[string]>;
  private stmtClear!: Statement<[]>;
  private stmtCount!: Statement<[]>;

  constructor(projectRoot: string, configJson: string = '', opts: { readonly?: boolean } = {}) {
    this.cacheDir = join(projectRoot, '.vda-cache');
    this.cacheFile = join(this.cacheDir, 'parse-cache.sqlite');
    this.configHash = contentHash(configJson);
    this.readonly = opts.readonly === true;

    if (!this.readonly && !existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }

    // One-shot migration from legacy JSON file (best-effort, non-fatal)
    if (!this.readonly) {
      this.migrateFromJsonIfPresent();
    }

    this.db = new Database(this.cacheFile, {
      readonly: this.readonly,
      fileMustExist: this.readonly,
    });

    this.init();
  }

  private init(): void {
    if (!this.readonly) {
      // Pragmas tuned for analyzer workload: many small reads + bulk writes
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('mmap_size = 268435456'); // 256 MB
      this.db.pragma('temp_store = MEMORY');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS entries (
          file_path TEXT PRIMARY KEY,
          content_hash TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );
      `);

      // Bust on version or config change
      const storedVersion = this.readMeta('version');
      const storedConfig = this.readMeta('configHash');
      if (storedVersion !== String(CACHE_VERSION) || storedConfig !== this.configHash) {
        this.db.exec('DELETE FROM entries');
        this.writeMeta('version', String(CACHE_VERSION));
        this.writeMeta('configHash', this.configHash);
      }
    }

    this.stmtGet = this.db.prepare(
      'SELECT file_path AS filePath, content_hash AS contentHash, payload, timestamp FROM entries WHERE file_path = ?'
    );

    if (!this.readonly) {
      this.stmtUpsert = this.db.prepare(
        `INSERT INTO entries (file_path, content_hash, payload, timestamp)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(file_path) DO UPDATE SET
           content_hash = excluded.content_hash,
           payload = excluded.payload,
           timestamp = excluded.timestamp`
      );
      this.stmtDelete = this.db.prepare('DELETE FROM entries WHERE file_path = ?');
      this.stmtClear = this.db.prepare('DELETE FROM entries');
    }
    this.stmtCount = this.db.prepare('SELECT COUNT(*) AS n FROM entries');
  }

  private readMeta(key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM meta WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  private writeMeta(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value);
  }

  private migrateFromJsonIfPresent(): void {
    const legacyJson = join(this.cacheDir, 'parse-cache.json');
    if (!existsSync(legacyJson) || existsSync(this.cacheFile)) {
      // Nothing to migrate, or new DB already exists (skip — DB is source of truth)
      if (existsSync(legacyJson) && existsSync(this.cacheFile)) {
        try { unlinkSync(legacyJson); } catch { /* ignore */ }
      }
      return;
    }

    let parsed: { version?: number; configHash?: string; entries?: Record<string, { contentHash: string; nodes: GraphNode[]; edges: GraphEdge[]; errors: ParseError[]; timestamp: number }> } | null = null;
    try {
      parsed = JSON.parse(readFileSync(legacyJson, 'utf-8'));
    } catch {
      try { unlinkSync(legacyJson); } catch { /* ignore */ }
      return;
    }

    // Only migrate if config hash matches current (otherwise data is dead)
    if (!parsed?.entries || parsed.configHash !== this.configHash) {
      try { unlinkSync(legacyJson); } catch { /* ignore */ }
      return;
    }

    // Materialize the SQLite db with migrated rows in a single tx
    const tmpDb = new Database(this.cacheFile);
    try {
      tmpDb.pragma('journal_mode = WAL');
      tmpDb.pragma('synchronous = NORMAL');
      tmpDb.exec(`
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS entries (
          file_path TEXT PRIMARY KEY,
          content_hash TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        );
      `);
      const ins = tmpDb.prepare(
        'INSERT OR REPLACE INTO entries (file_path, content_hash, payload, timestamp) VALUES (?, ?, ?, ?)'
      );
      const tx = tmpDb.transaction((rows: Array<[string, { contentHash: string; nodes: GraphNode[]; edges: GraphEdge[]; errors: ParseError[]; timestamp: number }]>) => {
        for (const [fp, e] of rows) {
          ins.run(fp, e.contentHash, JSON.stringify({ nodes: e.nodes, edges: e.edges, errors: e.errors }), e.timestamp);
        }
      });
      tx(Object.entries(parsed.entries));
      tmpDb
        .prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
        .run('version', String(CACHE_VERSION));
      tmpDb
        .prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
        .run('configHash', this.configHash);
    } finally {
      tmpDb.close();
    }

    try { unlinkSync(legacyJson); } catch { /* ignore */ }
  }

  /**
   * Persist any pending writes. SQLite (synchronous=NORMAL) commits per
   * statement, so this is a no-op kept for API compatibility; callers that
   * relied on `save()` for durability will still get it because each
   * `set()` already wrote through.
   */
  save(): void {
    // intentional no-op — writes are immediately durable in WAL+NORMAL mode
  }

  get(filePath: string, content: string): ParseResult | null {
    let row: CacheRow | undefined;
    try {
      row = this.stmtGet.get(filePath) as CacheRow | undefined;
    } catch {
      return null;
    }
    if (!row) return null;

    const hash = contentHash(content);
    if (row.contentHash !== hash) return null;

    try {
      const payload = JSON.parse(row.payload) as { nodes: GraphNode[]; edges: GraphEdge[]; errors: ParseError[] };
      return {
        nodes: payload.nodes,
        edges: payload.edges,
        errors: payload.errors,
      };
    } catch {
      return null;
    }
  }

  set(filePath: string, content: string, result: ParseResult): void {
    if (this.readonly) return;
    const payload = JSON.stringify({
      nodes: result.nodes,
      edges: result.edges,
      errors: result.errors,
    });
    try {
      this.stmtUpsert.run(filePath, contentHash(content), payload, Date.now());
    } catch {
      // non-fatal — cache write failures should not break analysis
    }
  }

  /**
   * Bulk write multiple entries in a single transaction. Significantly faster
   * than calling `set()` per file. Used by the parallel parser to flush all
   * uncached parse outputs at the end of a run.
   */
  setMany(entries: Array<{ filePath: string; content: string; result: ParseResult }>): void {
    if (this.readonly || entries.length === 0) return;
    const ts = Date.now();
    try {
      const tx = this.db.transaction((items: typeof entries) => {
        for (const item of items) {
          const payload = JSON.stringify({
            nodes: item.result.nodes,
            edges: item.result.edges,
            errors: item.result.errors,
          });
          this.stmtUpsert.run(item.filePath, contentHash(item.content), payload, ts);
        }
      });
      tx(entries);
    } catch {
      // non-fatal
    }
  }

  invalidate(filePath: string): void {
    if (this.readonly) return;
    try {
      this.stmtDelete.run(filePath);
    } catch {
      /* ignore */
    }
  }

  clear(): void {
    if (this.readonly) return;
    try {
      this.stmtClear.run();
    } catch {
      /* ignore */
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      /* ignore */
    }
  }

  get size(): number {
    try {
      const row = this.stmtCount.get() as { n: number } | undefined;
      return row?.n ?? 0;
    } catch {
      return 0;
    }
  }

  get hitRate(): { hits: number; total: number } {
    return { hits: 0, total: 0 };
  }
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
