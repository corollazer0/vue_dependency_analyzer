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

  describe('router file (router.ts)', () => {
    const content = readFileSync(resolve(fixturesDir, 'router.ts'), 'utf-8');
    const result = parser.parse('/test/router.ts', content, {});

    it('should detect as vue-router-route', () => {
      const node = result.nodes.find(n => n.kind === 'vue-router-route');
      expect(node).toBeDefined();
    });

    it('should create route-renders edges for static components', () => {
      const staticEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).componentName,
      );
      expect(staticEdges.length).toBeGreaterThanOrEqual(2);
      const names = staticEdges.map(e => (e.metadata as any).componentName);
      expect(names).toContain('HomeView');
      expect(names).toContain('UserListView');
    });

    it('should create route-renders edges for lazy imports', () => {
      const lazyEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).isLazy,
      );
      expect(lazyEdges.length).toBeGreaterThanOrEqual(2);
      const paths = lazyEdges.map(e => (e.metadata as any).importPath);
      expect(paths).toContain('@/views/UserDetailView.vue');
      expect(paths).toContain('@/views/ProductListView.vue');
    });

    it('should target unresolved imports for lazy routes', () => {
      const lazyEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).isLazy,
      );
      for (const edge of lazyEdges) {
        expect(edge.target).toMatch(/^unresolved:/);
      }
    });

    it('should target component: prefix for static routes', () => {
      const staticEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).componentName,
      );
      for (const edge of staticEdges) {
        expect(edge.target).toMatch(/^component:/);
      }
    });
  });

  describe('nested routes with children', () => {
    const nestedRouterContent = `
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/views/AdminLayout.vue'
import AdminUsers from '@/views/AdminUsers.vue'

const routes: RouteRecordRaw[] = [
  { path: '/admin', component: AdminLayout, children: [
    { path: 'users', component: AdminUsers },
    { path: 'settings', component: () => import('@/views/AdminSettings.vue') },
  ]},
  { path: '/login', component: () => import('@/views/LoginView.vue') },
]

export default createRouter({ history: createWebHistory(), routes })
`;
    const result = parser.parse('/test/router/index.ts', nestedRouterContent, {});

    it('should detect as vue-router-route', () => {
      const node = result.nodes.find(n => n.kind === 'vue-router-route');
      expect(node).toBeDefined();
    });

    it('should detect static components in children', () => {
      const staticEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).componentName,
      );
      const names = staticEdges.map(e => (e.metadata as any).componentName);
      expect(names).toContain('AdminLayout');
      expect(names).toContain('AdminUsers');
    });

    it('should detect lazy imports in children', () => {
      const lazyEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).isLazy,
      );
      const paths = lazyEdges.map(e => (e.metadata as any).importPath);
      expect(paths).toContain('@/views/AdminSettings.vue');
      expect(paths).toContain('@/views/LoginView.vue');
    });

    it('should create correct number of route-renders edges', () => {
      const routeEdges = result.edges.filter(e => e.kind === 'route-renders');
      // 2 static (AdminLayout, AdminUsers) + 2 lazy (AdminSettings, LoginView)
      expect(routeEdges).toHaveLength(4);
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
