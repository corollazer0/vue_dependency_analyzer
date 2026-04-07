// ─── Node Types ───

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

export interface SourceLocation {
  filePath: string;
  line: number;
  column: number;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  filePath: string;
  metadata: Record<string, unknown>;
  loc?: SourceLocation;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  metadata: Record<string, unknown>;
  loc?: SourceLocation;
}

export interface ParseError {
  filePath: string;
  message: string;
  line?: number;
  severity: 'error' | 'warning';
}

export interface ServiceConfig {
  id: string;
  root: string;
  type: 'vue' | 'spring-boot';
}

export interface AnalysisConfig {
  vueRoot?: string;
  springBootRoot?: string;
  /** MSA: multiple service roots */
  services?: ServiceConfig[];
  aliases?: Record<string, string>;
  apiBaseUrl?: string;
  include?: string[];
  exclude?: string[];
  nativeBridges?: string[];
}

export interface GraphMetadata {
  projectRoot: string;
  analyzedAt: string;
  fileCount: number;
  parseErrors: ParseError[];
  config: AnalysisConfig;
}

export interface ParseResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  errors: ParseError[];
}

export interface FileParser {
  supports(filePath: string): boolean;
  parse(filePath: string, content: string, config: AnalysisConfig): ParseResult;
}

export interface SerializedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}
