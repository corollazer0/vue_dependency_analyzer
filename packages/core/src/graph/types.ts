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

// ─── Phase 7a-12 — SpringDtoNode interface freeze ───────────────────────
//
// Phase 8 SignatureStore locks onto this exact shape to compute stable
// `fqn#fieldName` ids and detect breaking DTO changes. Add new optional
// fields if you must; never rename or remove these without bumping the
// contract.

export interface SpringDtoField {
  name: string;
  typeRef: string;
  nullable?: boolean;
  jsonName?: string;
}

export interface SpringDtoNodeMetadata {
  fqn: string;
  fields: SpringDtoField[];
  sourceRef: SourceLocation;
  className?: string;
  packageName?: string;
  [key: string]: unknown;
}

export interface SpringDtoNode extends GraphNode {
  kind: 'spring-dto';
  metadata: SpringDtoNodeMetadata;
}

export function isSpringDtoNode(node: GraphNode): node is SpringDtoNode {
  return node.kind === 'spring-dto';
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

export interface ArchitectureRule {
  id?: string;
  type: 'deny-circular' | 'deny-direct' | 'allow-only' | 'max-depth' | 'max-dependents';
  edgeKinds?: EdgeKind[];
  from?: NodeKind | NodeKind[];
  to?: NodeKind | NodeKind[];
  allowed?: NodeKind[];
  value?: number;
  severity?: 'error' | 'warning';
  message?: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleType: string;
  severity: 'error' | 'warning';
  message: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface FeatureSliceConfig {
  /** Stable feature id — used in URL and storage. */
  id: string;
  /** Repo-relative entry file (e.g. `src/pages/Checkout.vue`). */
  entry: string;
  /** Optional human description shown in the UI. */
  description?: string;
  tags?: string[];
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
  rules?: ArchitectureRule[];
  /** Phase 9-1 — F4 Feature Slice declarations. */
  features?: FeatureSliceConfig[];
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
