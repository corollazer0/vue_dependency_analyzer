import type {
  SerializedGraph,
  GraphNode,
  GraphEdge,
  NodeKind,
  EdgeKind,
} from '@vda/core';

// ─── Deterministic PRNG ───

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Public options ───

export interface SyntheticFixtureOptions {
  /** Target total node count. Default 5000 (Phase 3 G1 target). */
  nodeCount?: number;
  /** PRNG seed — same seed + options → same graph. Default 0x5EED. */
  seed?: number;
  /**
   * Desired fraction per node kind. Unset kinds are skipped. Values are
   * normalised to sum=1 across the declared kinds. Defaults approximate a
   * Vue 3 + Spring Boot MSA codebase measured against the project's own
   * `test-project` fixture.
   */
  kindRatios?: Partial<Record<NodeKind, number>>;
  /**
   * Average out-degree target per eligible source node. Higher → denser.
   * Default 3 — picks up a little on top of the `test-project` density.
   */
  avgOutDegree?: number;
  /**
   * When true (default), use preferential attachment so a small number of
   * nodes become hubs (realistic for real codebases: a few core modules get
   * many incoming imports, most leaf files get one or two).
   */
  powerLaw?: boolean;
}

// ─── Defaults ───

const DEFAULT_KIND_RATIOS: Record<NodeKind, number> = {
  'vue-component': 0.35,
  'ts-module': 0.20,
  'vue-composable': 0.05,
  'pinia-store': 0.03,
  'vue-router-route': 0.01,
  'vue-directive': 0.005,
  'api-call-site': 0.10,
  'spring-controller': 0.04,
  'spring-endpoint': 0.10,
  'spring-service': 0.05,
  'spring-dto': 0.03,
  'mybatis-mapper': 0.02,
  'mybatis-statement': 0.04,
  'db-table': 0.02,
  'native-bridge': 0.0,
  'native-method': 0.0,
  'vue-event': 0.0,
  'spring-event': 0.0,
  // Phase 12 — synthetic fixture doesn't generate top-level service
  // nodes (the test-project fixture serves the e2e gate). Keep at 0.
  'msa-service': 0.0,
};

// Edge rules: for each source kind, which target kinds are valid + edge kind.
// Order matters: earlier rules are tried first for a given source node.
const EDGE_RULES: {
  from: NodeKind;
  to: NodeKind;
  edgeKind: EdgeKind;
  /** Relative weight — how often this rule fires for a given source. */
  weight: number;
}[] = [
  { from: 'vue-component', to: 'vue-component',    edgeKind: 'uses-component',   weight: 2 },
  { from: 'vue-component', to: 'ts-module',        edgeKind: 'imports',          weight: 3 },
  { from: 'vue-component', to: 'vue-composable',   edgeKind: 'uses-composable',  weight: 1 },
  { from: 'vue-component', to: 'pinia-store',      edgeKind: 'uses-store',       weight: 1 },
  { from: 'vue-component', to: 'api-call-site',    edgeKind: 'imports',          weight: 1 },
  { from: 'ts-module',     to: 'ts-module',        edgeKind: 'imports',          weight: 3 },
  { from: 'ts-module',     to: 'api-call-site',    edgeKind: 'imports',          weight: 1 },
  { from: 'vue-composable',to: 'pinia-store',      edgeKind: 'uses-store',       weight: 1 },
  { from: 'vue-composable',to: 'api-call-site',    edgeKind: 'imports',          weight: 1 },
  { from: 'vue-router-route', to: 'vue-component', edgeKind: 'route-renders',    weight: 1 },
  { from: 'api-call-site', to: 'spring-endpoint',  edgeKind: 'api-call',         weight: 1 },
  { from: 'spring-controller', to: 'spring-endpoint', edgeKind: 'api-serves',    weight: 2 },
  { from: 'spring-controller', to: 'spring-service', edgeKind: 'spring-injects', weight: 2 },
  { from: 'spring-service',to: 'spring-service',   edgeKind: 'spring-injects',   weight: 1 },
  { from: 'spring-service',to: 'mybatis-mapper',   edgeKind: 'spring-injects',   weight: 2 },
  { from: 'mybatis-mapper',to: 'mybatis-statement',edgeKind: 'mybatis-maps',     weight: 3 },
  { from: 'mybatis-statement', to: 'db-table',     edgeKind: 'reads-table',      weight: 2 },
  { from: 'mybatis-statement', to: 'db-table',     edgeKind: 'writes-table',     weight: 1 },
];

// ─── Helpers ───

function resolveKindCounts(nodeCount: number, ratios: Partial<Record<NodeKind, number>>): Map<NodeKind, number> {
  const declared = Object.entries(ratios).filter(([, v]) => (v ?? 0) > 0) as [NodeKind, number][];
  const total = declared.reduce((s, [, v]) => s + v, 0);
  if (total === 0) throw new Error('kindRatios: no kind has a positive ratio');
  if (nodeCount < declared.length) {
    throw new Error(`nodeCount=${nodeCount} is smaller than the declared kind count (${declared.length})`);
  }

  // Largest-remainder allocation: every kind gets at least 1, remaining budget
  // distributed by fractional remainder so final total equals nodeCount exactly.
  const exactCounts: [NodeKind, number, number][] = declared.map(([kind, ratio]) => {
    const exact = (ratio / total) * nodeCount;
    return [kind, Math.max(1, Math.floor(exact)), exact - Math.floor(exact)];
  });

  const counts = new Map<NodeKind, number>();
  let allocated = 0;
  for (const [kind, base] of exactCounts) {
    counts.set(kind, base);
    allocated += base;
  }

  let diff = nodeCount - allocated;
  if (diff > 0) {
    // Budget left — hand out to the highest fractional remainders.
    const byRem = [...exactCounts].sort((a, b) => b[2] - a[2]);
    let i = 0;
    while (diff > 0) {
      const [kind] = byRem[i % byRem.length];
      counts.set(kind, counts.get(kind)! + 1);
      diff--; i++;
    }
  } else if (diff < 0) {
    // Over-budget (Math.max(1) floor on tiny-ratio kinds). Trim from the
    // largest allocation until we hit the target, never going below 1.
    while (diff < 0) {
      const largest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (largest[1] <= 1) break;
      counts.set(largest[0], largest[1] - 1);
      diff++;
    }
  }
  return counts;
}

function kindToPath(kind: NodeKind, index: number): string {
  // Realistic-looking project paths so UI labels/tooltips have something
  // plausible to show while benching. Keep stable per (kind,index) so fixture
  // output is byte-deterministic across runs.
  const serviceIdx = (index % 4) + 1;
  switch (kind) {
    case 'vue-component':
      return `/synthetic/frontend/src/components/Component${index}.vue`;
    case 'ts-module':
      return `/synthetic/frontend/src/utils/module${index}.ts`;
    case 'vue-composable':
      return `/synthetic/frontend/src/composables/use${index}.ts`;
    case 'pinia-store':
      return `/synthetic/frontend/src/stores/store${index}.ts`;
    case 'vue-router-route':
      return `/synthetic/frontend/src/router/route${index}.ts`;
    case 'vue-directive':
      return `/synthetic/frontend/src/directives/dir${index}.ts`;
    case 'api-call-site':
      return `/synthetic/frontend/src/api/api${index}.ts`;
    case 'spring-controller':
      return `/synthetic/service${serviceIdx}/src/main/java/controller/Ctrl${index}.java`;
    case 'spring-endpoint':
      return `/synthetic/service${serviceIdx}/src/main/java/controller/Ctrl${index}.java`;
    case 'spring-service':
      return `/synthetic/service${serviceIdx}/src/main/java/service/Svc${index}.java`;
    case 'mybatis-mapper':
      return `/synthetic/service${serviceIdx}/src/main/java/mapper/Mapper${index}.java`;
    case 'mybatis-statement':
      return `/synthetic/service${serviceIdx}/src/main/resources/mapper/Mapper${index}.xml`;
    case 'db-table':
      return `db://table_${index}`;
    default:
      return `/synthetic/${kind}/${index}`;
  }
}

function kindToLabel(kind: NodeKind, index: number): string {
  switch (kind) {
    case 'vue-component':     return `Component${index}`;
    case 'ts-module':         return `module${index}`;
    case 'vue-composable':    return `use${index}`;
    case 'pinia-store':       return `store${index}`;
    case 'vue-router-route':  return `/route/${index}`;
    case 'vue-directive':     return `v-dir${index}`;
    case 'api-call-site':     return `call${index}`;
    case 'spring-controller': return `Ctrl${index}`;
    case 'spring-endpoint':   return `GET /api/ep${index}`;
    case 'spring-service':    return `Svc${index}`;
    case 'mybatis-mapper':    return `Mapper${index}`;
    case 'mybatis-statement': return `stmt${index}`;
    case 'db-table':          return `table_${index}`;
    default:                  return `${kind}-${index}`;
  }
}

// ─── Main generator ───

export function generateSyntheticGraph(opts: SyntheticFixtureOptions = {}): SerializedGraph {
  const nodeCount = opts.nodeCount ?? 5000;
  const seed = opts.seed ?? 0x5EED;
  const avgOutDegree = opts.avgOutDegree ?? 3;
  const powerLaw = opts.powerLaw ?? true;
  const ratios = { ...DEFAULT_KIND_RATIOS, ...(opts.kindRatios ?? {}) };
  const rng = mulberry32(seed);

  // 1. Allocate nodes per kind.
  const kindCounts = resolveKindCounts(nodeCount, ratios);
  const nodes: GraphNode[] = [];
  const nodesByKind = new Map<NodeKind, GraphNode[]>();
  let runningIdx = 0;
  // Sort kinds so node id ordering is stable across runs even if Map insertion
  // order shifts (Object.entries preserves insertion, but be explicit).
  const kindsSorted = [...kindCounts.keys()].sort();
  for (const kind of kindsSorted) {
    const count = kindCounts.get(kind)!;
    const bucket: GraphNode[] = [];
    for (let i = 0; i < count; i++) {
      const idx = runningIdx++;
      const node: GraphNode = {
        id: `${kind}:${idx}`,
        kind,
        label: kindToLabel(kind, idx),
        filePath: kindToPath(kind, idx),
        metadata: {},
      };
      nodes.push(node);
      bucket.push(node);
    }
    nodesByKind.set(kind, bucket);
  }

  // 2. Build edges using EDGE_RULES + preferential attachment.
  // `inDegree` tracks current in-degree so preferential attachment can bias
  // toward already-popular targets (a realistic long-tailed degree distrib).
  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n.id, 1); // +1 so never-picked nodes stay eligible
  const edges: GraphEdge[] = [];
  let edgeIdx = 0;

  // Group rules by source kind for fast lookup.
  const rulesByFrom = new Map<NodeKind, typeof EDGE_RULES>();
  for (const rule of EDGE_RULES) {
    const arr = rulesByFrom.get(rule.from) ?? [];
    arr.push(rule);
    rulesByFrom.set(rule.from, arr);
  }

  // Pick a target node from a pool, weighted by preferential attachment or uniform.
  function pickTarget(pool: GraphNode[]): GraphNode | null {
    if (pool.length === 0) return null;
    if (!powerLaw) return pool[Math.floor(rng() * pool.length)];
    // Roulette wheel on inDegree.
    let total = 0;
    for (const n of pool) total += inDegree.get(n.id)!;
    let r = rng() * total;
    for (const n of pool) {
      r -= inDegree.get(n.id)!;
      if (r <= 0) return n;
    }
    return pool[pool.length - 1];
  }

  for (const source of nodes) {
    const rules = rulesByFrom.get(source.kind);
    if (!rules || rules.length === 0) continue;
    // Degree for this source: Poisson-ish around avgOutDegree, clamped.
    const degree = Math.max(0, Math.round(avgOutDegree + (rng() - 0.5) * avgOutDegree));
    for (let i = 0; i < degree; i++) {
      // Pick a rule by weight.
      const totalW = rules.reduce((s, r) => s + r.weight, 0);
      let r = rng() * totalW;
      let chosen = rules[0];
      for (const rule of rules) {
        r -= rule.weight;
        if (r <= 0) { chosen = rule; break; }
      }
      const pool = nodesByKind.get(chosen.to);
      if (!pool || pool.length === 0) continue;
      const target = pickTarget(pool);
      if (!target || target.id === source.id) continue;
      edges.push({
        id: `e${edgeIdx++}`,
        source: source.id,
        target: target.id,
        kind: chosen.edgeKind,
        metadata: {},
      });
      inDegree.set(target.id, (inDegree.get(target.id) ?? 1) + 1);
    }
  }

  return {
    nodes,
    edges,
    metadata: {
      projectRoot: '/synthetic',
      analyzedAt: '2026-01-01T00:00:00.000Z',
      fileCount: nodes.length,
      parseErrors: [],
      config: {},
    },
  };
}
