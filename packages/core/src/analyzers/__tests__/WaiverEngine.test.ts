import { describe, it, expect } from 'vitest';
import { WaiverEngine } from '../WaiverEngine.js';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { evaluateRulesWithWaivers } from '../RuleEngine.js';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('WaiverEngine (Phase 7b-5)', () => {
  it('parses .vdaignore lines into waiver records', () => {
    const root = mkdtempSync(join(tmpdir(), 'vda-waiver-'));
    writeFileSync(join(root, '.vdaignore'), [
      '# top comment',
      'deny-direct controller→repository reason=TICKET-123 until=2026-12-31',
      'breaking B1 file=src/X.java reason=TICKET-456 until=2026-09-30  # trailing',
      '',
    ].join('\n'));

    const eng = new WaiverEngine();
    eng.load(root, new DependencyGraph());
    const ws = eng.list();
    expect(ws).toHaveLength(2);
    expect(ws[0]).toMatchObject({
      ruleId: 'deny-direct',
      target: 'controller→repository',
      reason: 'TICKET-123',
      expires: '2026-12-31',
    });
    expect(ws[1]).toMatchObject({
      ruleId: 'breaking',
      target: 'B1',
      file: 'src/X.java',
      reason: 'TICKET-456',
      expires: '2026-09-30',
    });
    rmSync(root, { recursive: true, force: true });
  });

  it('matches waivers (rule-id + target) and respects expiry', () => {
    const eng = new WaiverEngine();
    eng.setForTest([
      {
        ruleId: 'deny-direct',
        target: 'controller→repository',
        expires: '2026-12-31',
        source: { kind: 'vdaignore', path: '.vdaignore', line: 1 },
      },
      {
        ruleId: 'deny-direct',
        target: 'controller→service',
        expires: '2026-01-01',
        source: { kind: 'vdaignore', path: '.vdaignore', line: 2 },
      },
    ]);

    expect(eng.isWaived(
      { ruleId: 'deny-direct', target: 'controller→repository' },
      '2026-04-19',
    ).waived).toBe(true);

    // expired
    expect(eng.isWaived(
      { ruleId: 'deny-direct', target: 'controller→service' },
      '2026-04-19',
    ).waived).toBe(false);

    // unknown
    expect(eng.isWaived(
      { ruleId: 'deny-direct', target: 'controller→nope' },
      '2026-04-19',
    ).waived).toBe(false);
  });

  it('reads inline `// vda:ignore` directives from source files', () => {
    const root = mkdtempSync(join(tmpdir(), 'vda-waiver-inline-'));
    const filePath = join(root, 'src', 'Foo.ts');
    writeFileSync(join(root, 'placeholder'), '');
    require('fs').mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(filePath, [
      '// vda:ignore deny-direct controller→repository reason=TICKET-7 until=2026-12-31',
      'export const x = 1;',
    ].join('\n'));

    const g = new DependencyGraph();
    g.addNode({ id: 'ts-module:Foo', kind: 'ts-module', label: 'Foo', filePath, metadata: {} });

    const eng = new WaiverEngine();
    eng.load(root, g);
    const ws = eng.list();
    expect(ws).toHaveLength(1);
    expect(ws[0]).toMatchObject({
      ruleId: 'deny-direct',
      target: 'controller→repository',
      file: filePath,
      reason: 'TICKET-7',
    });
    rmSync(root, { recursive: true, force: true });
  });

  it('Phase 8 forward-compat: accepts rule-ids the engine has never seen before', () => {
    // 8-8 will issue waivers like `breaking B1 file=src/X.java reason=… until=…`.
    // The engine should accept the line today without code changes.
    const eng = new WaiverEngine();
    eng.setForTest([
      {
        ruleId: 'breaking',
        target: 'B1',
        file: 'src/X.java',
        expires: '2026-12-31',
        source: { kind: 'vdaignore', path: '.vdaignore', line: 1 },
      },
    ]);
    const m = eng.isWaived(
      { ruleId: 'breaking', target: 'B1', file: 'src/X.java' },
      '2026-04-19',
    );
    expect(m.waived).toBe(true);
    expect(m.waiver?.ruleId).toBe('breaking');
  });
});

describe('RuleEngine + WaiverEngine integration (Phase 7b-5)', () => {
  it('moves a deny-direct violation to the waived list when matched', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} });
    g.addNode({ id: 'spring-service:/r.java', kind: 'spring-service', label: 'R', filePath: '/r.java', metadata: { isRepository: true } });
    g.addEdge({
      id: 'inj',
      source: 'spring-controller:/c.java',
      target: 'spring-service:/r.java',
      kind: 'spring-injects',
      metadata: {},
    });

    const eng = new WaiverEngine();
    eng.setForTest([
      {
        ruleId: 'deny-direct',
        target: 'spring-controller→spring-service',
        source: { kind: 'vdaignore', path: '.vdaignore', line: 1 },
      },
    ]);

    const result = evaluateRulesWithWaivers(
      g,
      [
        {
          id: 'no-controller-direct-service',
          type: 'deny-direct',
          from: ['spring-controller'],
          to: ['spring-service'],
        },
      ],
      { waivers: eng, today: '2026-04-19' },
    );

    expect(result.violations).toHaveLength(0);
    expect(result.waived).toHaveLength(1);
    expect(result.waived[0].waivedBy?.ruleId).toBe('deny-direct');
  });

  it('lets the violation through once the waiver expires', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'spring-controller:/c.java', kind: 'spring-controller', label: 'C', filePath: '/c.java', metadata: {} });
    g.addNode({ id: 'spring-service:/r.java', kind: 'spring-service', label: 'R', filePath: '/r.java', metadata: {} });
    g.addEdge({
      id: 'inj',
      source: 'spring-controller:/c.java',
      target: 'spring-service:/r.java',
      kind: 'spring-injects',
      metadata: {},
    });

    const eng = new WaiverEngine();
    eng.setForTest([
      {
        ruleId: 'deny-direct',
        target: 'spring-controller→spring-service',
        expires: '2026-01-01',
        source: { kind: 'vdaignore', path: '.vdaignore', line: 1 },
      },
    ]);

    const result = evaluateRulesWithWaivers(
      g,
      [{ type: 'deny-direct', from: ['spring-controller'], to: ['spring-service'] }],
      { waivers: eng, today: '2026-04-19' },
    );

    expect(result.violations).toHaveLength(1);
    expect(result.waived).toHaveLength(0);
  });
});
