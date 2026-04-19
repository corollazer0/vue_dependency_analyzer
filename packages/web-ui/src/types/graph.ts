export type NodeKind =
  | 'vue-component'
  | 'vue-composable'
  | 'pinia-store'
  | 'vue-directive'
  | 'vue-router-route'
  | 'ts-module'
  | 'api-call-site'
  | 'spring-controller'
  | 'spring-endpoint'
  | 'spring-service'
  | 'spring-dto'
  | 'native-bridge'
  | 'native-method'
  | 'mybatis-mapper'
  | 'mybatis-statement'
  | 'db-table'
  | 'vue-event'
  | 'spring-event';

export type EdgeKind =
  | 'imports'
  | 'uses-component'
  | 'uses-store'
  | 'uses-composable'
  | 'uses-directive'
  | 'provides'
  | 'injects'
  | 'emits-event'
  | 'listens-event'
  | 'api-call'
  | 'api-serves'
  | 'api-implements'
  | 'native-call'
  | 'route-renders'
  | 'spring-injects'
  | 'mybatis-maps'
  | 'reads-table'
  | 'writes-table'
  | 'dto-flows';

export interface SourceLocation {
  filePath: string;
  line: number;
  column?: number;
}

/**
 * Phase 2-9 — fixed-shape metadata.
 *
 * Every known-on-the-server-side metadata field is enumerated below as an
 * explicit optional. Unknown keys remain reachable via the index signature
 * so back-end additions don't break the type. The store's `normalizeNode`
 * (dataStore.ts) walks this exact key order on every fetched node so V8
 * settles on a single hidden class for the metadata object — every
 * downstream property access (filter checks, template renders) then
 * traverses a monomorphic IC instead of paying polymorphic lookup.
 */
export interface NodeMetadata {
  serviceId?: string;
  className?: string;
  basePath?: string;
  isRepository?: boolean;
  isMapper?: boolean;
  emits?: string[];
  imports?: string[];
  exportedFunctions?: string[];
  resultType?: string;
  componentId?: string;
  eventName?: string;
  eventClass?: string;
  virtual?: boolean;
  [key: string]: unknown;
}

export interface EdgeMetadata {
  importPath?: string;
  componentName?: string;
  storeName?: string;
  composableName?: string;
  eventName?: string;
  confidence?: 'high' | 'medium' | 'low';
  viaDomainMatch?: boolean;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  filePath: string;
  metadata: NodeMetadata;
  loc?: SourceLocation;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  metadata: EdgeMetadata;
  loc?: SourceLocation;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    projectRoot: string;
    analyzedAt: string;
    fileCount: number;
  };
}

export interface SearchResult {
  nodeId: string;
  label: string;
  kind: NodeKind;
  filePath: string;
}

export type CytoscapeShape = 'ellipse' | 'diamond' | 'rectangle' | 'triangle' | 'pentagon' | 'hexagon' | 'round-rectangle' | 'star';

export interface NodeStyle {
  color: string;
  shape: CytoscapeShape;
}

export const NODE_STYLES: Record<NodeKind, NodeStyle> = {
  'vue-component':     { color: '#42b883', shape: 'ellipse' },
  'vue-composable':    { color: '#a78bfa', shape: 'triangle' },
  'pinia-store':       { color: '#ffd859', shape: 'diamond' },
  'vue-directive':     { color: '#8e44ad', shape: 'hexagon' },
  'vue-router-route':  { color: '#3498db', shape: 'round-rectangle' },
  'ts-module':         { color: '#3178c6', shape: 'rectangle' },
  'api-call-site':     { color: '#ef4444', shape: 'pentagon' },
  'spring-controller': { color: '#6db33f', shape: 'round-rectangle' },
  'spring-endpoint':   { color: '#8bc34a', shape: 'rectangle' },
  'spring-service':    { color: '#4caf50', shape: 'hexagon' },
  'spring-dto':        { color: '#ab47bc', shape: 'rectangle' },
  'native-bridge':     { color: '#ff7043', shape: 'star' },
  'native-method':     { color: '#ff9800', shape: 'star' },
  'mybatis-mapper':    { color: '#e91e63', shape: 'round-rectangle' },
  'mybatis-statement': { color: '#f06292', shape: 'rectangle' },
  'db-table':          { color: '#00bcd4', shape: 'diamond' },
  'vue-event':         { color: '#e67e22', shape: 'star' },
  'spring-event':      { color: '#ff9800', shape: 'star' },
};

// Backward compat
export const NODE_COLORS: Record<NodeKind, string> = Object.fromEntries(
  Object.entries(NODE_STYLES).map(([k, v]) => [k, v.color])
) as Record<NodeKind, string>;

export const NODE_LABELS: Record<NodeKind, string> = {
  'vue-component': 'Vue Component',
  'vue-composable': 'Composable',
  'pinia-store': 'Pinia Store',
  'vue-directive': 'Directive',
  'vue-router-route': 'Route',
  'ts-module': 'TS Module',
  'api-call-site': 'API Call',
  'spring-controller': 'Controller',
  'spring-endpoint': 'Endpoint',
  'spring-service': 'Service',
  'spring-dto': 'Spring DTO',
  'native-bridge': 'Native Bridge',
  'native-method': 'Native Method',
  'mybatis-mapper': 'MyBatis Mapper',
  'mybatis-statement': 'SQL Statement',
  'db-table': 'DB Table',
  'vue-event': 'Vue Event',
  'spring-event': 'Spring Event',
};

export const EDGE_STYLES: Record<EdgeKind, { color: string; dashed: boolean }> = {
  'imports': { color: '#666', dashed: false },
  'uses-component': { color: '#42b883', dashed: false },
  'uses-store': { color: '#ffd859', dashed: false },
  'uses-composable': { color: '#35495e', dashed: false },
  'uses-directive': { color: '#8e44ad', dashed: true },
  'provides': { color: '#2ecc71', dashed: true },
  'injects': { color: '#27ae60', dashed: true },
  'emits-event': { color: '#e67e22', dashed: true },
  'listens-event': { color: '#d35400', dashed: true },
  'api-call': { color: '#e74c3c', dashed: true },
  'api-serves': { color: '#8bc34a', dashed: false },
  'api-implements': { color: '#8bc34a', dashed: true },
  'native-call': { color: '#ff7043', dashed: true },
  'route-renders': { color: '#3498db', dashed: false },
  'spring-injects': { color: '#4caf50', dashed: false },
  'mybatis-maps': { color: '#e91e63', dashed: false },
  'reads-table': { color: '#00bcd4', dashed: false },
  'writes-table': { color: '#ff5722', dashed: false },
  'dto-flows': { color: '#9c27b0', dashed: true },
};
