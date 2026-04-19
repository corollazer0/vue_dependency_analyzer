import type { FastifyInstance } from 'fastify';
import type { AnalysisEngine } from '../engine.js';
import { readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

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

  // Phase 10-6 — file-tree picker for ChangeImpactPanel "Files (tree)" mode.
  // Lazy: returns one level at a time (root by default) so 50K-file repos
  // don't ship 5 MB of tree on first open. Path is repo-relative; the server
  // jails reads to projectRoot.
  const SKIP_DIRS = new Set(['node_modules', '.git', '.vda-cache', 'dist', 'build', '.turbo']);
  fastify.get('/api/files/tree', async (request, reply) => {
    const { root: rootParam, depth: depthParam } = request.query as {
      root?: string;
      depth?: string;
    };
    const projectRoot = engine.getProjectRoot();
    const requested = rootParam ? decodeURIComponent(rootParam) : '';
    const absRoot = resolve(projectRoot, requested);
    // Path-jail: requested must stay inside projectRoot.
    if (absRoot !== projectRoot && !absRoot.startsWith(projectRoot + sep)) {
      reply.code(400);
      return { error: '"root" escapes the project root' };
    }
    let stat;
    try {
      stat = statSync(absRoot);
    } catch {
      reply.code(404);
      return { error: 'Directory not found' };
    }
    if (!stat.isDirectory()) {
      reply.code(400);
      return { error: '"root" is not a directory' };
    }
    const depth = Math.max(1, Math.min(3, depthParam ? parseInt(depthParam, 10) : 1));

    function walk(dir: string, remaining: number): Array<{ path: string; name: string; isDir: boolean; children?: any[] }> {
      const entries = readdirSync(dir, { withFileTypes: true });
      const out: Array<{ path: string; name: string; isDir: boolean; children?: any[] }> = [];
      for (const e of entries) {
        if (e.name.startsWith('.') && e.name !== '.vdarc.json') continue;
        if (SKIP_DIRS.has(e.name)) continue;
        const abs = resolve(dir, e.name);
        const rel = relative(projectRoot, abs).split(sep).join('/');
        if (e.isDirectory()) {
          const node: any = { path: rel, name: e.name, isDir: true };
          if (remaining > 1) node.children = walk(abs, remaining - 1);
          out.push(node);
        } else if (e.isFile()) {
          out.push({ path: rel, name: e.name, isDir: false });
        }
      }
      // Stable order: dirs first, then files, both alpha.
      out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
      return out;
    }

    return {
      root: relative(projectRoot, absRoot).split(sep).join('/'),
      entries: walk(absRoot, depth),
    };
  });
}
