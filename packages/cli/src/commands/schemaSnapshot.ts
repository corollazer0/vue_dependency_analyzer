import { resolve } from 'node:path';
import { loadConfig, type CliOptions } from '../config.js';
import { readFlywayMigrations, SchemaSnapshotStore } from '@vda/core';

// Phase 13-8 — `vda schema-snapshot --label <name> [--migrations <dir>]`
//
// Reads the Flyway migration sequence under `--migrations` (defaults to
// `db/migrations` relative to the project root), applies it, and persists
// the resulting per-table column lists to .vda-cache/schema.sqlite under
// the chosen label.

export async function schemaSnapshotCommand(
  dir: string,
  options: CliOptions & { label?: string; migrations?: string; json?: boolean },
): Promise<void> {
  const config = await loadConfig(dir, options);
  const label = options.label ?? new Date().toISOString().slice(0, 10);
  const migDir = resolve(config.projectRoot, options.migrations ?? 'db/migrations');

  const snap = readFlywayMigrations(migDir);
  if (snap.tables.size === 0) {
    console.error(`No Flyway migrations found under ${migDir}.`);
    process.exit(1);
  }
  const store = new SchemaSnapshotStore(config.projectRoot);
  const rows = store.snapshot(label, snap.tables);
  store.close();

  if (options.json) {
    console.log(JSON.stringify({ label, migrations: snap.migrations.length, tables: rows.length }, null, 2));
    return;
  }
  console.log(
    `📐 Schema snapshot \`${label}\` written: ${rows.length} table(s) ` +
    `from ${snap.migrations.length} migration(s) under ${migDir}.`,
  );
}
