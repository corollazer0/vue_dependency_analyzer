import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { DtoFlowLinker } from '../DtoFlowLinker.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): DependencyGraph {
  const graph = new DependencyGraph();
  for (const n of nodes) graph.addNode(n);
  for (const e of edges) graph.addEdge(e);
  return graph;
}

describe('DtoFlowLinker', () => {
  const linker = new DtoFlowLinker();

  it('should create dto-flows edges between endpoint and DTO node sharing a type', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-endpoint:GET:/api/users',
          kind: 'spring-endpoint',
          label: 'GET /api/users',
          filePath: '/UserController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/users',
            returnType: 'List<UserResponse>',
            paramTypes: [],
          },
        },
        {
          id: 'spring-service:/dto/UserResponse.java',
          kind: 'spring-service',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [{ name: 'id', type: 'Long' }],
          },
        },
      ],
      [],
    );

    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].kind).toBe('dto-flows');
    expect(newEdges[0].metadata.dtoName).toBe('UserResponse');
  });

  it('should link endpoints with matching DTO param types', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-endpoint:POST:/api/users',
          kind: 'spring-endpoint',
          label: 'POST /api/users',
          filePath: '/UserController.java',
          metadata: {
            httpMethod: 'POST',
            path: '/api/users',
            returnType: 'void',
            paramTypes: ['CreateUserRequest'],
          },
        },
        {
          id: 'spring-service:/dto/CreateUserRequest.java',
          kind: 'spring-service',
          label: 'CreateUserRequest',
          filePath: '/dto/CreateUserRequest.java',
          metadata: {
            className: 'CreateUserRequest',
            isDto: true,
            fields: [{ name: 'name', type: 'String' }],
          },
        },
      ],
      [],
    );

    const newEdges = linker.link(graph);

    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].kind).toBe('dto-flows');
    expect(newEdges[0].metadata.dtoName).toBe('CreateUserRequest');
  });

  it('should not create edges when no DTO types are shared', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-endpoint:GET:/api/health',
          kind: 'spring-endpoint',
          label: 'GET /api/health',
          filePath: '/HealthController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/health',
            returnType: 'String',
            paramTypes: [],
          },
        },
        {
          id: 'spring-service:/dto/UserResponse.java',
          kind: 'spring-service',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [{ name: 'id', type: 'Long' }],
          },
        },
      ],
      [],
    );

    const newEdges = linker.link(graph);
    expect(newEdges).toHaveLength(0);
  });

  it('should create multiple edges when multiple endpoints share DTOs', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-endpoint:GET:/api/users',
          kind: 'spring-endpoint',
          label: 'GET /api/users',
          filePath: '/UserController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/users',
            returnType: 'UserResponse',
            paramTypes: [],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/users/{id}',
          kind: 'spring-endpoint',
          label: 'GET /api/users/{id}',
          filePath: '/UserController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/users/{id}',
            returnType: 'UserResponse',
            paramTypes: [],
          },
        },
        {
          id: 'spring-service:/dto/UserResponse.java',
          kind: 'spring-service',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [{ name: 'id', type: 'Long' }],
          },
        },
      ],
      [],
    );

    const newEdges = linker.link(graph);

    // 3 nodes sharing UserResponse → 3 pairs: (ep1,ep2), (ep1,dto), (ep2,dto)
    expect(newEdges).toHaveLength(3);
    expect(newEdges.every(e => e.kind === 'dto-flows')).toBe(true);
  });
});

describe('DtoFlowLinker.buildFieldChains — 3-tier field linkage', () => {
  const linker = new DtoFlowLinker();

  it('should chain TS interface ↔ DTO ↔ ResultMap ↔ table at field granularity', () => {
    const graph = buildGraph(
      [
        // Backend DTO
        {
          id: 'spring-service:/dto/OrderResponse.java',
          kind: 'spring-service',
          label: 'OrderResponse',
          filePath: '/dto/OrderResponse.java',
          metadata: {
            className: 'OrderResponse',
            isDto: true,
            fields: [
              { name: 'orderId', type: 'Long' },
              { name: 'customerName', type: 'String' },
              { name: 'total', type: 'BigDecimal' },
            ],
          },
        },
        // Frontend TS interface (missing `total`)
        {
          id: 'ts-module:/src/types/order.ts',
          kind: 'ts-module',
          label: 'order',
          filePath: '/src/types/order.ts',
          metadata: {
            interfaces: [{
              name: 'OrderResponse',
              fields: ['orderId', 'customerName', 'orphanFront'],
              fieldTypes: [
                { name: 'orderId', type: 'number', optional: false },
                { name: 'customerName', type: 'string', optional: false },
                { name: 'orphanFront', type: 'string', optional: true },
              ],
            }],
          },
        },
        // MyBatis statement with resultMap mapping
        {
          id: 'mybatis-statement:com.example.mapper.OrderMapper.findById',
          kind: 'mybatis-statement',
          label: 'OrderMapper.findById',
          filePath: '/mapper/OrderMapper.xml',
          metadata: {
            statementType: 'select',
            statementId: 'findById',
            namespace: 'com.example.mapper.OrderMapper',
            resultMapType: 'com.example.dto.OrderResponse',
            resultMapTypeSimple: 'OrderResponse',
            fieldMappings: [
              { property: 'orderId', column: 'order_id', javaType: 'Long' },
              { property: 'customerName', column: 'customer_name' },
              { property: 'total', column: 'total_amount', javaType: 'BigDecimal', jdbcType: 'DECIMAL' },
            ],
          },
        },
        // DB table
        {
          id: 'db-table:orders',
          kind: 'db-table',
          label: 'orders',
          filePath: '/mapper/OrderMapper.xml',
          metadata: { tableName: 'orders' },
        },
      ],
      [
        {
          id: 'stmt:reads-table:orders',
          source: 'mybatis-statement:com.example.mapper.OrderMapper.findById',
          target: 'db-table:orders',
          kind: 'reads-table',
          metadata: { tableName: 'orders' },
        },
      ],
    );

    const chains = linker.buildFieldChains(graph);
    const chain = chains.find(c => c.dtoName === 'OrderResponse')!;
    expect(chain).toBeDefined();
    expect(chain.backendNode?.label).toBe('OrderResponse');
    expect(chain.frontendNode?.id).toBe('ts-module:/src/types/order.ts');
    expect(chain.statementNodes.map(s => s.label)).toContain('OrderMapper.findById');
    expect(chain.tableNodes.map(t => t.label)).toContain('orders');

    // Entries: 3 backend fields + 1 frontend-only leftover
    expect(chain.entries).toHaveLength(4);

    const orderIdEntry = chain.entries.find(e => e.fieldName === 'orderId')!;
    expect(orderIdEntry.backendType).toBe('Long');
    expect(orderIdEntry.frontendType).toBe('number');
    expect(orderIdEntry.column).toBe('order_id');

    const totalEntry = chain.entries.find(e => e.fieldName === 'total')!;
    expect(totalEntry.frontendType).toBeUndefined(); // missing in TS
    expect(totalEntry.column).toBe('total_amount');
    expect(totalEntry.jdbcType).toBe('DECIMAL');

    const orphan = chain.entries.find(e => e.fieldName === 'orphanFront')!;
    expect(orphan.sourceTier).toBe('frontend');
    expect(orphan.backendType).toBeUndefined();
  });

  it('link() emits 3-tier dto-flows edges (frontend↔backend, backend↔mapper) with field entries', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-service:/dto/OrderResponse.java',
          kind: 'spring-service',
          label: 'OrderResponse',
          filePath: '/dto/OrderResponse.java',
          metadata: {
            className: 'OrderResponse',
            isDto: true,
            fields: [
              { name: 'orderId', type: 'Long' },
              { name: 'total', type: 'BigDecimal' },
            ],
          },
        },
        {
          id: 'ts-module:/src/types/order.ts',
          kind: 'ts-module',
          label: 'order',
          filePath: '/src/types/order.ts',
          metadata: {
            interfaces: [{
              name: 'OrderResponse',
              fields: ['orderId'],
              fieldTypes: [{ name: 'orderId', type: 'number', optional: false }],
            }],
          },
        },
        {
          id: 'mybatis-statement:com.example.mapper.OrderMapper.findById',
          kind: 'mybatis-statement',
          label: 'OrderMapper.findById',
          filePath: '/mapper/OrderMapper.xml',
          metadata: {
            statementType: 'select',
            statementId: 'findById',
            namespace: 'com.example.mapper.OrderMapper',
            resultMapType: 'com.example.dto.OrderResponse',
            resultMapTypeSimple: 'OrderResponse',
            fieldMappings: [
              { property: 'orderId', column: 'order_id' },
              { property: 'total', column: 'total_amount' },
            ],
          },
        },
      ],
      [],
    );

    const linker = new DtoFlowLinker();
    const edges = linker.link(graph);
    const chainEdges = edges.filter(e => e.metadata && (e.metadata as any).tier);
    expect(chainEdges.length).toBe(2);
    const frontBack = chainEdges.find(e => (e.metadata as any).tier === 'frontend-backend')!;
    expect(frontBack.source).toBe('ts-module:/src/types/order.ts');
    expect(frontBack.target).toBe('spring-service:/dto/OrderResponse.java');
    expect(Array.isArray((frontBack.metadata as any).entries)).toBe(true);
    expect((frontBack.metadata as any).entries.length).toBe(2);

    const backMap = chainEdges.find(e => (e.metadata as any).tier === 'backend-mapper')!;
    expect(backMap.source).toBe('spring-service:/dto/OrderResponse.java');
    expect(backMap.target).toBe('mybatis-statement:com.example.mapper.OrderMapper.findById');
  });

  it('should emit an empty statements list when no MyBatis mapping exists', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-service:/dto/PingDTO.java',
          kind: 'spring-service',
          label: 'PingDTO',
          filePath: '/dto/PingDTO.java',
          metadata: {
            className: 'PingDTO',
            isDto: true,
            fields: [{ name: 'msg', type: 'String' }],
          },
        },
      ],
      [],
    );

    const chains = linker.buildFieldChains(graph);
    const chain = chains.find(c => c.dtoName === 'PingDTO')!;
    expect(chain.statementNodes).toEqual([]);
    expect(chain.tableNodes).toEqual([]);
    expect(chain.entries).toHaveLength(1);
    expect(chain.entries[0].column).toBeUndefined();
  });
});
