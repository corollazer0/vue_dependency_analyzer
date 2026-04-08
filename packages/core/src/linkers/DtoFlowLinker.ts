import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphEdge } from '../graph/types.js';

const DTO_SUFFIXES = /(?:DTO|Dto|Request|Response|VO|Summary|Detail)$/;

/**
 * Scan Controller/Service method signatures for DTO type references
 * and create `dto-flows` edges between nodes that share the same DTO class name.
 */
export class DtoFlowLinker {
  link(graph: DependencyGraph): GraphEdge[] {
    const newEdges: GraphEdge[] = [];

    // Collect DTO type references per node
    // Map: dtoName -> Set<nodeId>
    const dtoToNodes = new Map<string, Set<string>>();

    for (const node of graph.getAllNodes()) {
      const dtoNames = new Set<string>();

      if (node.kind === 'spring-endpoint') {
        // Check return type and param types for DTO names
        const returnType = node.metadata.returnType as string | undefined;
        const paramTypes = node.metadata.paramTypes as string[] | undefined;

        if (returnType) {
          const extracted = extractDtoName(returnType);
          if (extracted) dtoNames.add(extracted);
        }
        if (paramTypes) {
          for (const pt of paramTypes) {
            const extracted = extractDtoName(pt);
            if (extracted) dtoNames.add(extracted);
          }
        }
      }

      if (node.kind === 'spring-service' && node.metadata.isDto) {
        dtoNames.add(node.label);
      }

      for (const dtoName of dtoNames) {
        if (!dtoToNodes.has(dtoName)) {
          dtoToNodes.set(dtoName, new Set());
        }
        dtoToNodes.get(dtoName)!.add(node.id);
      }
    }

    // Also check controller nodes: look at their endpoint children for DTO refs
    // and link controllers to DTO service nodes
    for (const [dtoName, nodeIds] of dtoToNodes) {
      const ids = Array.from(nodeIds);
      // Create dto-flows edges between all pairs
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const edgeId = `${ids[i]}:dto-flows:${ids[j]}`;
          // Avoid duplicate edges
          if (graph.getEdge(edgeId)) continue;

          const edge: GraphEdge = {
            id: edgeId,
            source: ids[i],
            target: ids[j],
            kind: 'dto-flows',
            metadata: { dtoName },
          };
          newEdges.push(edge);
          graph.addEdge(edge);
        }
      }
    }

    return newEdges;
  }
}

/**
 * Extract a DTO class name from a type string (may include generics like List<UserDTO>).
 * Returns the DTO name if found, or null.
 */
function extractDtoName(type: string): string | null {
  // Check if the type itself is a DTO
  if (DTO_SUFFIXES.test(type)) return type;

  // Check inside generics: e.g. List<UserDTO> → UserDTO
  const genericMatch = type.match(/<(\w+)>/);
  if (genericMatch && DTO_SUFFIXES.test(genericMatch[1])) {
    return genericMatch[1];
  }

  return null;
}
