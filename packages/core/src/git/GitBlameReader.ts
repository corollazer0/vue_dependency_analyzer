import { execSync } from 'node:child_process';
import { resolve, relative, sep } from 'node:path';
import { existsSync } from 'node:fs';

// Phase 11-1 — F8 git blame at the file level.
//
// We read "who last touched this file?" per file via a SINGLE batch
// `git log` call (Risk R1 in phase11-plan.md): per-file `git log -1`
// would mean N processes for an N-file project — death-by-fork on the
// 50K-file fixture target.
//
// Instead we run one `git log --name-only --pretty=...` over the whole
// repo and reduce in memory: first-seen file path = last commit that
// touched it. `git log` lists commits newest → oldest by default, so the
// first hit per file is exactly the last-touched record.
//
// Shallow-clone fallback (R2): when the repo is shallow, `git log`
// stops early — we surface what we have. Files we never see end up with
// `lastTouchedAt = null` and consumers should treat that as unknown
// rather than 0 / epoch.
//
// fail-soft when no .git dir: callers (runAnalysis withGitBlame) get
// an empty map and skip the metadata stamp. Never throws.

export interface GitBlameRecord {
  /** ISO 8601 author-date of the most recent commit touching this file. */
  lastTouchedAt: string;
  /** `git config user.name` of that commit's author. */
  lastAuthor: string;
  /** Short SHA of that commit (first 7 chars). */
  lastCommitSha: string;
  /** How many commits have ever touched this file (since shallow boundary). */
  commitCount: number;
}

export interface GitBlameMap {
  /** Repo-relative file path (with `/` separators) → blame record. */
  byFile: Map<string, GitBlameRecord>;
  /** True when the repo is shallow — coverage is best-effort. */
  shallow: boolean;
}

const EMPTY: GitBlameMap = { byFile: new Map(), shallow: false };

function repoIsGit(projectRoot: string): boolean {
  // `.git` may be a directory or a file (worktrees). Both work for `git log`.
  return existsSync(resolve(projectRoot, '.git'));
}

function repoIsShallow(projectRoot: string): boolean {
  return existsSync(resolve(projectRoot, '.git', 'shallow'));
}

/**
 * Read last-touched + commit-count for every tracked file in `projectRoot`.
 * Single `git log` invocation; fail-soft when not a git repo.
 *
 * `pathPrefixes` (optional) limits the log to those subtrees so an analysis
 * scoped to vueRoot/springBootRoot doesn't pay for the whole monorepo.
 */
export function readGitBlame(
  projectRoot: string,
  opts: { pathPrefixes?: string[] } = {},
): GitBlameMap {
  const root = resolve(projectRoot);
  if (!repoIsGit(root)) return EMPTY;

  // Format: SHA<TAB>ISO-DATE<TAB>AUTHOR  followed by --name-only file list.
  // Using `%x09` (TAB) as separator survives author names containing spaces.
  // `--no-renames` keeps the heuristic about "this file" simple — we don't
  // want a rename to be invisible to the next analysis run; it should show
  // up as a fresh lastTouchedAt on the new path. Phase 10-4's previousId
  // catches DTO-level renames from a separate signal.
  const args = [
    'log',
    '--no-renames',
    '--name-only',
    '--pretty=format:%x01%H%x09%aI%x09%an',
  ];
  // -- separator + path prefixes restrict the log scope.
  if (opts.pathPrefixes && opts.pathPrefixes.length > 0) {
    args.push('--');
    for (const p of opts.pathPrefixes) {
      // Convert absolute paths to repo-relative; pathspec must be relative.
      const rel = relative(root, resolve(root, p));
      if (rel && !rel.startsWith('..')) args.push(rel);
    }
  }

  let stdout: string;
  try {
    stdout = execSync(`git ${args.map(a => (/[\s'"]/.test(a) ? `'${a}'` : a)).join(' ')}`, {
      cwd: root,
      encoding: 'utf-8',
      timeout: 60_000,
      // 50K-file repos can produce ~25 MB of `git log --name-only` output.
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    return EMPTY;
  }

  const byFile = new Map<string, GitBlameRecord>();
  // Split on the chosen record marker (\x01) to avoid collision with file
  // paths that might happen to contain "commit" in their name.
  const records = stdout.split('\x01');
  for (const block of records) {
    if (!block) continue;
    const newlineIdx = block.indexOf('\n');
    if (newlineIdx === -1) continue;
    const header = block.slice(0, newlineIdx);
    const fileBlock = block.slice(newlineIdx + 1);
    const [sha, isoDate, author] = header.split('\t');
    if (!sha || !isoDate) continue;
    const shortSha = sha.slice(0, 7);
    const lines = fileBlock.split('\n');
    for (const f of lines) {
      const path = f.trim();
      if (!path) continue;
      const existing = byFile.get(path);
      if (existing) {
        existing.commitCount += 1;
      } else {
        byFile.set(path, {
          lastTouchedAt: isoDate,
          lastAuthor: author ?? '',
          lastCommitSha: shortSha,
          commitCount: 1,
        });
      }
    }
  }

  return { byFile, shallow: repoIsShallow(root) };
}

/**
 * Convert an absolute file path back to the repo-relative key
 * `readGitBlame` uses. Helper for callers that hold absolute paths.
 */
export function repoRelative(projectRoot: string, absPath: string): string {
  return relative(resolve(projectRoot), resolve(absPath)).split(sep).join('/');
}
