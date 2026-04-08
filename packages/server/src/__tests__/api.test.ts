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
