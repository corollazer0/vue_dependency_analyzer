// Phase 2 benchmark — measures the four gate metrics:
//
//   1. Cold analysis duration (no .vda-cache).
//   2. Warm analysis duration (full .vda-cache hit on the same content).
//   3. Server heap peak after analysis (via /api/admin/metrics).
//   4. /api/graph/overview payload size.
//
// Compares against the baseline captured in docs/phase-ultra/phase1-benchmark.md
// when available. Run with:
//   npx tsx packages/server/src/__tests__/benchmark-phase2.ts <project-dir>
//
// Defaults to test-project-ecommerce. Emits one JSON object on stdout for
// downstream tooling and a human-readable summary on stderr.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import { constants as zlibConstants } from 'zlib';
import { resolve, join } from 'path';
import { existsSync, rmSync } from 'fs';
import { AnalysisEngine } from '../engine.js';
import { registerGraphRoutes } from '../routes/graphRoutes.js';
import { registerHealthRoutes } from '../routes/healthRoutes.js';

interface PhaseRun {
  durationMs: number;
  nodeCount: number;
  edgeCount: number;
  heapPeakMB: number;
  rssPeakMB: number;
}

async function buildServer(projectDir: string) {
  const fastify = Fastify({ logger: false });
  await fastify.register(cors);
  await fastify.register(compress, {
    encodings: ['br', 'gzip', 'deflate'],
    threshold: 1024,
    brotliOptions: {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      },
    },
  });

  const engine = new AnalysisEngine(projectDir, {}, false);
  const startMs = Date.now();
  await engine.initialize();
  const analyzeMs = Date.now() - startMs;

  registerHealthRoutes(fastify, engine);
  registerGraphRoutes(fastify, engine);
  await fastify.ready();

  const stats = engine.getStats();
  const peaks = engine.getMemoryPeaks();

  return {
    fastify,
    engine,
    run: {
      durationMs: analyzeMs,
      nodeCount: stats.totalNodes,
      edgeCount: stats.totalEdges,
      heapPeakMB: peaks.heapPeakMB,
      rssPeakMB: peaks.rssPeakMB,
    } as PhaseRun,
  };
}

async function main() {
  const projectDir = resolve(process.argv[2] || 'test-project-ecommerce');
  const cacheDir = join(projectDir, '.vda-cache');

  // Cold: ensure no cache exists. Subsequent warm run reuses it.
  if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });
  process.stderr.write(`[bench] project = ${projectDir}\n`);
  process.stderr.write('[bench] cold run (no cache)…\n');
  const cold = await buildServer(projectDir);
  await cold.fastify.close();
  cold.engine.dispose();

  process.stderr.write('[bench] warm run (cache primed)…\n');
  const warm = await buildServer(projectDir);

  // Overview payload (warm engine — server cache hit on the second-call path
  // would skew, so first call wins the measurement).
  const overviewRes = await warm.fastify.inject({ method: 'GET', url: '/api/graph/overview' });
  const overviewBytes = Buffer.byteLength(overviewRes.body, 'utf8');

  // Pull /api/admin/metrics for the heap peak read.
  const metricsRes = await warm.fastify.inject({ method: 'GET', url: '/api/admin/metrics' });
  const metrics = JSON.parse(metricsRes.body) as {
    memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
    peaks: { heapPeakMB: number; rssPeakMB: number; lastAnalysisMs: number };
  };

  await warm.fastify.close();
  warm.engine.dispose();

  const result = {
    project: projectDir,
    cold: cold.run,
    warm: warm.run,
    deltas: {
      analysisMs: warm.run.durationMs - cold.run.durationMs,
      analysisRatio: +(warm.run.durationMs / Math.max(1, cold.run.durationMs)).toFixed(3),
    },
    overview: {
      bytes: overviewBytes,
      under5kb: overviewBytes < 5 * 1024,
    },
    metrics: {
      currentHeapMB: metrics.memory.heapUsedMB,
      currentRssMB: metrics.memory.rssMB,
      peakHeapMB: metrics.peaks.heapPeakMB,
      peakRssMB: metrics.peaks.rssPeakMB,
    },
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
  process.stderr.write(
    `[bench] cold=${cold.run.durationMs}ms warm=${warm.run.durationMs}ms ` +
    `peakHeap=${metrics.peaks.heapPeakMB}MB overview=${overviewBytes}B\n`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
