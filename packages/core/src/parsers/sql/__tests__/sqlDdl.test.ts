import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSqlDdl } from '../SqlDdlParser.js';
import { readFlywayMigrations, applyMigrations } from '../FlywayMigrationParser.js';

describe('SqlDdlParser (Phase 13-5)', () => {
  it('parses CREATE TABLE with NULL/NOT NULL/DEFAULT', () => {
    const ops = parseSqlDdl(`
      CREATE TABLE users (
        id BIGINT NOT NULL,
        email VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NULL DEFAULT 'Anon',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      );
    `);
    expect(ops).toHaveLength(1);
    expect(ops[0].kind).toBe('create-table');
    if (ops[0].kind !== 'create-table') throw new Error();
    expect(ops[0].table).toBe('users');
    expect(ops[0].columns).toEqual([
      { name: 'id', type: 'BIGINT', nullable: false },
      { name: 'email', type: 'VARCHAR', nullable: false },
      { name: 'display_name', type: 'VARCHAR', nullable: true, default: "'Anon'" },
      { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    ]);
  });

  it('parses ALTER TABLE ADD/DROP/MODIFY/RENAME COLUMN', () => {
    const ops = parseSqlDdl(`
      ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL;
      ALTER TABLE users DROP COLUMN display_name;
      ALTER TABLE users MODIFY COLUMN email VARCHAR(320);
      ALTER TABLE users RENAME COLUMN role TO user_role;
    `);
    expect(ops.map(o => o.kind)).toEqual(['add-column', 'drop-column', 'modify-column', 'rename-column']);
    if (ops[0].kind !== 'add-column') throw new Error();
    expect(ops[0].column.name).toBe('role');
    expect(ops[0].column.nullable).toBe(false);
  });

  it('skips index / FK / unknown clauses silently', () => {
    const ops = parseSqlDdl(`
      CREATE INDEX idx_users_email ON users (email);
      ALTER TABLE users ADD CONSTRAINT fk_x FOREIGN KEY (id) REFERENCES other(id);
    `);
    // No table-shape changes → no ops emitted.
    expect(ops).toEqual([]);
  });
});

describe('FlywayMigrationParser (Phase 13-4)', () => {
  it('applies V1 → V2 → V3 in numeric order and drops a column at V3', () => {
    const root = mkdtempSync(join(tmpdir(), 'vda-flyway-'));
    try {
      const migDir = join(root, 'db', 'migrations');
      mkdirSync(migDir, { recursive: true });
      writeFileSync(join(migDir, 'V1__init.sql'), `
        CREATE TABLE users (
          id BIGINT NOT NULL,
          email VARCHAR(255) NOT NULL
        );
      `);
      writeFileSync(join(migDir, 'V2__add_display_name.sql'), `
        ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
      `);
      // V10 should sort AFTER V2, not before (lexical sort would put V10 first).
      writeFileSync(join(migDir, 'V10__drop_display_name.sql'), `
        ALTER TABLE users DROP COLUMN display_name;
      `);

      const snap = readFlywayMigrations(migDir);
      expect(snap.migrations.map(m => m.version)).toEqual(['1', '2', '10']);
      const users = snap.tables.get('users')!;
      expect(users.map(c => c.name)).toEqual(['id', 'email']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rename-column updates the column name in place', () => {
    const tables = applyMigrations([
      {
        filePath: '/v1.sql', version: '1', description: 'init',
        ops: [{ kind: 'create-table', table: 'users', columns: [{ name: 'old_name', type: 'VARCHAR' }] }],
      },
      {
        filePath: '/v2.sql', version: '2', description: 'rename',
        ops: [{ kind: 'rename-column', table: 'users', from: 'old_name', to: 'new_name' }],
      },
    ]);
    expect(tables.get('users')!.map(c => c.name)).toEqual(['new_name']);
  });
});
