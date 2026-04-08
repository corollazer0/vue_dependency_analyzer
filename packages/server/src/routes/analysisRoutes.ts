import type { FastifyInstance } from 'fastify';
import type { AnalysisEngine } from '../engine.js';

export function registerAnalysisRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  fastify.post('/api/analyze', async (request, reply) => {
    await engine.runAnalysis();
    return { status: 'complete' };
  });

  fastify.get('/api/stats', async (request, reply) => {
    return engine.getStats();
  });

  fastify.get('/api/analysis/dto-consistency', async (request, reply) => {
    return engine.checkDtoConsistency();
  });
}
