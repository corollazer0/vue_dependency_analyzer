import { describe, it, expect, afterAll } from 'vitest';
import { ParallelParser, parseFile } from '../ParallelParser.js';
import type { ProgressInfo } from '../ParallelParser.js';
import { resolve } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const fixturesDir = resolve(import.meta.dirname, '../../__fixtures__');

describe('parseFile', () => {
  it('should parse .vue files', () => {
    const content = `<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>
<template><div>{{ count }}</div></template>`;
    const result = parseFile('/test.vue', content, {});
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
    expect(result.nodes[0].kind).toBe('vue-component');
  });

  it('should parse .ts files', () => {
    const content = `export function useCounter() { return { count: 0 }; }`;
    const result = parseFile('/useCounter.ts', content, {});
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse .java files', () => {
    const content = `package com.test;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/test")
public class TestController {
    @GetMapping("/hello")
    public String hello() { return "hello"; }
}`;
    const result = parseFile('/Test.java', content, {});
    const controller = result.nodes.find(n => n.kind === 'spring-controller');
    expect(controller).toBeDefined();
  });

  it('should parse .xml mybatis files', () => {
    const content = `<mapper namespace="com.test.TestMapper">
  <select id="find">SELECT * FROM test_table</select>
</mapper>`;
    const result = parseFile('/test.xml', content, {});
    expect(result.nodes.find(n => n.kind === 'mybatis-mapper')).toBeDefined();
    expect(result.nodes.find(n => n.kind === 'db-table')).toBeDefined();
  });

  it('should return empty for unsupported files', () => {
    const result = parseFile('/readme.md', '# Hello', {});
    expect(result.nodes).toHaveLength(0);
  });
});

describe('ParallelParser', () => {
  it('should parse multiple files with progress callback', async () => {
    const files = [
      resolve(fixturesDir, 'SampleComponent.vue'),
      resolve(fixturesDir, 'useAuth.ts'),
      resolve(fixturesDir, 'stores/userStore.ts'),
      resolve(fixturesDir, 'UserController.java'),
      resolve(fixturesDir, 'UserMapper.xml'),
    ];

    const progressEvents: ProgressInfo[] = [];
    const parser = new ParallelParser({});
    const result = await parser.parseAll(files, (info) => {
      progressEvents.push({ ...info });
    });

    expect(result.nodes.length).toBeGreaterThan(10);
    expect(result.edges.length).toBeGreaterThan(5);
    expect(result.errors).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // Progress should have been called for each file
    expect(progressEvents.length).toBe(5);
    expect(progressEvents[progressEvents.length - 1].processed).toBe(5);
    expect(progressEvents[progressEvents.length - 1].total).toBe(5);
  });

  it('should integrate with cache check', async () => {
    const files = [resolve(fixturesDir, 'SampleComponent.vue')];
    const cachedResult = { nodes: [{ id: 'cached', kind: 'vue-component' as const, label: 'cached', filePath: files[0], metadata: {} }], edges: [], errors: [] };

    const parser = new ParallelParser({});
    const result = await parser.parseAll(files, undefined, (filePath, content) => {
      return cachedResult; // Always return cached
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('cached');
    expect(result.cachedCount).toBe(1);
  });

  it('should handle file read errors gracefully', async () => {
    const files = ['/nonexistent/file.vue'];
    const parser = new ParallelParser({});
    const result = await parser.parseAll(files);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Failed to read');
  });

  it('should parse many files using worker threads (above WORKER_THRESHOLD)', async () => {
    // Use enough files to exceed the WORKER_THRESHOLD of 4
    const files = [
      resolve(fixturesDir, 'SampleComponent.vue'),
      resolve(fixturesDir, 'useAuth.ts'),
      resolve(fixturesDir, 'stores/userStore.ts'),
      resolve(fixturesDir, 'UserController.java'),
      resolve(fixturesDir, 'UserMapper.xml'),
    ];

    const progressEvents: ProgressInfo[] = [];
    const parser = new ParallelParser({});
    const result = await parser.parseAll(files, (info) => {
      progressEvents.push({ ...info });
    });

    // All files should be parsed with correct results (same as main-thread)
    expect(result.nodes.length).toBeGreaterThan(10);
    expect(result.edges.length).toBeGreaterThan(5);
    expect(result.errors).toHaveLength(0);
    expect(progressEvents.length).toBe(5);
    expect(progressEvents[progressEvents.length - 1].processed).toBe(5);
  });

  it('should fall back to main thread when workers fail', async () => {
    // Even with a single file (below threshold), it should work via main thread fallback
    const files = [resolve(fixturesDir, 'SampleComponent.vue')];
    const parser = new ParallelParser({}, 1);
    const result = await parser.parseAll(files);

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  describe('serviceId tagging', () => {
    const tmpRoot = mkdtempSync(resolve(tmpdir(), 'vda-svc-'));
    mkdirSync(resolve(tmpRoot, 'services/api'), { recursive: true });
    mkdirSync(resolve(tmpRoot, 'services/api-gateway'), { recursive: true });
    const apiFile = resolve(tmpRoot, 'services/api/a.ts');
    const gatewayFile = resolve(tmpRoot, 'services/api-gateway/g.ts');
    writeFileSync(apiFile, 'export const a = 1;');
    writeFileSync(gatewayFile, 'export const g = 1;');

    afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

    it('attributes prefix-sharing siblings to the most specific service regardless of config order', async () => {
      // `services/api` is listed first; the buggy implementation matched it
      // for `services/api-gateway/g.ts` via raw startsWith.
      const parser = new ParallelParser(
        {
          projectRoot: tmpRoot,
          services: [
            { id: 'api', root: 'services/api', type: 'spring-boot' },
            { id: 'api-gateway', root: 'services/api-gateway', type: 'spring-boot' },
          ],
        },
        1,
        tmpRoot,
      );
      const result = await parser.parseAll([apiFile, gatewayFile]);

      const apiNode = result.nodes.find((n) => n.filePath === apiFile);
      const gatewayNode = result.nodes.find((n) => n.filePath === gatewayFile);
      expect(apiNode?.metadata.serviceId).toBe('api');
      expect(gatewayNode?.metadata.serviceId).toBe('api-gateway');
    });
  });
});
