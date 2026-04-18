import type { GraphData, GraphNode, GraphEdge, NodeMetadata, EdgeMetadata } from '@/types/graph';

/**
 * Phase 2-9 — V8 hidden-class stabilization for metadata objects.
 *
 * The server returns nodes/edges with sparse metadata: a Vue component has
 * `emits` + `imports`; a Spring controller has `className` + `basePath`;
 * etc. Each variant produced a different V8 hidden class for the metadata
 * object, forcing every property access (filter checks, template renders,
 * 5K+ times per fetch on large projects) onto a slow polymorphic IC.
 *
 * `normalizeMetadata` rewrites every metadata object so:
 *   1. All known keys are assigned in the same fixed order regardless of
 *      whether the server included them. Absent keys land as `undefined`,
 *      but the *shape* is identical, so V8 collapses every node's metadata
 *      onto a single hidden class.
 *   2. Any key the server sent that isn't in the known list is appended at
 *      the end (forward compat — back-end additions don't break the UI).
 *
 * Two facts make this cheap:
 *   • Run once per fetch, not per render.
 *   • The new object is a fresh allocation, so callers continue to operate
 *     on stable shapes without copy-on-write surprises.
 */

const NODE_META_KEYS: (keyof NodeMetadata)[] = [
  'serviceId',
  'className',
  'basePath',
  'isRepository',
  'isMapper',
  'emits',
  'imports',
  'exportedFunctions',
  'resultType',
  'componentId',
  'eventName',
  'eventClass',
  'virtual',
];

const EDGE_META_KEYS: (keyof EdgeMetadata)[] = [
  'importPath',
  'componentName',
  'storeName',
  'composableName',
  'eventName',
  'confidence',
  'viaDomainMatch',
];

const NODE_KEY_SET = new Set<string>(NODE_META_KEYS as string[]);
const EDGE_KEY_SET = new Set<string>(EDGE_META_KEYS as string[]);

function normalizeNodeMetadata(src: NodeMetadata | undefined): NodeMetadata {
  const out: NodeMetadata = {};
  // Known keys, fixed order
  for (const k of NODE_META_KEYS) {
    out[k] = src ? src[k] : undefined;
  }
  // Trailing unknown keys (forward compat; rare in practice)
  if (src) {
    for (const k of Object.keys(src)) {
      if (!NODE_KEY_SET.has(k)) out[k] = src[k];
    }
  }
  return out;
}

function normalizeEdgeMetadata(src: EdgeMetadata | undefined): EdgeMetadata {
  const out: EdgeMetadata = {};
  for (const k of EDGE_META_KEYS) {
    out[k] = src ? src[k] : undefined;
  }
  if (src) {
    for (const k of Object.keys(src)) {
      if (!EDGE_KEY_SET.has(k)) out[k] = src[k];
    }
  }
  return out;
}

export function normalizeGraphData(data: GraphData): GraphData {
  const nodes: GraphNode[] = new Array(data.nodes.length);
  for (let i = 0; i < data.nodes.length; i++) {
    const n = data.nodes[i];
    nodes[i] = {
      id: n.id,
      kind: n.kind,
      label: n.label,
      filePath: n.filePath,
      metadata: normalizeNodeMetadata(n.metadata),
      loc: n.loc,
    };
  }
  const edges: GraphEdge[] = new Array(data.edges.length);
  for (let i = 0; i < data.edges.length; i++) {
    const e = data.edges[i];
    edges[i] = {
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.kind,
      metadata: normalizeEdgeMetadata(e.metadata),
      loc: e.loc,
    };
  }
  return { nodes, edges, metadata: data.metadata };
}
