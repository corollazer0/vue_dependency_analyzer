// Phase 1-2 — JSON Schemas for hot routes so Fastify wires up fast-json-stringify.
// Kept intentionally lax (additionalProperties: true on freeform metadata) to avoid
// coupling transport to the core shape; the schema's only job is to make serialization
// branchless on the known properties.

const sourceLocation = {
  type: 'object',
  properties: {
    filePath: { type: 'string' },
    line: { type: 'integer' },
    column: { type: 'integer' },
  },
  required: ['filePath', 'line', 'column'],
  additionalProperties: false,
} as const;

const graphNode = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    kind: { type: 'string' },
    label: { type: 'string' },
    filePath: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
    loc: sourceLocation,
  },
  required: ['id', 'kind', 'label', 'filePath', 'metadata'],
  additionalProperties: false,
} as const;

const graphEdge = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    source: { type: 'string' },
    target: { type: 'string' },
    kind: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
    loc: sourceLocation,
  },
  required: ['id', 'source', 'target', 'kind', 'metadata'],
  additionalProperties: false,
} as const;

const graphMetadata = {
  type: 'object',
  properties: {
    projectRoot: { type: 'string' },
    analyzedAt: { type: 'string' },
    fileCount: { type: 'integer' },
    parseErrors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          message: { type: 'string' },
          line: { type: 'integer' },
          severity: { type: 'string' },
        },
        required: ['filePath', 'message', 'severity'],
        additionalProperties: true,
      },
    },
    config: { type: 'object', additionalProperties: true },
  },
  required: ['projectRoot', 'analyzedAt', 'fileCount', 'parseErrors', 'config'],
  additionalProperties: true,
} as const;

export const serializedGraphSchema = {
  type: 'object',
  properties: {
    nodes: { type: 'array', items: graphNode },
    edges: { type: 'array', items: graphEdge },
    metadata: graphMetadata,
  },
  required: ['nodes', 'edges', 'metadata'],
  additionalProperties: false,
} as const;

export const clusterGraphSchema = {
  type: 'object',
  properties: {
    clusters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          childCount: { type: 'integer' },
          childKinds: { type: 'object', additionalProperties: { type: 'integer' } },
        },
        required: ['id', 'label', 'childCount', 'childKinds'],
        additionalProperties: true,
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          weight: { type: 'integer' },
          kinds: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'source', 'target', 'weight', 'kinds'],
        additionalProperties: true,
      },
    },
  },
  required: ['clusters', 'edges'],
  additionalProperties: true,
} as const;

export const pathsResponseSchema = {
  type: 'object',
  properties: {
    paths: {
      type: 'array',
      items: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    count: { type: 'integer' },
  },
  required: ['paths', 'count'],
  additionalProperties: true,
} as const;

export const overviewSchema = {
  type: 'object',
  properties: {
    global: {
      type: 'object',
      properties: {
        totalNodes: { type: 'integer' },
        totalEdges: { type: 'integer' },
        parseErrorCount: { type: 'integer' },
        analyzedAt: { type: 'string' },
      },
      required: ['totalNodes', 'totalEdges', 'parseErrorCount', 'analyzedAt'],
      additionalProperties: false,
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          root: { type: 'string' },
          nodeCount: { type: 'integer' },
          edgeCount: { type: 'integer' },
          nodesByKind: { type: 'object', additionalProperties: { type: 'integer' } },
          topDirectories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                nodeCount: { type: 'integer' },
              },
              required: ['path', 'nodeCount'],
              additionalProperties: false,
            },
          },
        },
        required: ['id', 'type', 'root', 'nodeCount', 'edgeCount', 'nodesByKind', 'topDirectories'],
        additionalProperties: false,
      },
    },
  },
  required: ['global', 'services'],
  additionalProperties: false,
} as const;

export const errorSchema = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
  additionalProperties: false,
} as const;
