import { DependencyGraph } from '../graph/DependencyGraph.js';

export interface ComplexityScore {
  nodeId: string;
  label: string;
  fanIn: number;
  fanOut: number;
  score: number;
}

export function calculateComplexity(graph: DependencyGraph): ComplexityScore[] {
  const scores: ComplexityScore[] = [];

  for (const node of graph.getAllNodes()) {
    const fanIn = graph.getInEdges(node.id).length;
    const fanOut = graph.getOutEdges(node.id).length;
    // Complexity score: higher means more coupled
    const score = fanIn * fanOut;

    scores.push({
      nodeId: node.id,
      label: node.label,
      fanIn,
      fanOut,
      score,
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}

export function findHubs(graph: DependencyGraph, threshold: number = 5): ComplexityScore[] {
  return calculateComplexity(graph).filter(s => s.fanIn >= threshold || s.fanOut >= threshold);
}
