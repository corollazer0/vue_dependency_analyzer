import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cpus } from 'os';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { GraphNode, GraphEdge, ParseError, AnalysisConfig, ParseResult } from '../graph/types.js';
import { VueSfcParser } from '../parsers/vue/VueSfcParser.js';
import { TsFileParser } from '../parsers/typescript/TsFileParser.js';
import { JavaFileParser } from '../parsers/java/JavaFileParser.js';
import { KotlinFileParser } from '../parsers/java/KotlinFileParser.js';
import { MyBatisXmlParser } from '../parsers/java/MyBatisXmlParser.js';

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
 * Parses a single file using the appropriate parser.
 * This is the function used both in main thread (fallback) and conceptually in workers.
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
 * Parallel parser using chunked concurrent execution.
 * Uses Promise.all with controlled concurrency instead of worker_threads
 * to avoid serialization overhead (TS compiler API objects aren't transferable).
 */
export class ParallelParser {
  private concurrency: number;
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig, concurrency?: number) {
    this.config = config;
    this.concurrency = concurrency || Math.max(1, cpus().length - 1);
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

    // Read all file contents upfront
    const tasks: FileTask[] = [];
    for (const filePath of files) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        tasks.push({ filePath, content });
      } catch (e) {
        allErrors.push({
          filePath,
          message: `Failed to read: ${e instanceof Error ? e.message : String(e)}`,
          severity: 'error',
        });
        processed++;
      }
    }

    // Process in chunks for concurrency control
    const chunkSize = Math.max(1, Math.ceil(tasks.length / this.concurrency));
    const chunks: FileTask[][] = [];
    for (let i = 0; i < tasks.length; i += chunkSize) {
      chunks.push(tasks.slice(i, i + chunkSize));
    }

    // Process chunks concurrently
    await Promise.all(chunks.map(async (chunk) => {
      for (const task of chunk) {
        // Check cache first
        if (cacheCheck) {
          const cached = cacheCheck(task.filePath, task.content);
          if (cached) {
            allNodes.push(...cached.nodes);
            allEdges.push(...cached.edges);
            allErrors.push(...cached.errors);
            cachedCount++;
            processed++;
            if (onProgress) {
              onProgress({
                processed,
                total: files.length,
                currentFile: task.filePath,
                cachedCount,
                elapsedMs: Date.now() - startTime,
              });
            }
            continue;
          }
        }

        // Parse
        const result = parseFile(task.filePath, task.content, this.config);
        allNodes.push(...result.nodes);
        allEdges.push(...result.edges);
        allErrors.push(...result.errors);

        processed++;
        if (onProgress) {
          onProgress({
            processed,
            total: files.length,
            currentFile: task.filePath,
            cachedCount,
            elapsedMs: Date.now() - startTime,
          });
        }
      }
    }));

    return {
      nodes: allNodes,
      edges: allEdges,
      errors: allErrors,
      durationMs: Date.now() - startTime,
      cachedCount,
    };
  }
}
