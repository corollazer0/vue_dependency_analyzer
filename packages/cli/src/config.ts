import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import {
  DependencyGraph,
  CrossBoundaryResolver,
  ParallelParser,
  ParseCache,
  findCircularDependencies,
  findOrphanNodes,
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
  options?: { noCache?: boolean; onProgress?: (info: ProgressInfo) => void },
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

  // Parallel parsing with cache
  const parser = new ParallelParser(config);
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

  // Tag nodes with serviceId based on which service root they fall under
  if (config.services && config.services.length > 0) {
    for (const node of graph.getAllNodes()) {
      for (const service of config.services) {
        const serviceRoot = resolve(config.projectRoot, service.root);
        if (node.filePath.startsWith(serviceRoot)) {
          node.metadata.serviceId = service.id;
          break;
        }
      }
    }
  }

  // Cross-boundary resolution
  const resolver = new CrossBoundaryResolver(config, config.projectRoot);
  resolver.resolve(graph);

  const circularDeps = findCircularDependencies(graph);
  const orphans = findOrphanNodes(graph).map(n => `${n.kind}: ${n.label}`);

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
