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
