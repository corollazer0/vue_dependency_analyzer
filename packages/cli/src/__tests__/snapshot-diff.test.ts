// Phase 11-7 + 11-8 — vda snapshot + vda diff smoke tests.
// Build a temp project, snapshot it, mutate, snapshot again, diff.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cliBin = resolve(import.meta.dirname, '../../dist/index.js');

function runCli(args: string, cwd: string): string {
  return execSync(`node '${cliBin}' ${args}`, { encoding: 'utf-8', cwd });
}

describe('vda snapshot + diff (Phase 11-7 / 11-8)', () => {
  let projectRoot: string;

  beforeAll(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'vda-snapdiff-'));
    mkdirSync(join(projectRoot, 'src'));
    writeFileSync(join(projectRoot, 'src', 'a.ts'), `export const a = 1;`);
    writeFileSync(join(projectRoot, '.vdarc.json'), JSON.stringify({
      vueRoot: './src',
      aliases: { '@': './src' },
    }));
  });
  afterAll(() => rmSync(projectRoot, { recursive: true, force: true }));

  it('vda snapshot persists a snapshot row', () => {
    const out = runCli(`snapshot '${projectRoot}' --label v1 --json --no-cache`, projectRoot);
    const snap = JSON.parse(out);
    expect(snap.label).toBe('v1');
    expect(snap.summary.nodeCount).toBeGreaterThanOrEqual(1);
  });

  it('vda diff returns a non-empty kind diff after a graph mutation', () => {
    // Add a Vue component to introduce a new node-kind.
    writeFileSync(join(projectRoot, 'src', 'Foo.vue'), `<template><div /></template>`);
    runCli(`snapshot '${projectRoot}' --label v2 --json --no-cache`, projectRoot);

    const out = runCli(`diff v1..v2 --dir '${projectRoot}' --json`, projectRoot);
    const diff = JSON.parse(out);
    expect(diff.fromLabel).toBe('v1');
    expect(diff.toLabel).toBe('v2');
    // We added a Vue component → either added kind or changed kind, but
    // node count must increase.
    expect(diff.totalsDelta.nodes).toBeGreaterThan(0);
  });

  it('vda diff exits non-zero when the snapshot label is missing', () => {
    let exitCode = 0;
    try {
      execSync(`node '${cliBin}' diff missing..v1 --dir '${projectRoot}' --json`, {
        cwd: projectRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e: any) {
      exitCode = e.status ?? 1;
    }
    expect(exitCode).not.toBe(0);
  });
});
