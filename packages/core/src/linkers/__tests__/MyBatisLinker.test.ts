import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { MyBatisLinker } from '../MyBatisLinker.js';
import { JavaFileParser } from '../../parsers/java/JavaFileParser.js';
import { MyBatisXmlParser } from '../../parsers/java/MyBatisXmlParser.js';
import type { GraphNode } from '../../graph/types.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function addNode(graph: DependencyGraph, node: Partial<GraphNode> & { id: string; kind: GraphNode['kind'] }) {
  graph.addNode({ label: node.id, filePath: '', metadata: {}, ...node });
}

describe('MyBatisLinker', () => {
  it('should link mapper XML to Java @Mapper interface by FQN', () => {
    const graph = new DependencyGraph();
    addNode(graph, { id: 'mybatis-mapper:com.example.UserMapper', kind: 'mybatis-mapper', metadata: { fqn: 'com.example.UserMapper', namespace: 'com.example.UserMapper' } });
    addNode(graph, { id: 'spring-service:/UserMapper.java', kind: 'spring-service', metadata: { fqn: 'com.example.UserMapper', className: 'UserMapper', isMapper: true } });

    const linker = new MyBatisLinker();
    const edges = linker.link(graph);

    expect(edges).toHaveLength(1);
    expect(edges[0].kind).toBe('spring-injects');
    expect(edges[0].source).toBe('spring-service:/UserMapper.java');
    expect(edges[0].target).toBe('mybatis-mapper:com.example.UserMapper');
  });

  it('should fallback to className matching', () => {
    const graph = new DependencyGraph();
    addNode(graph, { id: 'mybatis-mapper:com.example.OrderMapper', kind: 'mybatis-mapper', metadata: { fqn: 'com.example.OrderMapper' } });
    addNode(graph, { id: 'spring-service:/OrderMapper.java', kind: 'spring-service', metadata: { className: 'OrderMapper' } });

    const linker = new MyBatisLinker();
    const edges = linker.link(graph);
    expect(edges).toHaveLength(1);
  });

  it('should deduplicate db-table nodes', () => {
    const graph = new DependencyGraph();
    // Two different XML files reference the same table
    addNode(graph, { id: 'db-table:users-1', kind: 'db-table', metadata: { tableName: 'users' } });
    addNode(graph, { id: 'db-table:users-2', kind: 'db-table', metadata: { tableName: 'users' } });
    addNode(graph, { id: 'stmt1', kind: 'mybatis-statement' });
    graph.addEdge({ id: 'stmt1:reads:users-1', source: 'stmt1', target: 'db-table:users-1', kind: 'reads-table', metadata: {} });
    graph.addEdge({ id: 'stmt1:reads:users-2', source: 'stmt1', target: 'db-table:users-2', kind: 'reads-table', metadata: {} });

    const linker = new MyBatisLinker();
    linker.link(graph);

    // Should have only one users table node
    const tableNodes = graph.getAllNodes().filter(n => n.kind === 'db-table' && (n.metadata as any).tableName === 'users');
    expect(tableNodes).toHaveLength(1);
  });

  it('should not crash when no mappers exist', () => {
    const graph = new DependencyGraph();
    addNode(graph, { id: 'vue:comp', kind: 'vue-component' });

    const linker = new MyBatisLinker();
    const edges = linker.link(graph);
    expect(edges).toHaveLength(0);
  });

  it('should handle unmatched mappers gracefully', () => {
    const graph = new DependencyGraph();
    addNode(graph, { id: 'mybatis-mapper:com.example.UnknownMapper', kind: 'mybatis-mapper', metadata: { fqn: 'com.example.UnknownMapper' } });

    const linker = new MyBatisLinker();
    const edges = linker.link(graph);
    expect(edges).toHaveLength(0); // No match, no edge, no crash
  });

  it('should link a real parsed Java @Mapper interface to its MyBatis XML', () => {
    const fixturesDir = resolve(import.meta.dirname, '../../__fixtures__');
    const javaParser = new JavaFileParser();
    const xmlParser = new MyBatisXmlParser();

    const javaContent = readFileSync(resolve(fixturesDir, 'UserMapperInterface.java'), 'utf-8');
    const xmlContent = readFileSync(resolve(fixturesDir, 'UserMapper.xml'), 'utf-8');

    const javaResult = javaParser.parse('/test/UserMapperInterface.java', javaContent, {});
    const xmlResult = xmlParser.parse('/test/UserMapper.xml', xmlContent, {});

    const graph = new DependencyGraph();
    for (const node of [...javaResult.nodes, ...xmlResult.nodes]) {
      graph.addNode(node);
    }
    for (const edge of [...javaResult.edges, ...xmlResult.edges]) {
      graph.addEdge(edge);
    }

    const linker = new MyBatisLinker();
    const edges = linker.link(graph);

    const injectEdge = edges.find(
      e => e.kind === 'spring-injects' && e.target.includes('mybatis-mapper'),
    );
    expect(injectEdge).toBeDefined();
    expect(injectEdge!.source).toBe('spring-service:/test/UserMapperInterface.java');
  });
});
