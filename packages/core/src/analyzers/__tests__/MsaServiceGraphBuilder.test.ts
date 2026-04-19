// Phase 12-1 to 12-4 — MSA service graph post-processing.
import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import {
  buildMsaServiceGraph,
  MSA_SERVICE_NODE_PREFIX,
  UNASSIGNED_SERVICE_ID,
} from '../MsaServiceGraphBuilder.js';
import type { GraphNode, GraphEdge, ServiceConfig } from '../../graph/types.js';

function n(id: string, kind: GraphNode['kind'], serviceId?: string, extra: Record<string, unknown> = {}): GraphNode {
  return {
    id, kind, label: id, filePath: `/${id}`,
    metadata: { ...(serviceId ? { serviceId } : {}), ...extra },
  };
}
function e(id: string, source: string, target: string, kind: GraphEdge['kind']): GraphEdge {
  return { id, source, target, kind, metadata: {} };
}

describe('MsaServiceGraphBuilder (Phase 12)', () => {
  it('adds one msa-service node per services[] entry plus an unassigned bucket', () => {
    const g = new DependencyGraph();
    g.addNode(n('a', 'spring-controller', 'user-service'));
    g.addNode(n('b', 'spring-service'));  // no serviceId → unassigned
    const services: ServiceConfig[] = [
      { id: 'user-service', root: '/u', type: 'spring-boot' },
      { id: 'product-service', root: '/p', type: 'spring-boot' },
    ];
    const r = buildMsaServiceGraph(g, services);
    const ids = r.serviceNodes.map(s => s.id).sort();
    expect(ids).toContain(`${MSA_SERVICE_NODE_PREFIX}user-service`);
    expect(ids).toContain(`${MSA_SERVICE_NODE_PREFIX}product-service`);
    expect(ids).toContain(`${MSA_SERVICE_NODE_PREFIX}${UNASSIGNED_SERVICE_ID}`);
  });

  it('emits service-calls when api-call edges cross a serviceId boundary', () => {
    const g = new DependencyGraph();
    g.addNode(n('callsite', 'api-call-site', 'frontend'));
    g.addNode(n('endpoint', 'spring-endpoint', 'user-service'));
    g.addEdge(e('e1', 'callsite', 'endpoint', 'api-call'));
    const r = buildMsaServiceGraph(g, [
      { id: 'frontend', root: '/f', type: 'vue' },
      { id: 'user-service', root: '/u', type: 'spring-boot' },
    ]);
    const calls = r.serviceEdges.filter(x => x.kind === 'service-calls');
    expect(calls).toHaveLength(1);
    expect(calls[0].source).toBe(`${MSA_SERVICE_NODE_PREFIX}frontend`);
    expect(calls[0].target).toBe(`${MSA_SERVICE_NODE_PREFIX}user-service`);
    expect(calls[0].metadata.callCount).toBe(1);
  });

  it('does NOT emit service-calls for same-service api-call', () => {
    const g = new DependencyGraph();
    g.addNode(n('cs', 'api-call-site', 'user-service'));
    g.addNode(n('ep', 'spring-endpoint', 'user-service'));
    g.addEdge(e('e1', 'cs', 'ep', 'api-call'));
    const r = buildMsaServiceGraph(g, [
      { id: 'user-service', root: '/u', type: 'spring-boot' },
    ]);
    expect(r.serviceEdges.filter(x => x.kind === 'service-calls')).toEqual([]);
  });

  it('emits service-shares-db when a service reads a table owned by another (writer = owner)', () => {
    const g = new DependencyGraph();
    g.addNode(n('writer', 'mybatis-statement', 'user-service'));
    g.addNode(n('reader', 'mybatis-statement', 'product-service'));
    g.addNode(n('users', 'db-table'));
    g.addEdge(e('w1', 'writer', 'users', 'writes-table'));
    g.addEdge(e('r1', 'reader', 'users', 'reads-table'));
    const r = buildMsaServiceGraph(g, [
      { id: 'user-service', root: '/u', type: 'spring-boot' },
      { id: 'product-service', root: '/p', type: 'spring-boot' },
    ]);
    expect(r.tableOwners.get('users')).toBe('user-service');
    const shares = r.serviceEdges.filter(x => x.kind === 'service-shares-db');
    expect(shares).toHaveLength(1);
    expect(shares[0].source).toBe(`${MSA_SERVICE_NODE_PREFIX}product-service`);
    expect(shares[0].target).toBe(`${MSA_SERVICE_NODE_PREFIX}user-service`);
    expect(shares[0].metadata.ownership).toBe('heuristic');
  });

  it('emits service-shares-dto when a spring-endpoint references a DTO owned by another service', () => {
    const g = new DependencyGraph();
    g.addNode(n('UserDto', 'spring-dto', 'user-service', { fqn: 'com.user.UserDto' }));
    g.addNode(n('orderEp', 'spring-endpoint', 'order-service', {
      returnType: 'OrderResponse', paramTypes: ['UserDto'],
    }));
    const r = buildMsaServiceGraph(g, [
      { id: 'user-service', root: '/u', type: 'spring-boot' },
      { id: 'order-service', root: '/o', type: 'spring-boot' },
    ]);
    const shares = r.serviceEdges.filter(x => x.kind === 'service-shares-dto');
    expect(shares).toHaveLength(1);
    expect(shares[0].source).toBe(`${MSA_SERVICE_NODE_PREFIX}order-service`);
    expect(shares[0].target).toBe(`${MSA_SERVICE_NODE_PREFIX}user-service`);
    expect((shares[0].metadata.dtos as string[])).toContain('UserDto');
  });
});
