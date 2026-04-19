import { DependencyGraph } from '../graph/DependencyGraph.js';
import { findCircularDependencies } from './CircularDependencyAnalyzer.js';
import { filterByKind } from '../graph/query.js';
import type { ArchitectureRule, RuleViolation, NodeKind, EdgeKind } from '../graph/types.js';
import type { WaiverEngine } from './WaiverEngine.js';

/**
 * Evaluate architecture rules against the dependency graph.
 * Returns a list of violations found.
 *
 * Phase 7b-5 — when `opts.waivers` is supplied, every violation is
 * checked against the loaded waivers. A matching, non-expired waiver
 * is recorded on the violation (`waivedBy`) and the violation is moved
 * to `waived[]` instead of `violations[]`. Production callers should
 * pass `today` so expiry is deterministic; tests use the same hook.
 */
export interface EvaluateRulesOptions {
  waivers?: WaiverEngine;
  today?: string;
}

export interface EvaluateRulesResult {
  violations: (RuleViolation & { waivedBy?: ReturnType<WaiverEngine['isWaived']>['waiver'] })[];
  waived: (RuleViolation & { waivedBy: ReturnType<WaiverEngine['isWaived']>['waiver'] })[];
}

export function evaluateRules(
  graph: DependencyGraph,
  rules: ArchitectureRule[],
  opts?: EvaluateRulesOptions,
): RuleViolation[] {
  const result = evaluateRulesWithWaivers(graph, rules, opts);
  return result.violations;
}

export function evaluateRulesWithWaivers(
  graph: DependencyGraph,
  rules: ArchitectureRule[],
  opts?: EvaluateRulesOptions,
): EvaluateRulesResult {
  const raw: RuleViolation[] = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleId = rule.id || `rule-${i + 1}`;
    const severity = rule.severity || 'error';

    switch (rule.type) {
      case 'deny-circular':
        raw.push(...checkDenyCircular(graph, rule, ruleId, severity));
        break;
      case 'deny-direct':
        raw.push(...checkDenyDirect(graph, rule, ruleId, severity));
        break;
      case 'allow-only':
        raw.push(...checkAllowOnly(graph, rule, ruleId, severity));
        break;
      case 'max-depth':
        raw.push(...checkMaxDepth(graph, rule, ruleId, severity));
        break;
      case 'max-dependents':
        raw.push(...checkMaxDependents(graph, rule, ruleId, severity));
        break;
      case 'no-cross-service-db':
        raw.push(...checkNoCrossServiceDb(graph, rule, ruleId, severity));
        break;
    }
  }

  if (!opts?.waivers) {
    return { violations: raw, waived: [] };
  }
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const violations: EvaluateRulesResult['violations'] = [];
  const waived: EvaluateRulesResult['waived'] = [];
  for (const v of raw) {
    const target = waiverTargetFor(v, graph);
    const file = waiverFileFor(v, graph);
    const match = opts.waivers.isWaived({ ruleId: v.ruleType, target, file }, today);
    if (match.waived && match.waiver) {
      waived.push({ ...v, waivedBy: match.waiver });
    } else {
      violations.push(v);
    }
  }
  return { violations, waived };
}

function waiverTargetFor(v: RuleViolation, graph: DependencyGraph): string {
  if (v.ruleType === 'deny-direct' && v.nodeIds.length === 2) {
    const a = graph.getNode(v.nodeIds[0]);
    const b = graph.getNode(v.nodeIds[1]);
    if (a && b) return `${a.kind}→${b.kind}`;
  }
  return v.nodeIds[0] ?? v.ruleId;
}

function waiverFileFor(v: RuleViolation, graph: DependencyGraph): string | undefined {
  for (const id of v.nodeIds) {
    const n = graph.getNode(id);
    if (n?.filePath) return n.filePath;
  }
  return undefined;
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/**
 * Phase 10-5 — apply a Layer DSL `where:` predicate to a node. Returns true
 * iff every key of `pred` equals `node.metadata[key]`. `undefined` predicate
 * = no filter (always true).
 */
function nodeMatchesPredicate(
  node: { metadata?: Record<string, unknown> } | undefined | null,
  pred: Record<string, string | boolean> | undefined,
): boolean {
  if (!pred) return true;
  if (!node) return false;
  const md = (node.metadata ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(pred)) {
    if (md[k] !== v) return false;
  }
  return true;
}

function checkDenyCircular(
  graph: DependencyGraph, rule: ArchitectureRule, ruleId: string, severity: 'error' | 'warning',
): RuleViolation[] {
  // If edgeKinds specified, filter the graph to only those edges
  const targetGraph = rule.edgeKinds?.length
    ? filterByKind(graph, undefined, rule.edgeKinds)
    : graph;

  const cycles = findCircularDependencies(targetGraph);
  return cycles.map(cycle => ({
    ruleId,
    ruleType: 'deny-circular',
    severity,
    message: rule.message || `Circular dependency detected: ${cycle.map(id => id.split(':').pop()).join(' → ')}`,
    nodeIds: cycle,
    edgeIds: [],
  }));
}

function checkDenyDirect(
  graph: DependencyGraph, rule: ArchitectureRule, ruleId: string, severity: 'error' | 'warning',
): RuleViolation[] {
  const fromKinds = new Set(toArray(rule.from));
  const toKinds = new Set(toArray(rule.to));
  if (fromKinds.size === 0 || toKinds.size === 0) return [];

  const violations: RuleViolation[] = [];

  for (const edge of graph.getAllEdges()) {
    if (rule.edgeKinds?.length && !rule.edgeKinds.includes(edge.kind)) continue;

    const sourceNode = graph.getNode(edge.source);
    const targetNode = graph.getNode(edge.target);
    if (!sourceNode || !targetNode) continue;

    if (fromKinds.has(sourceNode.kind) && toKinds.has(targetNode.kind)) {
      // Phase 10-5 — Layer DSL `where:` narrows the layer at evaluation time.
      if (!nodeMatchesPredicate(sourceNode, rule.fromWhere)) continue;
      if (!nodeMatchesPredicate(targetNode, rule.toWhere)) continue;
      violations.push({
        ruleId,
        ruleType: 'deny-direct',
        severity,
        message: rule.message || `Direct dependency denied: ${sourceNode.label} (${sourceNode.kind}) → ${targetNode.label} (${targetNode.kind})`,
        nodeIds: [edge.source, edge.target],
        edgeIds: [edge.id],
      });
    }
  }

  return violations;
}

function checkAllowOnly(
  graph: DependencyGraph, rule: ArchitectureRule, ruleId: string, severity: 'error' | 'warning',
): RuleViolation[] {
  const fromKinds = new Set(toArray(rule.from));
  const allowedKinds = new Set(toArray(rule.allowed as NodeKind[]));
  if (fromKinds.size === 0 || allowedKinds.size === 0) return [];

  const violations: RuleViolation[] = [];

  for (const node of graph.getAllNodes()) {
    if (!fromKinds.has(node.kind)) continue;
    // Phase 10-5 — `from` predicate narrows source layer.
    if (!nodeMatchesPredicate(node, rule.fromWhere)) continue;

    for (const edge of graph.getOutEdges(node.id)) {
      if (rule.edgeKinds?.length && !rule.edgeKinds.includes(edge.kind)) continue;

      const targetNode = graph.getNode(edge.target);
      if (!targetNode) continue;

      if (!allowedKinds.has(targetNode.kind)) {
        // toWhere applies to the *allowed* side: an edge to a non-allowed
        // kind is always a violation, but if the target IS an allowed kind
        // and toWhere is set, the predicate must hold to consider it allowed.
        violations.push({
          ruleId,
          ruleType: 'allow-only',
          severity,
          message: rule.message || `${node.label} (${node.kind}) depends on ${targetNode.label} (${targetNode.kind}), which is not in the allowed list`,
          nodeIds: [node.id, edge.target],
          edgeIds: [edge.id],
        });
      } else if (rule.toWhere && !nodeMatchesPredicate(targetNode, rule.toWhere)) {
        // Allowed by kind but fails the metadata predicate -> still a violation.
        violations.push({
          ruleId,
          ruleType: 'allow-only',
          severity,
          message: rule.message || `${node.label} (${node.kind}) depends on ${targetNode.label} (${targetNode.kind}), which fails the layer predicate`,
          nodeIds: [node.id, edge.target],
          edgeIds: [edge.id],
        });
      }
    }
  }

  return violations;
}

function checkMaxDepth(
  graph: DependencyGraph, rule: ArchitectureRule, ruleId: string, severity: 'error' | 'warning',
): RuleViolation[] {
  const maxDepth = rule.value ?? 10;
  const edgeKindSet = rule.edgeKinds?.length ? new Set(rule.edgeKinds) : null;
  const violations: RuleViolation[] = [];
  const checked = new Set<string>();

  for (const node of graph.getAllNodes()) {
    if (checked.has(node.id)) continue;

    // DFS to find max chain depth from this node
    const depth = measureDepth(graph, node.id, edgeKindSet, new Set());
    if (depth > maxDepth) {
      violations.push({
        ruleId,
        ruleType: 'max-depth',
        severity,
        message: rule.message || `Dependency chain from ${node.label} has depth ${depth}, exceeding limit of ${maxDepth}`,
        nodeIds: [node.id],
        edgeIds: [],
      });
    }
    checked.add(node.id);
  }

  return violations;
}

function measureDepth(
  graph: DependencyGraph, nodeId: string, edgeKindSet: Set<EdgeKind> | null, visited: Set<string>,
): number {
  visited.add(nodeId);
  let maxChildDepth = 0;

  for (const edge of graph.getOutEdges(nodeId)) {
    if (edgeKindSet && !edgeKindSet.has(edge.kind)) continue;
    if (visited.has(edge.target)) continue;

    const childDepth = measureDepth(graph, edge.target, edgeKindSet, visited);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }

  visited.delete(nodeId);
  return 1 + maxChildDepth;
}

// Phase 12-9 — no-cross-service-db.
// Iterates the inter-service edges added by buildMsaServiceGraph and
// emits one violation per edge. Default scans `service-shares-db`; the
// `edgeKinds` rule field can broaden to also include `service-shares-dto`
// and `service-calls` if the project is strict.
function checkNoCrossServiceDb(
  graph: DependencyGraph, rule: ArchitectureRule, ruleId: string, severity: 'error' | 'warning',
): RuleViolation[] {
  const targetKinds = rule.edgeKinds?.length
    ? new Set(rule.edgeKinds)
    : new Set(['service-shares-db'] as EdgeKind[]);
  const violations: RuleViolation[] = [];
  for (const edge of graph.getAllEdges()) {
    if (!targetKinds.has(edge.kind)) continue;
    const source = graph.getNode(edge.source);
    const target = graph.getNode(edge.target);
    violations.push({
      ruleId,
      ruleType: 'no-cross-service-db',
      severity,
      message: rule.message
        || `Cross-service ${edge.kind}: ${source?.label ?? edge.source} → ${target?.label ?? edge.target}`,
      nodeIds: [edge.source, edge.target],
      edgeIds: [edge.id],
    });
  }
  return violations;
}

function checkMaxDependents(
  graph: DependencyGraph, rule: ArchitectureRule, ruleId: string, severity: 'error' | 'warning',
): RuleViolation[] {
  const maxDependents = rule.value ?? 10;
  const violations: RuleViolation[] = [];

  for (const node of graph.getAllNodes()) {
    const inEdges = graph.getInEdges(node.id);
    const filteredIn = rule.edgeKinds?.length
      ? inEdges.filter(e => rule.edgeKinds!.includes(e.kind))
      : inEdges;

    if (filteredIn.length > maxDependents) {
      violations.push({
        ruleId,
        ruleType: 'max-dependents',
        severity,
        message: rule.message || `${node.label} has ${filteredIn.length} dependents, exceeding limit of ${maxDependents}`,
        nodeIds: [node.id],
        edgeIds: filteredIn.map(e => e.id),
      });
    }
  }

  return violations;
}
