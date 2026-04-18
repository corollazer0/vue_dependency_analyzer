import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import type { GraphNode, GraphEdge, ParseError, AnalysisConfig, ParseResult } from '../graph/types.js';
import { VueSfcParser } from '../parsers/vue/VueSfcParser.js';
import { TsFileParser } from '../parsers/typescript/TsFileParser.js';
import { JavaFileParser } from '../parsers/java/JavaFileParser.js';
import { KotlinFileParser } from '../parsers/java/KotlinFileParser.js';
import { MyBatisXmlParser } from '../parsers/java/MyBatisXmlParser.js';
import type {
  TaskMessage,
  TaskDoneMessage,
  ReadyMessage,
  InitMessage,
} from './parseWorker.js';

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
  /**
   * Per-file parse output for freshly-parsed (uncached) files only.
   * Carries the already-read content so callers can persist to cache
   * without a second readFileSync. Cached files are omitted.
   */
  parsedFileEntries: ParsedFileEntry[];
}

export interface ParsedFileEntry {
  filePath: string;
  content: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  errors: ParseError[];
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

function resolveWorkerPath(): string {
  const thisUrl = new URL(import.meta.url);
  const workerUrl = new URL('./parseWorker.js', thisUrl);
  if (thisUrl.pathname.endsWith('.ts')) {
    return new URL('./parseWorker.ts', thisUrl).pathname;
  }
  return workerUrl.pathname;
}

// ─────────────────────────────────────────────────────────────────
// Worker pool (Phase 2-2)
// ─────────────────────────────────────────────────────────────────

interface PendingTask {
  filePath: string;
  contentBuf: Uint8Array;
  resolve: (r: { result: ParseResult | null; error: string | null }) => void;
  reject: (err: unknown) => void;
}

interface PooledWorker {
  worker: Worker;
  ready: boolean;
  busy: boolean;
  inflight: PendingTask | null;
}

/**
 * A persistent pool of parser workers. Workers are spawned via `warmup()`
 * (typically called by the parser before dispatching tasks) and stay alive
 * until `dispose()`. Each worker is sent the AnalysisConfig exactly once
 * during init and then receives tasks carrying only filePath + transferable
 * content buffer.
 *
 * Failure modes:
 *   • If a worker fails to become ready before `warmupTimeoutMs`, it is
 *     dropped. If NO worker becomes ready, `warmup()` rejects so the caller
 *     can fall back to main-thread parsing.
 *   • If a worker errors during a task, the in-flight task rejects. The
 *     pool removes that worker without respawning (avoids spawn loops on
 *     systemic worker-load failures, e.g. in test environments without a
 *     TS loader).
 */
class WorkerPool {
  private workers: PooledWorker[] = [];
  private queue: PendingTask[] = [];
  private nextTaskId = 0;
  private warmedUp = false;
  private disposed = false;
  private readyResolved = false;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((err: Error) => void) | null = null;

  constructor(
    private readonly config: AnalysisConfig,
    private readonly size: number,
    private readonly workerPath: string,
  ) {}

  /**
   * Spawn workers and wait until at least one becomes ready. Resolves on
   * the first 'ready'; rejects immediately if all workers fail to spawn or
   * exit before any becomes ready, or after `timeoutMs` if no signal arrives.
   * Idempotent.
   */
  async warmup(timeoutMs = 3000): Promise<void> {
    if (this.disposed) throw new Error('WorkerPool disposed');
    if (this.warmedUp) {
      if (this.workers.some((w) => w.ready)) return;
      throw new Error('WorkerPool: no workers ready');
    }
    this.warmedUp = true;

    const readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = () => {
        if (this.readyResolved) return;
        this.readyResolved = true;
        resolve();
      };
      this.readyReject = (err) => {
        if (this.readyResolved) return;
        this.readyResolved = true;
        reject(err);
      };
    });

    for (let i = 0; i < this.size; i++) {
      this.spawnOne(i);
    }

    if (this.workers.length === 0) {
      this.readyReject?.(new Error('WorkerPool: no workers could be spawned'));
    }

    const timer = setTimeout(() => {
      if (!this.readyResolved) {
        this.readyReject?.(new Error(`WorkerPool: no worker became ready within ${timeoutMs}ms`));
      }
    }, timeoutMs);
    timer.unref?.();

    try {
      await readyPromise;
    } finally {
      clearTimeout(timer);
    }
  }

  private spawnOne(id: number): void {
    let worker: Worker;
    try {
      worker = new Worker(this.workerPath);
    } catch {
      // Worker constructor failed — skip
      return;
    }
    const pw: PooledWorker = { worker, ready: false, busy: false, inflight: null };

    worker.on('message', (msg: ReadyMessage | TaskDoneMessage) => {
      if (msg.type === 'ready') {
        pw.ready = true;
        this.readyResolve?.();
        this.dispatch();
        return;
      }
      if (msg.type === 'task-done') {
        const task = pw.inflight;
        pw.inflight = null;
        pw.busy = false;
        if (task) task.resolve({ result: msg.result, error: msg.error });
        this.dispatch();
      }
    });

    worker.on('error', (err) => {
      const task = pw.inflight;
      pw.inflight = null;
      pw.busy = false;
      this.removeWorker(pw);
      if (task) task.reject(err);
    });

    worker.on('exit', (code) => {
      if (this.disposed) return;
      this.removeWorker(pw);
      if (code !== 0 && pw.inflight) {
        pw.inflight.reject(new Error(`Worker exited with code ${code}`));
        pw.inflight = null;
      }
    });

    const init: InitMessage = { type: 'init', id, config: this.config };
    try {
      worker.postMessage(init);
      this.workers.push(pw);
    } catch {
      try { worker.terminate(); } catch { /* ignore */ }
    }
  }

  private removeWorker(pw: PooledWorker): void {
    const idx = this.workers.indexOf(pw);
    if (idx !== -1) this.workers.splice(idx, 1);
    try { pw.worker.terminate(); } catch { /* ignore */ }
    // If no workers remain, fail any queued tasks (no chance of progress)
    if (this.workers.length === 0) {
      const queued = this.queue;
      this.queue = [];
      for (const t of queued) t.reject(new Error('WorkerPool: all workers gone'));
      // If warmup is still pending, fail it now so the caller can fall back
      this.readyReject?.(new Error('WorkerPool: all workers exited before becoming ready'));
    }
  }

  private dispatch(): void {
    if (this.disposed) return;
    while (this.queue.length > 0) {
      const free = this.workers.find((w) => w.ready && !w.busy);
      if (!free) return;
      const task = this.queue.shift()!;
      free.busy = true;
      free.inflight = task;
      const id = this.nextTaskId++;
      const msg: TaskMessage = {
        type: 'task',
        id,
        filePath: task.filePath,
        contentBuf: task.contentBuf,
      };
      try {
        free.worker.postMessage(msg, [task.contentBuf.buffer as ArrayBuffer]);
      } catch (e) {
        free.busy = false;
        free.inflight = null;
        task.reject(e);
      }
    }
  }

  run(filePath: string, content: string): Promise<{ result: ParseResult | null; error: string | null }> {
    if (this.disposed) return Promise.reject(new Error('WorkerPool disposed'));
    if (this.workers.length === 0) return Promise.reject(new Error('WorkerPool not warm'));
    const contentBuf = new TextEncoder().encode(content);
    return new Promise((resolve, reject) => {
      this.queue.push({ filePath, contentBuf, resolve, reject });
      this.dispatch();
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const pw of this.workers) {
      try { pw.worker.terminate(); } catch { /* ignore */ }
    }
    this.workers = [];
    for (const t of this.queue) t.reject(new Error('WorkerPool disposed'));
    this.queue = [];
    this.readyReject?.(new Error('WorkerPool disposed'));
  }
}

/**
 * Parallel parser using a persistent worker_threads pool.
 *
 * Phase 2-2 changes vs. the original per-batch worker spawn:
 *   • Workers are spawned lazily on first parseAll() and reused across runs.
 *   • AnalysisConfig is sent once per worker lifetime (during init), not per
 *     task, so subsequent runs skip config serialization entirely.
 *   • File content is encoded to Uint8Array and the underlying ArrayBuffer
 *     is *transferred* (zero-copy) to the worker.
 *   • Tasks are dispatched via a queue so all workers stay busy until the
 *     queue drains — no batch-imbalance idle time.
 *
 * Callers that perform multiple analyses (e.g. server file-watcher) should
 * keep one ParallelParser instance alive and call `dispose()` on shutdown.
 * One-shot callers (CLI) will see no benefit but pay no extra cost beyond
 * the one-time spawn that previously happened anyway.
 */
export class ParallelParser {
  private concurrency: number;
  private config: AnalysisConfig;
  private pool: WorkerPool | null = null;
  /**
   * Phase 2-6: precomputed (serviceId, absolute root) pairs. Used to tag
   * every parsed node with its owning service in O(services) per file
   * instead of an O(nodes * services) post-hoc sweep done by callers.
   * Empty when no services are configured (single-project mode).
   */
  private serviceRoots: { id: string; root: string }[] = [];

  constructor(config: AnalysisConfig, concurrency?: number, projectRoot?: string) {
    this.config = config;
    this.concurrency = concurrency || Math.max(1, Math.min(8, cpus().length - 1));
    if (config.services && config.services.length > 0) {
      const root = projectRoot ?? '';
      this.serviceRoots = config.services.map((s) => ({
        id: s.id,
        root: root ? resolvePath(root, s.root) : s.root,
      }));
    }
  }

  private tagServiceId(node: GraphNode): void {
    if (this.serviceRoots.length === 0) return;
    if (node.metadata.serviceId !== undefined) return;
    for (const sr of this.serviceRoots) {
      if (node.filePath.startsWith(sr.root)) {
        node.metadata.serviceId = sr.id;
        return;
      }
    }
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

      if (cacheCheck) {
        const cached = cacheCheck(filePath, content);
        if (cached) {
          // Re-tag defensively: cached entries written before 2-6 won't carry
          // serviceId. tagServiceId is a no-op when already set.
          for (const n of cached.nodes) this.tagServiceId(n);
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

    const parsedFileEntries: ParsedFileEntry[] = [];

    // Phase 2: Parse uncached files
    if (uncachedTasks.length > 0) {
      const useWorkers = uncachedTasks.length >= WORKER_THRESHOLD;
      let workerSucceeded = false;

      if (useWorkers) {
        try {
          if (!this.pool) {
            this.pool = new WorkerPool(this.config, this.concurrency, resolveWorkerPath());
          }
          await this.pool.warmup();
          // Dispatch all tasks in parallel; results streamed in any order
          const settled = await Promise.all(
            uncachedTasks.map((t) =>
              this.pool!.run(t.filePath, t.content).then(
                (r) => ({ ok: true as const, task: t, result: r.result, error: r.error }),
                (err) => ({ ok: false as const, task: t, error: err instanceof Error ? err.message : String(err) }),
              ),
            ),
          );
          for (const s of settled) {
            if (!s.ok || s.error || !('result' in s) || !s.result) {
              allErrors.push({
                filePath: s.task.filePath,
                message: `Worker parse error: ${(s as { error?: string }).error ?? 'unknown'}`,
                severity: 'error',
              });
            } else {
              for (const n of s.result.nodes) this.tagServiceId(n);
              allNodes.push(...s.result.nodes);
              allEdges.push(...s.result.edges);
              allErrors.push(...s.result.errors);
              parsedFileEntries.push({
                filePath: s.task.filePath,
                content: s.task.content,
                nodes: s.result.nodes,
                edges: s.result.edges,
                errors: s.result.errors,
              });
            }
            processed++;
            reportProgress(s.task.filePath);
          }
          workerSucceeded = true;
        } catch {
          // Pool failure → fall through to main-thread parsing
          this.disposePool();
          workerSucceeded = false;
        }
      }

      if (!workerSucceeded) {
        for (const task of uncachedTasks) {
          const result = parseFile(task.filePath, task.content, this.config);
          for (const n of result.nodes) this.tagServiceId(n);
          allNodes.push(...result.nodes);
          allEdges.push(...result.edges);
          allErrors.push(...result.errors);
          parsedFileEntries.push({
            filePath: task.filePath,
            content: task.content,
            nodes: result.nodes,
            edges: result.edges,
            errors: result.errors,
          });
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
      parsedFileEntries,
    };
  }

  private disposePool(): void {
    if (this.pool) {
      this.pool.dispose();
      this.pool = null;
    }
  }

  /**
   * Terminate any pooled workers. Callers that reuse a parser across
   * multiple analyses should call this on shutdown to avoid hanging the
   * Node event loop.
   */
  dispose(): void {
    this.disposePool();
  }
}
