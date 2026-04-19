import { execSync } from 'child_process';
import { resolve } from 'path';

/**
 * Parse git diff output to get list of changed files.
 * @param projectRoot - Absolute path to the project root
 * @param diffSpec - Git diff spec like "HEAD~1..HEAD", "main..feature", or "--staged"
 * @returns Array of relative file paths that were changed
 */
export function parseGitDiff(projectRoot: string, diffSpec: string): string[] {
  try {
    const cmd = diffSpec === '--staged'
      ? 'git diff --cached --name-only'
      : `git diff --name-only ${diffSpec}`;

    const output = execSync(cmd, {
      cwd: resolve(projectRoot),
      encoding: 'utf-8',
      timeout: 10000,
    });

    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (e) {
    throw new Error(`Failed to run git diff: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Get list of uncommitted changed files (both staged and unstaged).
 */
export function getUncommittedFiles(projectRoot: string): string[] {
  try {
    const output = execSync('git diff --name-only HEAD', {
      cwd: resolve(projectRoot),
      encoding: 'utf-8',
      timeout: 10000,
    });

    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}
