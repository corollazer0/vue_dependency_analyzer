// Phase 5-2 harness server. Minimal Node `http` server — no Fastify dep so
// `@vda/bench` stays self-contained.
//
// Serves:
//   /                     → web-ui dist index.html
//   /assets/*             → web-ui static assets
//   /api/graph            → fixture JSON (synthetic 5K graph)
//   /api/graph/overlays   → empty overlays (bench does not exercise analyses)
//   /api/graph/overlays/* → same
//   /api/auth/me          → { authEnabled: false }  (auth-off path)
//   /api/search           → []
//   /api/stats            → stub (first-load telemetry ignores this)
//   /api/rule-violations  → { violations: [], count: 0 }
//   /api/*                → 404
//   /<anything-else>      → index.html (SPA fallback)
import { createServer, IncomingMessage, ServerResponse } from 'http';
import type { Server } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import type { SerializedGraph, GraphNode } from '@vda/core';

interface ClusterNode {
  id: string;
  label: string;
  childCount: number;
  childKinds: Record<string, number>;
}

interface ClusterEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  kinds: string[];
}

// Naïve directory-bucket clustering — the harness doesn't need the Louvain
// fidelity of the real engine, only the same response shape so the web-ui
// clustering path exercises under the same runtime load as production.
function buildClusters(graph: SerializedGraph): {
  clusters: ClusterNode[];
  edges: ClusterEdge[];
  nodeToCluster: Map<string, string>;
} {
  const groups = new Map<string, GraphNode[]>();
  for (const node of graph.nodes) {
    // Bucket by the second-level directory segment, mirroring the real engine's
    // "top directories" depth=2. db-table / unknown paths fall into 'misc'.
    let bucket = 'misc';
    const parts = node.filePath.split('/').filter(Boolean);
    if (parts.length >= 2) bucket = `${parts[0]}/${parts[1]}`;
    else if (parts.length >= 1) bucket = parts[0];
    const arr = groups.get(bucket) ?? [];
    arr.push(node);
    groups.set(bucket, arr);
  }
  const clusters: ClusterNode[] = [];
  const nodeToCluster = new Map<string, string>();
  let idx = 0;
  for (const [bucket, nodes] of groups) {
    const cid = `cluster:c${idx++}`;
    const childKinds: Record<string, number> = {};
    for (const n of nodes) {
      childKinds[n.kind] = (childKinds[n.kind] ?? 0) + 1;
      nodeToCluster.set(n.id, cid);
    }
    clusters.push({ id: cid, label: bucket, childCount: nodes.length, childKinds });
  }
  // Aggregate inter-cluster edges.
  const edgeMap = new Map<string, ClusterEdge>();
  for (const e of graph.edges) {
    const sc = nodeToCluster.get(e.source);
    const tc = nodeToCluster.get(e.target);
    if (!sc || !tc || sc === tc) continue;
    const key = `${sc}→${tc}`;
    let agg = edgeMap.get(key);
    if (!agg) {
      agg = { id: `${sc}:edge:${tc}`, source: sc, target: tc, weight: 0, kinds: [] };
      edgeMap.set(key, agg);
    }
    agg.weight++;
    if (!agg.kinds.includes(e.kind)) agg.kinds.push(e.kind);
  }
  return { clusters, edges: [...edgeMap.values()], nodeToCluster };
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.woff2':'font/woff2',
  '.ico':  'image/x-icon',
  '.map':  'application/json; charset=utf-8',
};

export interface HarnessServerOptions {
  /** Absolute path to the synthetic fixture JSON. */
  fixturePath: string;
  /** Absolute path to the web-ui dist directory. */
  webUiDist: string;
  /** 0 = OS-assigned port. */
  port?: number;
}

export interface HarnessServerHandle {
  server: Server;
  port: number;
  close: () => Promise<void>;
}

function send(res: ServerResponse, status: number, body: string | Buffer, contentType: string) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export async function startHarnessServer(opts: HarnessServerOptions): Promise<HarnessServerHandle> {
  const fixtureRaw = readFileSync(opts.fixturePath, 'utf-8');
  // Validate fixture has the shape the web-ui expects.
  const parsed = JSON.parse(fixtureRaw) as SerializedGraph;
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error(`${opts.fixturePath}: not a SerializedGraph (missing nodes/edges)`);
  }

  const webUiDist = resolve(opts.webUiDist);
  if (!existsSync(join(webUiDist, 'index.html'))) {
    throw new Error(`${webUiDist}/index.html not found — run \`npx -w @vda/web-ui run build\` first`);
  }

  // Lazy-compute the cluster response; real engine memoises too.
  let clusterCache: ReturnType<typeof buildClusters> | null = null;
  const getClusters = () => {
    if (!clusterCache) clusterCache = buildClusters(parsed);
    return clusterCache;
  };

  const handler = (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '/';
    const pathname = url.split('?')[0];
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const params = new URLSearchParams(query);

    // API routes first.
    if (pathname === '/api/graph') {
      if (params.get('cluster') === 'true') {
        const c = getClusters();
        return send(res, 200, JSON.stringify({ clusters: c.clusters, edges: c.edges }), MIME['.json']);
      }
      return send(res, 200, fixtureRaw, MIME['.json']);
    }
    if (pathname.startsWith('/api/graph/cluster/')) {
      const clusterId = decodeURIComponent(pathname.slice('/api/graph/cluster/'.length));
      const c = getClusters();
      const members: GraphNode[] = [];
      const memberIds = new Set<string>();
      for (const [nodeId, cid] of c.nodeToCluster) {
        if (cid !== clusterId) continue;
        const node = parsed.nodes.find((n) => n.id === nodeId);
        if (node) { members.push(node); memberIds.add(nodeId); }
      }
      const edges = parsed.edges.filter((e) => memberIds.has(e.source) || memberIds.has(e.target));
      return send(res, 200, JSON.stringify({ nodes: members, edges }), MIME['.json']);
    }
    if (pathname === '/api/graph/overlays' || pathname === '/api/analysis/overlays') {
      return send(res, 200, JSON.stringify({
        circularNodeIds: [], orphanNodeIds: [], hubNodeIds: [], circularGroups: [],
      }), MIME['.json']);
    }
    if (pathname === '/api/auth/me') {
      return send(res, 200, JSON.stringify({ authEnabled: false, user: null }), MIME['.json']);
    }
    if (pathname === '/api/search') {
      return send(res, 200, '[]', MIME['.json']);
    }
    if (pathname === '/api/stats') {
      return send(res, 200, JSON.stringify({
        nodesByKind: {}, edgesByKind: {}, totalNodes: parsed.nodes.length, totalEdges: parsed.edges.length,
        circularDeps: [], orphanNodes: [], unusedEndpoints: [], topComplexity: [], cacheSize: 0,
      }), MIME['.json']);
    }
    if (pathname === '/api/rule-violations') {
      return send(res, 200, JSON.stringify({ violations: [], count: 0 }), MIME['.json']);
    }
    if (pathname === '/api/parse-errors') {
      return send(res, 200, '[]', MIME['.json']);
    }
    if (pathname === '/api/unresolved-edges') {
      return send(res, 200, '[]', MIME['.json']);
    }
    if (pathname === '/api/dto-consistency') {
      return send(res, 200, '[]', MIME['.json']);
    }
    if (pathname === '/api/health' || pathname === '/health' || pathname === '/health/ready') {
      return send(res, 200, JSON.stringify({ ready: true, analyzing: false, nodeCount: parsed.nodes.length, edgeCount: parsed.edges.length }), MIME['.json']);
    }
    // Analysis endpoints return empty/noop payloads so the side panels on the
    // landing page don't log fetch errors during the bench run.
    if (
      pathname === '/api/analysis/parse-errors' ||
      pathname === '/api/analysis/unresolved-edges' ||
      pathname === '/api/analysis/dto-consistency' ||
      pathname === '/api/analysis/change-impact'
    ) {
      return send(res, 200, '[]', MIME['.json']);
    }
    if (pathname === '/api/analysis/rule-violations') {
      return send(res, 200, JSON.stringify({ violations: [], count: 0 }), MIME['.json']);
    }
    if (pathname === '/api/graph/matrix') {
      return send(res, 200, JSON.stringify({ modules: [], matrix: [], edgeDetails: {} }), MIME['.json']);
    }
    if (pathname === '/api/source-snippet') {
      return send(res, 200, JSON.stringify({ lines: [] }), MIME['.json']);
    }
    if (pathname.startsWith('/api/')) {
      return send(res, 404, JSON.stringify({ error: 'not-found', path: pathname }), MIME['.json']);
    }

    // Static files under webUiDist.
    const relative = pathname === '/' ? '/index.html' : pathname;
    const safe = relative.replace(/\.\.+/g, '');
    const full = join(webUiDist, safe);
    if (existsSync(full) && statSync(full).isFile()) {
      const ext = extname(full);
      return send(res, 200, readFileSync(full), MIME[ext] ?? 'application/octet-stream');
    }

    // SPA fallback.
    return send(res, 200, readFileSync(join(webUiDist, 'index.html')), MIME['.html']);
  };

  const server = createServer(handler);
  await new Promise<void>((r) => server.listen(opts.port ?? 0, () => r()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('unexpected server address');
  const port = addr.port;

  return {
    server,
    port,
    close: () => new Promise<void>((resolveClose) => server.close(() => resolveClose())),
  };
}
