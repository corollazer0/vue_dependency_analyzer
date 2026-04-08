import { parentPort } from 'worker_threads';
import { parseFile } from './ParallelParser.js';
import type { AnalysisConfig, ParseResult } from '../graph/types.js';

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
  parentPort.on('message', (msg: WorkerBatchMessage) => {
    if (msg.type === 'batch') {
      const results: WorkerResult[] = [];
      for (const task of msg.tasks) {
        try {
          const result = parseFile(task.filePath, task.content, task.config);
          results.push({ filePath: task.filePath, result, error: null });
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
