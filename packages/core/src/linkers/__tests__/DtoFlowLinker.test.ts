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
