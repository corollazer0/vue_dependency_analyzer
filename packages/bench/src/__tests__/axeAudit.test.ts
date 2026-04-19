// Phase 10-8 — axe-core integration shape tests. Browser-driven runs live
// in CI (workflow_dispatch strict mode); these unit tests pin the audit
// summary shape so consumers (workflow gate, future PR-comment formatter)
// can rely on the field names.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import type { AxeAuditSummary } from '../harness/measure.js';

describe('axe-core integration (Phase 10-8)', () => {
  it('axe-core devDep is resolvable so addScriptTag can find axe.min.js', () => {
    const req = createRequire(import.meta.url);
    const axePath = req.resolve('axe-core/axe.min.js');
    expect(axePath).toMatch(/axe\.min\.js$/);
  });

  it('AxeAuditSummary shape matches the four-bucket impact taxonomy', () => {
    const summary: AxeAuditSummary = {
      violations: { critical: 0, serious: 1, moderate: 2, minor: 3 },
      details: [{ id: 'image-alt', impact: 'critical', nodes: 1, help: 'Images must have alt' }],
    };
    expect(summary.violations.critical).toBe(0);
    expect(summary.violations.serious).toBe(1);
    expect(summary.violations.moderate).toBe(2);
    expect(summary.violations.minor).toBe(3);
    expect(summary.details).toHaveLength(1);
  });

  // The strict-mode workflow gate fails iff A1_verdict !== 'MET'. Mirror the
  // tiny shape it enforces so a refactor can't accidentally rename the field.
  it('strict-mode A1 gate reads critical=0 from audit.json', () => {
    const audit: AxeAuditSummary = {
      violations: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      details: [],
    };
    const verdict = audit.violations.critical === 0 ? 'MET' : 'NOT MET';
    expect(verdict).toBe('MET');

    const failing: AxeAuditSummary = {
      violations: { critical: 1, serious: 0, moderate: 0, minor: 0 },
      details: [],
    };
    const failVerdict = failing.violations.critical === 0 ? 'MET' : 'NOT MET';
    expect(failVerdict).toBe('NOT MET');
  });
});
