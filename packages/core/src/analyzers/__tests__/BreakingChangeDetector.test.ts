import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { SignatureStore } from '../../engine/SignatureStore.js';
import { detectBreakingChanges } from '../BreakingChangeDetector.js';

function dto(fqn: string, fields: Array<{ name: string; typeRef: string; nullable?: boolean }>) {
  return {
    id: `spring-dto:${fqn}`,
    kind: 'spring-dto' as const,
    label: fqn.split('.').pop()!,
    filePath: `/${fqn.replace(/\./g, '/')}.java`,
    metadata: { fqn, fields },
  };
}
function endpoint(controllerFqn: string, handlerMethod: string, httpMethod: string, path: string, returnType?: string, paramTypes: string[] = []) {
  return {
    id: `spring-endpoint:${httpMethod}:${path}`,
    kind: 'spring-endpoint' as const,
    label: `${httpMethod} ${path}`,
    filePath: `/${controllerFqn.replace(/\./g, '/')}.java`,
    metadata: { controllerFqn, handlerMethod, httpMethod, path, returnType, paramTypes },
  };
}
function table(name: string, columns: Array<{ name: string; type: string }>) {
  return {
    id: `db-table:${name}`,
    kind: 'db-table' as const,
    label: name,
    filePath: '',
    metadata: { tableName: name, columns },
  };
}

describe('BreakingChangeDetector (Phase 8-2/3/4)', () => {
  let projectRoot: string;
  let store: SignatureStore;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'vda-bc-'));
    store = new SignatureStore(projectRoot);
  });
  afterEach(() => {
    store.close();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('B1 — flags a removed DTO field', () => {
    const before = new DependencyGraph();
    before.addNode(dto('com.example.UserDto', [
      { name: 'id', typeRef: 'Long' },
      { name: 'email', typeRef: 'String' },
    ]));
    store.snapshot('v1', before);

    const after = new DependencyGraph();
    after.addNode(dto('com.example.UserDto', [{ name: 'id', typeRef: 'Long' }]));
    store.snapshot('v2', after);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    expect(report.byCode.B1).toBeGreaterThanOrEqual(1);
    const b1 = report.changes.find(c => c.code === 'B1' && c.signatureId === 'com.example.UserDto#email');
    expect(b1).toBeDefined();
    expect(b1!.severity).toBe('error');
  });

  it('B1 — flags a typeRef change on an existing field', () => {
    const before = new DependencyGraph();
    before.addNode(dto('com.example.X', [{ name: 'amount', typeRef: 'Long' }]));
    store.snapshot('v1', before);
    const after = new DependencyGraph();
    after.addNode(dto('com.example.X', [{ name: 'amount', typeRef: 'String' }]));
    store.snapshot('v2', after);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    const b1 = report.changes.find(c => c.code === 'B1' && c.signatureId === 'com.example.X#amount');
    expect(b1).toBeDefined();
    expect(b1!.message).toContain('Long → String');
  });

  it('B2 — flags a nullable→required field flip', () => {
    const before = new DependencyGraph();
    before.addNode(dto('com.example.X', [{ name: 'phone', typeRef: 'String', nullable: true }]));
    store.snapshot('v1', before);
    const after = new DependencyGraph();
    after.addNode(dto('com.example.X', [{ name: 'phone', typeRef: 'String', nullable: false }]));
    store.snapshot('v2', after);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    const b2 = report.changes.find(c => c.code === 'B2');
    expect(b2).toBeDefined();
    expect(b2!.signatureId).toBe('com.example.X#phone');
    expect(report.byCode.B2).toBe(1);
  });

  it('B3 — flags an endpoint signature change (path or returnType)', () => {
    const before = new DependencyGraph();
    before.addNode(endpoint('com.example.UserController', 'list', 'GET', '/api/users', 'List<UserDto>'));
    store.snapshot('v1', before);

    const after = new DependencyGraph();
    after.addNode(endpoint('com.example.UserController', 'list', 'GET', '/api/users/v2', 'List<UserDto>'));
    store.snapshot('v2', after);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    expect(report.byCode.B3).toBe(1);
  });

  it('B3 — flags a removed endpoint', () => {
    const before = new DependencyGraph();
    before.addNode(endpoint('com.example.UserController', 'getById', 'GET', '/api/users/{id}', 'UserDto'));
    store.snapshot('v1', before);
    store.snapshot('v2', new DependencyGraph());

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    expect(report.byCode.B3).toBe(1);
    expect(report.changes[0].message).toContain('endpoint removed');
  });

  it('B4 — flags a removed db column', () => {
    const before = new DependencyGraph();
    before.addNode(table('users', [
      { name: 'id', type: 'BIGINT' },
      { name: 'email', type: 'VARCHAR' },
    ]));
    store.snapshot('v1', before);

    const after = new DependencyGraph();
    after.addNode(table('users', [{ name: 'id', type: 'BIGINT' }]));
    store.snapshot('v2', after);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    expect(report.byCode.B4).toBe(1);
    const b4 = report.changes.find(c => c.code === 'B4');
    expect(b4!.signatureId).toBe('users.email');
  });

  it('false-positive guard — identity diff (same graph snapshotted twice) returns 0 changes', () => {
    const g = new DependencyGraph();
    g.addNode(dto('com.example.X', [{ name: 'a', typeRef: 'Long' }]));
    g.addNode(endpoint('com.example.C', 'list', 'GET', '/api/x', 'X'));
    g.addNode(table('x', [{ name: 'a', type: 'BIGINT' }]));
    store.snapshot('v1', g);
    store.snapshot('v2', g);
    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    expect(report.changes).toHaveLength(0);
    expect(report.byCode).toEqual({ B1: 0, B2: 0, B3: 0, B4: 0 });
  });

  // Phase 10-4 — class-rename heuristic must suppress B1 for moved fields.
  it('does not fire B1 for fields paired by the rename heuristic', () => {
    const g1 = new DependencyGraph();
    g1.addNode(dto('com.old.UserDto', [
      { name: 'id', typeRef: 'Long' },
      { name: 'email', typeRef: 'String' },
    ]));
    store.snapshot('v1', g1);

    const g2 = new DependencyGraph();
    g2.addNode(dto('com.new.UserDto', [
      { name: 'id', typeRef: 'Long' },
      { name: 'email', typeRef: 'String' },
    ]));
    store.snapshot('v2', g2);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    expect(report.byCode.B1).toBe(0);
    expect(report.renamed).toHaveLength(2);
    // No B1 change emitted for the paired ids
    const b1Ids = report.changes.filter(c => c.code === 'B1').map(c => c.signatureId);
    expect(b1Ids).not.toContain('com.old.UserDto#id');
    expect(b1Ids).not.toContain('com.old.UserDto#email');
  });

  // Phase 13-9 — B4 reads schema-diff input in addition to db-column SignatureDiff.
  it('B4 fires when the schema diff drops a column (DDL-only, even if no SignatureStore record exists)', () => {
    const empty = store.diff('v1', 'v2'); // both labels empty → empty diff
    const report = detectBreakingChanges(empty, {
      schemaDiff: {
        fromLabel: 'v1', toLabel: 'v2',
        addedTables: [], removedTables: [],
        changedTables: [{
          table: 'users',
          addedColumns: [],
          removedColumns: [{ name: 'email', type: 'VARCHAR' }],
          changedColumns: [],
        }],
      },
    });
    expect(report.byCode.B4).toBe(1);
    expect(report.changes[0].signatureId).toBe('users.email');
    expect(report.changes[0].code).toBe('B4');
  });

  it('B4 dedupes when both SignatureStore + schema-diff report the same id', () => {
    const g1 = new DependencyGraph();
    g1.addNode(table('users', [{ name: 'email', type: 'VARCHAR' }]));
    store.snapshot('v1', g1);
    const g2 = new DependencyGraph();
    g2.addNode(table('users', []));
    store.snapshot('v2', g2);
    const report = detectBreakingChanges(store.diff('v1', 'v2'), {
      schemaDiff: {
        fromLabel: 'v1', toLabel: 'v2',
        addedTables: [], removedTables: [],
        changedTables: [{
          table: 'users',
          addedColumns: [],
          removedColumns: [{ name: 'email', type: 'VARCHAR' }],
          changedColumns: [],
        }],
      },
    });
    // SignatureStore already counted users.email as B4. Schema-diff dedupes.
    expect(report.byCode.B4).toBe(1);
  });

  it('still fires B1 for genuinely removed (unpaired) fields when a class is renamed and shrinks', () => {
    const g1 = new DependencyGraph();
    g1.addNode(dto('com.old.UserDto', [
      { name: 'id', typeRef: 'Long' },
      { name: 'deprecated', typeRef: 'String' },
    ]));
    store.snapshot('v1', g1);

    const g2 = new DependencyGraph();
    g2.addNode(dto('com.new.UserDto', [
      { name: 'id', typeRef: 'Long' },
    ]));
    store.snapshot('v2', g2);

    const report = detectBreakingChanges(store.diff('v1', 'v2'));
    // 1 paired rename (id), 1 truly removed field (deprecated) -> B1 = 1
    expect(report.renamed).toHaveLength(1);
    expect(report.byCode.B1).toBe(1);
    const b1 = report.changes.find(c => c.code === 'B1')!;
    expect(b1.signatureId).toBe('com.old.UserDto#deprecated');
  });
});
