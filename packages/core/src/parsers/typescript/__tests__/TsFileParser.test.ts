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

  describe('alias lazy routes (const X = () => import(...))', () => {
    const aliasRouterContent = `
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const HomeView = () => import('@/components/dashboard/DashboardPage.vue')
const LoginView = () => import('@/components/auth/Login.vue')
const ProductListView = () => import('@/components/product/ProductList.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', component: HomeView },
  { path: '/login', component: LoginView },
  { path: '/products', component: ProductListView },
  { path: '/about', component: () => import('@/views/About.vue') },
]

export default createRouter({ history: createWebHistory(), routes })
`;
    const result = parser.parse('/test/router/index.ts', aliasRouterContent, {});

    it('should resolve alias references to unresolved: import paths', () => {
      const routeEdges = result.edges.filter(e => e.kind === 'route-renders');
      // 3 alias lazy + 1 inline lazy = 4 total
      expect(routeEdges).toHaveLength(4);

      // All should be unresolved: (not component:)
      for (const edge of routeEdges) {
        expect(edge.target).toMatch(/^unresolved:/);
      }
    });

    it('should preserve import paths from aliases', () => {
      const lazyEdges = result.edges.filter(e => e.kind === 'route-renders');
      const paths = lazyEdges.map(e => (e.metadata as any).importPath);
      expect(paths).toContain('@/components/dashboard/DashboardPage.vue');
      expect(paths).toContain('@/components/auth/Login.vue');
      expect(paths).toContain('@/components/product/ProductList.vue');
      expect(paths).toContain('@/views/About.vue');
    });

    it('should mark alias field on alias-resolved edges', () => {
      const aliasEdges = result.edges.filter(
        e => e.kind === 'route-renders' && (e.metadata as any).alias,
      );
      expect(aliasEdges.length).toBe(3);
      const aliases = aliasEdges.map(e => (e.metadata as any).alias);
      expect(aliases).toContain('HomeView');
      expect(aliases).toContain('LoginView');
      expect(aliases).toContain('ProductListView');
    });

    it('should not create duplicate edges for the same import path', () => {
      const paths = result.edges
        .filter(e => e.kind === 'route-renders')
        .map(e => (e.metadata as any).importPath);
      expect(new Set(paths).size).toBe(paths.length);
    });
  });

  describe('interface and type extraction', () => {
    it('should extract exported interfaces with fields', () => {
      const content = `
export interface UserResponse {
  id: number;
  username: string;
  email: string;
}

export interface ProductResponse {
  id: number;
  title: string;
  price: number;
}
`;
      const result = parser.parse('/test/types/api.ts', content, {});
      const mainNode = result.nodes.find(n => n.kind === 'ts-module');
      expect(mainNode).toBeDefined();
      const meta = mainNode!.metadata as any;
      expect(meta.interfaces).toHaveLength(2);
      expect(meta.interfaces[0].name).toBe('UserResponse');
      expect(meta.interfaces[0].fields).toEqual(['id', 'username', 'email']);
      expect(meta.interfaces[0].fieldTypes).toHaveLength(3);
      expect(meta.interfaces[0].fieldTypes[0]).toEqual({ name: 'id', type: 'number', optional: false });
      expect(meta.interfaces[1].name).toBe('ProductResponse');
      expect(meta.interfaces[1].fields).toEqual(['id', 'title', 'price']);
      expect(meta.exportedTypes).toHaveLength(2);
    });

    it('should extract exported type aliases with object shape', () => {
      const content = `
export type OrderItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
};
`;
      const result = parser.parse('/test/types/order.ts', content, {});
      const mainNode = result.nodes.find(n => n.kind === 'ts-module');
      const meta = mainNode!.metadata as any;
      expect(meta.interfaces).toHaveLength(1);
      expect(meta.interfaces[0].name).toBe('OrderItem');
      expect(meta.interfaces[0].fields).toEqual(['productId', 'quantity', 'unitPrice']);
      expect(meta.interfaces[0].fieldTypes).toHaveLength(3);
      expect(meta.exportedTypes).toHaveLength(1);
    });

    it('should separate exported and non-exported interfaces', () => {
      const content = `
interface InternalConfig {
  debug: boolean;
  timeout: number;
}

export interface PublicApi {
  name: string;
  version: string;
}
`;
      const result = parser.parse('/test/types/mixed.ts', content, {});
      const mainNode = result.nodes.find(n => n.kind === 'ts-module');
      const meta = mainNode!.metadata as any;
      expect(meta.interfaces).toHaveLength(2);
      expect(meta.exportedTypes).toHaveLength(1);
      expect(meta.exportedTypes[0].name).toBe('PublicApi');
    });

    it('should not set metadata when no interfaces exist', () => {
      const content = `export function hello() { return 'world'; }`;
      const result = parser.parse('/test/utils.ts', content, {});
      const mainNode = result.nodes.find(n => n.kind === 'ts-module');
      const meta = mainNode!.metadata as any;
      expect(meta.interfaces).toBeUndefined();
      expect(meta.exportedTypes).toBeUndefined();
    });

    it('should extract multiple exported interfaces (DTO-style)', () => {
      const content = `
export interface UserResponse {
  id: number
  username: string
  email: string
  displayName: string
}

export interface ProductResponse {
  id: number
  title: string
  price: number
  stock: number
}

export interface OrderResponse {
  id: number
  userId: number
  totalAmount: number
  status: string
}
`;
      const result = parser.parse('/test/types/api.ts', content, {});
      const mainNode = result.nodes.find(n => n.kind === 'ts-module');
      const meta = mainNode!.metadata as any;
      expect(meta.interfaces).toHaveLength(3);
      expect(meta.exportedTypes).toHaveLength(3);
      const names = meta.interfaces.map((i: any) => i.name);
      expect(names).toContain('UserResponse');
      expect(names).toContain('ProductResponse');
      expect(names).toContain('OrderResponse');
      expect(meta.interfaces[0].fields).toEqual(['id', 'username', 'email', 'displayName']);
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
