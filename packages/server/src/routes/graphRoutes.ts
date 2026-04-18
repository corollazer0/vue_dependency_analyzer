import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AnalysisEngine } from '../engine.js';
import { pathsResponseSchema, errorSchema } from './schemas.js';

// Phase 1-3 — Dirty-flag cache + ETag for /api/graph.
// We cache the pre-stringified JSON keyed by (graphVersion, queryKey). On 2xx we send
// the buffer directly (Fastify skips JSON.stringify when payload is a Buffer/string with
// content-type set). A matching If-None-Match short-circuits to 304 so repeat navigations
// pay only TCP + headers.
interface GraphCacheEntry {
  etag: string;
  body: string;
}

export function registerGraphRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  // Per-engine cache. Keys combine analyzedAt (swapped on every new runAnalysis) and the
  // monotonic graph.version (bumped on every mutation) so warm-path invalidation is exact.
  const graphCache = new Map<string, GraphCacheEntry>();
  const MAX_CACHE_ENTRIES = 16;

  function cacheKey(queryKey: string): string {
    const v = engine.getGraphRevision();
    return `${v}|${queryKey}`;
  }

  function getCached(queryKey: string): GraphCacheEntry | undefined {
    return graphCache.get(cacheKey(queryKey));
  }

  function setCached(queryKey: string, body: string): GraphCacheEntry {
    const key = cacheKey(queryKey);
    // Purge stale revisions on first write after a mutation.
    if (!graphCache.has(key)) {
      const currentPrefix = key.split('|')[0] + '|';
      for (const existing of graphCache.keys()) {
        if (!existing.startsWith(currentPrefix)) graphCache.delete(existing);
      }
      while (graphCache.size >= MAX_CACHE_ENTRIES) {
        const oldest = graphCache.keys().next().value;
        if (oldest === undefined) break;
        graphCache.delete(oldest);
      }
    }
    const etag = `W/"g${key}-${body.length}"`;
    const entry = { etag, body };
    graphCache.set(key, entry);
    return entry;
  }

  function sendWithEtag(request: FastifyRequest, reply: FastifyReply, entry: GraphCacheEntry): unknown {
    const ifNoneMatch = request.headers['if-none-match'];
    reply.header('ETag', entry.etag);
    // Clients MUST revalidate — graph edits invalidate version immediately.
    reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      reply.code(304);
      return null;
    }
    reply.type('application/json; charset=utf-8');
    return reply.send(entry.body);
  }

  // Full graph or filtered.
  // Response shape varies (SerializedGraph vs ClusterGraph) so we hand-stringify and
  // ship the buffer directly instead of leaning on fast-json-stringify — see 1-3 cache.
  fastify.get(
    '/api/graph',
    async (request, reply) => {
      const { nodeKinds, edgeKinds, cluster, depth } = request.query as {
        nodeKinds?: string;
        edgeKinds?: string;
        cluster?: string;
        depth?: string;
      };

      const queryKey = cluster === 'true'
        ? `cluster:${depth ?? '1'}`
        : nodeKinds || edgeKinds
          ? `filter:${nodeKinds ?? ''}|${edgeKinds ?? ''}`
          : 'full';

      const hit = getCached(queryKey);
      if (hit) {
        return sendWithEtag(request, reply, hit);
      }

      // Clustered view
      let payload: unknown;
      if (cluster === 'true') {
        payload = engine.getGraphClustered(depth ? parseInt(depth, 10) : 1);
      } else if (nodeKinds || edgeKinds) {
        const nk = nodeKinds?.split(',');
        const ek = edgeKinds?.split(',');
        payload = engine.getGraphFiltered(nk, ek);
      } else {
        payload = engine.getGraph();
      }

      const body = JSON.stringify(payload);
      const entry = setCached(queryKey, body);
      return sendWithEtag(request, reply, entry);
    },
  );

  // Expand a cluster
  fastify.get('/api/graph/cluster/:clusterId', async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    return engine.expandCluster(decodeURIComponent(clusterId));
  });

  // Single node detail — query param to support IDs with slashes
  fastify.get('/api/graph/node', async (request, reply) => {
    const { id } = request.query as { id?: string };
    if (!id) {
      reply.code(400);
      return { error: '"id" query parameter is required' };
    }
    const result = engine.getNode(decodeURIComponent(id));
    if (!result) {
      reply.code(404);
      return { error: 'Node not found' };
    }
    return result;
  });

  // Impact analysis — query param
  fastify.get('/api/graph/node/impact', async (request, reply) => {
    const { id, depth } = request.query as { id?: string; depth?: string };
    if (!id) {
      reply.code(400);
      return { error: '"id" query parameter is required' };
    }
    return engine.getNodeImpact(decodeURIComponent(id), depth ? parseInt(depth, 10) : undefined);
  });

  // Path finding between two nodes
  fastify.get(
    '/api/graph/paths',
    {
      schema: {
        response: {
          200: pathsResponseSchema,
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { from, to, maxDepth, edgeKinds } = request.query as { from?: string; to?: string; maxDepth?: string; edgeKinds?: string };
      if (!from || !to) {
        reply.code(400);
        return { error: 'Both "from" and "to" query parameters are required' };
      }
      // Distinguish omitted edgeKinds from an explicitly empty edgeKinds=
      const edgeKindList = edgeKinds !== undefined ? edgeKinds.split(',').filter(Boolean) : undefined;
      const paths = engine.findPaths(
        decodeURIComponent(from),
        decodeURIComponent(to),
        maxDepth ? parseInt(maxDepth, 10) : 10,
        edgeKindList,
      );
      return { paths, count: paths.length };
    },
  );

  // Dependency matrix data
  fastify.get('/api/graph/matrix', async (request, reply) => {
    const { depth } = request.query as { depth?: string };
    return engine.getMatrixData(depth ? parseInt(depth, 10) : 3);
  });

  // Analysis overlays (circular, orphan, hub node IDs)
  fastify.get('/api/analysis/overlays', async (request, reply) => {
    return engine.getAnalysisOverlays();
  });

  // Source code snippet
  fastify.get('/api/source-snippet', async (request, reply) => {
    const { file, line, context } = request.query as { file?: string; line?: string; context?: string };
    if (!file || !line) {
      reply.code(400);
      return { error: '"file" and "line" parameters required' };
    }
    const result = engine.getSourceSnippet(
      decodeURIComponent(file),
      parseInt(line, 10),
      context ? parseInt(context, 10) : 5,
    );
    if (!result) {
      reply.code(404);
      return { error: 'File not found' };
    }
    return result;
  });

  // Parse errors
  fastify.get('/api/analysis/parse-errors', async (request, reply) => {
    return { errors: engine.getParseErrors() };
  });

  // Unresolved edges
  fastify.get('/api/analysis/unresolved-edges', async (request, reply) => {
    return { edges: engine.getUnresolvedEdges() };
  });
}
