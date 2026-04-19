// Phase 10-2 — universal node metadata.
// Two metrics every node carries so downstream consumers (anti-pattern classifier,
// hot-spot ranking in Phase 11) never need to fall back to file I/O or guess:
//
//   lineCount    — total newlines + 1 of the file the node was parsed from.
//   packageCount — distinct top-level package buckets the file imports from.
//
// 0 fallback is intentional: the field is *always* present so consumers
// can read `node.metadata.lineCount` without `?? 0` ceremony.

/** Count newlines + 1, treating empty content as 0 lines. */
export function countLines(content: string): number {
  if (content.length === 0) return 0;
  let n = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) n++;
  }
  return n;
}

/**
 * First-segment bucket of an import specifier so siblings of the same library
 * roll up to one package. Examples:
 *   "lodash"             -> "lodash"
 *   "lodash/fp"          -> "lodash"
 *   "@vue/runtime-core"  -> "@vue/runtime-core" (scoped: keep first two)
 *   "./util"             -> "."   (relative: collapsed to a single bucket)
 *   "../util"            -> ".."
 *   "/abs"               -> "/abs"
 */
export function topLevelPackage(spec: string): string {
  if (spec.startsWith('.')) return spec.startsWith('..') ? '..' : '.';
  const slash = spec.indexOf('/');
  if (spec.startsWith('@') && slash !== -1) {
    // scoped: include the package name part too (@scope/name)
    const rest = spec.slice(slash + 1);
    const innerSlash = rest.indexOf('/');
    return innerSlash === -1 ? spec : `${spec.slice(0, slash)}/${rest.slice(0, innerSlash)}`;
  }
  return slash === -1 ? spec : spec.slice(0, slash);
}

export function distinctPackageCount(specs: Iterable<string>): number {
  const set = new Set<string>();
  for (const s of specs) set.add(topLevelPackage(s));
  return set.size;
}

/** Match Java import statements — `import com.foo.Bar;` (static or wildcard ok). */
const JAVA_IMPORT_RE = /^\s*import\s+(?:static\s+)?([\w.$*]+)\s*;/gm;

export function distinctJavaPackageCount(content: string): number {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  JAVA_IMPORT_RE.lastIndex = 0;
  while ((m = JAVA_IMPORT_RE.exec(content)) !== null) {
    const fqn = m[1];
    // Top-level Java package = first segment (com / org / java / …).
    const dot = fqn.indexOf('.');
    set.add(dot === -1 ? fqn : fqn.slice(0, dot));
  }
  return set.size;
}
