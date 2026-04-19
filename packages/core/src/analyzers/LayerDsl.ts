import type { ArchitectureRule, NodeKind, LayerMetadataPredicate } from '../graph/types.js';

// Phase 7b-3 — F3 Layer DSL.
//
// `.vdarc.json` accepts an optional layer dictionary that compiles into
// the same `ArchitectureRule[]` the RuleEngine already evaluates. This
// keeps a single runtime ruleset while letting users describe intent
// at the conceptual layer level (presentation / application / infra)
// rather than per-NodeKind tuples.
//
// Conflict policy (per plan §3-1):
//   * Each compiled rule carries `source: 'layer-dsl'` in its `id` so
//     `vda lint --explain` can attribute it.
//   * If a hand-written rule covers the same (type, from, to) tuple,
//     the hand-written one wins and the DSL output for that tuple is
//     reported in `dropped[]` instead of being emitted.
//   * `layerDsl.mode === 'strict'` promotes any conflict to a lint
//     error — the conflict is surfaced as an additional `RuleViolation`
//     by the consumer of `compileLayerRules`.

export interface LayerDefinition {
  name: string;
  match: NodeKind[];
  /**
   * Phase 10-5 — additional metadata predicate. A node belongs to this
   * layer iff its `kind` is in `match` AND every key of `where` equals
   * the node's `metadata[key]`. Predicate values are string or boolean
   * only (booleans help with parser-emitted flags like `isBarrel`).
   *
   * Use case: split `spring-service` into "service-application" vs
   * "service-infrastructure" by `metadata.isRepository: true`.
   */
  where?: LayerMetadataPredicate;
}

export interface LayerRule {
  from: string;
  to: string;
  policy: 'deny' | 'allow-only';
  /** Optional human-readable explanation surfaced in violation messages. */
  message?: string;
}

export interface LayerDslConfig {
  layers?: LayerDefinition[];
  layerRules?: LayerRule[];
  layerDsl?: { mode?: 'lenient' | 'strict' };
}

export interface DroppedRule {
  reason: 'conflict-with-hand-written';
  layerRule: LayerRule;
  conflictsWith: ArchitectureRule;
  /** True when `layerDsl.mode === 'strict'` (the consumer should
   *  surface this as a lint error). */
  isError: boolean;
}

export interface CompiledLayerRules {
  rules: ArchitectureRule[];
  dropped: DroppedRule[];
}

function tupleKey(rule: { type?: string; from?: any; to?: any }): string {
  const fromArr = Array.isArray(rule.from) ? rule.from.slice().sort() : rule.from ? [rule.from] : [];
  const toArr = Array.isArray(rule.to) ? rule.to.slice().sort() : rule.to ? [rule.to] : [];
  return `${rule.type ?? ''}|${fromArr.join(',')}|${toArr.join(',')}`;
}

/**
 * Compile the layer DSL into ArchitectureRules. `userRules` is the
 * existing `rules[]` from `.vdarc.json` — used for conflict detection,
 * NOT mutated.
 */
export function compileLayerRules(
  config: LayerDslConfig,
  userRules: ArchitectureRule[] = [],
): CompiledLayerRules {
  const layers = config.layers ?? [];
  const layerRules = config.layerRules ?? [];
  const strict = config.layerDsl?.mode === 'strict';
  if (layers.length === 0 || layerRules.length === 0) {
    return { rules: [], dropped: [] };
  }

  const byName = new Map<string, LayerDefinition>();
  for (const l of layers) byName.set(l.name, l);

  const userKeys = new Map<string, ArchitectureRule>();
  for (const r of userRules) userKeys.set(tupleKey(r), r);

  const rules: ArchitectureRule[] = [];
  const dropped: DroppedRule[] = [];

  for (const lr of layerRules) {
    const fromLayer = byName.get(lr.from);
    const toLayer = byName.get(lr.to);
    if (!fromLayer || !toLayer) continue;

    const compiled: ArchitectureRule = lr.policy === 'deny'
      ? {
          id: `layer-dsl:${lr.from}→${lr.to}:deny`,
          type: 'deny-direct',
          from: fromLayer.match,
          to: toLayer.match,
          severity: 'error',
          message: lr.message ?? `Layer policy: ${lr.from} cannot depend on ${lr.to}`,
          ...(fromLayer.where ? { fromWhere: fromLayer.where } : {}),
          ...(toLayer.where ? { toWhere: toLayer.where } : {}),
        }
      : {
          id: `layer-dsl:${lr.from}→only-${lr.to}`,
          type: 'allow-only',
          from: fromLayer.match,
          allowed: toLayer.match,
          severity: 'error',
          message: lr.message ?? `Layer policy: ${lr.from} may depend only on ${lr.to}`,
          ...(fromLayer.where ? { fromWhere: fromLayer.where } : {}),
          ...(toLayer.where ? { toWhere: toLayer.where } : {}),
        };

    const key = tupleKey(compiled);
    const conflict = userKeys.get(key);
    if (conflict) {
      dropped.push({
        reason: 'conflict-with-hand-written',
        layerRule: lr,
        conflictsWith: conflict,
        isError: strict,
      });
      continue;
    }
    rules.push(compiled);
  }

  return { rules, dropped };
}

/** Convenience: feed a config that already has hand-written rules + a
 *  layer DSL through and get the merged rule set. Hand-written rules
 *  are returned first so they take precedence in any tie-breaking the
 *  engine does later. */
export function mergeWithLayerRules(
  baseRules: ArchitectureRule[],
  config: LayerDslConfig,
): { rules: ArchitectureRule[]; dropped: DroppedRule[] } {
  const compiled = compileLayerRules(config, baseRules);
  return { rules: [...baseRules, ...compiled.rules], dropped: compiled.dropped };
}
