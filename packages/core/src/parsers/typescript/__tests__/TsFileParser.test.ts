import { describe, it, expect } from 'vitest';
import { TsFileParser } from '../TsFileParser.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../__fixtures__');

describe('TsFileParser', () => {
  const parser = new TsFileParser();

  it('should support .ts and .js files', () => {
    expect(parser.supports('foo.ts')).toBe(true);
    expect(parser.supports('foo.js')).toBe(true);
    expect(parser.supports('foo.tsx')).toBe(true);
    expect(parser.supports('foo.vue')).toBe(false);
    expect(parser.supports('foo.d.ts')).toBe(false);
  });

  describe('composable file (useAuth.ts)', () => {
    const content = readFileSync(resolve(fixturesDir, 'useAuth.ts'), 'utf-8');
    const result = parser.parse('/test/useAuth.ts', content, {});

    it('should detect as vue-composable', () => {
      const mainNode = result.nodes.find(n => n.kind === 'vue-composable');
      expect(mainNode).toBeDefined();
      expect(mainNode!.label).toBe('useAuth');
    });

    it('should detect imports', () => {
      const imports = result.edges.filter(e => e.kind === 'imports');
      const paths = imports.map(e => (e.metadata as any).importPath);
      expect(paths).toContain('./stores/userStore');
    });

    it('should detect API calls', () => {
      const apiEdges = result.edges.filter(e => e.kind === 'api-call');
      expect(apiEdges).toHaveLength(2);
      const apiNodes = result.nodes.filter(n => n.kind === 'api-call-site');
      expect(apiNodes).toHaveLength(2);
    });

    it('should detect exported functions', () => {
      const mainNode = result.nodes.find(n => n.kind === 'vue-composable');
      expect((mainNode!.metadata as any).exportedFunctions).toContain('useAuth');
    });
  });

  describe('store file (userStore.ts)', () => {
    const content = readFileSync(resolve(fixturesDir, 'stores/userStore.ts'), 'utf-8');
    const result = parser.parse('/test/stores/userStore.ts', content, {});

    it('should detect as pinia-store', () => {
      const mainNode = result.nodes.find(n => n.kind === 'pinia-store');
      expect(mainNode).toBeDefined();
      expect(mainNode!.label).toBe('userStore');
    });

    it('should detect imports', () => {
      const imports = result.edges.filter(e => e.kind === 'imports');
      const paths = imports.map(e => (e.metadata as any).importPath);
      expect(paths).toContain('pinia');
    });
  });
});
