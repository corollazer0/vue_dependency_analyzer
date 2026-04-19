import { describe, it, expect } from 'vitest';
import { compileLayerRules, mergeWithLayerRules } from '../LayerDsl.js';
import { evaluateRules } from '../RuleEngine.js';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import type { ArchitectureRule } from '../../graph/types.js';

describe('LayerDsl (Phase 7b-3)', () => {
  it('compiles a deny policy into a deny-direct rule with the layer match expanded', () => {
    const { rules, dropped } = compileLayerRules({
      layers: [
        { name: 'presentation', match: ['spring-controller', 'vue-component'] },
        { name: 'infrastructure', match: ['mybatis-mapper', 'db-table'] },
      ],
      layerRules: [
        { from: 'presentation', to: 'infrastructure', policy: 'deny' },
      ],
    });

    expect(dropped).toEqual([]);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      type: 'deny-direct',
      from: ['spring-controller', 'vue-component'],
      to: ['mybatis-mapper', 'db-table'],
    });
    expect(rules[0].id).toBe('layer-dsl:presentation→infrastructure:deny');
  });

  it('compiles an allow-only policy into an allow-only rule', () => {
    const { rules } = compileLayerRules({
      layers: [
        { name: 'presentation', match: ['spring-controller'] },
        { name: 'application', match: ['spring-service'] },
      ],
      layerRules: [
        { from: 'presentation', to: 'application', policy: 'allow-only' },
      ],
    });
    expect(rules[0]).toMatchObject({
      type: 'allow-only',
      from: ['spring-controller'],
      allowed: ['spring-service'],
    });
  });

  it('drops a DSL rule whose (type, from, to) tuple already has a hand-written rule', () => {
    const userRules: ArchitectureRule[] = [
      {
        id: 'hand-written-1',
        type: 'deny-direct',
        from: ['spring-controller'],
        to: ['mybatis-mapper'],
        message: 'use a service',
      },
    ];
    const { rules, dropped } = compileLayerRules(
      {
        layers: [
          { name: 'presentation', match: ['spring-controller'] },
          { name: 'infra', match: ['mybatis-mapper'] },
        ],
        layerRules: [
          { from: 'presentation', to: 'infra', policy: 'deny' },
        ],
      },
      userRules,
    );
    expect(rules).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({
      reason: 'conflict-with-hand-written',
      isError: false,
      layerRule: { from: 'presentation', to: 'infra' },
    });
    expect(dropped[0].conflictsWith.id).toBe('hand-written-1');
  });

  it('promotes a conflict to error when layerDsl.mode === "strict"', () => {
    const userRules: ArchitectureRule[] = [
      { type: 'deny-direct', from: ['a'] as any, to: ['b'] as any },
    ];
    const { dropped } = compileLayerRules(
      {
        layers: [
          { name: 'l1', match: ['a' as any] },
          { name: 'l2', match: ['b' as any] },
        ],
        layerRules: [{ from: 'l1', to: 'l2', policy: 'deny' }],
        layerDsl: { mode: 'strict' },
      },
      userRules,
    );
    expect(dropped).toHaveLength(1);
    expect(dropped[0].isError).toBe(true);
  });

  // Phase 10-5 — Layer DSL `where:` predicate.
  it('compiles where: into rule fromWhere/toWhere fields', () => {
    const { rules } = compileLayerRules({
      layers: [
        {
          name: 'service-application',
          match: ['spring-service'],
          where: { isRepository: false },
        },
        {
          name: 'service-infrastructure',
          match: ['spring-service'],
          where: { isRepository: true },
        },
      ],
      layerRules: [
        { from: 'service-application', to: 'service-infrastructure', policy: 'allow-only' },
      ],
    });
    expect(rules).toHaveLength(1);
    expect(rules[0].fromWhere).toEqual({ isRepository: false });
    expect(rules[0].toWhere).toEqual({ isRepository: true });
  });

  it('where: predicate at evaluateRules narrows actual matched nodes', () => {
    // Two spring-service nodes — one is a repository, one isn't.
    const g = new DependencyGraph();
    g.addNode({
      id: 'svc:UserService', kind: 'spring-service', label: 'UserService',
      filePath: '/UserService.java',
      metadata: { isRepository: false },
    });
    g.addNode({
      id: 'svc:UserRepo', kind: 'spring-service', label: 'UserRepo',
      filePath: '/UserRepo.java',
      metadata: { isRepository: true },
    });
    // Application service depends on a repository — allowed
    g.addEdge({
      id: 'e1', source: 'svc:UserService', target: 'svc:UserRepo',
      kind: 'spring-injects', metadata: {},
    });
    // Repository depends on application service — should violate the
    // "infra cannot depend on application" deny rule.
    g.addEdge({
      id: 'e2', source: 'svc:UserRepo', target: 'svc:UserService',
      kind: 'spring-injects', metadata: {},
    });

    const merged = mergeWithLayerRules([], {
      layers: [
        { name: 'app', match: ['spring-service'], where: { isRepository: false } },
        { name: 'infra', match: ['spring-service'], where: { isRepository: true } },
      ],
      layerRules: [
        { from: 'infra', to: 'app', policy: 'deny' },
      ],
    });
    const violations = evaluateRules(g, merged.rules);
    expect(violations).toHaveLength(1);
    // Only the e2 edge (UserRepo → UserService) should violate.
    expect(violations[0].nodeIds).toEqual(['svc:UserRepo', 'svc:UserService']);
  });

  it('mergeWithLayerRules + evaluateRules — DSL deny actually flags a real graph edge', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} });
    g.addNode({ id: 'mybatis-mapper:/m.xml', kind: 'mybatis-mapper', label: 'M', filePath: '/m.xml', metadata: {} });
    g.addEdge({
      id: 'inj',
      source: 'spring-controller:/c.java',
      target: 'mybatis-mapper:/m.xml',
      kind: 'spring-injects',
      metadata: {},
    });

    const merged = mergeWithLayerRules(
      [],
      {
        layers: [
          { name: 'presentation', match: ['spring-controller'] },
          { name: 'infrastructure', match: ['mybatis-mapper'] },
        ],
        layerRules: [{ from: 'presentation', to: 'infrastructure', policy: 'deny' }],
      },
    );
    const violations = evaluateRules(g, merged.rules);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleType).toBe('deny-direct');
  });
});
