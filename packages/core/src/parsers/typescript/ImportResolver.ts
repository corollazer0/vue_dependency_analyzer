import path from 'path';
import fs from 'fs';
import type { AnalysisConfig } from '../../graph/types.js';

export class ImportResolver {
  private aliases: Record<string, string>;
  private projectRoot: string;

  constructor(config: AnalysisConfig, projectRoot: string) {
    // Start with explicit config aliases
    this.aliases = { ...(config.aliases || {}) };
    this.projectRoot = projectRoot;

    // Auto-detect from tsconfig.json (lower priority than explicit config)
    this.loadTsconfigPaths(projectRoot);
  }

  private loadTsconfigPaths(fromDir: string): void {
    const tsconfigPath = this.findTsconfig(fromDir);
    if (!tsconfigPath) return;

    try {
      const raw = fs.readFileSync(tsconfigPath, 'utf-8');
      // Strip comments for JSON parsing (tsconfig allows comments)
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const tsconfig = JSON.parse(cleaned);

      // Handle "extends"
      if (tsconfig.extends) {
        const parentPath = path.resolve(path.dirname(tsconfigPath), tsconfig.extends);
        const parentDir = fs.statSync(parentPath).isDirectory()
          ? parentPath
          : path.dirname(parentPath);
        this.loadTsconfigPaths(parentDir);
      }

      const compilerOptions = tsconfig.compilerOptions || {};
      const baseUrl = compilerOptions.baseUrl
        ? path.resolve(path.dirname(tsconfigPath), compilerOptions.baseUrl)
        : path.dirname(tsconfigPath);
      const paths = compilerOptions.paths || {};

      for (const [pattern, targets] of Object.entries(paths)) {
        if (!Array.isArray(targets) || targets.length === 0) continue;

        // Convert tsconfig path pattern to alias
        // "@/*" → ["src/*"] becomes "@" → "src"
        const alias = pattern.replace(/\/\*$/, '');
        const target = (targets[0] as string).replace(/\/\*$/, '');

        // Don't override explicit config aliases
        if (!this.aliases[alias]) {
          this.aliases[alias] = path.resolve(baseUrl, target);
        }
      }
    } catch {
      // tsconfig parse error, skip
    }
  }

  private findTsconfig(fromDir: string): string | null {
    let dir = fromDir;
    const root = path.parse(dir).root;

    while (dir !== root) {
      const candidate = path.join(dir, 'tsconfig.json');
      if (fs.existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
    return null;
  }

  resolve(importPath: string, fromFile: string): string | null {
    // Skip node_modules imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && !this.isAliased(importPath)) {
      return null; // external package
    }

    let resolvedPath: string;

    if (this.isAliased(importPath)) {
      resolvedPath = this.resolveAlias(importPath);
    } else {
      resolvedPath = path.resolve(path.dirname(fromFile), importPath);
    }

    return this.resolveToFile(resolvedPath);
  }

  private isAliased(importPath: string): boolean {
    for (const alias of Object.keys(this.aliases)) {
      if (importPath === alias || importPath.startsWith(alias + '/')) {
        return true;
      }
    }
    return false;
  }

  private resolveAlias(importPath: string): string {
    for (const [alias, target] of Object.entries(this.aliases)) {
      if (importPath === alias) {
        const resolved = path.isAbsolute(target) ? target : path.resolve(this.projectRoot, target);
        return resolved;
      }
      if (importPath.startsWith(alias + '/')) {
        const rest = importPath.slice(alias.length + 1);
        const resolved = path.isAbsolute(target) ? target : path.resolve(this.projectRoot, target);
        return path.resolve(resolved, rest);
      }
    }
    return importPath;
  }

  private resolveToFile(basePath: string): string | null {
    if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
      return basePath;
    }

    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];
    for (const ext of extensions) {
      const withExt = basePath + ext;
      if (fs.existsSync(withExt)) return withExt;
    }

    for (const ext of extensions) {
      const indexPath = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexPath)) return indexPath;
    }

    return null;
  }

  resolveAllImports(
    edges: Array<{ id: string; source: string; target: string; kind: string; metadata: Record<string, unknown> }>,
    fromFile: string,
  ): Map<string, string> {
    const resolved = new Map<string, string>();

    for (const edge of edges) {
      if (edge.kind === 'imports' && edge.metadata.importPath) {
        const importPath = edge.metadata.importPath as string;
        const resolvedFile = this.resolve(importPath, fromFile);
        if (resolvedFile) {
          resolved.set(importPath, resolvedFile);
        }
      }
    }

    return resolved;
  }
}
