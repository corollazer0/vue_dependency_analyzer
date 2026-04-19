import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import {
  DependencyGraph,
  CrossBoundaryResolver,
  ParallelParser,
  ParseCache,
  findCircularDependencies,
  findOrphanNodes,
  readGitBlame,
  blameLookupKey,
  buildMsaServiceGraph,
  type AnalysisConfig,
  type ProgressInfo,
} from '@vda/core';
import { glob } from './utils/glob.js';

export interface CliOptions {
  vueRoot?: string;
  springRoot?: string;
  config?: string;
  json?: boolean;
  noCache?: boolean;
}

export interface AnalysisResult {
  graph: DependencyGraph;
  stats: {
    circularDeps: string[][];
    orphans: string[];
    durationMs: number;
    cachedCount: number;
    totalFiles: number;
  };
}

export async function loadConfig(dir: string, options: CliOptions): Promise<AnalysisConfig & { projectRoot: string }> {
  const projectRoot = resolve(dir);
  let config: AnalysisConfig = {};

  const configPath = resolve(projectRoot, options.config || '.vdarc.json');
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      console.warn(`Warning: Failed to parse config file ${configPath}`);
    }
  }

  if (options.vueRoot) config.vueRoot = options.vueRoot;
  if (options.springRoot) config.springBootRoot = options.springRoot;
  if (config.vueRoot) config.vueRoot = resolve(projectRoot, config.vueRoot);
  if (config.springBootRoot) config.springBootRoot = resolve(projectRoot, config.springBootRoot);

  if (!config.aliases) {
    config.aliases = { '@': config.vueRoot || join(projectRoot, 'src') };
  }

  return { ...config, projectRoot };
}

export async function runAnalysis(
  config: AnalysisConfig & { projectRoot: string },
  options?: {
    noCache?: boolean;
    onProgress?: (info: ProgressInfo) => void;
    /**
     * Phase 10-3 — signaturesOnly skips the cross-boundary linker (api-call,
     * MyBatis, DTO-flow, etc.) and the post-parse analyzers (circular,
     * orphan). The graph still contains every parser-emitted node/edge so
     * SignatureStore.snapshot can extract DTO signatures unchanged. The 35%
     * wall-time goal comes from cutting linker + analyzer cost on large
     * monorepos where parsing dominates but the linker is non-trivial.
     */
    signaturesOnly?: boolean;
    /**
     * Phase 11-2 — F8 git blame. When true, runs a single batch `git log`
     * after parsing and stamps node.metadata.{lastTouchedAt, lastAuthor,
     * commitCount, lastCommitSha}. Fail-soft when no .git is present.
     * Plan §3 caps wall-time impact at +15%; actual numbers tracked in
     * phase11-benchmark.md.
     */
    withGitBlame?: boolean;
  },
): Promise<AnalysisResult> {
  const graph = new DependencyGraph();
  graph.metadata.projectRoot = config.projectRoot;
  graph.metadata.analyzedAt = new Date().toISOString();
  graph.metadata.config = config;

  // Initialize cache
  const cache = options?.noCache ? null : new ParseCache(config.projectRoot, JSON.stringify(config));

  // Discover files
  const patterns: string[] = [];
  const excludePatterns = config.exclude || ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.vda-cache/**'];

  if (config.vueRoot) {
    patterns.push(join(config.vueRoot, '**/*.vue'));
    patterns.push(join(config.vueRoot, '**/*.ts'));
    patterns.push(join(config.vueRoot, '**/*.js'));
  }
  if (config.springBootRoot) {
    patterns.push(join(config.springBootRoot, '**/*.java'));
    patterns.push(join(config.springBootRoot, '**/*.kt'));
    // MyBatis XML — may be in resources/ sibling to java/
    const springParent = resolve(config.springBootRoot, '..');
    patterns.push(join(springParent, '**/*.xml'));
    patterns.push(join(config.springBootRoot, '**/*.xml'));
  }

  // MSA: additional service roots
  if (config.services && config.services.length > 0) {
    for (const service of config.services) {
      const serviceRoot = resolve(config.projectRoot, service.root);
      if (service.type === 'vue') {
        patterns.push(join(serviceRoot, '**/*.vue'));
        patterns.push(join(serviceRoot, '**/*.ts'));
        patterns.push(join(serviceRoot, '**/*.js'));
      } else if (service.type === 'spring-boot') {
        patterns.push(join(serviceRoot, '**/*.java'));
        patterns.push(join(serviceRoot, '**/*.kt'));
        // MyBatis XML — may be in resources/ sibling to java/
        const springParent = resolve(serviceRoot, '..');
        patterns.push(join(springParent, '**/*.xml'));
        patterns.push(join(serviceRoot, '**/*.xml'));
      }
    }
  }

  if (!config.vueRoot && !config.springBootRoot && (!config.services || config.services.length === 0)) {
    patterns.push(join(config.projectRoot, '**/*.vue'));
    patterns.push(join(config.projectRoot, '**/*.ts'));
    patterns.push(join(config.projectRoot, '**/*.js'));
    patterns.push(join(config.projectRoot, '**/*.java'));
    patterns.push(join(config.projectRoot, '**/*.kt'));
    patterns.push(join(config.projectRoot, '**/*.xml'));
  }

  const files = await glob(patterns, excludePatterns);
  graph.metadata.fileCount = files.length;

  // Parallel parsing with cache. Parser tags serviceId at parse time
  // (Phase 2-6) so the post-hoc node sweep below is no longer needed.
  const parser = new ParallelParser(config, undefined, config.projectRoot);
  const result = await parser.parseAll(
    files,
    options?.onProgress,
    cache ? (filePath, content) => {
      const cached = cache.get(filePath, content);
      if (cached) return cached;
      return null;
    } : undefined,
  );

  // Add results to graph
  for (const node of result.nodes) graph.addNode(node);
  for (const edge of result.edges) graph.addEdge(edge);
  graph.metadata.parseErrors = result.errors;

  // Update cache with new results
  if (cache) {
    // Save cache for files that were parsed (not cached)
    for (const filePath of files) {
      const fileNodes = graph.getNodesByFile(filePath);
      if (fileNodes.length > 0 && !cache.get(filePath, readFileSync(filePath, 'utf-8'))) {
        const edges = graph.getAllEdges().filter(e =>
          fileNodes.some(n => n.id === e.source)
        );
        cache.set(filePath, readFileSync(filePath, 'utf-8'), {
          nodes: fileNodes,
          edges,
          errors: result.errors.filter(e => e.filePath === filePath),
        });
      }
    }
    cache.save();
  }

  let circularDeps: string[][] = [];
  let orphans: string[] = [];
  if (!options?.signaturesOnly) {
    // Cross-boundary resolution
    const resolver = new CrossBoundaryResolver(config, config.projectRoot);
    resolver.resolve(graph);

    circularDeps = findCircularDependencies(graph);
    orphans = findOrphanNodes(graph).map(n => `${n.kind}: ${n.label}`);

    // Phase 12-1 — post-process the resolved graph to add msa-service nodes
    // + inter-service edges. Skipped when signaturesOnly because the linker
    // hasn't run (api-call-site → spring-endpoint edges aren't resolved).
    buildMsaServiceGraph(graph, config.services);
  }

  // Phase 11-2 — F8 git blame stamp. Single batch git log; fail-soft when no
  // .git is present. Stamps `lastTouchedAt`/`lastAuthor`/`commitCount`/
  // `lastCommitSha` onto every node whose filePath sits inside the repo.
  if (options?.withGitBlame) {
    const blame = readGitBlame(config.projectRoot);
    if (blame.byFile.size > 0) {
      for (const node of graph.getAllNodes()) {
        if (!node.filePath) continue;
        const key = blameLookupKey(blame, node.filePath);
        if (!key) continue;
        const rec = blame.byFile.get(key);
        if (!rec) continue;
        const md = (node.metadata ??= {}) as Record<string, unknown>;
        md.lastTouchedAt = rec.lastTouchedAt;
        md.lastAuthor = rec.lastAuthor;
        md.lastCommitSha = rec.lastCommitSha;
        md.commitCount = rec.commitCount;
      }
      if (blame.shallow) {
        graph.metadata.gitBlameShallow = true;
      }
    }
  }

  // Release the persistent worker pool so the CLI process can exit.
  parser.dispose();
  if (cache) cache.close();

  return {
    graph,
    stats: {
      circularDeps,
      orphans,
      durationMs: result.durationMs,
      cachedCount: result.cachedCount,
      totalFiles: files.length,
    },
  };
}
