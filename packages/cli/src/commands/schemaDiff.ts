import { loadConfig, type CliOptions } from '../config.js';
import { SchemaSnapshotStore } from '@vda/core';

// Phase 13-8 — `vda schema-diff <fromLabel>..<toLabel>`
//
// Pure DB read against .vda-cache/schema.sqlite. Renders added /
// removed tables + per-table added/removed/changed columns with
// type-and-nullable visibility.

function parseRange(spec: string): [string, string] | null {
  const m = spec.match(/^([^.]+)\.\.([^.]+)$/);
  if (!m) return null;
  return [m[1], m[2]];
}

export async function schemaDiffCommand(
  range: string | undefined,
  options: CliOptions & { dir?: string; json?: boolean },
): Promise<void> {
  const config = await loadConfig(options.dir ?? '.', options);
  if (!range) { console.error('Usage: vda schema-diff <fromLabel>..<toLabel>'); process.exit(2); }
  const parsed = parseRange(range);
  if (!parsed) { console.error(`Invalid range: ${range}`); process.exit(2); }
  const [from, to] = parsed;

  const store = new SchemaSnapshotStore(config.projectRoot);
  const diff = store.diff(from, to);
  if (!diff) {
    const labels = store.list().map(s => s.label);
    store.close();
    console.error(`Snapshot label not found. Available: ${labels.length > 0 ? labels.join(', ') : '(none)'}`);
    process.exit(1);
  }
  store.close();

  if (options.json) { console.log(JSON.stringify(diff, null, 2)); return; }

  console.log(`\n📐 Schema diff ${diff.fromLabel} → ${diff.toLabel}\n`);
  if (diff.addedTables.length > 0) {
    console.log('  Added tables:');
    for (const t of diff.addedTables) console.log(`    + ${t.table} (${t.columns.length} cols)`);
  }
  if (diff.removedTables.length > 0) {
    console.log('  Removed tables:');
    for (const t of diff.removedTables) console.log(`    - ${t.table} (was ${t.was.length} cols)`);
  }
  for (const t of diff.changedTables) {
    console.log(`  ~ ${t.table}`);
    for (const c of t.addedColumns)   console.log(`      + ${c.name} ${c.type}${c.nullable === false ? ' NOT NULL' : ''}`);
    for (const c of t.removedColumns) console.log(`      - ${c.name} ${c.type}`);
    for (const c of t.changedColumns) console.log(`      ~ ${c.name}: ${c.from.type}${c.from.nullable === false ? ' NOT NULL' : ''} → ${c.to.type}${c.to.nullable === false ? ' NOT NULL' : ''}`);
  }
  if (diff.addedTables.length + diff.removedTables.length + diff.changedTables.length === 0) {
    console.log('  No schema differences.');
  }
  console.log('');
}
