import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import {
  collectEntrypoints,
  reachableFromEntrypoints,
} from '../EntrypointCollector.js';
import { findDeadNodes } from '../DeadCodeDetector.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): DependencyGraph {
  const g = new DependencyGraph();
  for (const n of nodes) g.addNode(n);
  for (const e of edges) g.addEdge(e);
  return g;
}

describe('EntrypointCollector (Phase 7b-1)', () => {
  it('flags @RestController nodes as spring-controller entrypoints', () => {
    const g = buildGraph(
      [
        { id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} },
        { id: 'spring-service:/s.java', kind: 'spring-service', label: 'S', filePath: '/s.java', metadata: {} },
      ],
      [],
    );
    const eps = collectEntrypoints(g);
    expect(eps.map(e => e.reason)).toEqual(['spring-controller']);
    expect(eps[0].node.id).toBe('spring-controller:/c.java');
  });

  it('flags spring-service nodes carrying hasScheduled metadata', () => {
    const g = buildGraph(
      [
        { id: 'spring-service:/s.java', kind: 'spring-service', label: 'S', filePath: '/s.java', metadata: { hasScheduled: true } },
        { id: 'spring-service:/q.java', kind: 'spring-service', label: 'Q', filePath: '/q.java', metadata: {} },
      ],
      [],
    );
    const eps = collectEntrypoints(g);
    expect(eps.map(e => ({ reason: e.reason, id: e.node.id }))).toEqual([
      { reason: 'spring-scheduled', id: 'spring-service:/s.java' },
    ]);
  });

  it('flags services that listen to events (incoming listens-event)', () => {
    const g = buildGraph(
      [
        { id: 'event:OrderPlaced', kind: 'spring-event', label: 'OrderPlaced', filePath: '', metadata: {} },
        { id: 'spring-service:/audit.java', kind: 'spring-service', label: 'Audit', filePath: '/audit.java', metadata: {} },
      ],
      [
        {
          id: 'event:OrderPlaced:listens-event:spring-service:/audit.java',
          source: 'event:OrderPlaced',
          target: 'spring-service:/audit.java',
          kind: 'listens-event',
          metadata: { eventClass: 'OrderPlaced' },
        },
      ],
    );
    const eps = collectEntrypoints(g);
    const audit = eps.find(e => e.node.id === 'spring-service:/audit.java')!;
    expect(audit).toBeDefined();
    expect(audit.reason).toBe('spring-event-listener');
  });

  it('flags vue-router-route + main.ts + native-bridge', () => {
    const g = buildGraph(
      [
        { id: 'vue-router-route:/router/index.ts', kind: 'vue-router-route', label: 'router', filePath: '/src/router/index.ts', metadata: {} },
        { id: 'ts-module:/src/main.ts', kind: 'ts-module', label: 'main', filePath: '/src/main.ts', metadata: {} },
        { id: 'ts-module:/src/utils/foo.ts', kind: 'ts-module', label: 'foo', filePath: '/src/utils/foo.ts', metadata: {} },
        { id: 'native-bridge:Camera', kind: 'native-bridge', label: 'Camera', filePath: '', metadata: {} },
      ],
      [],
    );
    const reasons = new Set(collectEntrypoints(g).map(e => e.reason));
    expect(reasons.has('vue-router-route')).toBe(true);
    expect(reasons.has('app-entry')).toBe(true);
    expect(reasons.has('native-bridge')).toBe(true);
    // utils/foo.ts is NOT an entrypoint
    expect(collectEntrypoints(g).find(e => e.node.id === 'ts-module:/src/utils/foo.ts')).toBeUndefined();
  });

  it('reachable set follows imports/api-call/etc but skips dto-flows + api-implements', () => {
    const g = buildGraph(
      [
        { id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} },
        { id: 'spring-endpoint:GET:/api/x', kind: 'spring-endpoint', label: 'GET /api/x', filePath: '/c.java', metadata: {} },
        { id: 'spring-service:/svc.java', kind: 'spring-service', label: 'Svc', filePath: '/svc.java', metadata: {} },
        { id: 'spring-dto:/dto.java', kind: 'spring-dto', label: 'XDto', filePath: '/dto.java', metadata: {} },
      ],
      [
        { id: 'a', source: 'spring-controller:/c.java', target: 'spring-endpoint:GET:/api/x', kind: 'api-serves', metadata: {} },
        { id: 'b', source: 'spring-controller:/c.java', target: 'spring-service:/svc.java', kind: 'spring-injects', metadata: {} },
        { id: 'c', source: 'spring-endpoint:GET:/api/x', target: 'spring-controller:/c.java', kind: 'api-implements', metadata: {} },
        { id: 'd', source: 'spring-endpoint:GET:/api/x', target: 'spring-dto:/dto.java', kind: 'dto-flows', metadata: { tier: 'endpoint-dto' } },
      ],
    );
    const reachable = reachableFromEntrypoints(g, collectEntrypoints(g));
    expect(reachable.has('spring-endpoint:GET:/api/x')).toBe(true);
    expect(reachable.has('spring-service:/svc.java')).toBe(true);
    // dto-flows is excluded → spring-dto not reached from controller via this path
    expect(reachable.has('spring-dto:/dto.java')).toBe(false);
  });
});

describe('DeadCodeDetector (Phase 7b-1)', () => {
  it('flags an unreferenced spring-service as dead', () => {
    const g = buildGraph(
      [
        { id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} },
        { id: 'spring-service:/used.java', kind: 'spring-service', label: 'Used', filePath: '/used.java', metadata: {} },
        { id: 'spring-service:/dead.java', kind: 'spring-service', label: 'Dead', filePath: '/dead.java', metadata: {} },
      ],
      [
        { id: 'inj', source: 'spring-controller:/c.java', target: 'spring-service:/used.java', kind: 'spring-injects', metadata: {} },
      ],
    );
    const report = findDeadNodes(g);
    expect(report.dead.map(n => n.id)).toEqual(['spring-service:/dead.java']);
    expect(report.reachable.has('spring-service:/used.java')).toBe(true);
  });

  it('keeps db-table / vue-event / spring-event off the dead list even when unreferenced', () => {
    const g = buildGraph(
      [
        { id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} },
        { id: 'db-table:audit', kind: 'db-table', label: 'audit', filePath: '', metadata: {} },
        { id: 'vue-event:foo', kind: 'vue-event', label: 'foo', filePath: '', metadata: {} },
        { id: 'mybatis-statement:s', kind: 'mybatis-statement', label: 'q', filePath: '', metadata: {} },
      ],
      [],
    );
    const report = findDeadNodes(g);
    expect(report.dead.map(n => n.id)).toEqual([]);
  });
});
