import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
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
  toJSON,
  type AnalysisConfig,
  type SerializedGraph,
  type ProgressInfo,
  type NodeKind,
  type EdgeKind,
  type GraphNode,
} from '@vda/core';
import type { WebSocket } from 'ws';

export class AnalysisEngine {
  private graph: DependencyGraph = new DependencyGraph();
  private config: AnalysisConfig & { projectRoot: string };
  private cache: ParseCache;
  private clients: Set<WebSocket> = new Set();
  private watcher: any = null;
  private watchEnabled: boolean;
  private analyzing = false;
  private lastProgressBroadcast = 0;

  constructor(dir: string, options: Record<string, string | undefined>, watch: boolean) {
    const projectRoot = resolve(dir);
    this.config = this.buildConfig(projectRoot, options);
    this.cache = new ParseCache(projectRoot, JSON.stringify(this.config));
    this.watchEnabled = watch;
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
    await this.runAnalysis();
    if (this.watchEnabled) {
      await this.startWatching();
    }
  }

  async runAnalysis(): Promise<void> {
    if (this.analyzing) return;
    this.analyzing = true;

    try {
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

      // Parallel parsing with cache
      const parser = new ParallelParser(this.config);
      const result = await parser.parseAll(
        files,
        // Progress callback — throttle to max 10/sec
        (info: ProgressInfo) => {
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

      // Update cache with newly parsed files
      // (cache entries updated inline during parsing would be ideal,
      //  but we do it via re-read here for simplicity)
      this.cache.save();

      // Cross-boundary resolution
      const resolver = new CrossBoundaryResolver(this.config, this.config.projectRoot);
      resolver.resolve(this.graph);

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
    }
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
    }
    if (patterns.length === 0) {
      patterns.push(join(this.config.projectRoot, '**/*.{vue,ts,js,java,kt}'));
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
      if (this.config.springBootRoot) watchPaths.push(this.config.springBootRoot);
      if (watchPaths.length === 0) watchPaths.push(this.config.projectRoot);

      this.watcher = chokidar.watch(watchPaths, {
        ignored: /(node_modules|dist|\.git|\.vda-cache)/,
        ignoreInitial: true,
      });

      this.watcher.on('change', (filePath: string) => this.handleFileChange(filePath, 'changed'));
      this.watcher.on('add', (filePath: string) => this.handleFileChange(filePath, 'added'));
      this.watcher.on('unlink', (filePath: string) => {
        this.graph.removeByFile(filePath);
        this.cache.invalidate(filePath);
        this.cache.save();
        this.broadcast({ type: 'graph:update', payload: { removedFile: filePath } });
      });
    } catch {
      console.warn('Warning: chokidar not available, watch mode disabled');
    }
  }

  private handleFileChange(filePath: string, action: string): void {
    // Incremental: only re-parse the changed file
    this.graph.removeByFile(filePath);
    this.cache.invalidate(filePath);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const result = parseFile(filePath, content, this.config);
      for (const node of result.nodes) this.graph.addNode(node);
      for (const edge of result.edges) this.graph.addEdge(edge);

      // Update cache
      this.cache.set(filePath, content, result);
      this.cache.save();
    } catch {
      // File may have been deleted between event and read
    }

    // Only re-link edges involving this file's nodes (not full re-resolve)
    const resolver = new CrossBoundaryResolver(this.config, this.config.projectRoot);
    resolver.resolve(this.graph);

    this.broadcast({ type: 'graph:update', payload: { changedFile: filePath, action } });
  }

  // ─── Public API ───

  getGraph(): SerializedGraph {
    return toJSON(this.graph);
  }

  getGraphFiltered(nodeKinds?: string[], edgeKinds?: string[]): SerializedGraph {
    const filtered = filterByKind(
      this.graph,
      nodeKinds as NodeKind[],
      edgeKinds as EdgeKind[],
    );
    return toJSON(filtered);
  }

  getGraphClustered(depth: number = 1): { clusters: ClusterNode[]; edges: ClusterEdge[] } {
    const nodes = this.graph.getAllNodes();
    const edges = this.graph.getAllEdges();

    // Group nodes by directory path segments
    const groups = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      const dir = getDirectoryAtDepth(node.filePath, this.config.projectRoot, depth);
      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir)!.push(node);
    }

    const clusters: ClusterNode[] = [];
    const clusterEdges: ClusterEdge[] = [];
    const nodeToCluster = new Map<string, string>();

    for (const [dir, groupNodes] of groups) {
      const clusterId = `cluster:${dir}`;
      const kindCounts: Record<string, number> = {};
      for (const n of groupNodes) {
        kindCounts[n.kind] = (kindCounts[n.kind] || 0) + 1;
        nodeToCluster.set(n.id, clusterId);
      }

      clusters.push({
        id: clusterId,
        label: dir || '(root)',
        childCount: groupNodes.length,
        childKinds: kindCounts,
      });
    }

    // Aggregate edges between clusters
    const edgeMap = new Map<string, { source: string; target: string; weight: number; kinds: Set<string> }>();
    for (const edge of edges) {
      const sc = nodeToCluster.get(edge.source);
      const tc = nodeToCluster.get(edge.target);
      if (!sc || !tc || sc === tc) continue;
      const key = `${sc}→${tc}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { source: sc, target: tc, weight: 0, kinds: new Set() });
      }
      const e = edgeMap.get(key)!;
      e.weight++;
      e.kinds.add(edge.kind);
    }

    for (const [, e] of edgeMap) {
      clusterEdges.push({
        id: `${e.source}:edge:${e.target}`,
        source: e.source,
        target: e.target,
        weight: e.weight,
        kinds: Array.from(e.kinds),
      });
    }

    return { clusters, edges: clusterEdges };
  }

  expandCluster(clusterId: string): { nodes: GraphNode[]; edges: any[] } {
    const dir = clusterId.replace(/^cluster:/, '');
    const nodes = this.graph.getAllNodes().filter(n => {
      const nodeDir = getDirectoryAtDepth(n.filePath, this.config.projectRoot, 999);
      return nodeDir.startsWith(dir);
    });
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = this.graph.getAllEdges().filter(
      e => nodeIds.has(e.source) || nodeIds.has(e.target)
    );
    return { nodes, edges };
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

  getStats() {
    const stats = this.graph.getStats();
    const circularDeps = findCircularDependencies(this.graph);
    const orphans = findOrphanNodes(this.graph).map(n => n.id);
    const unusedEndpoints = findUnusedEndpoints(this.graph).map(n => n.id);
    const complexity = calculateComplexity(this.graph).slice(0, 20);

    return {
      ...stats,
      circularDeps,
      orphanNodes: orphans,
      unusedEndpoints,
      topComplexity: complexity,
      cacheSize: this.cache.size,
    };
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

function getDirectoryAtDepth(filePath: string, projectRoot: string, depth: number): string {
  const relative = filePath.startsWith(projectRoot)
    ? filePath.slice(projectRoot.length + 1)
    : filePath;
  const parts = relative.split('/').filter(Boolean);
  // Remove filename, keep only directories
  parts.pop();
  return parts.slice(0, depth).join('/');
}
