import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

export async function glob(patterns: string[], excludePatterns: string[]): Promise<string[]> {
  const results = new Set<string>();

  for (const pattern of patterns) {
    // Extract base directory and file extension from pattern
    const parts = pattern.split('**');
    const baseDir = parts[0].replace(/\/+$/, '');
    const extPattern = parts[parts.length - 1]; // e.g., /*.vue

    const ext = extPattern.match(/\*(\.\w+)$/)?.[1];
    if (!baseDir || !ext) continue;

    try {
      await walkDir(baseDir, ext, excludePatterns, results);
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return Array.from(results).sort();
}

async function walkDir(
  dir: string,
  ext: string,
  excludePatterns: string[],
  results: Set<string>,
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Check excludes
    if (shouldExclude(fullPath, excludePatterns)) continue;

    if (entry.isDirectory()) {
      await walkDir(fullPath, ext, excludePatterns, results);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      // Skip .d.ts files
      if (entry.name.endsWith('.d.ts')) continue;
      results.add(fullPath);
    }
  }
}

function shouldExclude(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching for common patterns
    const cleaned = pattern.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\//g, '');
    if (cleaned && path.includes(cleaned)) return true;
  }
  return false;
}
