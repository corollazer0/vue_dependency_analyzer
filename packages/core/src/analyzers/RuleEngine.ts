import { DependencyGraph } from '../graph/DependencyGraph.js';
import { findCircularDependencies } from './CircularDependencyAnalyzer.js';
import { filterByKind } from '../graph/query.js';
import type { ArchitectureRule, RuleViolation, NodeKind, EdgeKind } from '../graph/types.js';

/**
 * Evaluate architecture rules against the dependency graph.
 * Returns a list of violations found.
 */
export function evaluateRules(graph: DependencyGraph, rules: ArchitectureRule[]): RuleViolation[] {
  const violations: RuleViolation[] = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleId = rule.id || `rule-${i + 1}`;
    const severity = rule.severity || 'error';

    switch (rule.type) {
      case 'deny-circular':
        violations.push(...checkDenyCircular(graph, rule, ruleId, severity));
        break;
      case 'deny-direct':
        violations.push(...checkDenyDirect(graph, rule, ruleId, severity));
        break;
      case 'allow-only':
        violations.push(...checkAllowOnly(graph, rule, ruleId, severity));
        break;
      case 'max-depth':
        violations.push(...checkMaxDepth(graph, rule, ruleId, severity));
        break;
      case 'max-dependents':
        violations.push(...checkMaxDependents(graph, rule, ruleId, severity));
        break;
    }
  }

  return violations;
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
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

    for (const edge of graph.getOutEdges(node.id)) {
      if (rule.edgeKinds?.length && !rule.edgeKinds.includes(edge.kind)) continue;

      const targetNode = graph.getNode(edge.target);
      if (!targetNode) continue;

      if (!allowedKinds.has(targetNode.kind)) {
        violations.push({
          ruleId,
          ruleType: 'allow-only',
          severity,
          message: rule.message || `${node.label} (${node.kind}) depends on ${targetNode.label} (${targetNode.kind}), which is not in the allowed list`,
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
