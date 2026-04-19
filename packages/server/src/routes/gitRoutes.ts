import type { FastifyInstance } from 'fastify';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import type { AnalysisEngine } from '../engine.js';

// Phase 7a-3 — surface uncommitted / commit-range changed files so the
// Change-Impact panel can populate without the user typing relative paths.
//
// Safety contract:
//   * `execFile` (no shell), absolute `git` path, fixed cwd.
//   * Each route runs read-only `git` plumbing only — diff / status /
//     ls-files. No `git add`, `git commit`, or anything that mutates state.
//   * Inputs (`range.from`, `range.to`) are validated against a strict
//     regex before reaching git; reject anything outside `[A-Za-z0-9._/~^-]`.

const execFileP = promisify(execFile);
const SAFE_REVISION = /^[A-Za-z0-9._/~^-]+$/;

async function runGit(cwd: string, args: string[]): Promise<string[]> {
  const { stdout } = await execFileP('git', args, {
    cwd,
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

async function isGitRepo(cwd: string): Promise<boolean> {
  return existsSync(join(cwd, '.git')) || existsSync(join(cwd, '.git/HEAD'));
}

export function registerGitRoutes(fastify: FastifyInstance, engine: AnalysisEngine): void {
  // GET /api/git/uncommitted — staged + unstaged + untracked, deduped.
  fastify.get('/api/git/uncommitted', async (_request, reply) => {
    const cwd = engine.getProjectRoot();
    if (!(await isGitRepo(cwd))) {
      reply.code(400);
      return { error: 'Project root is not a git repository', files: [] };
    }
    try {
      const [unstaged, staged, untracked] = await Promise.all([
        runGit(cwd, ['diff', '--name-only', 'HEAD']),
        runGit(cwd, ['diff', '--name-only', '--cached']),
        runGit(cwd, ['ls-files', '--others', '--exclude-standard']),
      ]);
      const files = Array.from(new Set([...unstaged, ...staged, ...untracked])).sort();
      return { files, source: 'uncommitted' };
    } catch (e) {
      reply.code(500);
      return { error: e instanceof Error ? e.message : String(e), files: [] };
    }
  });

  // GET /api/git/range?from=<rev>&to=<rev> — files changed between two revs.
  fastify.get('/api/git/range', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    if (!from || !to) {
      reply.code(400);
      return { error: '"from" and "to" query parameters are required', files: [] };
    }
    if (!SAFE_REVISION.test(from) || !SAFE_REVISION.test(to)) {
      reply.code(400);
      return { error: 'revisions must match /^[A-Za-z0-9._/~^-]+$/', files: [] };
    }
    const cwd = engine.getProjectRoot();
    if (!(await isGitRepo(cwd))) {
      reply.code(400);
      return { error: 'Project root is not a git repository', files: [] };
    }
    try {
      const files = await runGit(cwd, ['diff', '--name-only', `${from}..${to}`]);
      return { files: files.sort(), source: 'range', from, to };
    } catch (e) {
      reply.code(500);
      return { error: e instanceof Error ? e.message : String(e), files: [] };
    }
  });
}
