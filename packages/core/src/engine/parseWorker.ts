import { parentPort } from 'worker_threads';
import { parseFile } from './ParallelParser.js';
import type { AnalysisConfig, ParseResult } from '../graph/types.js';

/**
 * Worker protocol (Phase 2-2):
 *
 *   main → worker:
 *     { type: 'init', id, config }                  // sent once on spawn
 *     { type: 'task', id, filePath, contentBuf }    // contentBuf is a transferred Uint8Array
 *
 *   worker → main:
 *     { type: 'ready', id }                         // ack of init
 *     { type: 'task-done', id, filePath, result, error }
 */

export interface InitMessage {
  type: 'init';
  id: number;
  config: AnalysisConfig;
}
export interface TaskMessage {
  type: 'task';
  id: number;
  filePath: string;
  contentBuf: Uint8Array;
}
export interface ReadyMessage {
  type: 'ready';
  id: number;
}
export interface TaskDoneMessage {
  type: 'task-done';
  id: number;
  filePath: string;
  result: ParseResult | null;
  error: string | null;
}

// --- Legacy single-batch protocol kept for fallback/back-compat ---
export interface WorkerTask {
  filePath: string;
  content: string;
  config: AnalysisConfig;
}
export interface WorkerResult {
  filePath: string;
  result: ParseResult | null;
  error: string | null;
}
export interface WorkerBatchMessage {
  type: 'batch';
  tasks: WorkerTask[];
}
export interface WorkerBatchResponse {
  type: 'batch-done';
  results: WorkerResult[];
}

if (parentPort) {
  let workerConfig: AnalysisConfig | null = null;
  const decoder = new TextDecoder('utf-8');

  parentPort.on('message', (msg: InitMessage | TaskMessage | WorkerBatchMessage) => {
    if (msg.type === 'init') {
      workerConfig = msg.config;
      parentPort!.postMessage({ type: 'ready', id: msg.id } satisfies ReadyMessage);
      return;
    }

    if (msg.type === 'task') {
      const config = workerConfig ?? {};
      let result: ParseResult | null = null;
      let error: string | null = null;
      try {
        const content = decoder.decode(msg.contentBuf);
        result = parseFile(msg.filePath, content, config);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      parentPort!.postMessage({
        type: 'task-done',
        id: msg.id,
        filePath: msg.filePath,
        result,
        error,
      } satisfies TaskDoneMessage);
      return;
    }

    if (msg.type === 'batch') {
      const results: WorkerResult[] = [];
      for (const task of msg.tasks) {
        try {
          const r = parseFile(task.filePath, task.content, task.config);
          results.push({ filePath: task.filePath, result: r, error: null });
        } catch (e) {
          results.push({
            filePath: task.filePath,
            result: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      parentPort!.postMessage({ type: 'batch-done', results } satisfies WorkerBatchResponse);
    }
  });
}
