// Phase 11-1 — single-batch git log reader.
// Each test builds a tiny throwaway git repo so we can pin specific
// commit dates / authors / paths without depending on the host repo.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGitBlame, repoRelative } from '../GitBlameReader.js';

function git(repo: string, ...args: string[]): string {
  return execSync(`git ${args.map(a => (/[\s'"]/.test(a) ? `'${a}'` : a)).join(' ')}`, {
    cwd: repo,
    encoding: 'utf-8',
    env: { ...process.env, GIT_AUTHOR_DATE: process.env.GIT_AUTHOR_DATE, GIT_COMMITTER_DATE: process.env.GIT_COMMITTER_DATE },
  });
}

function commit(repo: string, file: string, content: string, isoDate: string, author = 'Test User') {
  writeFileSync(join(repo, file), content);
  execSync(`git add '${file}'`, { cwd: repo });
  const env = {
    ...process.env,
    GIT_AUTHOR_DATE: isoDate,
    GIT_COMMITTER_DATE: isoDate,
    GIT_AUTHOR_NAME: author,
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: author,
    GIT_COMMITTER_EMAIL: 'test@example.com',
  };
  execSync(`git commit -m 'touch ${file}' --no-verify --no-gpg-sign`, { cwd: repo, env });
}

describe('GitBlameReader (Phase 11-1)', () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'vda-blame-'));
    git(repo, 'init', '-q');
    git(repo, 'config', 'commit.gpgsign', 'false');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test User');
  });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  it('returns empty map (fail-soft) when no .git directory exists', () => {
    const nonRepo = mkdtempSync(join(tmpdir(), 'vda-not-git-'));
    try {
      const result = readGitBlame(nonRepo);
      expect(result.byFile.size).toBe(0);
      expect(result.shallow).toBe(false);
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });

  it('records last-touched, author, sha, commitCount for each file', () => {
    commit(repo, 'a.ts', 'export const a = 1;', '2026-01-01T00:00:00Z', 'Alice');
    commit(repo, 'b.ts', 'export const b = 2;', '2026-02-01T00:00:00Z', 'Bob');
    commit(repo, 'a.ts', 'export const a = 100;', '2026-03-01T00:00:00Z', 'Carol');

    const result = readGitBlame(repo);
    const a = result.byFile.get('a.ts')!;
    expect(a).toBeDefined();
    expect(a.lastAuthor).toBe('Carol');
    // Commit date might be normalized to local TZ — assert prefix only.
    expect(a.lastTouchedAt.startsWith('2026-03-01')).toBe(true);
    expect(a.commitCount).toBe(2);
    expect(a.lastCommitSha).toMatch(/^[0-9a-f]{7}$/);

    const b = result.byFile.get('b.ts')!;
    expect(b.lastAuthor).toBe('Bob');
    expect(b.commitCount).toBe(1);
  });

  it('handles author names containing spaces and special characters', () => {
    commit(repo, 'x.ts', 'x', '2026-04-01T00:00:00Z', 'Alice O\'Connor');
    const result = readGitBlame(repo);
    expect(result.byFile.get('x.ts')!.lastAuthor).toBe('Alice O\'Connor');
  });

  it('repoRelative returns forward-slash relative path', () => {
    const abs = join(repo, 'sub', 'nested.ts');
    mkdirSync(join(repo, 'sub'));
    writeFileSync(abs, '');
    expect(repoRelative(repo, abs)).toBe('sub/nested.ts');
  });
});
