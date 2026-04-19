import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative, parse as pathParse } from 'path';
import type { AnalysisConfig, ServiceConfig, FeatureSliceConfig } from '@vda/core';

export async function initCommand(dir: string): Promise<void> {
  const projectRoot = resolve(dir);
  console.log(`\n🔧 Initializing VDA for: ${projectRoot}\n`);

  const config: AnalysisConfig = {
    aliases: {},
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.vda-cache/**'],
    nativeBridges: [],
  };

  const services: ServiceConfig[] = [];

  // Detect Vue project
  const vueRoot = detectVueProject(projectRoot);
  if (vueRoot) {
    config.vueRoot = relative(projectRoot, vueRoot) || '.';
    console.log(`   ✅ Vue project found: ${config.vueRoot}`);

    // Read tsconfig for aliases
    const aliases = readTsconfigAliases(vueRoot);
    if (Object.keys(aliases).length > 0) {
      config.aliases = aliases;
      console.log(`   ✅ Aliases from tsconfig.json: ${Object.keys(aliases).join(', ')}`);
    }

    services.push({ id: 'frontend', root: config.vueRoot, type: 'vue' });
  }

  // Detect Spring Boot projects (MSA)
  const springRoots = detectSpringBootProjects(projectRoot);
  if (springRoots.length === 1) {
    config.springBootRoot = relative(projectRoot, springRoots[0].root) || '.';
    console.log(`   ✅ Spring Boot project found: ${config.springBootRoot}`);
    services.push({ id: springRoots[0].name, root: config.springBootRoot, type: 'spring-boot' });
  } else if (springRoots.length > 1) {
    console.log(`   ✅ MSA: ${springRoots.length} Spring Boot services detected:`);
    for (const sr of springRoots) {
      const rel = relative(projectRoot, sr.root) || '.';
      console.log(`      - ${sr.name}: ${rel}`);
      services.push({ id: sr.name, root: rel, type: 'spring-boot' });
    }
  }

  if (services.length > 1) {
    config.services = services;
  }

  // Detect native bridges
  if (vueRoot) {
    const bridges = detectNativeBridges(vueRoot);
    if (bridges.length > 0) {
      config.nativeBridges = bridges;
      console.log(`   ✅ Native bridges: ${bridges.join(', ')}`);
    }
  }

  if (!vueRoot && springRoots.length === 0) {
    console.log('   ⚠️  No Vue or Spring Boot project detected.');
    console.log('   Creating a minimal config. Edit .vdarc.json to set paths.\n');
  }

  // Phase 9-2 — heuristic features[] from router files.
  if (vueRoot) {
    const features = heuristicFeaturesFromRouter(vueRoot);
    if (features.length > 0) {
      config.features = features;
      console.log(`   ✅ Heuristic features (${features.length}) — review before commit:`);
      for (const f of features) console.log(`      - ${f.id}: ${f.entry}`);
    }
  }
  if (services.length > 1) {
    console.log('');
    console.log('   ⚠️  MSA 환경 감지: F10 미구현 상태에서 heuristic feature 정확도 < 50% 예상.');
    console.log('       수동 검토 강력 권장. 각 feature 의 entry 가 도메인 경계와 맞는지 확인하세요.');
  }

  // Write config
  const configPath = join(projectRoot, '.vdarc.json');
  if (existsSync(configPath)) {
    console.log(`\n   ⚠️  ${configPath} already exists. Overwriting.`);
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(`\n   📄 Created .vdarc.json`);
  console.log(`\n   Next steps:`);
  console.log(`     vda analyze      # Run dependency analysis`);
  console.log(`     vda serve        # Start visualization server`);
  console.log('');
}

function detectVueProject(root: string): string | null {
  // Check package.json for vue dependency
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.vue || deps.nuxt) {
        // Check for src directory
        const srcDir = join(root, 'src');
        if (existsSync(srcDir)) return srcDir;
        return root;
      }
    } catch { /* ignore */ }
  }

  // Check subdirectories (monorepo)
  const entries = safeReaddir(root);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const subDir = join(root, entry);
    if (!statSync(subDir).isDirectory()) continue;
    const subPkg = join(subDir, 'package.json');
    if (existsSync(subPkg)) {
      try {
        const pkg = JSON.parse(readFileSync(subPkg, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.vue || deps.nuxt) {
          const srcDir = join(subDir, 'src');
          return existsSync(srcDir) ? srcDir : subDir;
        }
      } catch { /* ignore */ }
    }
  }

  return null;
}

interface SpringRoot {
  name: string;
  root: string;
}

function detectSpringBootProjects(root: string): SpringRoot[] {
  const results: SpringRoot[] = [];

  function check(dir: string, depth: number): void {
    if (depth > 3) return;

    // Check for build.gradle or pom.xml with Spring Boot
    for (const buildFile of ['build.gradle', 'build.gradle.kts', 'pom.xml']) {
      const filePath = join(dir, buildFile);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          if (content.includes('spring-boot') || content.includes('org.springframework.boot')) {
            const srcMain = join(dir, 'src', 'main', 'java');
            const srcKotlin = join(dir, 'src', 'main', 'kotlin');
            const sourceDir = existsSync(srcMain) ? srcMain : existsSync(srcKotlin) ? srcKotlin : dir;
            const name = dir.split('/').pop() || 'service';
            results.push({ name, root: sourceDir });
            return; // Don't recurse into sub-modules of same project
          }
        } catch { /* ignore */ }
      }
    }

    // Recurse into subdirectories
    const entries = safeReaddir(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'build' || entry === '.git' || entry === 'target') continue;
      const subDir = join(dir, entry);
      try {
        if (statSync(subDir).isDirectory()) {
          check(subDir, depth + 1);
        }
      } catch { /* ignore */ }
    }
  }

  check(root, 0);
  return results;
}

function readTsconfigAliases(vueRoot: string): Record<string, string> {
  const aliases: Record<string, string> = {};

  function loadFromTsconfig(tsconfigPath: string, visited: Set<string> = new Set()): void {
    if (!tsconfigPath || visited.has(tsconfigPath)) return;
    visited.add(tsconfigPath);

    try {
      const raw = readFileSync(tsconfigPath, 'utf-8');
      const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const tsconfig = JSON.parse(cleaned);

      // Follow extends first (base config has lower priority)
      if (tsconfig.extends) {
        const parentPath = resolve(join(tsconfigPath, '..'), tsconfig.extends);
        // Try with and without .json extension
        if (existsSync(parentPath)) loadFromTsconfig(parentPath, visited);
        else if (existsSync(parentPath + '.json')) loadFromTsconfig(parentPath + '.json', visited);
      }

      const paths = tsconfig.compilerOptions?.paths || {};
      const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
      const base = resolve(join(tsconfigPath, '..'), baseUrl);

      for (const [pattern, targets] of Object.entries(paths)) {
        if (!Array.isArray(targets) || targets.length === 0) continue;
        const alias = pattern.replace(/\/\*$/, '');
        const target = (targets[0] as string).replace(/\/\*$/, '');
        // Don't override already-set aliases (child takes priority)
        if (!aliases[alias]) {
          aliases[alias] = relative(vueRoot, resolve(base, target)) || '.';
        }
      }
    } catch { /* ignore parse errors */ }
  }

  const tsconfigPath = findUp('tsconfig.json', vueRoot);
  if (tsconfigPath) loadFromTsconfig(tsconfigPath);
  return aliases;
}

function detectNativeBridges(vueRoot: string): string[] {
  const bridges = new Set<string>();
  const pattern = /window\.(\w+)\.\w+\(/g;

  function scan(dir: string, depth: number): void {
    if (depth > 5) return;
    const entries = safeReaddir(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          scan(fullPath, depth + 1);
        } else if (entry.endsWith('.vue') || entry.endsWith('.ts') || entry.endsWith('.js')) {
          const content = readFileSync(fullPath, 'utf-8');
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const name = match[1];
            // Filter out common browser globals
            if (!['document', 'location', 'history', 'navigator', 'console', 'localStorage', 'sessionStorage', 'performance', 'crypto', 'screen', 'alert'].includes(name)) {
              bridges.add(name);
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  scan(vueRoot, 0);
  return Array.from(bridges);
}

function findUp(filename: string, fromDir: string): string | null {
  let dir = fromDir;
  const root = pathParse(dir).root;
  while (dir !== root) {
    const candidate = join(dir, filename);
    if (existsSync(candidate)) return candidate;
    dir = join(dir, '..');
  }
  return null;
}

// Phase 9-2 helper — pull `path: '...'` + `component: …` pairs from the
// router file and propose one feature per unique top-level path segment.
// Always tagged with `// review: heuristic` in the description so the
// user knows this needs hand-curation (especially in MSA setups, where
// router-based feature partitioning is meaningless on the backend).
function heuristicFeaturesFromRouter(vueRoot: string): FeatureSliceConfig[] {
  const candidates = [
    join(vueRoot, 'router', 'index.ts'),
    join(vueRoot, 'router', 'index.js'),
    join(vueRoot, 'router.ts'),
    join(vueRoot, 'router.js'),
    join(vueRoot, 'routes.ts'),
    join(vueRoot, 'routes.js'),
  ];
  const routerPath = candidates.find(p => existsSync(p));
  if (!routerPath) return [];

  let content: string;
  try {
    content = readFileSync(routerPath, 'utf-8');
  } catch {
    return [];
  }

  // path -> { aliasName | inlineImport }
  const aliasToImport = new Map<string, string>();
  const aliasRe = /const\s+([A-Z]\w+)\s*=\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = aliasRe.exec(content)) !== null) {
    aliasToImport.set(m[1], m[2]);
  }

  // Pair `path: '...'` with the closest following `component: …` to build
  // (path, importPath) tuples.
  const pathHits: Array<{ path: string; index: number }> = [];
  const pathRe = /\bpath\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = pathRe.exec(content)) !== null) {
    pathHits.push({ path: m[1], index: m.index });
  }

  const tuples: Array<{ path: string; importPath: string }> = [];
  for (const ph of pathHits) {
    // window: 600 chars after path: — covers `meta: { … }` + the component line.
    const window = content.slice(ph.index, ph.index + 600);
    let importPath: string | undefined;
    const inlineLazy = window.match(/component\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/);
    if (inlineLazy) importPath = inlineLazy[1];
    if (!importPath) {
      const stat = window.match(/component\s*:\s*([A-Z]\w+)/);
      if (stat) importPath = aliasToImport.get(stat[1]);
    }
    if (importPath) tuples.push({ path: ph.path, importPath });
  }

  // Group by top-level path segment ("/checkout/foo" → "checkout").
  // First entry per segment wins as the feature entry.
  const features: FeatureSliceConfig[] = [];
  const seenIds = new Set<string>();
  for (const t of tuples) {
    const segments = t.path.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    const id = segments[0]
      .replace(/[^A-Za-z0-9_-]/g, '-')
      .toLowerCase();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    // Resolve alias-relative paths back to vueRoot-relative for the config.
    const importPath = t.importPath
      .replace(/^@\//, '')
      .replace(/^~\//, '')
      .replace(/^\.\//, '');
    features.push({
      id,
      entry: importPath,
      description: '// review: heuristic — derived from router path segment',
    });
  }
  return features;
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
