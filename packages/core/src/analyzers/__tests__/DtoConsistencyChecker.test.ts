import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { checkDtoConsistency } from '../DtoConsistencyChecker.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): DependencyGraph {
  const graph = new DependencyGraph();
  for (const n of nodes) graph.addNode(n);
  for (const e of edges) graph.addEdge(e);
  return graph;
}

describe('DtoConsistencyChecker', () => {
  it('should report mismatches when frontend interface is missing fields', () => {
    const graph = buildGraph(
      [
        // Backend DTO with 4 fields
        {
          id: 'spring-dto:/dto/UserResponse.java',
          kind: 'spring-dto',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [
              { name: 'id', typeRef: 'Long' },
              { name: 'name', typeRef: 'String' },
              { name: 'email', typeRef: 'String' },
              { name: 'createdAt', typeRef: 'String' },
            ],
          },
        },
        // Controller endpoint returning UserResponse
        {
          id: 'spring-endpoint:GET:/api/users',
          kind: 'spring-endpoint',
          label: 'GET /api/users',
          filePath: '/controller/UserController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/users',
            handlerMethod: 'getUsers',
            returnType: 'List<UserResponse>',
            paramTypes: [],
          },
        },
        // Frontend API call site
        {
          id: 'api-call-site:/src/api/users.ts:getUsers',
          kind: 'api-call-site',
          label: 'getUsers',
          filePath: '/src/api/users.ts',
          metadata: { url: '/api/users', httpMethod: 'GET' },
        },
        // Frontend TS module with interface (missing createdAt)
        {
          id: 'ts-module:/src/types/user.ts',
          kind: 'ts-module',
          label: 'user',
          filePath: '/src/types/user.ts',
          metadata: {
            interfaces: [
              { name: 'UserResponse', fields: ['id', 'name', 'email'] },
            ],
          },
        },
      ],
      [
        // api-call edge linking frontend to backend
        {
          id: 'api-call-site:/src/api/users.ts:getUsers:api-call:spring-endpoint:GET:/api/users',
          source: 'api-call-site:/src/api/users.ts:getUsers',
          target: 'spring-endpoint:GET:/api/users',
          kind: 'api-call',
          metadata: {},
        },
      ],
    );

    const mismatches = checkDtoConsistency(graph);

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].endpointPath).toBe('/api/users');
    expect(mismatches[0].backendDto).toBe('UserResponse');
    expect(mismatches[0].missingInFrontend).toEqual(['createdAt']);
    expect(mismatches[0].missingInBackend).toEqual([]);
  });

  it('should report fields missing in backend', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/UserResponse.java',
          kind: 'spring-dto',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [
              { name: 'id', typeRef: 'Long' },
              { name: 'name', typeRef: 'String' },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/users/{id}',
          kind: 'spring-endpoint',
          label: 'GET /api/users/{id}',
          filePath: '/controller/UserController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/users/{id}',
            handlerMethod: 'getUser',
            returnType: 'UserResponse',
            paramTypes: [],
          },
        },
        {
          id: 'api-call-site:/src/api.ts:getUser',
          kind: 'api-call-site',
          label: 'getUser',
          filePath: '/src/api.ts',
          metadata: { url: '/api/users/1', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types.ts',
          kind: 'ts-module',
          label: 'types',
          filePath: '/src/types.ts',
          metadata: {
            interfaces: [
              { name: 'UserResponse', fields: ['id', 'name', 'email', 'avatar'] },
            ],
          },
        },
      ],
      [
        {
          id: 'api-call',
          source: 'api-call-site:/src/api.ts:getUser',
          target: 'spring-endpoint:GET:/api/users/{id}',
          kind: 'api-call',
          metadata: {},
        },
      ],
    );

    const mismatches = checkDtoConsistency(graph);

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].missingInFrontend).toEqual([]);
    expect(mismatches[0].missingInBackend).toEqual(['email', 'avatar']);
  });

  it('should report no mismatches when fields match', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/UserResponse.java',
          kind: 'spring-dto',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [
              { name: 'id', typeRef: 'Long' },
              { name: 'name', typeRef: 'String' },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/users',
          kind: 'spring-endpoint',
          label: 'GET /api/users',
          filePath: '/controller/UserController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/users',
            returnType: 'UserResponse',
            paramTypes: [],
          },
        },
        {
          id: 'api-call-site:/src/api.ts:get',
          kind: 'api-call-site',
          label: 'get',
          filePath: '/src/api.ts',
          metadata: { url: '/api/users', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types.ts',
          kind: 'ts-module',
          label: 'types',
          filePath: '/src/types.ts',
          metadata: {
            interfaces: [
              { name: 'UserResponse', fields: ['id', 'name'] },
            ],
          },
        },
      ],
      [
        {
          id: 'api-call',
          source: 'api-call-site:/src/api.ts:get',
          target: 'spring-endpoint:GET:/api/users',
          kind: 'api-call',
          metadata: {},
        },
      ],
    );

    const mismatches = checkDtoConsistency(graph);
    expect(mismatches).toHaveLength(0);
  });

  it('should dedup by (endpointPath, dtoName) when multiple call sites hit the same endpoint', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/UserResponse.java',
          kind: 'spring-dto',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [
              { name: 'id', typeRef: 'Long' },
              { name: 'name', typeRef: 'String' },
              { name: 'secret', typeRef: 'String' },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/users',
          kind: 'spring-endpoint',
          label: 'GET /api/users',
          filePath: '/controller/UserController.java',
          metadata: { httpMethod: 'GET', path: '/api/users', returnType: 'UserResponse', paramTypes: [] },
        },
        // Two separate frontend call sites hitting the same endpoint
        {
          id: 'api-call-site:/src/pageA.ts:10',
          kind: 'api-call-site',
          label: 'GET /api/users',
          filePath: '/src/pageA.ts',
          metadata: { url: '/api/users', httpMethod: 'GET' },
        },
        {
          id: 'api-call-site:/src/pageB.ts:20',
          kind: 'api-call-site',
          label: 'GET /api/users',
          filePath: '/src/pageB.ts',
          metadata: { url: '/api/users', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types.ts',
          kind: 'ts-module',
          label: 'types',
          filePath: '/src/types.ts',
          metadata: {
            interfaces: [{ name: 'UserResponse', fields: ['id', 'name'] }],
          },
        },
      ],
      [
        {
          id: 'api-call-1',
          source: 'api-call-site:/src/pageA.ts:10',
          target: 'spring-endpoint:GET:/api/users',
          kind: 'api-call',
          metadata: {},
        },
        {
          id: 'api-call-2',
          source: 'api-call-site:/src/pageB.ts:20',
          target: 'spring-endpoint:GET:/api/users',
          kind: 'api-call',
          metadata: {},
        },
      ],
    );

    const mismatches = checkDtoConsistency(graph);

    // Should be 1, not 2 — dedup by (endpointPath, dtoName)
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].endpointPath).toBe('/api/users');
    expect(mismatches[0].backendDto).toBe('UserResponse');
    expect(mismatches[0].missingInFrontend).toEqual(['secret']);
  });

  it('should include fieldDetails with type info and severity', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/ItemDTO.java',
          kind: 'spring-dto',
          label: 'ItemDTO',
          filePath: '/dto/ItemDTO.java',
          metadata: {
            className: 'ItemDTO',
            isDto: true,
            fields: [
              { name: 'id', typeRef: 'Long' },
              { name: 'price', typeRef: 'BigDecimal' },
              { name: 'secret', typeRef: 'String' },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/items',
          kind: 'spring-endpoint',
          label: 'GET /api/items',
          filePath: '/controller/ItemController.java',
          metadata: { httpMethod: 'GET', path: '/api/items', returnType: 'ItemDTO', paramTypes: [] },
        },
        {
          id: 'api-call-site:/src/api.ts:1',
          kind: 'api-call-site',
          label: 'getItems',
          filePath: '/src/api.ts',
          metadata: { url: '/api/items', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types.ts',
          kind: 'ts-module',
          label: 'types',
          filePath: '/src/types.ts',
          metadata: {
            interfaces: [{
              name: 'ItemDTO',
              fields: ['id', 'price', 'extraField'],
              fieldTypes: [
                { name: 'id', type: 'number', optional: false },
                { name: 'price', type: 'string', optional: false },
                { name: 'extraField', type: 'string', optional: true },
              ],
            }],
          },
        },
      ],
      [
        {
          id: 'api-call',
          source: 'api-call-site:/src/api.ts:1',
          target: 'spring-endpoint:GET:/api/items',
          kind: 'api-call',
          metadata: {},
        },
      ],
    );

    const mismatches = checkDtoConsistency(graph);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].fieldDetails).toBeDefined();
    expect(mismatches[0].fieldDetails.length).toBeGreaterThan(0);

    // 'secret' missing in frontend → critical
    const secretDetail = mismatches[0].fieldDetails.find(d => d.name === 'secret');
    expect(secretDetail).toBeDefined();
    expect(secretDetail!.issue).toBe('missing-frontend');
    expect(secretDetail!.severity).toBe('critical');

    // 'extraField' missing in backend, optional → info
    const extraDetail = mismatches[0].fieldDetails.find(d => d.name === 'extraField');
    expect(extraDetail).toBeDefined();
    expect(extraDetail!.issue).toBe('missing-backend');
    expect(extraDetail!.severity).toBe('info');

    // 'price' type mismatch: BigDecimal vs string → compatible (BigDecimal maps to number|string)
    // So price should NOT appear in fieldDetails as type-mismatch since string is compatible
    const priceDetail = mismatches[0].fieldDetails.find(d => d.name === 'price');
    expect(priceDetail).toBeUndefined();
  });

  it('should flag nullable mismatch when backend declares non-null but frontend is optional', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/UserResponse.java',
          kind: 'spring-dto',
          label: 'UserResponse',
          filePath: '/dto/UserResponse.java',
          metadata: {
            className: 'UserResponse',
            isDto: true,
            fields: [
              { name: 'id', typeRef: 'Long', nullable: false },
              { name: 'email', typeRef: 'String', nullable: true },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/users',
          kind: 'spring-endpoint',
          label: 'GET /api/users',
          filePath: '/controller/UserController.java',
          metadata: { httpMethod: 'GET', path: '/api/users', returnType: 'UserResponse', paramTypes: [] },
        },
        {
          id: 'api-call-site:/src/api.ts:1',
          kind: 'api-call-site',
          label: 'getUsers',
          filePath: '/src/api.ts',
          metadata: { url: '/api/users', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types.ts',
          kind: 'ts-module',
          label: 'types',
          filePath: '/src/types.ts',
          metadata: {
            interfaces: [{
              name: 'UserResponse',
              fields: ['id', 'email'],
              fieldTypes: [
                { name: 'id', type: 'number', optional: true },   // backend non-null, front optional
                { name: 'email', type: 'string', optional: false }, // backend nullable, front required
              ],
            }],
          },
        },
      ],
      [{
        id: 'api-call',
        source: 'api-call-site:/src/api.ts:1',
        target: 'spring-endpoint:GET:/api/users',
        kind: 'api-call',
        metadata: {},
      }],
    );

    const mismatches = checkDtoConsistency(graph);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].nullableMismatches.sort()).toEqual(['email', 'id']);

    const idDetail = mismatches[0].fieldDetails.find(d => d.name === 'id');
    expect(idDetail?.issue).toBe('nullable-mismatch');
    expect(idDetail?.backendNullable).toBe(false);
    expect(idDetail?.optional).toBe(true);
  });

  it('should flag missing DB column when a mapper statement targets the DTO but omits the field', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/OrderResponse.java',
          kind: 'spring-dto',
          label: 'OrderResponse',
          filePath: '/dto/OrderResponse.java',
          metadata: {
            className: 'OrderResponse',
            isDto: true,
            fields: [
              { name: 'orderId', typeRef: 'Long' },
              { name: 'customerName', typeRef: 'String' },
              { name: 'ghost', typeRef: 'String' },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/orders',
          kind: 'spring-endpoint',
          label: 'GET /api/orders',
          filePath: '/controller/OrderController.java',
          metadata: { httpMethod: 'GET', path: '/api/orders', returnType: 'OrderResponse', paramTypes: [] },
        },
        {
          id: 'api-call-site:/src/api.ts:orders',
          kind: 'api-call-site',
          label: 'getOrders',
          filePath: '/src/api.ts',
          metadata: { url: '/api/orders', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types/order.ts',
          kind: 'ts-module',
          label: 'order',
          filePath: '/src/types/order.ts',
          metadata: {
            interfaces: [{
              name: 'OrderResponse',
              fields: ['orderId', 'customerName', 'ghost'],
              fieldTypes: [
                { name: 'orderId', type: 'number', optional: false },
                { name: 'customerName', type: 'string', optional: false },
                { name: 'ghost', type: 'string', optional: false },
              ],
            }],
          },
        },
        {
          id: 'mybatis-statement:OrderMapper.findAll',
          kind: 'mybatis-statement',
          label: 'OrderMapper.findAll',
          filePath: '/mapper/OrderMapper.xml',
          metadata: {
            statementType: 'select',
            statementId: 'findAll',
            namespace: 'com.example.mapper.OrderMapper',
            resultMapType: 'com.example.dto.OrderResponse',
            resultMapTypeSimple: 'OrderResponse',
            fieldMappings: [
              { property: 'orderId', column: 'order_id' },
              { property: 'customerName', column: 'customer_name' },
            ],
          },
        },
      ],
      [{
        id: 'api-call',
        source: 'api-call-site:/src/api.ts:orders',
        target: 'spring-endpoint:GET:/api/orders',
        kind: 'api-call',
        metadata: {},
      }],
    );

    const mismatches = checkDtoConsistency(graph);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].missingInDb).toEqual(['ghost']);

    const ghostDetail = mismatches[0].fieldDetails.find(d => d.name === 'ghost' && d.issue === 'missing-db');
    expect(ghostDetail).toBeDefined();
    expect(ghostDetail?.severity).toBe('warning');
  });

  it('should populate source refs from backend and frontend nodes', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/ItemDTO.java',
          kind: 'spring-dto',
          label: 'ItemDTO',
          filePath: '/dto/ItemDTO.java',
          loc: { filePath: '/dto/ItemDTO.java', line: 7, column: 0 },
          metadata: {
            className: 'ItemDTO',
            isDto: true,
            fields: [{ name: 'id', typeRef: 'Long' }, { name: 'extra', typeRef: 'String' }],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/items',
          kind: 'spring-endpoint',
          label: 'GET /api/items',
          filePath: '/controller/ItemController.java',
          metadata: { httpMethod: 'GET', path: '/api/items', returnType: 'ItemDTO', paramTypes: [] },
        },
        {
          id: 'api-call-site:/src/api.ts:items',
          kind: 'api-call-site',
          label: 'getItems',
          filePath: '/src/api.ts',
          metadata: { url: '/api/items', httpMethod: 'GET' },
        },
        {
          id: 'ts-module:/src/types/item.ts',
          kind: 'ts-module',
          label: 'item',
          filePath: '/src/types/item.ts',
          metadata: {
            interfaces: [{ name: 'ItemDTO', fields: ['id'], fieldTypes: [{ name: 'id', type: 'number', optional: false }] }],
          },
        },
      ],
      [{
        id: 'api-call',
        source: 'api-call-site:/src/api.ts:items',
        target: 'spring-endpoint:GET:/api/items',
        kind: 'api-call',
        metadata: {},
      }],
    );

    const mismatches = checkDtoConsistency(graph);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].backendSource?.filePath).toBe('/dto/ItemDTO.java');
    expect(mismatches[0].backendSource?.line).toBe(7);
    expect(mismatches[0].frontendSource?.filePath).toBe('/src/types/item.ts');
  });

  it('should report when no frontend interface exists', () => {
    const graph = buildGraph(
      [
        {
          id: 'spring-dto:/dto/OrderDTO.java',
          kind: 'spring-dto',
          label: 'OrderDTO',
          filePath: '/dto/OrderDTO.java',
          metadata: {
            className: 'OrderDTO',
            isDto: true,
            fields: [
              { name: 'orderId', typeRef: 'Long' },
              { name: 'total', typeRef: 'BigDecimal' },
            ],
          },
        },
        {
          id: 'spring-endpoint:GET:/api/orders',
          kind: 'spring-endpoint',
          label: 'GET /api/orders',
          filePath: '/controller/OrderController.java',
          metadata: {
            httpMethod: 'GET',
            path: '/api/orders',
            returnType: 'OrderDTO',
            paramTypes: [],
          },
        },
        {
          id: 'api-call-site:/src/api.ts:getOrders',
          kind: 'api-call-site',
          label: 'getOrders',
          filePath: '/src/api.ts',
          metadata: { url: '/api/orders', httpMethod: 'GET' },
        },
      ],
      [
        {
          id: 'api-call',
          source: 'api-call-site:/src/api.ts:getOrders',
          target: 'spring-endpoint:GET:/api/orders',
          kind: 'api-call',
          metadata: {},
        },
      ],
    );

    const mismatches = checkDtoConsistency(graph);

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].backendDto).toBe('OrderDTO');
    expect(mismatches[0].frontendInterface).toBeUndefined();
    expect(mismatches[0].missingInFrontend).toEqual(['orderId', 'total']);
  });
});
