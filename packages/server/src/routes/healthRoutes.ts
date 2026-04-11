import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { FastifyInstance } from 'fastify';
import type { AnalysisEngine } from '../engine.js';

const startTime = Date.now();

function getServerVersion(): string {
  try {
    const pkgPath = resolve(import.meta.dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

const serverVersion = getServerVersion();

export function registerHealthRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  // Liveness probe — always responds if the process is alive
  fastify.get('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: serverVersion,
    };
  });

  // Readiness probe — only ready after initial analysis is done and not currently analyzing
  fastify.get('/health/ready', async (_request, reply) => {
    const info = engine.getHealthInfo();
    if (!info.ready) {
      reply.code(503);
    }
    return {
      ready: info.ready,
      analyzing: info.analyzing,
      nodeCount: info.nodeCount,
      edgeCount: info.edgeCount,
      analyzedAt: info.analyzedAt,
    };
  });
}
