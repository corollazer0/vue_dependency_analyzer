import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import { execFileSync } from 'child_process';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerGitRoutes } from '../routes/gitRoutes.js';

// Phase 7a-3 — verify the read-only git plumbing the Impact panel
// will hit. Uses a fresh temp git repo so test-project's lack of `.git`
// doesn't matter and so test-project isn't accidentally committed-against.

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function buildFastify(projectRoot: string): FastifyInstance {
  const fastify = Fastify({ logger: false });
  // Minimal AnalysisEngine surface — only `getProjectRoot` is touched.
  registerGitRoutes(fastify, { getProjectRoot: () => projectRoot } as any);
  return fastify;
}

describe('git routes (Phase 7a-3)', () => {
  let repo: string;
  let nonRepo: string;
  let firstSha: string;
  let secondSha: string;

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'vda-git-'));
    git(repo, ['init', '-q', '-b', 'main']);
    git(repo, ['config', 'user.email', 'vda@test.local']);
    git(repo, ['config', 'user.name', 'VDA Test']);
    git(repo, ['config', 'commit.gpgsign', 'false']);

    writeFileSync(resolve(repo, 'a.txt'), 'hello\n');
    git(repo, ['add', 'a.txt']);
    git(repo, ['commit', '-q', '-m', 'initial']);
    firstSha = git(repo, ['rev-parse', 'HEAD']).trim();

    writeFileSync(resolve(repo, 'b.txt'), 'world\n');
    git(repo, ['add', 'b.txt']);
    git(repo, ['commit', '-q', '-m', 'second']);
    secondSha = git(repo, ['rev-parse', 'HEAD']).trim();

    // After the commit: stage one new file, leave one as unstaged-modified,
    // and drop one untracked file so the uncommitted route surfaces all 3.
    writeFileSync(resolve(repo, 'a.txt'), 'hello world\n');
    writeFileSync(resolve(repo, 'staged.txt'), 'staged\n');
    git(repo, ['add', 'staged.txt']);
    writeFileSync(resolve(repo, 'untracked.txt'), 'untracked\n');

    nonRepo = mkdtempSync(join(tmpdir(), 'vda-nogit-'));
    mkdirSync(resolve(nonRepo, 'sub'), { recursive: true });
    writeFileSync(resolve(nonRepo, 'sub/foo.ts'), '// no git here\n');
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
    rmSync(nonRepo, { recursive: true, force: true });
  });

  describe('GET /api/git/uncommitted', () => {
    it('returns staged + unstaged + untracked deduped + sorted', async () => {
      const fastify = buildFastify(repo);
      const res = await fastify.inject({ method: 'GET', url: '/api/git/uncommitted' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.source).toBe('uncommitted');
      expect(body.files).toEqual(['a.txt', 'staged.txt', 'untracked.txt']);
      await fastify.close();
    });

    it('returns 400 when projectRoot is not a git repository', async () => {
      const fastify = buildFastify(nonRepo);
      const res = await fastify.inject({ method: 'GET', url: '/api/git/uncommitted' });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/not a git repository/i);
      expect(body.files).toEqual([]);
      await fastify.close();
    });
  });

  describe('GET /api/git/range', () => {
    it('lists files changed between two revisions', async () => {
      const fastify = buildFastify(repo);
      const res = await fastify.inject({
        method: 'GET',
        url: `/api/git/range?from=${firstSha}&to=${secondSha}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.source).toBe('range');
      expect(body.files).toEqual(['b.txt']);
      await fastify.close();
    });

    it('rejects unsafe revision strings before reaching git', async () => {
      const fastify = buildFastify(repo);
      const res = await fastify.inject({
        method: 'GET',
        url: '/api/git/range?from=HEAD&to=' + encodeURIComponent('HEAD; rm -rf /'),
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/revisions/);
      await fastify.close();
    });

    it('returns 400 when from / to missing', async () => {
      const fastify = buildFastify(repo);
      const res = await fastify.inject({ method: 'GET', url: '/api/git/range?from=HEAD' });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toMatch(/required/i);
      await fastify.close();
    });
  });
});
