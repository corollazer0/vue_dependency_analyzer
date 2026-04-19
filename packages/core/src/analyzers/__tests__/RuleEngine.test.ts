import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { evaluateRules } from '../RuleEngine.js';
import type { GraphNode, GraphEdge, ArchitectureRule } from '../../graph/types.js';

function addNode(graph: DependencyGraph, id: string, kind: GraphNode['kind'], label?: string) {
  graph.addNode({ id, kind, label: label || id.split(':').pop() || id, filePath: '/test', metadata: {} });
}

function addEdge(graph: DependencyGraph, source: string, target: string, kind: GraphEdge['kind']) {
  graph.addEdge({ id: `${source}:${kind}:${target}`, source, target, kind, metadata: {} });
}

describe('RuleEngine', () => {
  describe('deny-circular', () => {
    it('should detect circular dependencies', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'a', 'ts-module');
      addNode(graph, 'b', 'ts-module');
      addNode(graph, 'c', 'ts-module');
      addEdge(graph, 'a', 'b', 'imports');
      addEdge(graph, 'b', 'c', 'imports');
      addEdge(graph, 'c', 'a', 'imports');

      const violations = evaluateRules(graph, [
        { type: 'deny-circular', edgeKinds: ['imports'], severity: 'error' },
      ]);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleType).toBe('deny-circular');
      expect(violations[0].severity).toBe('error');
      expect(violations[0].nodeIds.length).toBe(3);
    });

    it('should not report when no cycles exist', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'a', 'ts-module');
      addNode(graph, 'b', 'ts-module');
      addEdge(graph, 'a', 'b', 'imports');

      const violations = evaluateRules(graph, [
        { type: 'deny-circular', edgeKinds: ['imports'] },
      ]);

      expect(violations).toHaveLength(0);
    });
  });

  describe('deny-direct', () => {
    it('should detect forbidden direct dependencies', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'comp', 'vue-component', 'MyComp');
      addNode(graph, 'svc', 'spring-service', 'UserService');
      addEdge(graph, 'comp', 'svc', 'imports');

      const violations = evaluateRules(graph, [
        { type: 'deny-direct', from: ['vue-component'], to: ['spring-service'], severity: 'error' },
      ]);

      expect(violations).toHaveLength(1);
      expect(violations[0].ruleType).toBe('deny-direct');
      expect(violations[0].nodeIds).toEqual(['comp', 'svc']);
    });

    it('should not flag allowed dependencies', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'comp', 'vue-component');
      addNode(graph, 'store', 'pinia-store');
      addEdge(graph, 'comp', 'store', 'uses-store');

      const violations = evaluateRules(graph, [
        { type: 'deny-direct', from: ['vue-component'], to: ['spring-service'] },
      ]);

      expect(violations).toHaveLength(0);
    });
  });

  describe('allow-only', () => {
    it('should detect dependencies outside allowed list', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'comp', 'vue-component', 'MyComp');
      addNode(graph, 'store', 'pinia-store', 'MyStore');
      addNode(graph, 'module', 'ts-module', 'Utils');
      addEdge(graph, 'comp', 'store', 'uses-store');
      addEdge(graph, 'comp', 'module', 'imports');

      const violations = evaluateRules(graph, [
        { type: 'allow-only', from: ['vue-component'], allowed: ['pinia-store', 'vue-composable'] as any },
      ]);

      // imports to ts-module is not in allowed list
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('Utils');
      expect(violations[0].message).toContain('ts-module');
    });
  });

  describe('max-depth', () => {
    it('should detect chains exceeding max depth', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'a', 'ts-module');
      addNode(graph, 'b', 'ts-module');
      addNode(graph, 'c', 'ts-module');
      addNode(graph, 'd', 'ts-module');
      addNode(graph, 'e', 'ts-module');
      addEdge(graph, 'a', 'b', 'imports');
      addEdge(graph, 'b', 'c', 'imports');
      addEdge(graph, 'c', 'd', 'imports');
      addEdge(graph, 'd', 'e', 'imports');

      const violations = evaluateRules(graph, [
        { type: 'max-depth', value: 3, edgeKinds: ['imports'] },
      ]);

      // Chain a→b→c→d→e has depth 5 from a, exceeds 3
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleType).toBe('max-depth');
    });

    it('should not flag chains within limit', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'a', 'ts-module');
      addNode(graph, 'b', 'ts-module');
      addEdge(graph, 'a', 'b', 'imports');

      const violations = evaluateRules(graph, [
        { type: 'max-depth', value: 5, edgeKinds: ['imports'] },
      ]);

      expect(violations).toHaveLength(0);
    });
  });

  describe('max-dependents', () => {
    it('should detect nodes with too many dependents', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'hub', 'spring-service', 'HubService');
      for (let i = 0; i < 5; i++) {
        addNode(graph, `dep${i}`, 'spring-controller', `Controller${i}`);
        addEdge(graph, `dep${i}`, 'hub', 'spring-injects');
      }

      const violations = evaluateRules(graph, [
        { type: 'max-dependents', value: 3, severity: 'warning' },
      ]);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('warning');
      expect(violations[0].message).toContain('HubService');
      expect(violations[0].message).toContain('5');
    });
  });

  describe('empty rules', () => {
    it('should return no violations when rules array is empty', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'a', 'ts-module');

      const violations = evaluateRules(graph, []);
      expect(violations).toHaveLength(0);
    });
  });

  // Phase 12-9 — no-cross-service-db rule fires per inter-service edge.
  describe('no-cross-service-db rule (Phase 12-9)', () => {
    it('flags every service-shares-db edge by default', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'msa-service:user', 'msa-service', 'user');
      addNode(graph, 'msa-service:product', 'msa-service', 'product');
      addEdge(graph, 'msa-service:user', 'msa-service:product', 'service-shares-db');
      const violations = evaluateRules(graph, [
        { id: 'r1', type: 'no-cross-service-db', severity: 'error' },
      ]);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleType).toBe('no-cross-service-db');
      expect(violations[0].edgeIds).toEqual(['msa-service:user:service-shares-db:msa-service:product']);
    });

    it('respects edgeKinds override (broaden to dto + calls)', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'msa-service:user', 'msa-service', 'user');
      addNode(graph, 'msa-service:order', 'msa-service', 'order');
      addEdge(graph, 'msa-service:user', 'msa-service:order', 'service-shares-db');
      addEdge(graph, 'msa-service:user', 'msa-service:order', 'service-shares-dto');
      addEdge(graph, 'msa-service:user', 'msa-service:order', 'service-calls');
      const violations = evaluateRules(graph, [
        { id: 'r1', type: 'no-cross-service-db', edgeKinds: ['service-shares-db', 'service-shares-dto'], severity: 'warning' },
      ]);
      expect(violations).toHaveLength(2);
      expect(violations.every(v => v.severity === 'warning')).toBe(true);
    });
  });
});
