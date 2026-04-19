import { readFileSync, existsSync } from 'fs';
import { resolve, join, sep as pathSep } from 'path';
import {
  DependencyGraph,
  CrossBoundaryResolver,
  ParallelParser,
  ParseCache,
  parseFile,
  findCircularDependencies,
  findOrphanNodes,
  findUnusedEndpoints,
  calculateComplexity,
  filterByKind,
  analyzeImpact,
  checkDtoConsistency,
  evaluateRules,
  analyzeChangeImpact as analyzeChangeImpactFn,
  findPaths as findPathsFn,
  toJSON,
  detectCommunities,
  type AnalysisConfig,
  type SerializedGraph,
  type ProgressInfo,
  type NodeKind,
  type EdgeKind,
  type GraphNode,
  type GraphEdge,
  type DtoMismatch,
  type RuleViolation,
  type CommunityResult,
} from '@vda/core';
import type { WebSocket } from 'ws';

/**
 * Minimal pino-compatible logger interface.
 * Supports both `log.info(obj, msg)` and `log.info(msg)` signatures
 * so it works with Fastify's built-in pino logger or a noop stub.
 */
export interface EngineLogger {
  info(msg: string): void;
  info(obj: object, msg: string): void;
  warn(msg: string): void;
  warn(obj: object, msg: string): void;
  error(msg: string): void;
  error(obj: object, msg: string): void;
}

const noopLogger: EngineLogger = {
  info() {},
  warn() {},
  error() {},
};

export class AnalysisEngine {
  private graph: DependencyGraph = new DependencyGraph();
  private config: AnalysisConfig & { projectRoot: string };
  private cache: ParseCache;
  private parser: ParallelParser;
  private clients: Set<WebSocket> = new Set();
  private watcher: any = null;
  private watchEnabled: boolean;
  private analyzing = false;
  private abortController: AbortController | null = null;
  private lastProgressBroadcast = 0;
  private initializeTime: string | null = null;
  private log: EngineLogger;
  // Phase 2 gate measurement: high-water marks recorded at the end of every
  // runAnalysis(). Surfaces the actual analysis peak instead of an arbitrary
  // sample window that /api/admin/metrics happens to land on.
  private peakHeapMB = 0;
  private peakRssMB = 0;
  private lastAnalysisDurationMs = 0;
  // Phase 3-2 — Louvain partition cached per (graph version + resolution). Both the
  // initial cluster-graph response and the follow-up expandCluster() call read from
  // this snapshot so the cluster ids the client received remain valid until the next
  // analysis bumps the graph version.
  private clusterCache: {
    key: string;
    result: CommunityResult;
    clusterIdToNodes: Map<string, GraphNode[]>;
  } | null = null;

  constructor(dir: string, options: Record<string, string | undefined>, watch: boolean, logger?: EngineLogger) {
    const projectRoot = resolve(dir);
    this.config = this.buildConfig(projectRoot, options);
    this.cache = new ParseCache(projectRoot, JSON.stringify(this.config));
    // Phase 2-2: long-lived parser owns a persistent worker pool. Workers
    // receive the AnalysisConfig once during init and are reused across
    // every runAnalysis() call (initial load + every file-watcher trigger).
    // Phase 2-6: parser also tags every node with serviceId at parse time —
    // engine no longer needs a post-hoc nodesIter() sweep.
    this.parser = new ParallelParser(this.config, undefined, this.config.projectRoot);
    this.watchEnabled = watch;
    this.log = logger || noopLogger;
  }

  private buildConfig(projectRoot: string, options: Record<string, string | undefined>): AnalysisConfig & { projectRoot: string } {
    let config: AnalysisConfig = {};

    const configPath = resolve(projectRoot, options.config || '.vdarc.json');
    if (existsSync(configPath)) {
      try {
        config = JSON.parse(readFileSync(configPath, 'utf-8'));
      } catch { /* ignore */ }
    }

    if (options.vueRoot) config.vueRoot = resolve(projectRoot, options.vueRoot);
    if (options.springRoot) config.springBootRoot = resolve(projectRoot, options.springRoot);

    if (config.vueRoot && !config.vueRoot.startsWith('/')) {
      config.vueRoot = resolve(projectRoot, config.vueRoot);
    }
    if (config.springBootRoot && !config.springBootRoot.startsWith('/')) {
      config.springBootRoot = resolve(projectRoot, config.springBootRoot);
    }

    if (!config.aliases) {
      config.aliases = { '@': config.vueRoot || join(projectRoot, 'src') };
    }

    return { ...config, projectRoot };
  }

  async initialize(): Promise<void> {
    this.log.info({ event: 'engine:initialize:start', projectRoot: this.config.projectRoot }, 'Engine initialization started');
    await this.runAnalysis();
    this.initializeTime = new Date().toISOString();
    if (this.watchEnabled) {
      await this.startWatching();
    }
    this.log.info({ event: 'engine:initialize:complete', nodeCount: this.graph.getNodeCount(), edgeCount: this.graph.getEdgeCount() }, 'Engine initialization complete');
  }

  async runAnalysis(): Promise<void> {
    if (this.analyzing) return;
    this.analyzing = true;
    this.abortController = new AbortController();

    try {
      this.log.info({ event: 'analysis:start' }, 'Analysis started');
      this.graph = new DependencyGraph();
      this.graph.metadata.projectRoot = this.config.projectRoot;
      this.graph.metadata.analyzedAt = new Date().toISOString();
      this.graph.metadata.config = this.config;

      const files = await this.discoverFiles();
      this.graph.metadata.fileCount = files.length;

      this.broadcast({
        type: 'analysis:started',
        payload: { totalFiles: files.length },
      });

      // Parallel parsing with cache (parser + pool reused across runs)
      const result = await this.parser.parseAll(
        files,
        // Progress callback — throttle to max 10/sec
        (info: ProgressInfo) => {
          if (this.abortController?.signal.aborted) {
            throw new Error('Analysis cancelled');
          }
          const now = Date.now();
          if (now - this.lastProgressBroadcast > 100) {
            this.lastProgressBroadcast = now;
            this.broadcast({
              type: 'analysis:progress',
              payload: info,
            });
          }
        },
        // Cache check
        (filePath: string, content: string) => {
          const cached = this.cache.get(filePath, content);
          return cached;
        },
      );

      // Add all parsed nodes/edges to graph
      for (const node of result.nodes) this.graph.addNode(node);
      for (const edge of result.edges) this.graph.addEdge(edge);
      this.graph.metadata.parseErrors = result.errors;

      // Persist freshly-parsed files to cache. ParallelParser already read
      // these files and parsed them, so reuse the content + per-file
      // attribution it returned (avoids a second readFileSync per file and
      // the prior O(files * (nodes + edges * fileNodeCount)) filter pattern).
      // Bulk-write in a single SQLite transaction.
      this.cache.setMany(
        result.parsedFileEntries
          .filter((e) => e.nodes.length > 0)
          .map((e) => ({
            filePath: e.filePath,
            content: e.content,
            result: { nodes: e.nodes, edges: e.edges, errors: e.errors },
          }))
      );

      // Phase 2-6: serviceId tagging now happens inside ParallelParser at
      // parse time — no post-hoc sweep required here.

      // Cross-boundary resolution
      const resolver = new CrossBoundaryResolver(this.config, this.config.projectRoot);
      resolver.resolve(this.graph);

      this.log.info({
        event: 'analysis:complete',
        totalFiles: files.length,
        totalNodes: this.graph.getNodeCount(),
        totalEdges: this.graph.getEdgeCount(),
        durationMs: result.durationMs,
        cachedCount: result.cachedCount,
      }, 'Analysis complete');

      // Capture process memory after full analysis (peak observed for the run).
      const mem = process.memoryUsage();
      const heapMB = mem.heapUsed / 1024 / 1024;
      const rssMB = mem.rss / 1024 / 1024;
      if (heapMB > this.peakHeapMB) this.peakHeapMB = heapMB;
      if (rssMB > this.peakRssMB) this.peakRssMB = rssMB;
      this.lastAnalysisDurationMs = result.durationMs;

      this.broadcast({
        type: 'analysis:complete',
        payload: {
          totalFiles: files.length,
          totalNodes: this.graph.getNodeCount(),
          totalEdges: this.graph.getEdgeCount(),
          durationMs: result.durationMs,
          cachedCount: result.cachedCount,
        },
      });
    } finally {
      this.analyzing = false;
      this.abortController = null;
    }
  }

  cancelAnalysis(): void {
    this.abortController?.abort();
  }

  private async discoverFiles(): Promise<string[]> {
    const { glob } = await import('glob');
    const patterns: string[] = [];
    const ignore = this.config.exclude || ['**/node_modules/**', '**/dist/**', '**/.git/**'];

    if (this.config.vueRoot) {
      patterns.push(join(this.config.vueRoot, '**/*.{vue,ts,js}'));
    }
    if (this.config.springBootRoot) {
      patterns.push(join(this.config.springBootRoot, '**/*.{java,kt}'));
      // Also scan for MyBatis XML — may be in resources/ sibling to java/
      const springParent = resolve(this.config.springBootRoot, '..');
      patterns.push(join(springParent, '**/*.xml'));
      patterns.push(join(this.config.springBootRoot, '**/*.xml'));
    }

    // MSA: additional service roots
    if (this.config.services && this.config.services.length > 0) {
      for (const service of this.config.services) {
        const serviceRoot = resolve(this.config.projectRoot, service.root);
        if (service.type === 'vue') {
          patterns.push(join(serviceRoot, '**/*.{vue,ts,js}'));
        } else if (service.type === 'spring-boot') {
          patterns.push(join(serviceRoot, '**/*.{java,kt}'));
          const springParent = resolve(serviceRoot, '..');
          patterns.push(join(springParent, '**/*.xml'));
          patterns.push(join(serviceRoot, '**/*.xml'));
        }
      }
    }

    if (patterns.length === 0) {
      patterns.push(join(this.config.projectRoot, '**/*.{vue,ts,js,java,kt,xml}'));
    }

    const files: string[] = [];
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, { ignore, absolute: true });
        files.push(...matches.filter(f => !f.endsWith('.d.ts')));
      } catch { /* directory may not exist */ }
    }

    return [...new Set(files)].sort();
  }

  private async startWatching(): Promise<void> {
    try {
      const chokidar = await import('chokidar');
      const watchPaths: string[] = [];

      if (this.config.vueRoot) watchPaths.push(this.config.vueRoot);
      if (this.config.springBootRoot) {
        watchPaths.push(this.config.springBootRoot);
        // Also watch resources/ sibling for MyBatis XML
        const resourcesDir = resolve(this.config.springBootRoot, '..', 'resources');
        if (existsSync(resourcesDir)) {
          watchPaths.push(resourcesDir);
        }
      }
      if (this.config.services) {
        for (const service of this.config.services) {
          watchPaths.push(resolve(this.config.projectRoot, service.root));
        }
      }
      if (watchPaths.length === 0) watchPaths.push(this.config.projectRoot);

      this.watcher = chokidar.watch(watchPaths, {
        ignored: /(node_modules|dist|\.git|\.vda-cache)/,
        ignoreInitial: true,
      });

      this.watcher.on('change', (filePath: string) => this.handleFileChange(filePath, 'changed'));
      this.watcher.on('add', (filePath: string) => this.handleFileChange(filePath, 'added'));
      this.watcher.on('unlink', (filePath: string) => {
        // Phase 2-7: also invalidate the 1-hop dependents whose cached parse
        // outputs may carry edges into nodes we are about to drop.
        const dependents = this.graph.removeByFile(filePath);
        this.cache.invalidate(filePath);
        for (const dep of dependents) this.cache.invalidate(dep);
        this.broadcast({ type: 'graph:update', payload: { removedFile: filePath, invalidatedDependents: dependents.length } });
      });
    } catch {
      console.warn('Warning: chokidar not available, watch mode disabled');
    }
  }

  private handleFileChange(filePath: string, action: string): void {
    // Incremental: only re-parse the changed file. Phase 2-7 — also drop the
    // cache entries of files that previously imported this one, since their
    // resolved cross-file edges may now point at recreated node ids.
    const dependents = this.graph.removeByFile(filePath);
    this.cache.invalidate(filePath);
    for (const dep of dependents) this.cache.invalidate(dep);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const result = parseFile(filePath, content, this.config);
      // Phase 2-6: tag serviceId on the incremental re-parse path too,
      // mirroring what ParallelParser does on full runs.
      if (this.config.services && this.config.services.length > 0) {
        // Longest root first so prefix-sharing siblings (e.g. `services/api`
        // vs `services/api-gateway`) resolve to the most specific match.
        const sortedServices = [...this.config.services]
          .map((s) => ({ id: s.id, root: resolve(this.config.projectRoot, s.root) }))
          .sort((a, b) => b.root.length - a.root.length);
        for (const node of result.nodes) {
          if (node.metadata.serviceId !== undefined) continue;
          for (const sr of sortedServices) {
            if (node.filePath === sr.root || node.filePath.startsWith(sr.root + pathSep)) {
              node.metadata.serviceId = sr.id;
              break;
            }
          }
        }
      }
      for (const node of result.nodes) this.graph.addNode(node);
      for (const edge of result.edges) this.graph.addEdge(edge);

      // Update cache
      this.cache.set(filePath, content, result);
    } catch {
      // File may have been deleted between event and read
    }

    // Only re-link edges involving this file's nodes (not full re-resolve)
    const resolver = new CrossBoundaryResolver(this.config, this.config.projectRoot);
    resolver.resolve(this.graph);

    this.broadcast({ type: 'graph:update', payload: { changedFile: filePath, action } });
  }

  // ─── Public API ───

  /** Release worker pool, sqlite handle, and file watcher. Idempotent. */
  dispose(): void {
    try { this.parser.dispose(); } catch { /* ignore */ }
    try { this.cache.close(); } catch { /* ignore */ }
    if (this.watcher) {
      try { this.watcher.close(); } catch { /* ignore */ }
      this.watcher = null;
    }
  }

  /** Phase 2 gate measurement: peak heap/rss observed at the end of any analysis. */
  getMemoryPeaks(): { heapPeakMB: number; rssPeakMB: number; lastAnalysisMs: number } {
    return {
      heapPeakMB: +this.peakHeapMB.toFixed(1),
      rssPeakMB: +this.peakRssMB.toFixed(1),
      lastAnalysisMs: this.lastAnalysisDurationMs,
    };
  }

  /** Whether the engine has completed at least one analysis run */
  isReady(): boolean {
    return this.initializeTime !== null && !this.analyzing;
  }

  /** Phase 7a-3 — gitRoutes need the resolved project root to scope `git` calls. */
  getProjectRoot(): string {
    return this.config.projectRoot;
  }

  getHealthInfo(): { ready: boolean; analyzing: boolean; nodeCount: number; edgeCount: number; analyzedAt: string | null } {
    return {
      ready: this.initializeTime !== null && !this.analyzing,
      analyzing: this.analyzing,
      nodeCount: this.graph.getNodeCount(),
      edgeCount: this.graph.getEdgeCount(),
      analyzedAt: this.graph.metadata.analyzedAt || null,
    };
  }

  getGraph(): SerializedGraph {
    return toJSON(this.graph);
  }

  // Phase 1-3 — opaque revision id combining analyzedAt (swapped on new runs) with the
  // graph's mutation counter. Transport caches use this as the invalidation key.
  getGraphRevision(): string {
    return `${this.graph.metadata.analyzedAt}:${this.graph.getVersion()}`;
  }

  getGraphFiltered(nodeKinds?: string[], edgeKinds?: string[]): SerializedGraph {
    const filtered = filterByKind(
      this.graph,
      nodeKinds as NodeKind[],
      edgeKinds as EdgeKind[],
    );
    return toJSON(filtered);
  }

  /**
   * Phase 3-2 — Louvain-based mid-zoom clustering.
   *
   * The previous depth-based directory grouping ignored cross-tree coupling
   * (Vue ↔ Spring services connected by api-call edges always landed in
   * separate clusters because their directories don't share a prefix). The
   * Louvain partition uses actual graph topology, so coupled directories
   * collapse into one community while a folder spanning unrelated concerns
   * splits into several.
   *
   * `depth` is reinterpreted as the Louvain *resolution*: 1 = default,
   * higher = more, smaller communities. This preserves the legacy "raise depth
   * for finer grouping" intent of the API.
   */
  getGraphClustered(depth: number = 1): { clusters: ClusterNode[]; edges: ClusterEdge[] } {
    const resolution = Math.max(0.5, depth);
    const { clusterIdToNodes } = this.getOrComputeClusters(resolution);

    const clusters: ClusterNode[] = [];
    const nodeToCluster = new Map<string, string>();

    // Singleton/tiny communities (< MIN_CLUSTER_SIZE) are surfaced as raw nodes;
    // collapsing them into a "cluster of 2" wastes a compound and adds visual
    // noise. The threshold matches the legacy directory-clustering behaviour so
    // existing UX expectations carry over.
    const MIN_CLUSTER_SIZE = 5;

    for (const [clusterId, groupNodes] of clusterIdToNodes) {
      if (groupNodes.length < MIN_CLUSTER_SIZE) {
        for (const n of groupNodes) {
          nodeToCluster.set(n.id, n.id);
          clusters.push({
            id: n.id,
            label: n.label,
            childCount: 0,
            childKinds: { [n.kind]: 1 },
          });
        }
        continue;
      }
      const kindCounts: Record<string, number> = {};
      const dirCounts = new Map<string, number>();
      for (const n of groupNodes) {
        kindCounts[n.kind] = (kindCounts[n.kind] || 0) + 1;
        const dir = getDirectoryAtDepth(n.filePath, this.config.projectRoot, 2);
        if (dir) dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
        nodeToCluster.set(n.id, clusterId);
      }
      const dominantDir = [...dirCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const idx = clusterId.replace(/^cluster:c/, '');
      const label = dominantDir ? `${dominantDir} #${idx}` : `Community ${idx}`;
      clusters.push({
        id: clusterId,
        label,
        childCount: groupNodes.length,
        childKinds: kindCounts,
      });
    }

    // Inter-community edge aggregation — single sweep over the full edge set.
    const edgeMap = new Map<string, { source: string; target: string; weight: number; kinds: Set<string> }>();
    for (const edge of this.graph.edgesIter()) {
      const sc = nodeToCluster.get(edge.source);
      const tc = nodeToCluster.get(edge.target);
      if (!sc || !tc || sc === tc) continue;
      const key = `${sc}→${tc}`;
      let agg = edgeMap.get(key);
      if (!agg) { agg = { source: sc, target: tc, weight: 0, kinds: new Set() }; edgeMap.set(key, agg); }
      agg.weight++;
      agg.kinds.add(edge.kind);
    }

    const clusterEdges: ClusterEdge[] = [];
    for (const e of edgeMap.values()) {
      clusterEdges.push({
        id: `${e.source}:edge:${e.target}`,
        source: e.source,
        target: e.target,
        weight: e.weight,
        kinds: [...e.kinds],
      });
    }

    return { clusters, edges: clusterEdges };
  }

  /**
   * Resolve a Louvain cluster id (`cluster:c<idx>`) back to the member nodes
   * and every edge incident to one of them. The partition lookup uses the most
   * recently computed cluster cache, so callers must hit getGraphClustered()
   * before requesting an expansion (the UI flow does this naturally).
   */
  expandCluster(clusterId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (!this.clusterCache) {
      this.getOrComputeClusters(1);
    }
    const cache = this.clusterCache!;
    const nodes = cache.clusterIdToNodes.get(clusterId) ?? [];
    if (nodes.length === 0) return { nodes: [], edges: [] };
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: GraphEdge[] = [];
    for (const e of this.graph.edgesIter()) {
      if (nodeIds.has(e.source) || nodeIds.has(e.target)) edges.push(e);
    }
    return { nodes, edges };
  }

  private getOrComputeClusters(resolution: number): {
    result: CommunityResult;
    clusterIdToNodes: Map<string, GraphNode[]>;
  } {
    const key = `${this.graph.metadata.analyzedAt}:${this.graph.getVersion()}:${resolution}`;
    if (this.clusterCache && this.clusterCache.key === key) {
      return this.clusterCache;
    }
    // Seeded RNG — Louvain's local-move order is randomised, so without a fixed
    // seed two consecutive cluster requests on the same graph would shuffle
    // community indices and invalidate any client-side cluster id the user just
    // received.
    const result = detectCommunities(this.graph, { resolution, rng: mulberry32(0x9E3779B9) });
    const clusterIdToNodes = new Map<string, GraphNode[]>();
    for (const [nodeId, communityIdx] of result.communities) {
      const node = this.graph.getNode(nodeId);
      if (!node) continue;
      const cid = `cluster:c${communityIdx}`;
      let bucket = clusterIdToNodes.get(cid);
      if (!bucket) { bucket = []; clusterIdToNodes.set(cid, bucket); }
      bucket.push(node);
    }
    this.clusterCache = { key, result, clusterIdToNodes };
    return this.clusterCache;
  }

  getNode(nodeId: string) {
    const node = this.graph.getNode(nodeId);
    if (!node) return null;
    return {
      node,
      inEdges: this.graph.getInEdges(nodeId),
      outEdges: this.graph.getOutEdges(nodeId),
    };
  }

  getNodeImpact(nodeId: string, depth?: number) {
    return analyzeImpact(this.graph, nodeId, depth);
  }

  search(query: string) {
    const q = query.toLowerCase();
    return this.graph.getAllNodes()
      .filter(n => n.label.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q))
      .slice(0, 50)
      .map(n => ({
        nodeId: n.id,
        label: n.label,
        kind: n.kind,
        filePath: n.filePath,
      }));
  }

  // ─── Phase 2-3: Progressive Disclosure API ───
  // Cheap entry point: returns per-service summaries + top directories. The web
  // client uses this to render an initial picture without paying for the full
  // graph payload. Each service detail is then loaded lazily via
  // getServiceGraph()/getDirectoryGraph() as the user drills in.

  getOverview(): GraphOverview {
    const services: ServiceSummary[] = [];
    const projectRoot = this.config.projectRoot;

    // Per-node serviceId tagging is done in runAnalysis(). Group nodes by it
    // (or by '__root__' for unmatched nodes when no services are configured).
    const byService = new Map<string, GraphNode[]>();
    for (const node of this.graph.nodesIter()) {
      const sid = (node.metadata.serviceId as string | undefined) ?? '__root__';
      let list = byService.get(sid);
      if (!list) { list = []; byService.set(sid, list); }
      list.push(node);
    }

    const configuredServices = this.config.services ?? [];
    const serviceMeta = new Map<string, { root: string; type: string }>();
    for (const s of configuredServices) {
      serviceMeta.set(s.id, { root: s.root, type: s.type });
    }
    if (this.config.vueRoot && !serviceMeta.has('__root__')) {
      serviceMeta.set('__root__', { root: this.config.vueRoot, type: 'vue' });
    } else if (this.config.springBootRoot && !serviceMeta.has('__root__')) {
      serviceMeta.set('__root__', { root: this.config.springBootRoot, type: 'spring-boot' });
    }

    // Compute per-service edge count: edges where both endpoints share serviceId
    const nodeService = new Map<string, string>();
    for (const [sid, nodes] of byService) {
      for (const n of nodes) nodeService.set(n.id, sid);
    }
    const edgeCountByService = new Map<string, number>();
    for (const edge of this.graph.edgesIter()) {
      const ss = nodeService.get(edge.source);
      const ts = nodeService.get(edge.target);
      if (ss && ts && ss === ts) {
        edgeCountByService.set(ss, (edgeCountByService.get(ss) ?? 0) + 1);
      }
    }

    for (const [sid, nodes] of byService) {
      const nodesByKind: Record<string, number> = {};
      const dirCounts = new Map<string, number>();
      for (const n of nodes) {
        nodesByKind[n.kind] = (nodesByKind[n.kind] ?? 0) + 1;
        const dir = getDirectoryAtDepth(n.filePath, projectRoot, 3);
        if (dir) dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
      }
      const topDirectories = [...dirCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, nodeCount]) => ({ path, nodeCount }));

      const meta = serviceMeta.get(sid);
      services.push({
        id: sid,
        type: meta?.type ?? 'unknown',
        root: meta?.root ?? '',
        nodeCount: nodes.length,
        edgeCount: edgeCountByService.get(sid) ?? 0,
        nodesByKind,
        topDirectories,
      });
    }

    // Sort services by nodeCount desc for stable rendering
    services.sort((a, b) => b.nodeCount - a.nodeCount);

    return {
      global: {
        totalNodes: this.graph.getNodeCount(),
        totalEdges: this.graph.getEdgeCount(),
        parseErrorCount: this.graph.metadata.parseErrors.length,
        analyzedAt: this.graph.metadata.analyzedAt,
      },
      services,
    };
  }

  getServiceGraph(serviceId: string): SerializedGraph {
    const nodes: GraphNode[] = [];
    for (const n of this.graph.nodesIter()) {
      const sid = (n.metadata.serviceId as string | undefined) ?? '__root__';
      if (sid === serviceId) nodes.push(n);
    }
    return this.subgraphFromNodes(nodes);
  }

  getDirectoryGraph(relativePath: string): SerializedGraph {
    const projectRoot = this.config.projectRoot;
    const cleanRel = relativePath.replace(/^\/+/, '').replace(/\/+$/, '');
    const absPrefix = cleanRel.length > 0
      ? join(projectRoot, cleanRel) + '/'
      : projectRoot + '/';

    const nodes: GraphNode[] = [];
    for (const n of this.graph.nodesIter()) {
      // filePath might equal absPrefix without trailing slash for files at the dir root
      if (n.filePath === absPrefix.slice(0, -1) || n.filePath.startsWith(absPrefix)) {
        nodes.push(n);
      }
    }
    return this.subgraphFromNodes(nodes);
  }

  /**
   * Build a SerializedGraph from a node subset, including only edges whose
   * BOTH endpoints fall in the subset. Lightweight metadata (file count,
   * subset size) is reused so clients can validate the result.
   */
  private subgraphFromNodes(nodes: GraphNode[]): SerializedGraph {
    const idSet = new Set<string>();
    for (const n of nodes) idSet.add(n.id);
    const edges = [];
    for (const e of this.graph.edgesIter()) {
      if (idSet.has(e.source) && idSet.has(e.target)) edges.push(e);
    }
    return {
      nodes,
      edges,
      metadata: {
        ...this.graph.metadata,
        fileCount: new Set(nodes.map((n) => n.filePath)).size,
      },
    };
  }

  getStats() {
    const stats = this.graph.getStats();
    const circularDeps = findCircularDependencies(this.graph);
    const orphans = findOrphanNodes(this.graph).map(n => n.id);
    const unusedEndpoints = findUnusedEndpoints(this.graph).map(n => n.id);
    const complexity = calculateComplexity(this.graph).slice(0, 20);

    return {
      nodesByKind: stats.nodesByKind,
      edgesByKind: stats.edgesByKind,
      totalNodes: stats.totalNodes,
      totalEdges: stats.totalEdges,
      circularDeps,
      orphanNodes: orphans,
      unusedEndpoints,
      topComplexity: complexity,
      cacheSize: this.cache.size,
    };
  }

  checkDtoConsistency(): DtoMismatch[] {
    return checkDtoConsistency(this.graph);
  }

  getMatrixData(depth: number = 3): { modules: string[]; matrix: number[][]; edgeDetails: Record<string, string[]> } {
    const nodes = this.graph.getAllNodes();
    const edges = this.graph.getAllEdges();

    // Group nodes by directory
    const groups = new Map<string, Set<string>>(); // dir → set of node IDs
    for (const node of nodes) {
      if (!node.filePath) continue;
      const dir = getDirectoryAtDepth(node.filePath, this.config.projectRoot, depth);
      if (!dir) continue;
      if (!groups.has(dir)) groups.set(dir, new Set());
      groups.get(dir)!.add(node.id);
    }

    // Build node→module lookup
    const nodeToModule = new Map<string, string>();
    for (const [dir, nodeIds] of groups) {
      for (const id of nodeIds) nodeToModule.set(id, dir);
    }

    const modules = [...groups.keys()].sort();
    const moduleIndex = new Map(modules.map((m, i) => [m, i]));
    const n = modules.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const edgeDetails: Record<string, string[]> = {};

    for (const edge of edges) {
      const srcMod = nodeToModule.get(edge.source);
      const tgtMod = nodeToModule.get(edge.target);
      if (!srcMod || !tgtMod) continue;
      const ri = moduleIndex.get(srcMod)!;
      const ci = moduleIndex.get(tgtMod)!;
      matrix[ri][ci]++;
      const key = `${ri}|${ci}`;
      if (!edgeDetails[key]) edgeDetails[key] = [];
      if (!edgeDetails[key].includes(edge.kind)) edgeDetails[key].push(edge.kind);
    }

    return { modules, matrix, edgeDetails };
  }

  analyzeChangeImpact(files: string[]) {
    return analyzeChangeImpactFn(this.graph, files, this.config.projectRoot);
  }

  checkRuleViolations(): { violations: RuleViolation[]; count: number } {
    const rules = this.config.rules || [];
    const violations = evaluateRules(this.graph, rules);
    return { violations, count: violations.length };
  }

  /**
   * Phase 7b-4 — Layer compliance matrix.
   *
   * Computes a layer × layer grid of edges and labels each cell as
   * `allowed`, `denied`, or `undefined` based on the configured layer
   * DSL (compileLayerRules + the engine's evaluateRules cross-check).
   * The view consumes this directly so no client-side rule logic ships.
   */
  getLayerCompliance(): {
    layers: Array<{ name: string; kinds: string[]; nodeIds: string[] }>;
    matrix: Array<{
      from: string;
      to: string;
      count: number;
      status: 'allowed' | 'denied' | 'undefined';
      sampleEdgeIds: string[];
    }>;
  } {
    const cfg = this.config as unknown as {
      layers?: Array<{ name: string; match: string[] }>;
      layerRules?: Array<{ from: string; to: string; policy: 'deny' | 'allow-only' }>;
    };
    const layers = cfg.layers ?? [];
    const layerRules = cfg.layerRules ?? [];
    if (layers.length === 0) {
      return { layers: [], matrix: [] };
    }

    // Map kind → first matching layer (layers earlier in the list win
    // when a kind appears in multiple definitions).
    const kindToLayer = new Map<string, string>();
    for (const l of layers) {
      for (const k of l.match) {
        if (!kindToLayer.has(k)) kindToLayer.set(k, l.name);
      }
    }

    // Index nodes per layer.
    const nodeIdsByLayer = new Map<string, string[]>();
    for (const l of layers) nodeIdsByLayer.set(l.name, []);
    for (const node of this.graph.nodesIter()) {
      const layer = kindToLayer.get(node.kind);
      if (!layer) continue;
      nodeIdsByLayer.get(layer)!.push(node.id);
    }

    // Index policies: ('A','B') → 'deny' | 'allow-only'
    const policyKey = (a: string, b: string) => `${a}|${b}`;
    const denyPairs = new Set<string>();
    const allowedTargets = new Map<string, Set<string>>();
    for (const r of layerRules) {
      if (r.policy === 'deny') denyPairs.add(policyKey(r.from, r.to));
      else if (r.policy === 'allow-only') {
        if (!allowedTargets.has(r.from)) allowedTargets.set(r.from, new Set());
        allowedTargets.get(r.from)!.add(r.to);
      }
    }

    // Walk every edge once, bucket into (fromLayer, toLayer) cells.
    const cells = new Map<string, { count: number; sampleEdgeIds: string[] }>();
    for (const edge of this.graph.edgesIter()) {
      const src = this.graph.getNode(edge.source);
      const tgt = this.graph.getNode(edge.target);
      if (!src || !tgt) continue;
      const fl = kindToLayer.get(src.kind);
      const tl = kindToLayer.get(tgt.kind);
      if (!fl || !tl) continue;
      const k = policyKey(fl, tl);
      let c = cells.get(k);
      if (!c) {
        c = { count: 0, sampleEdgeIds: [] };
        cells.set(k, c);
      }
      c.count += 1;
      if (c.sampleEdgeIds.length < 5) c.sampleEdgeIds.push(edge.id);
    }

    const matrix: ReturnType<typeof this.getLayerCompliance>['matrix'] = [];
    for (const from of layers) {
      for (const to of layers) {
        const k = policyKey(from.name, to.name);
        const cell = cells.get(k);
        const allowedSet = allowedTargets.get(from.name);
        const status: 'allowed' | 'denied' | 'undefined' =
          denyPairs.has(k) ? 'denied'
          : allowedSet ? (allowedSet.has(to.name) ? 'allowed' : 'denied')
          : 'undefined';
        matrix.push({
          from: from.name,
          to: to.name,
          count: cell?.count ?? 0,
          status,
          sampleEdgeIds: cell?.sampleEdgeIds ?? [],
        });
      }
    }

    return {
      layers: layers.map(l => ({
        name: l.name,
        kinds: l.match,
        nodeIds: nodeIdsByLayer.get(l.name) ?? [],
      })),
      matrix,
    };
  }

  findPaths(from: string, to: string, maxDepth: number = 10, edgeKinds?: string[]) {
    return findPathsFn(this.graph, from, to, { maxDepth, edgeKinds });
  }

  getAnalysisOverlays() {
    const circular = findCircularDependencies(this.graph);
    const circularNodeIds = new Set<string>();
    for (const group of circular) {
      for (const id of group) circularNodeIds.add(id);
    }

    const orphans = findOrphanNodes(this.graph).map(n => n.id);
    const hubs = calculateComplexity(this.graph)
      .filter(s => s.fanIn >= 5 || s.fanOut >= 5)
      .map(s => s.nodeId);

    return {
      circularNodeIds: Array.from(circularNodeIds),
      orphanNodeIds: orphans,
      hubNodeIds: hubs,
      circularGroups: circular,
    };
  }

  getSourceSnippet(filePath: string, line: number, context: number = 5): { lines: { num: number; text: string; highlight: boolean }[] } | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const allLines = content.split('\n');
      const start = Math.max(0, line - context - 1);
      const end = Math.min(allLines.length, line + context);
      return {
        lines: allLines.slice(start, end).map((text, i) => ({
          num: start + i + 1,
          text,
          highlight: start + i + 1 === line,
        })),
      };
    } catch {
      return null;
    }
  }

  getParseErrors() {
    return this.graph.metadata.parseErrors;
  }

  getUnresolvedEdges() {
    const prefixes = ['unresolved:', 'component:', 'store:', 'composable:'];
    const json = toJSON(this.graph);
    return json.edges
      .filter(e => {
        if (!prefixes.some(p => e.target.startsWith(p))) return false;
        // Exclude external package imports (bare specifiers like 'vue', 'axios', 'pinia')
        const importPath = (e.metadata as Record<string, unknown>).importPath as string | undefined;
        if (importPath && !importPath.startsWith('.') && !importPath.startsWith('@/') && !importPath.startsWith('~')) {
          return false; // external dependency, not an analysis issue
        }
        return true;
      })
      .map(e => {
        const sourceNode = json.nodes.find(n => n.id === e.source);
        const prefix = prefixes.find(p => e.target.startsWith(p)) || 'unresolved:';
        return {
          edgeId: e.id,
          sourceId: e.source,
          sourceLabel: sourceNode?.label || e.source,
          sourceKind: sourceNode?.kind || 'unknown',
          edgeKind: e.kind,
          target: e.target,
          prefix: prefix.replace(':', ''),
          importPath: (e.metadata as Record<string, unknown>).importPath as string | undefined,
        };
      });
  }

  addClient(socket: WebSocket): void {
    this.clients.add(socket);
  }

  removeClient(socket: WebSocket): void {
    this.clients.delete(socket);
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.send(data);
      } catch { /* client may be disconnected */ }
    }
  }
}

// ─── Phase 2-3 overview types ───

export interface ServiceSummary {
  id: string;
  type: string;
  root: string;
  nodeCount: number;
  edgeCount: number;
  nodesByKind: Record<string, number>;
  topDirectories: { path: string; nodeCount: number }[];
}

export interface GraphOverview {
  global: {
    totalNodes: number;
    totalEdges: number;
    parseErrorCount: number;
    analyzedAt: string;
  };
  services: ServiceSummary[];
}

// ─── Clustering helpers ───

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

// Tiny seeded PRNG. Louvain accepts an rng() so we can stabilise community ids
// across calls — same graph + same seed = same partition. Fast and dependency-free.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDirectoryAtDepth(filePath: string, projectRoot: string, depth: number): string {
  const relative = filePath.startsWith(projectRoot)
    ? filePath.slice(projectRoot.length + 1)
    : filePath;
  const parts = relative.split('/').filter(Boolean);
  // Remove filename, keep only directories
  parts.pop();
  return parts.slice(0, depth).join('/');
}
