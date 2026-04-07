import type { FastifyInstance } from 'fastify';
import type { AnalysisEngine } from '../engine.js';

export function registerSearchRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  fastify.get('/api/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q) return { results: [] };
    return { results: engine.search(q) };
  });
}
