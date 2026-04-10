import type { SerializedGraph, NodeKind, EdgeKind } from './types.js';
import { DependencyGraph } from './DependencyGraph.js';
import { filterByKind } from './query.js';

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

// ─── Shared constants for diagram export ───

const NODE_COLORS: Partial<Record<NodeKind, string>> = {
  'vue-component': '#42b883',
  'vue-composable': '#a78bfa',
  'pinia-store': '#ffd859',
  'vue-directive': '#8e44ad',
  'vue-router-route': '#3498db',
  'ts-module': '#3178c6',
  'api-call-site': '#ef4444',
  'spring-controller': '#6db33f',
  'spring-endpoint': '#8bc34a',
  'spring-service': '#4caf50',
  'native-bridge': '#ff7043',
  'native-method': '#ff9800',
  'mybatis-mapper': '#e91e63',
  'mybatis-statement': '#f06292',
  'db-table': '#00bcd4',
  'vue-event': '#e67e22',
  'spring-event': '#ff9800',
};

const NODE_LABELS: Partial<Record<NodeKind, string>> = {
  'vue-component': 'Vue', 'vue-composable': 'Composable', 'pinia-store': 'Store',
  'vue-router-route': 'Route', 'ts-module': 'TS', 'api-call-site': 'API Call',
  'spring-controller': 'Controller', 'spring-endpoint': 'Endpoint', 'spring-service': 'Service',
  'mybatis-mapper': 'Mapper', 'mybatis-statement': 'SQL', 'db-table': 'DB Table',
  'vue-event': 'Event', 'spring-event': 'Event',
};

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').substring(0, 60);
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"').replace(/[<>]/g, '');
}

export interface DiagramExportOptions {
  nodeKinds?: NodeKind[];
  edgeKinds?: EdgeKind[];
}

// ─── Mermaid ───

export function toMermaid(graph: DependencyGraph, options?: DiagramExportOptions): string {
  const g = (options?.nodeKinds || options?.edgeKinds)
    ? filterByKind(graph, options.nodeKinds, options.edgeKinds)
    : graph;

  const lines: string[] = ['graph LR'];

  // Collect which kinds are used for classDef
  const usedKinds = new Set<NodeKind>();

  for (const node of g.getAllNodes()) {
    usedKinds.add(node.kind);
    const sid = sanitizeId(node.id);
    const kindLabel = NODE_LABELS[node.kind] || node.kind;
    lines.push(`  ${sid}["${escapeLabel(node.label)}"]:::${node.kind.replace(/-/g, '_')}`);
  }

  lines.push('');

  for (const edge of g.getAllEdges()) {
    const src = sanitizeId(edge.source);
    const tgt = sanitizeId(edge.target);
    lines.push(`  ${src} -->|${edge.kind}| ${tgt}`);
  }

  lines.push('');

  // classDef for each used kind
  for (const kind of usedKinds) {
    const color = NODE_COLORS[kind] || '#999';
    lines.push(`  classDef ${kind.replace(/-/g, '_')} fill:${color},color:#fff,stroke:${color}`);
  }

  return lines.join('\n');
}

// ─── PlantUML ───

export function toPlantUML(graph: DependencyGraph, options?: DiagramExportOptions): string {
  const g = (options?.nodeKinds || options?.edgeKinds)
    ? filterByKind(graph, options.nodeKinds, options.edgeKinds)
    : graph;

  const lines: string[] = ['@startuml', 'left to right direction', ''];

  for (const node of g.getAllNodes()) {
    const sid = sanitizeId(node.id);
    const color = NODE_COLORS[node.kind] || '#999';
    const kindLabel = NODE_LABELS[node.kind] || node.kind;
    lines.push(`component "${escapeLabel(node.label)}\\n<size:10>${kindLabel}</size>" as ${sid} ${color}`);
  }

  lines.push('');

  for (const edge of g.getAllEdges()) {
    const src = sanitizeId(edge.source);
    const tgt = sanitizeId(edge.target);
    lines.push(`${src} --> ${tgt} : ${edge.kind}`);
  }

  lines.push('', '@enduml');
  return lines.join('\n');
}
