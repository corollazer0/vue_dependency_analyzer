import type { FastifyInstance } from 'fastify';
import type { AnalysisEngine } from '../engine.js';

export function registerAnalysisRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  fastify.post('/api/analyze', async (request, reply) => {
    await engine.runAnalysis();
    return { status: 'complete' };
  });

  fastify.post('/api/analyze/cancel', async (request, reply) => {
    engine.cancelAnalysis();
    return { status: 'cancelled' };
  });

  fastify.get('/api/stats', async (request, reply) => {
    return engine.getStats();
  });

  fastify.get('/api/analysis/dto-consistency', async (request, reply) => {
    return engine.checkDtoConsistency();
  });

  fastify.post('/api/analysis/change-impact', async (request, reply) => {
    const { files } = request.body as { files?: string[] };
    if (!files || !Array.isArray(files) || files.length === 0) {
      reply.code(400);
      return { error: '"files" array is required' };
    }
    const impact = engine.analyzeChangeImpact(files);
    return {
      ...impact,
      changedNodes: impact.changedNodes.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
      directImpact: impact.directImpact.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
      transitiveImpact: impact.transitiveImpact.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
      affectedEndpoints: impact.affectedEndpoints.map(n => ({ id: n.id, label: n.label })),
      affectedTables: impact.affectedTables.map(n => ({ id: n.id, label: n.label })),
    };
  });

  fastify.get('/api/analysis/rule-violations', async (request, reply) => {
    return engine.checkRuleViolations();
  });

  // Phase 7b-4 — F3 layer compliance matrix.
  fastify.get('/api/analysis/layer-compliance', async () => {
    return engine.getLayerCompliance();
  });

  // Phase 8-6 — F6 breaking-change detector.
  fastify.get('/api/analysis/breaking-changes', async (request) => {
    const { baseline } = request.query as { baseline?: string };
    return engine.getBreakingChanges({ baseline });
  });

  // Phase 9-9 — F9 anti-pattern classifier.
  fastify.get('/api/analysis/anti-patterns', async () => {
    return engine.getAntiPatterns();
  });
}
