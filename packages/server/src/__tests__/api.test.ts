import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerGraphRoutes } from '../routes/graphRoutes.js';
import { registerAnalysisRoutes } from '../routes/analysisRoutes.js';
import { registerSearchRoutes } from '../routes/searchRoutes.js';
import { AnalysisEngine } from '../engine.js';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../core/src/__fixtures__');

describe('Server API', () => {
  let fastify: ReturnType<typeof Fastify>;
  let engine: AnalysisEngine;

  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(cors);

    engine = new AnalysisEngine(fixturesDir, {}, false);
    await engine.initialize();

    registerGraphRoutes(fastify, engine);
    registerAnalysisRoutes(fastify, engine);
    registerSearchRoutes(fastify, engine);

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
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
      // Test with a node that has file path in ID (slash-containing)
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
      // Get graph to find connected nodes
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
      // No edge should have an importPath that is a bare specifier (external package)
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
      // First get two nodes to use as from/to
      const graphRes = await fastify.inject({ method: 'GET', url: '/api/graph' });
      const graph = JSON.parse(graphRes.body);
      if (graph.nodes.length < 2) return; // skip if not enough nodes

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
});
