import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode } from '../graph/types.js';

export interface DtoMismatch {
  endpointPath: string;
  backendDto: string;
  backendFields: string[];
  frontendInterface?: string;
  frontendFields?: string[];
  missingInFrontend: string[];
  missingInBackend: string[];
}

const DTO_SUFFIXES = /(?:DTO|Dto|Request|Response|VO|Summary|Detail)$/;

/**
 * For each API endpoint that is linked to a frontend API call:
 *   - Find the backend DTO (from controller return type / parameter type)
 *   - Find matching frontend TypeScript interface (by name)
 *   - Compare field names
 *   - Report mismatches
 */
export function checkDtoConsistency(graph: DependencyGraph): DtoMismatch[] {
  const mismatches: DtoMismatch[] = [];

  // Build a map of DTO name -> fields from spring-service nodes marked as DTOs
  const dtoFieldMap = new Map<string, string[]>();
  for (const node of graph.getAllNodes()) {
    if (node.kind === 'spring-service' && node.metadata.isDto) {
      const fields = node.metadata.fields as { name: string; type: string }[] | undefined;
      if (fields) {
        dtoFieldMap.set(node.label, fields.map(f => f.name));
      }
    }
  }

  // Build a map of TypeScript interface name -> field names from ts-module / vue-component nodes
  const tsInterfaceMap = new Map<string, string[]>();
  for (const node of graph.getAllNodes()) {
    if (node.kind === 'ts-module' || node.kind === 'vue-component') {
      const interfaces = node.metadata.interfaces as { name: string; fields: string[] }[] | undefined;
      if (interfaces) {
        for (const iface of interfaces) {
          tsInterfaceMap.set(iface.name, iface.fields);
        }
      }
      // Also check exported types/interfaces stored in metadata
      const exportedTypes = node.metadata.exportedTypes as { name: string; fields: string[] }[] | undefined;
      if (exportedTypes) {
        for (const t of exportedTypes) {
          tsInterfaceMap.set(t.name, t.fields);
        }
      }
    }
  }

  // Find API endpoints that are linked to frontend API call sites
  const apiCallEdges = graph.getAllEdges().filter(e => e.kind === 'api-call');

  for (const edge of apiCallEdges) {
    const endpointNode = graph.getNode(edge.target);
    if (!endpointNode || endpointNode.kind !== 'spring-endpoint') continue;

    const endpointPath = endpointNode.metadata.path as string;
    const returnType = endpointNode.metadata.returnType as string | undefined;
    const paramTypes = endpointNode.metadata.paramTypes as string[] | undefined;

    // Collect DTO names from this endpoint
    const dtoNames: string[] = [];
    if (returnType) {
      const name = extractDtoNameFromType(returnType);
      if (name) dtoNames.push(name);
    }
    if (paramTypes) {
      for (const pt of paramTypes) {
        const name = extractDtoNameFromType(pt);
        if (name) dtoNames.push(name);
      }
    }

    for (const dtoName of dtoNames) {
      const backendFields = dtoFieldMap.get(dtoName);
      if (!backendFields) continue; // no parsed DTO definition

      // Try to find matching frontend interface by name
      const frontendFields = tsInterfaceMap.get(dtoName);

      if (frontendFields) {
        const missingInFrontend = backendFields.filter(f => !frontendFields.includes(f));
        const missingInBackend = frontendFields.filter(f => !backendFields.includes(f));

        if (missingInFrontend.length > 0 || missingInBackend.length > 0) {
          mismatches.push({
            endpointPath,
            backendDto: dtoName,
            backendFields,
            frontendInterface: dtoName,
            frontendFields,
            missingInFrontend,
            missingInBackend,
          });
        }
      } else {
        // No frontend interface found — report as mismatch with no frontend
        mismatches.push({
          endpointPath,
          backendDto: dtoName,
          backendFields,
          frontendInterface: undefined,
          frontendFields: undefined,
          missingInFrontend: backendFields,
          missingInBackend: [],
        });
      }
    }
  }

  return mismatches;
}

function extractDtoNameFromType(type: string): string | null {
  if (DTO_SUFFIXES.test(type)) return type;
  const genericMatch = type.match(/<(\w+)>/);
  if (genericMatch && DTO_SUFFIXES.test(genericMatch[1])) {
    return genericMatch[1];
  }
  return null;
}
