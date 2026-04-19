import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DependencyGraph } from '../graph/DependencyGraph.js';
import { SignatureStore } from '../engine/SignatureStore.js';
import { detectBreakingChanges } from '../analyzers/BreakingChangeDetector.js';
import type { BreakingChange } from '../analyzers/BreakingChangeDetector.js';

// Phase 8-9 + 8-10 — single end-to-end fixture exercising all four
// breaking-change codes.
//
// Fixture layout: a UserDto, a UserController.list endpoint, and a
// `users` table. The "before" graph is the baseline; the "after"
// graph applies one breaking change of each kind.

function buildBefore(): DependencyGraph {
  const g = new DependencyGraph();
  g.addNode({
    id: 'spring-dto:com.example.dto.UserDto',
    kind: 'spring-dto',
    label: 'UserDto',
    filePath: '/com/example/dto/UserDto.java',
    metadata: {
      fqn: 'com.example.dto.UserDto',
      fields: [
        { name: 'id', typeRef: 'Long' },
        { name: 'email', typeRef: 'String' },
        { name: 'phone', typeRef: 'String', nullable: true },  // Optional
      ],
    },
  });
  g.addNode({
    id: 'spring-endpoint:GET:/api/users',
    kind: 'spring-endpoint',
    label: 'GET /api/users',
    filePath: '/com/example/UserController.java',
    metadata: {
      controllerFqn: 'com.example.UserController',
      handlerMethod: 'list',
      httpMethod: 'GET',
      path: '/api/users',
      returnType: 'List<UserDto>',
      paramTypes: [],
    },
  });
  g.addNode({
    id: 'db-table:users',
    kind: 'db-table',
    label: 'users',
    filePath: '',
    metadata: {
      tableName: 'users',
      columns: [
        { name: 'id', type: 'BIGINT' },
        { name: 'email', type: 'VARCHAR' },
        { name: 'created_at', type: 'TIMESTAMP' },
      ],
    },
  });
  return g;
}

function buildAfter(): DependencyGraph {
  const g = new DependencyGraph();
  // B1: removed `email` field
  // B2: `phone` flipped from nullable=true → false (Optional → required)
  g.addNode({
    id: 'spring-dto:com.example.dto.UserDto',
    kind: 'spring-dto',
    label: 'UserDto',
    filePath: '/com/example/dto/UserDto.java',
    metadata: {
      fqn: 'com.example.dto.UserDto',
      fields: [
        { name: 'id', typeRef: 'Long' },
        { name: 'phone', typeRef: 'String', nullable: false },
      ],
    },
  });
  // B3: endpoint path changed (/api/users → /api/v2/users)
  g.addNode({
    id: 'spring-endpoint:GET:/api/v2/users',
    kind: 'spring-endpoint',
    label: 'GET /api/v2/users',
    filePath: '/com/example/UserController.java',
    metadata: {
      controllerFqn: 'com.example.UserController',
      handlerMethod: 'list',
      httpMethod: 'GET',
      path: '/api/v2/users',
      returnType: 'List<UserDto>',
      paramTypes: [],
    },
  });
  // B4: dropped `created_at` column
  g.addNode({
    id: 'db-table:users',
    kind: 'db-table',
    label: 'users',
    filePath: '',
    metadata: {
      tableName: 'users',
      columns: [
        { name: 'id', type: 'BIGINT' },
        { name: 'email', type: 'VARCHAR' },
      ],
    },
  });
  return g;
}

describe('Phase 8 E2E — fixture exercising B1/B2/B3/B4', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'vda-phase8-e2e-'));
  });
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('detects B1, B2, B3, and B4 each at least once on the canonical fixture', () => {
    const store = new SignatureStore(projectRoot);
    store.snapshot('before', buildBefore());
    store.snapshot('after', buildAfter());
    const diff = store.diff('before', 'after');
    const report = detectBreakingChanges(diff);
    store.close();

    expect(report.byCode.B1).toBeGreaterThanOrEqual(1);
    expect(report.byCode.B2).toBeGreaterThanOrEqual(1);
    expect(report.byCode.B3).toBeGreaterThanOrEqual(1);
    expect(report.byCode.B4).toBeGreaterThanOrEqual(1);

    // Specific evidence — pin the IDs the fixture is built around.
    const ids: Record<string, BreakingChange[]> = { B1: [], B2: [], B3: [], B4: [] };
    for (const c of report.changes) ids[c.code].push(c);
    expect(ids.B1.some(c => c.signatureId === 'com.example.dto.UserDto#email')).toBe(true);
    expect(ids.B2.some(c => c.signatureId === 'com.example.dto.UserDto#phone')).toBe(true);
    expect(ids.B3.some(c => c.signatureId === 'com.example.UserController#list')).toBe(true);
    expect(ids.B4.some(c => c.signatureId === 'users.created_at')).toBe(true);
  });

  it('identity diff (snapshot the same graph as both before and after) returns 0 changes', () => {
    const store = new SignatureStore(projectRoot);
    const g = buildBefore();
    store.snapshot('a', g);
    store.snapshot('b', g);
    const diff = store.diff('a', 'b');
    const report = detectBreakingChanges(diff);
    store.close();
    expect(report.changes).toHaveLength(0);
    expect(report.byCode).toEqual({ B1: 0, B2: 0, B3: 0, B4: 0 });
  });
});
