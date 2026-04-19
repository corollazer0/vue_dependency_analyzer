import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { SignatureStore } from '../SignatureStore.js';

function dtoNode(fqn: string, fields: Array<{ name: string; typeRef: string; nullable?: boolean; jsonName?: string }>) {
  return {
    id: `spring-dto:${fqn}`,
    kind: 'spring-dto' as const,
    label: fqn.split('.').pop()!,
    filePath: `/${fqn.replace(/\./g, '/')}.java`,
    metadata: { fqn, fields },
  };
}

function endpointNode(controllerFqn: string, handlerMethod: string, httpMethod: string, path: string, returnType?: string, paramTypes: string[] = []) {
  return {
    id: `spring-endpoint:${httpMethod}:${path}`,
    kind: 'spring-endpoint' as const,
    label: `${httpMethod} ${path}`,
    filePath: `/${controllerFqn.replace(/\./g, '/')}.java`,
    metadata: { controllerFqn, handlerMethod, httpMethod, path, returnType, paramTypes },
  };
}

function tableNode(name: string, columns: Array<{ name: string; type: string }> = []) {
  return {
    id: `db-table:${name}`,
    kind: 'db-table' as const,
    label: name,
    filePath: '',
    metadata: { tableName: name, columns },
  };
}

describe('SignatureStore (Phase 8-1)', () => {
  let projectRoot: string;
  let store: SignatureStore;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'vda-sig-'));
    store = new SignatureStore(projectRoot);
  });
  afterEach(() => {
    store.close();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('emits one record per DTO field with id `${fqn}#${fieldName}`', () => {
    const g = new DependencyGraph();
    g.addNode(dtoNode('com.example.dto.UserDto', [
      { name: 'id', typeRef: 'Long' },
      { name: 'email', typeRef: 'String', nullable: true },
    ]));
    const records = store.snapshot('v1', g);
    const ids = records.filter(r => r.kind === 'dto-field').map(r => r.id);
    expect(ids).toEqual([
      'com.example.dto.UserDto#id',
      'com.example.dto.UserDto#email',
    ]);
  });

  it('emits one record per endpoint with id `${controllerFqn}#${handlerMethod}` (path NOT in id)', () => {
    const g = new DependencyGraph();
    g.addNode(endpointNode('com.example.UserController', 'create', 'POST', '/api/users', 'UserDto', ['CreateUserRequest']));
    const records = store.snapshot('v1', g);
    const ep = records.find(r => r.kind === 'endpoint');
    expect(ep?.id).toBe('com.example.UserController#create');
    // path lives in metadata, not in the id
    expect(ep?.metadata.path).toBe('/api/users');
  });

  it('emits one record per db-column with id `${tableName}.${columnName}`', () => {
    const g = new DependencyGraph();
    g.addNode(tableNode('users', [
      { name: 'id', type: 'BIGINT' },
      { name: 'email', type: 'VARCHAR' },
    ]));
    const records = store.snapshot('v1', g);
    const ids = records.filter(r => r.kind === 'db-column').map(r => r.id).sort();
    expect(ids).toEqual(['users.email', 'users.id']);
  });

  it('hash is isolated to node-local metadata — adding an unrelated edge does NOT flip the DTO field hash', () => {
    const g1 = new DependencyGraph();
    g1.addNode(dtoNode('com.example.UserDto', [{ name: 'email', typeRef: 'String' }]));
    const before = store.snapshot('a', g1);

    // Same DTO, but the graph also has an unrelated edge — the gate
    // condition: the dto-field hash MUST NOT change just because the
    // surrounding graph topology shifted.
    const g2 = new DependencyGraph();
    g2.addNode(dtoNode('com.example.UserDto', [{ name: 'email', typeRef: 'String' }]));
    g2.addNode({ id: 'spring-controller:/X.java', kind: 'spring-controller', label: 'X', filePath: '/X.java', metadata: {} });
    g2.addNode({ id: 'spring-endpoint:GET:/api/x', kind: 'spring-endpoint', label: 'GET /api/x', filePath: '/X.java', metadata: { controllerFqn: 'com.example.X', handlerMethod: 'x', httpMethod: 'GET', path: '/api/x' } });
    g2.addEdge({ id: 'serves', source: 'spring-controller:/X.java', target: 'spring-endpoint:GET:/api/x', kind: 'api-serves', metadata: {} });
    const after = store.snapshot('b', g2);

    const beforeEmail = before.find(r => r.id === 'com.example.UserDto#email')!;
    const afterEmail = after.find(r => r.id === 'com.example.UserDto#email')!;
    expect(afterEmail.hash).toBe(beforeEmail.hash);
  });

  it('snapshot + load round-trip recovers the same records', () => {
    const g = new DependencyGraph();
    g.addNode(dtoNode('com.example.X', [{ name: 'a', typeRef: 'String' }]));
    store.snapshot('v1', g);
    const set = store.load('v1');
    expect(set.records.size).toBe(1);
    const r = set.records.get('com.example.X#a')!;
    expect(r.kind).toBe('dto-field');
    expect(r.metadata.typeRef).toBe('String');
  });

  it('diff() identifies added / removed / modified records', () => {
    const g1 = new DependencyGraph();
    g1.addNode(dtoNode('com.example.X', [
      { name: 'a', typeRef: 'String' },
      { name: 'b', typeRef: 'Long' },
      { name: 'c', typeRef: 'Boolean' },
    ]));
    store.snapshot('before', g1);

    const g2 = new DependencyGraph();
    g2.addNode(dtoNode('com.example.X', [
      { name: 'a', typeRef: 'String' },                           // unchanged
      { name: 'b', typeRef: 'Integer' },                          // modified (Long → Integer)
      // c removed
      { name: 'd', typeRef: 'String' },                           // added
    ]));
    store.snapshot('after', g2);

    const diff = store.diff('before', 'after');
    expect(diff.added.map(r => r.id)).toEqual(['com.example.X#d']);
    expect(diff.removed.map(r => r.id)).toEqual(['com.example.X#c']);
    expect(diff.modified.map(m => m.before.id)).toEqual(['com.example.X#b']);
    const bMod = diff.modified[0];
    expect(bMod.before.metadata.typeRef).toBe('Long');
    expect(bMod.after.metadata.typeRef).toBe('Integer');
  });

  it('B2 (Optional → required) flips the hash via metadata.nullable', () => {
    const g1 = new DependencyGraph();
    g1.addNode(dtoNode('com.example.X', [{ name: 'phone', typeRef: 'String', nullable: true }]));
    store.snapshot('v1', g1);

    const g2 = new DependencyGraph();
    g2.addNode(dtoNode('com.example.X', [{ name: 'phone', typeRef: 'String', nullable: false }]));
    store.snapshot('v2', g2);

    const diff = store.diff('v1', 'v2');
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].before.metadata.nullable).toBe(true);
    expect(diff.modified[0].after.metadata.nullable).toBe(false);
  });

  it('strips dbDefaultSchema prefix from db-column ids when configured', () => {
    const g = new DependencyGraph();
    g.addNode(tableNode('public.users', [{ name: 'id', type: 'BIGINT' }]));
    const stripped = new SignatureStore(projectRoot, { dbDefaultSchema: 'public' });
    const records = stripped.snapshot('v1', g);
    expect(records[0].id).toBe('users.id');
    stripped.close();
  });

  // Phase 10-4 — file-rename heuristic. When a class moves package
  // (com.old.UserDto → com.new.UserDto) every field id changes; the
  // rename pass pairs them so B1 doesn't fire on every field.
  describe('Phase 10-4 rename heuristic', () => {
    it('pairs dto-fields whose simple className + field name match 1:1 across snapshots', () => {
      const g1 = new DependencyGraph();
      g1.addNode(dtoNode('com.old.pkg.UserDto', [
        { name: 'id', typeRef: 'Long' },
        { name: 'email', typeRef: 'String', nullable: true },
      ]));
      store.snapshot('before', g1);

      const g2 = new DependencyGraph();
      g2.addNode(dtoNode('com.new.pkg.UserDto', [
        { name: 'id', typeRef: 'Long' },
        { name: 'email', typeRef: 'String', nullable: true },
      ]));
      store.snapshot('after', g2);

      const diff = store.diff('before', 'after');
      expect(diff.renamed).toHaveLength(2);
      const renamedIds = diff.renamed.map(p => `${p.before.id}→${p.after.id}`).sort();
      expect(renamedIds).toEqual([
        'com.old.pkg.UserDto#email→com.new.pkg.UserDto#email',
        'com.old.pkg.UserDto#id→com.new.pkg.UserDto#id',
      ]);

      // After-records carry previousId so consumers pair in O(1).
      const afterEmail = diff.added.find(r => r.id === 'com.new.pkg.UserDto#email')!;
      expect(afterEmail.previousId).toBe('com.old.pkg.UserDto#email');
    });

    it('does not pair when 2+ added candidates share the same (className, fieldName)', () => {
      // Two new packages both define UserDto.id — ambiguous, leave split.
      const g1 = new DependencyGraph();
      g1.addNode(dtoNode('com.old.pkg.UserDto', [{ name: 'id', typeRef: 'Long' }]));
      store.snapshot('before', g1);

      const g2 = new DependencyGraph();
      g2.addNode(dtoNode('com.a.pkg.UserDto', [{ name: 'id', typeRef: 'Long' }]));
      g2.addNode(dtoNode('com.b.pkg.UserDto', [{ name: 'id', typeRef: 'Long' }]));
      store.snapshot('after', g2);

      const diff = store.diff('before', 'after');
      expect(diff.renamed).toHaveLength(0);
      expect(diff.removed.map(r => r.id)).toEqual(['com.old.pkg.UserDto#id']);
      expect(diff.added).toHaveLength(2);
    });

    it('leaves a same-id field in modified[] (not renamed)', () => {
      const g1 = new DependencyGraph();
      g1.addNode(dtoNode('com.x.UserDto', [{ name: 'id', typeRef: 'Long' }]));
      store.snapshot('before', g1);

      const g2 = new DependencyGraph();
      g2.addNode(dtoNode('com.x.UserDto', [{ name: 'id', typeRef: 'Integer' }])); // type change
      store.snapshot('after', g2);

      const diff = store.diff('before', 'after');
      expect(diff.renamed).toHaveLength(0);
      expect(diff.modified).toHaveLength(1);
    });
  });
});
