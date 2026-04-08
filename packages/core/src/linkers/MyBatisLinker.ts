import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphEdge } from '../graph/types.js';

export class MyBatisLinker {
  link(graph: DependencyGraph): GraphEdge[] {
    const newEdges: GraphEdge[] = [];

    // Find all mybatis-mapper nodes
    const mapperNodes = graph.getAllNodes().filter(n => n.kind === 'mybatis-mapper');
    // Find all spring-service/spring-controller nodes that could be @Mapper interfaces
    const javaNodes = graph.getAllNodes().filter(n =>
      n.kind === 'spring-service' || n.kind === 'spring-controller'
    );

    for (const mapper of mapperNodes) {
      const fqn = mapper.metadata.fqn as string;
      if (!fqn) continue;

      const className = fqn.split('.').pop() || '';

      // Match by FQN in metadata (for @Mapper annotated interfaces)
      let matched = javaNodes.find(n => n.metadata.fqn === fqn);

      // Fallback: match by class name
      if (!matched) {
        matched = javaNodes.find(n => n.metadata.className === className);
      }

      // Fallback: match by label
      if (!matched) {
        matched = javaNodes.find(n => n.label === className);
      }

      if (matched) {
        const edge: GraphEdge = {
          id: `${matched.id}:spring-injects:${mapper.id}`,
          source: matched.id,
          target: mapper.id,
          kind: 'spring-injects',
          metadata: { viaMyBatis: true },
        };
        newEdges.push(edge);
        graph.addEdge(edge);
      }
    }

    // Deduplicate db-table nodes (same table from different XML files)
    const tableNodes = graph.getAllNodes().filter(n => n.kind === 'db-table');
    const tablsByName = new Map<string, string[]>();
    for (const t of tableNodes) {
      const name = t.metadata.tableName as string;
      if (!tablsByName.has(name)) tablsByName.set(name, []);
      tablsByName.get(name)!.push(t.id);
    }

    // Merge duplicate table nodes
    for (const [, ids] of tablsByName) {
      if (ids.length <= 1) continue;
      const primary = ids[0];
      for (let i = 1; i < ids.length; i++) {
        // Re-point edges from duplicate to primary
        for (const edge of graph.getInEdges(ids[i])) {
          graph.removeEdge(edge.id);
          graph.addEdge({ ...edge, id: `${edge.source}:${edge.kind}:${primary}`, target: primary });
        }
        for (const edge of graph.getOutEdges(ids[i])) {
          graph.removeEdge(edge.id);
          graph.addEdge({ ...edge, id: `${primary}:${edge.kind}:${edge.target}`, source: primary });
        }
        graph.removeNode(ids[i]);
      }
    }

    return newEdges;
  }
}
