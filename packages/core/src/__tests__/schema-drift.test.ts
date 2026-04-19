// Phase 13-11 — e2e schema drift gate.
// Loads test-project/db/migrations (V1__init / V2__add_user_role /
// V3__drop_user_display_name), snapshots V1+V2 vs V1+V2+V3 via the
// Phase 13-7 SchemaSnapshotStore, then asserts:
//   - schema-diff detects exactly 1 dropped column (display_name)
//   - BreakingChangeDetector B4 reports it as an error
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import {
  applyMigrations,
  readFlywayMigrations,
  SchemaSnapshotStore,
  detectBreakingChanges,
  SignatureStore,
  DependencyGraph,
} from '../index.js';

const migDir = resolve(import.meta.dirname, '../../../../test-project/db/migrations');
const hasFixture = existsSync(migDir);

describe.skipIf(!hasFixture)('Phase 13-11 — e2e schema drift', () => {
  it('Flyway sequence applied: V1+V2 has display_name, V3 drops it', () => {
    const all = readFlywayMigrations(migDir);
    const v1v2 = applyMigrations(all.migrations.filter(m => m.version !== '3'));
    const v1v2v3 = applyMigrations(all.migrations);
    expect(v1v2.get('users')!.map(c => c.name)).toEqual(['id', 'email', 'display_name', 'created_at', 'role']);
    expect(v1v2v3.get('users')!.map(c => c.name)).toEqual(['id', 'email', 'created_at', 'role']);
  });

  it('SchemaSnapshotStore.diff detects the dropped column', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vda-schema-e2e-'));
    try {
      const store = new SchemaSnapshotStore(tmp);
      const all = readFlywayMigrations(migDir);
      store.snapshot('before', applyMigrations(all.migrations.filter(m => m.version !== '3')));
      store.snapshot('after', applyMigrations(all.migrations));
      const diff = store.diff('before', 'after')!;
      const usersChange = diff.changedTables.find(t => t.table === 'users')!;
      expect(usersChange.removedColumns.map(c => c.name)).toEqual(['display_name']);
      expect(usersChange.addedColumns).toEqual([]);
      store.close();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('BreakingChangeDetector B4 fires on the DDL-driven column drop', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'vda-schema-e2e-bc-'));
    try {
      const sigStore = new SignatureStore(tmp);
      // Empty signature diff (no DTO/endpoint changes) — DDL-only path.
      sigStore.snapshot('s1', new DependencyGraph());
      sigStore.snapshot('s2', new DependencyGraph());
      const sigDiff = sigStore.diff('s1', 's2');
      sigStore.close();

      const all = readFlywayMigrations(migDir);
      const schemaStore = new SchemaSnapshotStore(tmp);
      schemaStore.snapshot('before', applyMigrations(all.migrations.filter(m => m.version !== '3')));
      schemaStore.snapshot('after', applyMigrations(all.migrations));
      const schemaDiff = schemaStore.diff('before', 'after');
      schemaStore.close();

      const report = detectBreakingChanges(sigDiff, { schemaDiff });
      const b4 = report.changes.filter(c => c.code === 'B4');
      expect(b4.length).toBeGreaterThanOrEqual(1);
      expect(b4.some(c => c.signatureId === 'users.display_name')).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
