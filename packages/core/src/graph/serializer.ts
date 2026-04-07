import type { SerializedGraph } from './types.js';
import { DependencyGraph } from './DependencyGraph.js';

export function toJSON(graph: DependencyGraph): SerializedGraph {
  return {
    nodes: graph.getAllNodes(),
    edges: graph.getAllEdges(),
    metadata: graph.metadata,
  };
}

export function fromJSON(data: SerializedGraph): DependencyGraph {
  const graph = new DependencyGraph();
  graph.metadata = data.metadata;
  for (const node of data.nodes) {
    graph.addNode(node);
  }
  for (const edge of data.edges) {
    graph.addEdge(edge);
  }
  return graph;
}

export function toDot(graph: DependencyGraph): string {
  const lines: string[] = ['digraph VDA {', '  rankdir=LR;', '  node [shape=box, style=filled];', ''];

  const kindColors: Record<string, string> = {
    'vue-component': '#42b883',
    'vue-composable': '#35495e',
    'pinia-store': '#ffd859',
    'spring-controller': '#6db33f',
    'spring-endpoint': '#8bc34a',
    'native-bridge': '#ff7043',
    'ts-module': '#3178c6',
  };

  for (const node of graph.getAllNodes()) {
    const color = kindColors[node.kind] || '#999999';
    const escaped = node.label.replace(/"/g, '\\"');
    lines.push(`  "${node.id}" [label="${escaped}", fillcolor="${color}", fontcolor="white"];`);
  }

  lines.push('');

  const edgeStyles: Record<string, string> = {
    'api-call': 'style=dashed, color=red',
    'native-call': 'style=dashed, color=orange',
    'uses-store': 'color=gold',
    'uses-component': 'color=green',
  };

  for (const edge of graph.getAllEdges()) {
    const style = edgeStyles[edge.kind] || '';
    lines.push(`  "${edge.source}" -> "${edge.target}" [label="${edge.kind}"${style ? ', ' + style : ''}];`);
  }

  lines.push('}');
  return lines.join('\n');
}
