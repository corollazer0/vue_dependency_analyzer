import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerGraphRoutes } from '../routes/graphRoutes.js';
import { registerAnalysisRoutes } from '../routes/analysisRoutes.js';
import { registerSearchRoutes } from '../routes/searchRoutes.js';
import { registerHealthRoutes } from '../routes/healthRoutes.js';
import { registerAuthRoutes, registerAuthHook } from '../middleware/auth.js';
import { AuditLog, registerAuditHook } from '../middleware/auditLog.js';
import { AnalysisEngine } from '../engine.js';
import { loadEnv } from '../index.js';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../core/src/__fixtures__');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared setup — no auth, like the original test suite
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Server API', () => {
  let fastify: ReturnType<typeof Fastify>;
  let engine: AnalysisEngine;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(cors);

    engine = new AnalysisEngine(fixturesDir, {}, false);
    await engine.initialize();

    const auditLog = new AuditLog();
    const env = loadEnv({ authEnabled: false });

    registerHealthRoutes(fastify, engine);
    registerAuthRoutes(fastify, env, auditLog);
    registerAuditHook(fastify, auditLog);
    registerGraphRoutes(fastify, engine);
    registerAnalysisRoutes(fastify, engine);
    registerSearchRoutes(fastify, engine);

    // Audit log endpoint
    fastify.get('/api/admin/audit-log', async (request, reply) => {
      const { limit } = request.query as { limit?: string };
      return { logs: auditLog.getEntries(limit ? parseInt(limit, 10) : 50) };
    });

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  // ─── GET /health ───

  describe('GET /health', () => {
    it('should return ok status with uptime and version', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof body.version).toBe('string');
    });
  });

  // ─── GET /health/ready ───

  describe('GET /health/ready', () => {
    it('should report ready after initialization', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ready).toBe(true);
      expect(body.nodeCount).toBeGreaterThan(0);
      expect(body.edgeCount).toBeGreaterThan(0);
      expect(typeof body.analyzedAt).toBe('string');
    });
  });

  // ─── GET /api/graph ───

  describe('GET /api/graph', () => {
    it('should return full graph with nodes and edges', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/graph' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.nodes).toBeDefined();
      expect(body.edges).toBeDefined();
      expect(body.nodes.length).toBeGreaterThan(10);
      expect(body.edges.length).toBeGreaterThan(5);
      expect(body.metadata).toBeDefined();
    });

    it('should return clustered graph', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/graph?cluster=true&depth=3' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.clusters).toBeDefined();
      expect(body.edges).toBeDefined();
      expect(body.clusters.length).toBeGreaterThan(0);
    });
  });

  // ─── GET /api/graph/node?id= ───

  describe('GET /api/graph/node?id=', () => {
    it('should return node detail for any node ID including file paths', async () => {
      const graphRes = await fastify.inject({ method: 'GET', url: '/api/graph' });
      const { nodes } = JSON.parse(graphRes.body);
      const fileNode = nodes.find((n: any) => n.id.includes('/')) || nodes[0];
      const id = encodeURIComponent(fileNode.id);

      const res = await fastify.inject({ method: 'GET', url: `/api/graph/node?id=${id}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.node).toBeDefined();
      expect(body.node.id).toBe(fileNode.id);
    });

    it('should return 404 for unknown node', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/graph/node?id=nonexistent' });
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when id param missing', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/graph/node' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /api/search ───

  describe('GET /api/search', () => {
    it('should return search results for valid query', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/search?q=Sample' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.results).toBeDefined();
      expect(body.results.length).toBeGreaterThan(0);
      expect(body.results[0]).toHaveProperty('nodeId');
      expect(body.results[0]).toHaveProperty('label');
      expect(body.results[0]).toHaveProperty('kind');
    });

    it('should return empty results for empty query', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/search?q=' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.results).toHaveLength(0);
    });
  });

  // ─── GET /api/stats ───

  describe('GET /api/stats', () => {
    it('should return graph statistics', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/stats' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.totalNodes).toBeGreaterThan(0);
      expect(body.totalEdges).toBeGreaterThan(0);
      expect(body.circularDeps).toBeDefined();
      expect(body.orphanNodes).toBeDefined();
    });
  });

  // ─── GET /api/graph/paths ───

  describe('GET /api/graph/paths', () => {
    it('should return paths between two connected nodes', async () => {
      const graphRes = await fastify.inject({ method: 'GET', url: '/api/graph' });
      const { edges } = JSON.parse(graphRes.body);
      if (edges.length === 0) return;

      const from = encodeURIComponent(edges[0].source);
      const to = encodeURIComponent(edges[0].target);
      const res = await fastify.inject({ method: 'GET', url: `/api/graph/paths?from=${from}&to=${to}` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.paths).toBeDefined();
      expect(body.count).toBeGreaterThanOrEqual(0);
    });

    it('should return 400 when missing parameters', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/graph/paths' });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /api/analysis/overlays ───

  describe('GET /api/analysis/overlays', () => {
    it('should return overlay data', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/analysis/overlays' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.circularNodeIds).toBeDefined();
      expect(body.orphanNodeIds).toBeDefined();
      expect(body.hubNodeIds).toBeDefined();
      expect(Array.isArray(body.circularNodeIds)).toBe(true);
    });
  });

  // ─── GET /api/source-snippet ───

  describe('GET /api/source-snippet', () => {
    it('should return source code snippet', async () => {
      const file = encodeURIComponent(resolve(fixturesDir, 'SampleComponent.vue'));
      const res = await fastify.inject({ method: 'GET', url: `/api/source-snippet?file=${file}&line=5` });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.lines).toBeDefined();
      expect(body.lines.length).toBeGreaterThan(0);
      expect(body.lines[0]).toHaveProperty('num');
      expect(body.lines[0]).toHaveProperty('text');
      expect(body.lines[0]).toHaveProperty('highlight');
    });

    it('should return 400 when missing parameters', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/source-snippet' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for nonexistent file', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/source-snippet?file=/nonexistent&line=1' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── GET /api/analysis/parse-errors ───

  describe('GET /api/analysis/parse-errors', () => {
    it('should return parse errors array', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/analysis/parse-errors' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.errors).toBeDefined();
      expect(Array.isArray(body.errors)).toBe(true);
    });
  });

  // ─── GET /api/analysis/unresolved-edges ───

  describe('GET /api/analysis/unresolved-edges', () => {
    it('should return unresolved edges array', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/analysis/unresolved-edges' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.edges).toBeDefined();
      expect(Array.isArray(body.edges)).toBe(true);
    });

    it('should exclude external package imports', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/analysis/unresolved-edges' });
      const body = JSON.parse(res.body);
      for (const edge of body.edges) {
        if (edge.importPath) {
          const isExternal = !edge.importPath.startsWith('.') && !edge.importPath.startsWith('@/') && !edge.importPath.startsWith('~');
          expect(isExternal).toBe(false);
        }
      }
    });

    it('should include sourceLabel and prefix fields', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/analysis/unresolved-edges' });
      const body = JSON.parse(res.body);
      if (body.edges.length > 0) {
        const edge = body.edges[0];
        expect(edge).toHaveProperty('sourceLabel');
        expect(edge).toHaveProperty('prefix');
        expect(edge).toHaveProperty('edgeKind');
        expect(['unresolved', 'component', 'store', 'composable']).toContain(edge.prefix);
      }
    });
  });

  // ─── GET /api/graph/paths with edgeKinds ───

  describe('GET /api/graph/paths with edgeKinds', () => {
    it('should accept edgeKinds query parameter', async () => {
      const graphRes = await fastify.inject({ method: 'GET', url: '/api/graph' });
      const graph = JSON.parse(graphRes.body);
      if (graph.nodes.length < 2) return;

      const from = encodeURIComponent(graph.nodes[0].id);
      const to = encodeURIComponent(graph.nodes[1].id);

      const res = await fastify.inject({
        method: 'GET',
        url: `/api/graph/paths?from=${from}&to=${to}&maxDepth=5&edgeKinds=imports,uses-component`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('paths');
      expect(body).toHaveProperty('count');
      expect(Array.isArray(body.paths)).toBe(true);
    });

    it('should treat empty edgeKinds query as no allowed edge kinds', async () => {
      const graphRes = await fastify.inject({ method: 'GET', url: '/api/graph' });
      const graph = JSON.parse(graphRes.body);
      if (graph.edges.length === 0) return;

      const from = encodeURIComponent(graph.edges[0].source);
      const to = encodeURIComponent(graph.edges[0].target);

      const allRes = await fastify.inject({
        method: 'GET',
        url: `/api/graph/paths?from=${from}&to=${to}&maxDepth=5`,
      });
      const emptyRes = await fastify.inject({
        method: 'GET',
        url: `/api/graph/paths?from=${from}&to=${to}&maxDepth=5&edgeKinds=`,
      });

      expect(allRes.statusCode).toBe(200);
      expect(emptyRes.statusCode).toBe(200);

      const allBody = JSON.parse(allRes.body);
      const emptyBody = JSON.parse(emptyRes.body);

      expect(allBody.count).toBeGreaterThan(0);
      expect(emptyBody.count).toBe(0);
      expect(emptyBody.paths).toEqual([]);
    });
  });

  // ─── GET /api/graph/matrix ───

  describe('GET /api/graph/matrix', () => {
    it('should return matrix data with modules and 2D array', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/graph/matrix?depth=2' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('modules');
      expect(body).toHaveProperty('matrix');
      expect(body).toHaveProperty('edgeDetails');
      expect(Array.isArray(body.modules)).toBe(true);
      expect(Array.isArray(body.matrix)).toBe(true);
      if (body.modules.length > 0) {
        expect(body.matrix.length).toBe(body.modules.length);
        expect(body.matrix[0].length).toBe(body.modules.length);
      }
    });
  });

  // ─── POST /api/analysis/change-impact ───

  describe('POST /api/analysis/change-impact', () => {
    it('should return impact analysis for given files', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/api/analysis/change-impact',
        payload: { files: ['useAuth.ts'] },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('changedNodes');
      expect(body).toHaveProperty('directImpact');
      expect(body).toHaveProperty('transitiveImpact');
      expect(body.summary).toHaveProperty('changed');
    });

    it('should return 400 when files array is missing', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/api/analysis/change-impact',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /api/analysis/rule-violations ───

  describe('GET /api/analysis/rule-violations', () => {
    it('should return violations array with count', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/analysis/rule-violations' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('violations');
      expect(body).toHaveProperty('count');
      expect(Array.isArray(body.violations)).toBe(true);
      expect(body.count).toBe(body.violations.length);
    });
  });

  // ─── POST /api/analyze ───

  describe('POST /api/analyze', () => {
    it('should trigger re-analysis', async () => {
      const res = await fastify.inject({ method: 'POST', url: '/api/analyze' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('complete');
    });
  });

  // ─── POST /api/auth/login (auth disabled) ───

  describe('POST /api/auth/login (auth disabled)', () => {
    it('should return null token when auth is disabled', async () => {
      const res = await fastify.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'test' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.token).toBeNull();
      expect(body.message).toBe('Authentication is disabled');
    });
  });

  // ─── GET /api/auth/me (auth disabled) ───

  describe('GET /api/auth/me (auth disabled)', () => {
    it('should report auth disabled', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/auth/me' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.authEnabled).toBe(false);
      expect(body.user).toBeNull();
    });
  });

  // ─── GET /api/admin/audit-log ───

  describe('GET /api/admin/audit-log', () => {
    it('should return audit log entries', async () => {
      // First trigger some auditable actions
      await fastify.inject({ method: 'GET', url: '/api/stats' });
      await fastify.inject({ method: 'GET', url: '/api/graph' });

      const res = await fastify.inject({ method: 'GET', url: '/api/admin/audit-log' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.logs).toBeDefined();
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBeGreaterThan(0);

      // Verify entry structure
      const entry = body.logs[0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('user');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('target');
      expect(entry).toHaveProperty('ip');
    });

    it('should respect limit parameter', async () => {
      const res = await fastify.inject({ method: 'GET', url: '/api/admin/audit-log?limit=1' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.logs.length).toBeLessThanOrEqual(1);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auth-enabled test suite
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Server API (auth enabled)', () => {
  let fastify: ReturnType<typeof Fastify>;
  let engine: AnalysisEngine;
  const TEST_PASSWORD = 'test-secret-password';

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(cors);

    engine = new AnalysisEngine(fixturesDir, {}, false);
    await engine.initialize();

    const auditLog = new AuditLog();
    const env = loadEnv({
      authEnabled: true,
      jwtSecret: 'test-jwt-secret-key',
      adminUser: 'admin',
      adminPassword: TEST_PASSWORD,
    });

    await registerAuthHook(fastify, env);
    registerAuditHook(fastify, auditLog);
    registerHealthRoutes(fastify, engine);
    registerAuthRoutes(fastify, env, auditLog);
    registerGraphRoutes(fastify, engine);
    registerAnalysisRoutes(fastify, engine);
    registerSearchRoutes(fastify, engine);

    fastify.get('/api/admin/audit-log', async (request, reply) => {
      const { limit } = request.query as { limit?: string };
      return { logs: auditLog.getEntries(limit ? parseInt(limit, 10) : 50) };
    });

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  // ─── Health endpoints are public ───

  it('GET /health should not require auth', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  it('GET /health/ready should not require auth', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
  });

  // ─── Protected endpoints return 401 without token ───

  it('GET /api/graph should return 401 without token', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/api/graph' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('GET /api/stats should return 401 without token', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/api/stats' });
    expect(res.statusCode).toBe(401);
  });

  // ─── Login flow ───

  it('POST /api/auth/login with wrong credentials should return 401', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Invalid credentials');
  });

  it('POST /api/auth/login with missing fields should return 400', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/login with correct credentials should return JWT', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: TEST_PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  // ─── Authenticated requests ───

  it('should access protected API with valid token', async () => {
    // Login first
    const loginRes = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: TEST_PASSWORD },
    });
    const { token } = JSON.parse(loginRes.body);

    // Access protected endpoint
    const res = await fastify.inject({
      method: 'GET',
      url: '/api/graph',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.nodes).toBeDefined();
    expect(body.nodes.length).toBeGreaterThan(0);
  });

  it('GET /api/auth/me should return user info with valid token', async () => {
    const loginRes = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: TEST_PASSWORD },
    });
    const { token } = JSON.parse(loginRes.body);

    const res = await fastify.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.authEnabled).toBe(true);
    expect(body.user.username).toBe('admin');
    expect(body.user.role).toBe('admin');
  });

  // ─── Audit log records auth events ───

  it('audit log should record login events', async () => {
    // Trigger a failed login
    await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'hacker', password: 'wrong' },
    });

    // Trigger a successful login
    const loginRes = await fastify.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: TEST_PASSWORD },
    });
    const { token } = JSON.parse(loginRes.body);

    // Read audit log
    const res = await fastify.inject({
      method: 'GET',
      url: '/api/admin/audit-log',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.logs.length).toBeGreaterThan(0);

    // Should have login:success and login:failed entries
    const actions = body.logs.map((l: any) => l.action);
    expect(actions).toContain('login:success');
    expect(actions).toContain('login:failed');
  });
});
