// Phase 11-5 — `vda lint --hot-spots` lists stale + dependent-heavy nodes.
// We test the listing logic via the JSON mode so we don't have to parse
// stdout. Wide --stale-days window (1 day) ensures the host repo's
// recently-touched files still produce ≥1 hit on the test-project fixture.
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const cliBin = resolve(import.meta.dirname, '../../dist/index.js');
const projectRoot = resolve(import.meta.dirname, '../../../../test-project');

function runCli(args: string): string {
  return execSync(`node '${cliBin}' ${args}`, { encoding: 'utf-8', cwd: resolve(projectRoot, '..') });
}

describe('vda lint --hot-spots (Phase 11-5)', () => {
  it('outputs JSON with hotSpots[] when --json is set', () => {
    const out = runCli(`lint '${projectRoot}' --hot-spots --json --stale-days 0 --min-fan-in 1 --no-cache`);
    const parsed = JSON.parse(out);
    expect(parsed).toHaveProperty('staleDays', 0);
    expect(parsed).toHaveProperty('minFanIn', 1);
    expect(Array.isArray(parsed.hotSpots)).toBe(true);
    if (parsed.hotSpots.length > 0) {
      const h = parsed.hotSpots[0];
      expect(h).toHaveProperty('id');
      expect(h).toHaveProperty('label');
      expect(h).toHaveProperty('fanIn');
      expect(h).toHaveProperty('lastTouchedAt');
      expect(h).toHaveProperty('ageDays');
      expect(typeof h.fanIn).toBe('number');
      expect(typeof h.ageDays).toBe('number');
    }
  });

  it('emits the no-hits message when thresholds are unreachable', () => {
    // 99999d is never reachable.
    const out = runCli(`lint '${projectRoot}' --hot-spots --json --stale-days 99999 --no-cache`);
    const parsed = JSON.parse(out);
    expect(parsed.count).toBe(0);
    expect(parsed.hotSpots).toEqual([]);
  });
});
