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

  // Phase 2 (5-) — process-level metrics. Lets the benchmark harness assert
  // the heap-peak gate and gives ops a quick read of current memory pressure.
  // Exposes the most recent peak observed since boot — sampled implicitly
  // by every /api/graph hit (engine bumps the high-water on each run).
  fastify.get('/api/admin/metrics', async (_request, _reply) => {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const info = engine.getHealthInfo();
    const peaks = engine.getMemoryPeaks();
    return {
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(1),
        rssMB: +(mem.rss / 1024 / 1024).toFixed(1),
        externalMB: +(mem.external / 1024 / 1024).toFixed(1),
        arrayBuffersMB: +(mem.arrayBuffers / 1024 / 1024).toFixed(1),
      },
      peaks,
      cpu: { userMs: cpu.user / 1000, systemMs: cpu.system / 1000 },
      graph: {
        nodeCount: info.nodeCount,
        edgeCount: info.edgeCount,
        analyzedAt: info.analyzedAt,
      },
    };
  });
}
