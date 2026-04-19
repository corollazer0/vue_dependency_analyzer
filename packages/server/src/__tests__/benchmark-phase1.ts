// Phase 1 benchmark — reports /api/graph payload size (uncompressed vs brotli) and
// cold-vs-warm request timing for the dirty-flag cache. Invoked manually:
//   npx tsx packages/server/src/__tests__/benchmark-phase1.ts <project-dir>
// Defaults to the test-project-ecommerce fixture that ships with the repo.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import { constants as zlibConstants } from 'zlib';
import { resolve } from 'path';
import { AnalysisEngine } from '../engine.js';
import { registerGraphRoutes } from '../routes/graphRoutes.js';

async function main() {
  const projectDir = resolve(process.argv[2] || 'test-project-ecommerce');
  // eslint-disable-next-line no-console
  console.log(`[bench] project = ${projectDir}`);

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
  const analyzeStart = Date.now();
  await engine.initialize();
  const analyzeMs = Date.now() - analyzeStart;
  registerGraphRoutes(fastify, engine);
  await fastify.ready();

  // Uncompressed
  const rawT0 = performance.now();
  const raw = await fastify.inject({ method: 'GET', url: '/api/graph' });
  const rawMs = performance.now() - rawT0;

  // Brotli
  const brT0 = performance.now();
  const br = await fastify.inject({
    method: 'GET',
    url: '/api/graph',
    headers: { 'accept-encoding': 'br' },
  });
  const brMs = performance.now() - brT0;

  // Cache-hit (revalidated)
  const etag = br.headers.etag as string;
  const revT0 = performance.now();
  const rev = await fastify.inject({
    method: 'GET',
    url: '/api/graph',
    headers: { 'accept-encoding': 'br', 'if-none-match': etag },
  });
  const revMs = performance.now() - revT0;

  // Warm cache (same body, no If-None-Match) — should be free-er than cold.
  const warmT0 = performance.now();
  const warm = await fastify.inject({
    method: 'GET',
    url: '/api/graph',
    headers: { 'accept-encoding': 'br' },
  });
  const warmMs = performance.now() - warmT0;

  const stats = engine.getStats();
  const rawBytes = Buffer.byteLength(raw.body, 'utf8');
  const brBytes = br.rawPayload.length;
  const reduction = ((1 - brBytes / rawBytes) * 100).toFixed(1);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    project: projectDir,
    analyze: {
      durationMs: analyzeMs,
      nodeCount: stats.totalNodes,
      edgeCount: stats.totalEdges,
    },
    transport: {
      uncompressedBytes: rawBytes,
      brotliBytes: brBytes,
      reductionPercent: Number(reduction),
    },
    timing: {
      coldUncompressedMs: Number(rawMs.toFixed(1)),
      coldBrotliMs: Number(brMs.toFixed(1)),
      revalidated304Ms: Number(revMs.toFixed(1)),
      warmCachedMs: Number(warmMs.toFixed(1)),
    },
    revalidatedStatus: rev.statusCode,
  }, null, 2));

  await fastify.close();
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
