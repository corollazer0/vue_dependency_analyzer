import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { readFileSync } from 'fs';
import type { GraphNode, GraphEdge, ParseError, AnalysisConfig, ParseResult } from '../graph/types.js';
import { VueSfcParser } from '../parsers/vue/VueSfcParser.js';
import { TsFileParser } from '../parsers/typescript/TsFileParser.js';
import { JavaFileParser } from '../parsers/java/JavaFileParser.js';
import { KotlinFileParser } from '../parsers/java/KotlinFileParser.js';
import { MyBatisXmlParser } from '../parsers/java/MyBatisXmlParser.js';
import type { WorkerBatchMessage, WorkerBatchResponse, WorkerResult } from './parseWorker.js';

export interface ProgressInfo {
  processed: number;
  total: number;
  currentFile: string;
  cachedCount: number;
  elapsedMs: number;
}

export type ProgressCallback = (info: ProgressInfo) => void;

export interface ParallelParseResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  errors: ParseError[];
  durationMs: number;
  cachedCount: number;
}

interface FileTask {
  filePath: string;
  content: string;
}

/**
 * Minimum number of uncached files to justify spinning up worker threads.
 * Below this threshold, parsing on the main thread is faster due to
 * worker startup and message serialization overhead.
 */
const WORKER_THRESHOLD = 4;

/**
 * Parses a single file using the appropriate parser.
 * Used by workers (via parseWorker.ts), by the main thread fallback,
 * and by the server for single-file incremental re-parsing.
 */
export function parseFile(filePath: string, content: string, config: AnalysisConfig): ParseResult {
  const parsers = [
    new VueSfcParser(),
    new TsFileParser(),
    new JavaFileParser(),
    new KotlinFileParser(),
    new MyBatisXmlParser(),
  ];

  for (const parser of parsers) {
    if (parser.supports(filePath)) {
      try {
        return parser.parse(filePath, content, config);
      } catch (e) {
        return {
          nodes: [],
          edges: [],
          errors: [{
            filePath,
            message: `Parse error: ${e instanceof Error ? e.message : String(e)}`,
            severity: 'error',
          }],
        };
      }
    }
  }

  return { nodes: [], edges: [], errors: [] };
}

/**
 * Resolve the path to the worker script. Works both for compiled JS (dist/)
 * and when running under vitest/ts-node with TypeScript source.
 */
function resolveWorkerPath(): string {
  // import.meta.url gives us the URL of this module.
  // The worker script lives alongside this file.
  const thisUrl = new URL(import.meta.url);
  const workerUrl = new URL('./parseWorker.js', thisUrl);
  // If we're running from .ts (e.g. vitest), try .ts extension
  if (thisUrl.pathname.endsWith('.ts')) {
    return new URL('./parseWorker.ts', thisUrl).pathname;
  }
  return workerUrl.pathname;
}

/**
 * Parallel parser using a worker_threads pool for true multi-core parsing.
 *
 * Strategy:
 * - File reading and cache checking happen on the main thread (fast I/O, non-transferable cache)
 * - Uncached files are distributed to worker threads in batches for parallel parsing
 * - Workers return plain JSON results (GraphNode[], GraphEdge[]) which are easily transferable
 * - Falls back to main-thread parsing when worker count is below threshold or workers fail
 */
export class ParallelParser {
  private concurrency: number;
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig, concurrency?: number) {
    this.config = config;
    this.concurrency = concurrency || Math.max(1, Math.min(8, cpus().length - 1));
  }

  async parseAll(
    files: string[],
    onProgress?: ProgressCallback,
    cacheCheck?: (filePath: string, content: string) => ParseResult | null,
  ): Promise<ParallelParseResult> {
    const startTime = Date.now();
    const allNodes: GraphNode[] = [];
    const allEdges: GraphEdge[] = [];
    const allErrors: ParseError[] = [];
    let processed = 0;
    let cachedCount = 0;

    const reportProgress = (filePath: string) => {
      if (onProgress) {
        onProgress({
          processed,
          total: files.length,
          currentFile: filePath,
          cachedCount,
          elapsedMs: Date.now() - startTime,
        });
      }
    };

    // Phase 1: Read files and check cache on main thread
    const uncachedTasks: FileTask[] = [];
    for (const filePath of files) {
      let content: string;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch (e) {
        allErrors.push({
          filePath,
          message: `Failed to read: ${e instanceof Error ? e.message : String(e)}`,
          severity: 'error',
        });
        processed++;
        reportProgress(filePath);
        continue;
      }

      // Check cache on main thread (cache objects aren't transferable)
      if (cacheCheck) {
        const cached = cacheCheck(filePath, content);
        if (cached) {
          allNodes.push(...cached.nodes);
          allEdges.push(...cached.edges);
          allErrors.push(...cached.errors);
          cachedCount++;
          processed++;
          reportProgress(filePath);
          continue;
        }
      }

      uncachedTasks.push({ filePath, content });
    }

    // Phase 2: Parse uncached files
    if (uncachedTasks.length > 0) {
      let workerResults: WorkerResult[] | null = null;

      // Only use workers if we have enough files to justify the overhead
      if (uncachedTasks.length >= WORKER_THRESHOLD) {
        workerResults = await this.parseWithWorkers(uncachedTasks).catch(() => null);
      }

      if (workerResults) {
        // Collect results from workers
        for (const wr of workerResults) {
          if (wr.error || !wr.result) {
            allErrors.push({
              filePath: wr.filePath,
              message: `Worker parse error: ${wr.error ?? 'unknown'}`,
              severity: 'error',
            });
          } else {
            allNodes.push(...wr.result.nodes);
            allEdges.push(...wr.result.edges);
            allErrors.push(...wr.result.errors);
          }
          processed++;
          reportProgress(wr.filePath);
        }
      } else {
        // Fallback: parse on main thread
        for (const task of uncachedTasks) {
          const result = parseFile(task.filePath, task.content, this.config);
          allNodes.push(...result.nodes);
          allEdges.push(...result.edges);
          allErrors.push(...result.errors);
          processed++;
          reportProgress(task.filePath);
        }
      }
    }

    return {
      nodes: allNodes,
      edges: allEdges,
      errors: allErrors,
      durationMs: Date.now() - startTime,
      cachedCount,
    };
  }

  /**
   * Distribute tasks across worker threads and collect results.
   * Each worker gets a batch of files to parse.
   */
  private async parseWithWorkers(tasks: FileTask[]): Promise<WorkerResult[]> {
    const workerCount = Math.min(this.concurrency, tasks.length);
    const workerPath = resolveWorkerPath();

    // Split tasks into batches, one per worker
    const batches: FileTask[][] = Array.from({ length: workerCount }, () => []);
    for (let i = 0; i < tasks.length; i++) {
      batches[i % workerCount].push(tasks[i]);
    }

    const promises = batches.map((batch) => {
      return new Promise<WorkerResult[]>((resolve, reject) => {
        const worker = new Worker(workerPath);

        const timeoutId = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker timed out after 30s'));
        }, 30_000);

        worker.on('message', (msg: WorkerBatchResponse) => {
          if (msg.type === 'batch-done') {
            clearTimeout(timeoutId);
            worker.terminate();
            resolve(msg.results);
          }
        });

        worker.on('error', (err) => {
          clearTimeout(timeoutId);
          worker.terminate();
          reject(err);
        });

        worker.on('exit', (code) => {
          clearTimeout(timeoutId);
          if (code !== 0) {
            reject(new Error(`Worker exited with code ${code}`));
          }
        });

        const message: WorkerBatchMessage = {
          type: 'batch',
          tasks: batch.map((t) => ({
            filePath: t.filePath,
            content: t.content,
            config: this.config,
          })),
        };
        worker.postMessage(message);
      });
    });

    const batchResults = await Promise.all(promises);
    return batchResults.flat();
  }
}
