import type { FastifyInstance } from 'fastify';
import type { AnalysisEngine } from '../engine.js';

export function registerGraphRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  // Full graph or filtered
  fastify.get('/api/graph', async (request, reply) => {
    const { nodeKinds, edgeKinds, cluster, depth } = request.query as {
      nodeKinds?: string;
      edgeKinds?: string;
      cluster?: string;
      depth?: string;
    };

    // Clustered view
    if (cluster === 'true') {
      return engine.getGraphClustered(depth ? parseInt(depth, 10) : 1);
    }

    // Filtered view
    if (nodeKinds || edgeKinds) {
      const nk = nodeKinds?.split(',');
      const ek = edgeKinds?.split(',');
      return engine.getGraphFiltered(nk, ek);
    }

    return engine.getGraph();
  });

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
  fastify.get('/api/graph/paths', async (request, reply) => {
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
