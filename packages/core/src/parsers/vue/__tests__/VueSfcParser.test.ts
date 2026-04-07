import { describe, it, expect } from 'vitest';
import { VueSfcParser } from '../VueSfcParser.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../__fixtures__');

describe('VueSfcParser', () => {
  const parser = new VueSfcParser();

  it('should support .vue files', () => {
    expect(parser.supports('Foo.vue')).toBe(true);
    expect(parser.supports('Foo.ts')).toBe(false);
  });

  describe('SampleComponent.vue', () => {
    const content = readFileSync(resolve(fixturesDir, 'SampleComponent.vue'), 'utf-8');
    const result = parser.parse('/test/SampleComponent.vue', content, {
      nativeBridges: ['AndroidBridge'],
    });

    it('should create a vue-component node', () => {
      const componentNode = result.nodes.find(n => n.kind === 'vue-component');
      expect(componentNode).toBeDefined();
      expect(componentNode!.label).toBe('SampleComponent');
    });

    it('should detect import edges', () => {
      const imports = result.edges.filter(e => e.kind === 'imports');
      expect(imports.length).toBeGreaterThanOrEqual(4);
      const importPaths = imports.map(e => (e.metadata as any).importPath);
      expect(importPaths).toContain('@/stores/userStore');
      expect(importPaths).toContain('@/composables/useAuth');
      expect(importPaths).toContain('./ChildComponent.vue');
    });

    it('should detect Pinia store usage', () => {
      const storeEdges = result.edges.filter(e => e.kind === 'uses-store');
      expect(storeEdges).toHaveLength(1);
      expect(storeEdges[0].metadata).toMatchObject({ storeName: 'useUserStore' });
    });

    it('should detect composable usage', () => {
      const composableEdges = result.edges.filter(e => e.kind === 'uses-composable');
      expect(composableEdges).toHaveLength(1);
      expect(composableEdges[0].metadata).toMatchObject({ composableName: 'useAuth' });
    });

    it('should detect API calls', () => {
      const apiEdges = result.edges.filter(e => e.kind === 'api-call');
      expect(apiEdges).toHaveLength(2);
      const urls = apiEdges.map(e => (e.metadata as any).url);
      expect(urls).toContain('/api/users');
      const methods = apiEdges.map(e => (e.metadata as any).httpMethod);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
    });

    it('should detect API call site nodes', () => {
      const apiNodes = result.nodes.filter(n => n.kind === 'api-call-site');
      expect(apiNodes).toHaveLength(2);
    });

    it('should detect native bridge calls', () => {
      const nativeEdges = result.edges.filter(e => e.kind === 'native-call');
      expect(nativeEdges).toHaveLength(1);
      expect(nativeEdges[0].metadata).toMatchObject({
        interfaceName: 'AndroidBridge',
        methodName: 'showToast',
      });
    });

    it('should detect provide/inject', () => {
      const provides = result.edges.filter(e => e.kind === 'provides');
      expect(provides).toHaveLength(1);
      expect(provides[0].metadata).toMatchObject({ injectionKey: 'theme' });

      const injects = result.edges.filter(e => e.kind === 'injects');
      expect(injects).toHaveLength(1);
      expect(injects[0].metadata).toMatchObject({ injectionKey: 'locale' });
    });

    it('should extract props from defineProps', () => {
      const componentNode = result.nodes.find(n => n.kind === 'vue-component');
      expect((componentNode!.metadata as any).props).toContain('title');
      expect((componentNode!.metadata as any).props).toContain('count');
    });

    it('should extract emits from defineEmits', () => {
      const componentNode = result.nodes.find(n => n.kind === 'vue-component');
      expect((componentNode!.metadata as any).emits).toContain('update');
      expect((componentNode!.metadata as any).emits).toContain('close');
    });

    it('should detect child components in template', () => {
      const componentEdges = result.edges.filter(e => e.kind === 'uses-component');
      const componentNames = componentEdges.map(e => (e.metadata as any).componentName);
      expect(componentNames).toContain('ChildComponent');
      expect(componentNames).toContain('BaseButton');
      expect(componentNames).toContain('CustomDialog');
    });

    it('should detect custom directives in template', () => {
      const directiveEdges = result.edges.filter(e => e.kind === 'uses-directive');
      expect(directiveEdges).toHaveLength(1);
      expect(directiveEdges[0].metadata).toMatchObject({ directiveName: 'highlight' });
    });

    it('should not have parsing errors', () => {
      expect(result.errors).toHaveLength(0);
    });
  });
});
