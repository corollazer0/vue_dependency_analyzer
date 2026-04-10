import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode } from '../graph/types.js';

export interface FieldDetail {
  name: string;
  backendType?: string;
  frontendType?: string;
  optional: boolean;
  severity: 'critical' | 'warning' | 'info';
  issue: 'missing-frontend' | 'missing-backend' | 'type-mismatch' | 'match';
}

export interface DtoMismatch {
  endpointPath: string;
  backendDto: string;
  backendFields: string[];
  frontendInterface?: string;
  frontendFields?: string[];
  missingInFrontend: string[];
  missingInBackend: string[];
  fieldDetails: FieldDetail[];
}

const DTO_SUFFIXES = /(?:DTO|Dto|Request|Response|VO|Summary|Detail)$/;

// Java → TypeScript type compatibility map
const JAVA_TO_TS_MAP: Record<string, string[]> = {
  'String': ['string'],
  'Long': ['number'],
  'long': ['number'],
  'Integer': ['number'],
  'int': ['number'],
  'Double': ['number'],
  'double': ['number'],
  'Float': ['number'],
  'float': ['number'],
  'BigDecimal': ['number', 'string'],
  'Boolean': ['boolean'],
  'boolean': ['boolean'],
  'LocalDateTime': ['string', 'Date'],
  'LocalDate': ['string', 'Date'],
  'Instant': ['string', 'number'],
  'Date': ['string', 'Date'],
};

function areTypesCompatible(javaType: string, tsType: string): boolean {
  // Strip generics: List<X> → X[], Map<K,V> → Record<K,V>
  const baseJava = javaType.replace(/^List<(.+)>$/, '$1').replace(/^Set<(.+)>$/, '$1');
  const baseTs = tsType.replace(/\[\]$/, '').replace(/^Array<(.+)>$/, '$1');

  const compatible = JAVA_TO_TS_MAP[baseJava];
  if (compatible) return compatible.includes(baseTs);

  // Fallback: same name (custom DTO types)
  return baseJava === baseTs;
}

/**
 * For each API endpoint that is linked to a frontend API call:
 *   - Find the backend DTO (from controller return type / parameter type)
 *   - Find matching frontend TypeScript interface (by name)
 *   - Compare field names
 *   - Report mismatches
 */
export function checkDtoConsistency(graph: DependencyGraph): DtoMismatch[] {
  const mismatches: DtoMismatch[] = [];

  // Build a map of DTO name -> fields (with types) from spring-service nodes marked as DTOs
  const dtoFieldMap = new Map<string, { name: string; type: string }[]>();
  for (const node of graph.getAllNodes()) {
    if (node.kind === 'spring-service' && node.metadata.isDto) {
      const fields = node.metadata.fields as { name: string; type: string }[] | undefined;
      if (fields) {
        dtoFieldMap.set(node.label, fields);
      }
    }
  }

  // Build maps of TypeScript interface name -> field info from ts-module / vue-component nodes
  const tsInterfaceMap = new Map<string, string[]>();
  const tsFieldTypeMap = new Map<string, { name: string; type: string; optional: boolean }[]>();
  for (const node of graph.getAllNodes()) {
    if (node.kind === 'ts-module' || node.kind === 'vue-component') {
      const interfaces = node.metadata.interfaces as { name: string; fields: string[]; fieldTypes?: { name: string; type: string; optional: boolean }[] }[] | undefined;
      if (interfaces) {
        for (const iface of interfaces) {
          tsInterfaceMap.set(iface.name, iface.fields);
          if (iface.fieldTypes) tsFieldTypeMap.set(iface.name, iface.fieldTypes);
        }
      }
      const exportedTypes = node.metadata.exportedTypes as { name: string; fields: string[]; fieldTypes?: { name: string; type: string; optional: boolean }[] }[] | undefined;
      if (exportedTypes) {
        for (const t of exportedTypes) {
          tsInterfaceMap.set(t.name, t.fields);
          if (t.fieldTypes) tsFieldTypeMap.set(t.name, t.fieldTypes);
        }
      }
    }
  }

  // Find unique API endpoints that are linked to frontend API call sites
  const apiCallEdges = graph.getAllEdges().filter(e => e.kind === 'api-call');
  const seenPairs = new Set<string>(); // "endpointPath|dtoName" dedup key

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
      // Dedup: skip if this (endpointPath, dtoName) pair was already reported
      const dedupKey = `${endpointPath}|${dtoName}`;
      if (seenPairs.has(dedupKey)) continue;
      seenPairs.add(dedupKey);

      const backendFieldsTyped = dtoFieldMap.get(dtoName);
      if (!backendFieldsTyped) continue; // no parsed DTO definition
      const backendFields = backendFieldsTyped.map(f => f.name);

      // Try to find matching frontend interface by name
      const frontendFields = tsInterfaceMap.get(dtoName);
      const frontendFieldTypes = tsFieldTypeMap.get(dtoName);

      if (frontendFields) {
        const missingInFrontend = backendFields.filter(f => !frontendFields.includes(f));
        const missingInBackend = frontendFields.filter(f => !backendFields.includes(f));

        // Build field details
        const fieldDetails: FieldDetail[] = [];
        for (const bf of backendFieldsTyped) {
          const ft = frontendFieldTypes?.find(f => f.name === bf.name);
          if (!ft) {
            fieldDetails.push({ name: bf.name, backendType: bf.type, severity: 'critical', issue: 'missing-frontend', optional: false });
          } else {
            const compatible = areTypesCompatible(bf.type, ft.type);
            if (!compatible) {
              fieldDetails.push({ name: bf.name, backendType: bf.type, frontendType: ft.type, severity: 'warning', issue: 'type-mismatch', optional: ft.optional });
            }
          }
        }
        for (const ff of (frontendFieldTypes || [])) {
          if (!backendFieldsTyped.find(bf => bf.name === ff.name)) {
            fieldDetails.push({ name: ff.name, frontendType: ff.type, severity: ff.optional ? 'info' : 'warning', issue: 'missing-backend', optional: ff.optional });
          }
        }

        if (missingInFrontend.length > 0 || missingInBackend.length > 0 || fieldDetails.some(d => d.issue === 'type-mismatch')) {
          mismatches.push({
            endpointPath,
            backendDto: dtoName,
            backendFields,
            frontendInterface: dtoName,
            frontendFields,
            missingInFrontend,
            missingInBackend,
            fieldDetails,
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
          fieldDetails: backendFieldsTyped.map(f => ({
            name: f.name, backendType: f.type, severity: 'critical' as const, issue: 'missing-frontend' as const, optional: false,
          })),
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
