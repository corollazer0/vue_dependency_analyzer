import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { GraphNode, GraphEdge, ParseError, ParseResult } from '../graph/types.js';

interface CacheEntry {
  contentHash: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  errors: ParseError[];
  timestamp: number;
}

interface CacheData {
  version: number;
  configHash: string;
  entries: Record<string, CacheEntry>;
}

const CACHE_VERSION = 1;

export class ParseCache {
  private entries = new Map<string, CacheEntry>();
  private cacheDir: string;
  private cacheFile: string;
  private configHash: string;
  private dirty = false;

  constructor(projectRoot: string, configJson: string = '') {
    this.cacheDir = join(projectRoot, '.vda-cache');
    this.cacheFile = join(this.cacheDir, 'parse-cache.json');
    this.configHash = contentHash(configJson);
    this.load();
  }

  private load(): void {
    if (!existsSync(this.cacheFile)) return;

    try {
      const raw = readFileSync(this.cacheFile, 'utf-8');
      const data: CacheData = JSON.parse(raw);

      // Bust cache if version or config changed
      if (data.version !== CACHE_VERSION || data.configHash !== this.configHash) {
        this.entries.clear();
        return;
      }

      for (const [filePath, entry] of Object.entries(data.entries)) {
        this.entries.set(filePath, entry);
      }
    } catch {
      // Corrupted cache, start fresh
      this.entries.clear();
    }
  }

  save(): void {
    if (!this.dirty) return;

    try {
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }

      const data: CacheData = {
        version: CACHE_VERSION,
        configHash: this.configHash,
        entries: Object.fromEntries(this.entries),
      };

      writeFileSync(this.cacheFile, JSON.stringify(data), 'utf-8');
      this.dirty = false;
    } catch {
      // Cache write failure is non-fatal
    }
  }

  /**
   * Check if file content matches cache. Returns cached result or null.
   */
  get(filePath: string, content: string): ParseResult | null {
    const entry = this.entries.get(filePath);
    if (!entry) return null;

    const hash = contentHash(content);
    if (entry.contentHash !== hash) return null;

    return {
      nodes: entry.nodes,
      edges: entry.edges,
      errors: entry.errors,
    };
  }

  /**
   * Store parse result in cache.
   */
  set(filePath: string, content: string, result: ParseResult): void {
    this.entries.set(filePath, {
      contentHash: contentHash(content),
      nodes: result.nodes,
      edges: result.edges,
      errors: result.errors,
      timestamp: Date.now(),
    });
    this.dirty = true;
  }

  invalidate(filePath: string): void {
    if (this.entries.delete(filePath)) {
      this.dirty = true;
    }
  }

  clear(): void {
    this.entries.clear();
    this.dirty = true;
  }

  get size(): number {
    return this.entries.size;
  }

  get hitRate(): { hits: number; total: number } {
    // Tracked externally — this is just for size reporting
    return { hits: 0, total: 0 };
  }
}

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
