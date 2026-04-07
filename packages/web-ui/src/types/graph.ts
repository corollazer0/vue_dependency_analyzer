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
  | 'native-bridge'
  | 'native-method';

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
  | 'native-call'
  | 'route-renders'
  | 'spring-injects';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  filePath: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  metadata: Record<string, unknown>;
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

export const NODE_COLORS: Record<NodeKind, string> = {
  'vue-component': '#42b883',
  'vue-composable': '#35495e',
  'pinia-store': '#ffd859',
  'vue-directive': '#8e44ad',
  'vue-router-route': '#3498db',
  'ts-module': '#3178c6',
  'api-call-site': '#e74c3c',
  'spring-controller': '#6db33f',
  'spring-endpoint': '#8bc34a',
  'spring-service': '#4caf50',
  'native-bridge': '#ff7043',
  'native-method': '#ff9800',
};

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
  'native-bridge': 'Native Bridge',
  'native-method': 'Native Method',
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
  'native-call': { color: '#ff7043', dashed: true },
  'route-renders': { color: '#3498db', dashed: false },
  'spring-injects': { color: '#4caf50', dashed: false },
};
