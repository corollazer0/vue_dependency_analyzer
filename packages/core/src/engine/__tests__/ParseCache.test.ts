import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ParseCache } from '../ParseCache.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'vda-cache-test-' + Date.now());

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('ParseCache', () => {
  it('should return null for uncached files', () => {
    const cache = new ParseCache(testDir);
    expect(cache.get('/foo.vue', 'content')).toBeNull();
  });

  it('should cache and retrieve parse results', () => {
    const cache = new ParseCache(testDir);
    const result = { nodes: [{ id: 'n1', kind: 'vue-component' as const, label: 'Foo', filePath: '/foo.vue', metadata: {} }], edges: [], errors: [] };
    cache.set('/foo.vue', 'content-abc', result);

    const cached = cache.get('/foo.vue', 'content-abc');
    expect(cached).not.toBeNull();
    expect(cached!.nodes).toHaveLength(1);
    expect(cached!.nodes[0].id).toBe('n1');
  });

  it('should return null when content hash changes', () => {
    const cache = new ParseCache(testDir);
    const result = { nodes: [], edges: [], errors: [] };
    cache.set('/foo.vue', 'old-content', result);

    expect(cache.get('/foo.vue', 'new-content')).toBeNull();
  });

  it('should invalidate specific files', () => {
    const cache = new ParseCache(testDir);
    const result = { nodes: [], edges: [], errors: [] };
    cache.set('/foo.vue', 'content', result);
    cache.set('/bar.vue', 'content', result);

    cache.invalidate('/foo.vue');
    expect(cache.get('/foo.vue', 'content')).toBeNull();
    expect(cache.get('/bar.vue', 'content')).not.toBeNull();
  });

  it('should clear all entries', () => {
    const cache = new ParseCache(testDir);
    const result = { nodes: [], edges: [], errors: [] };
    cache.set('/foo.vue', 'content', result);
    cache.set('/bar.vue', 'content', result);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should persist cache to disk and load it back', () => {
    const cache1 = new ParseCache(testDir, 'config-v1');
    const result = { nodes: [{ id: 'n1', kind: 'vue-component' as const, label: 'X', filePath: '/x.vue', metadata: {} }], edges: [], errors: [] };
    cache1.set('/x.vue', 'content-123', result);
    cache1.save();

    // Load from disk
    const cache2 = new ParseCache(testDir, 'config-v1');
    const cached = cache2.get('/x.vue', 'content-123');
    expect(cached).not.toBeNull();
    expect(cached!.nodes[0].id).toBe('n1');
  });

  it('should bust cache when config changes', () => {
    const cache1 = new ParseCache(testDir, 'config-v1');
    const result = { nodes: [], edges: [], errors: [] };
    cache1.set('/x.vue', 'content', result);
    cache1.save();

    // Different config → cache busted
    const cache2 = new ParseCache(testDir, 'config-v2');
    expect(cache2.get('/x.vue', 'content')).toBeNull();
    expect(cache2.size).toBe(0);
  });

  it('should handle a corrupted legacy json cache file gracefully', () => {
    const cacheDir = join(testDir, '.vda-cache');
    mkdirSync(cacheDir, { recursive: true });
    require('fs').writeFileSync(join(cacheDir, 'parse-cache.json'), 'NOT VALID JSON', 'utf-8');

    const cache = new ParseCache(testDir);
    expect(cache.size).toBe(0); // Should not crash; legacy file is dropped silently
  });

  it('should migrate a legacy json cache file into sqlite (matching config)', () => {
    const cacheDir = join(testDir, '.vda-cache');
    mkdirSync(cacheDir, { recursive: true });
    const legacy = {
      version: 1,
      configHash: require('crypto').createHash('sha256').update('cfg-legacy').digest('hex').slice(0, 16),
      entries: {
        '/legacy.vue': {
          contentHash: require('crypto').createHash('sha256').update('legacy-body').digest('hex').slice(0, 16),
          nodes: [{ id: 'l1', kind: 'vue-component' as const, label: 'L', filePath: '/legacy.vue', metadata: {} }],
          edges: [],
          errors: [],
          timestamp: Date.now(),
        },
      },
    };
    require('fs').writeFileSync(join(cacheDir, 'parse-cache.json'), JSON.stringify(legacy), 'utf-8');

    const cache = new ParseCache(testDir, 'cfg-legacy');
    const cached = cache.get('/legacy.vue', 'legacy-body');
    expect(cached).not.toBeNull();
    expect(cached!.nodes[0].id).toBe('l1');
    // Legacy file should have been removed
    expect(existsSync(join(cacheDir, 'parse-cache.json'))).toBe(false);
  });

  it('should support setMany() bulk insertion in a single transaction', () => {
    const cache = new ParseCache(testDir);
    const entries = Array.from({ length: 50 }, (_, i) => ({
      filePath: `/f${i}.vue`,
      content: `c${i}`,
      result: { nodes: [], edges: [], errors: [] },
    }));
    cache.setMany(entries);
    expect(cache.size).toBe(50);
    expect(cache.get('/f10.vue', 'c10')).not.toBeNull();
  });

  it('readonly cache should reject writes silently', () => {
    // First create the db with a writer
    const writer = new ParseCache(testDir, 'cfg-ro');
    writer.set('/a.vue', 'a', { nodes: [], edges: [], errors: [] });
    writer.close();

    const reader = new ParseCache(testDir, 'cfg-ro', { readonly: true });
    expect(reader.get('/a.vue', 'a')).not.toBeNull();
    // Writes are no-ops in readonly mode
    reader.set('/b.vue', 'b', { nodes: [], edges: [], errors: [] });
    reader.invalidate('/a.vue');
    reader.clear();
    expect(reader.size).toBe(1);
  });

  it('should report correct size', () => {
    const cache = new ParseCache(testDir);
    expect(cache.size).toBe(0);
    cache.set('/a.vue', 'a', { nodes: [], edges: [], errors: [] });
    cache.set('/b.vue', 'b', { nodes: [], edges: [], errors: [] });
    expect(cache.size).toBe(2);
    cache.invalidate('/a.vue');
    expect(cache.size).toBe(1);
  });

  it('should overwrite existing entry on re-set', () => {
    const cache = new ParseCache(testDir);
    cache.set('/a.vue', 'v1', { nodes: [{ id: 'old', kind: 'ts-module' as const, label: 'old', filePath: '/a.vue', metadata: {} }], edges: [], errors: [] });
    cache.set('/a.vue', 'v2', { nodes: [{ id: 'new', kind: 'ts-module' as const, label: 'new', filePath: '/a.vue', metadata: {} }], edges: [], errors: [] });

    expect(cache.get('/a.vue', 'v1')).toBeNull(); // old hash
    const cached = cache.get('/a.vue', 'v2');
    expect(cached!.nodes[0].id).toBe('new');
  });
});
