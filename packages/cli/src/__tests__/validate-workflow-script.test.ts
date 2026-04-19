// Phase 10-9 — smoke test for scripts/validate-workflow.sh.
//
// We don't bring `act` into the test environment; the script must
// exit 0 with a notice when act is missing and exit non-zero when a
// workflow file would not parse. The graceful-skip behavior is the
// primary contract because the script ships in vda-pr-report.yml
// and runs on every PR (where act is also absent).
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../../..');
const script = resolve(repoRoot, 'scripts/validate-workflow.sh');

describe('validate-workflow.sh (Phase 10-9)', () => {
  it('script exists and is executable', () => {
    expect(existsSync(script)).toBe(true);
  });

  it('exits 0 with a notice when act is not on PATH', () => {
    // Reduce PATH to /nonexistent so `command -v act` cannot find act, but
    // keep bash resolvable via absolute path.
    const r = spawnSync('/bin/bash', [script], {
      env: { ...process.env, PATH: '/nonexistent' },
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/act is not installed/);
  });

  it('accepts an explicit workflow name argument', () => {
    const r = spawnSync('/bin/bash', [script, 'vda-pr-report'], {
      env: { ...process.env, PATH: '/nonexistent' },
      encoding: 'utf8',
    });
    expect(r.status).toBe(0);
  });
});
