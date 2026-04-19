import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode } from '../graph/types.js';

export type DtoFieldIssue =
  | 'missing-frontend'
  | 'missing-backend'
  | 'missing-db'
  | 'type-mismatch'
  | 'nullable-mismatch'
  | 'match';

export interface FieldDetail {
  name: string;
  backendType?: string;
  frontendType?: string;
  column?: string;
  jdbcType?: string;
  optional: boolean;
  backendNullable?: boolean;
  severity: 'critical' | 'warning' | 'info';
  issue: DtoFieldIssue;
}

export interface SourceRef {
  filePath: string;
  line?: number;
  label?: string;
}

export interface DtoMismatch {
  endpointPath: string;
  backendDto: string;
  backendFields: string[];
  frontendInterface?: string;
  frontendFields?: string[];
  missingInFrontend: string[];
  missingInBackend: string[];
  missingInDb: string[];
  nullableMismatches: string[];
  fieldDetails: FieldDetail[];
  backendSource?: SourceRef;
  frontendSource?: SourceRef;
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

interface BackendField {
  name: string;
  type: string;
  nullable?: boolean;
  jsonName?: string;
}

interface FrontendField {
  name: string;
  type: string;
  optional: boolean;
}

interface TsInterface {
  name: string;
  fields: string[];
  fieldTypes?: FrontendField[];
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

  // Build a map of DTO name -> fields (with types) from spring-dto nodes
  // (Phase 7a-2 — DTOs are now first-class instead of spring-service+isDto).
  const dtoFieldMap = new Map<string, BackendField[]>();
  const dtoNodeMap = new Map<string, GraphNode>();
  for (const node of graph.getAllNodes()) {
    if (node.kind === 'spring-dto') {
      const fields = node.metadata.fields as BackendField[] | undefined;
      if (fields) {
        dtoFieldMap.set(node.label, fields);
        dtoNodeMap.set(node.label, node);
      }
    }
  }

  // Build maps of TypeScript interface name -> field info from ts-module / vue-component nodes
  const tsInterfaceMap = new Map<string, string[]>();
  const tsFieldTypeMap = new Map<string, FrontendField[]>();
  const tsNodeMap = new Map<string, GraphNode>();
  for (const node of graph.getAllNodes()) {
    if (node.kind === 'ts-module' || node.kind === 'vue-component') {
      const interfaces = node.metadata.interfaces as TsInterface[] | undefined;
      if (interfaces) {
        for (const iface of interfaces) {
          tsInterfaceMap.set(iface.name, iface.fields);
          if (iface.fieldTypes) tsFieldTypeMap.set(iface.name, iface.fieldTypes);
          if (!tsNodeMap.has(iface.name)) tsNodeMap.set(iface.name, node);
        }
      }
      const exportedTypes = node.metadata.exportedTypes as TsInterface[] | undefined;
      if (exportedTypes) {
        for (const t of exportedTypes) {
          tsInterfaceMap.set(t.name, t.fields);
          if (t.fieldTypes) tsFieldTypeMap.set(t.name, t.fieldTypes);
          if (!tsNodeMap.has(t.name)) tsNodeMap.set(t.name, node);
        }
      }
    }
  }

  // Build DTO name → (column mappings, statement presence) from mybatis-statement nodes
  const dtoColumnMap = new Map<string, Map<string, { column: string; javaType?: string; jdbcType?: string }>>();
  const dtoHasStatement = new Set<string>();
  for (const node of graph.getAllNodes()) {
    if (node.kind !== 'mybatis-statement') continue;
    const simple = node.metadata.resultMapTypeSimple as string | undefined;
    const paramSimple = node.metadata.parameterTypeSimple as string | undefined;
    const fm = node.metadata.fieldMappings as Array<{ property: string; column: string; javaType?: string; jdbcType?: string }> | undefined;
    for (const name of [simple, paramSimple]) {
      if (!name) continue;
      dtoHasStatement.add(name);
      if (!fm) continue;
      if (!dtoColumnMap.has(name)) dtoColumnMap.set(name, new Map());
      const target = dtoColumnMap.get(name)!;
      for (const m of fm) {
        const existing = target.get(m.property);
        if (!existing || (m.javaType && !existing.javaType) || (m.jdbcType && !existing.jdbcType)) {
          target.set(m.property, { column: m.column, javaType: m.javaType, jdbcType: m.jdbcType });
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
      const backendNode = dtoNodeMap.get(dtoName);
      const backendFields = backendFieldsTyped.map(f => f.name);

      // Try to find matching frontend interface by name
      const frontendFields = tsInterfaceMap.get(dtoName);
      const frontendFieldTypes = tsFieldTypeMap.get(dtoName);
      const frontendNode = tsNodeMap.get(dtoName);

      const columnMappings = dtoColumnMap.get(dtoName);
      const hasStatement = dtoHasStatement.has(dtoName);

      const backendSource: SourceRef | undefined = backendNode
        ? { filePath: backendNode.filePath, line: backendNode.loc?.line, label: backendNode.label }
        : undefined;
      const frontendSource: SourceRef | undefined = frontendNode
        ? { filePath: frontendNode.filePath, line: frontendNode.loc?.line, label: dtoName }
        : undefined;

      if (frontendFields) {
        const missingInFrontend = backendFieldsTyped
          .filter(bf => !frontendFields.includes(bf.jsonName || bf.name))
          .map(bf => bf.name);
        const missingInBackend = frontendFields.filter(f => !backendFieldsTyped.some(bf => (bf.jsonName || bf.name) === f));

        // Build field details
        const fieldDetails: FieldDetail[] = [];
        const nullableMismatches: string[] = [];
        const missingInDb: string[] = [];

        for (const bf of backendFieldsTyped) {
          const lookup = bf.jsonName || bf.name;
          const ft = frontendFieldTypes?.find(f => f.name === lookup);
          const mapping = columnMappings?.get(bf.name);

          if (!ft) {
            fieldDetails.push({
              name: bf.name, backendType: bf.type, optional: false,
              backendNullable: bf.nullable, column: mapping?.column, jdbcType: mapping?.jdbcType,
              severity: 'critical', issue: 'missing-frontend',
            });
          } else {
            const compatible = areTypesCompatible(bf.type, ft.type);
            if (!compatible) {
              fieldDetails.push({
                name: bf.name, backendType: bf.type, frontendType: ft.type, optional: ft.optional,
                backendNullable: bf.nullable, column: mapping?.column, jdbcType: mapping?.jdbcType,
                severity: 'warning', issue: 'type-mismatch',
              });
            } else if (bf.nullable !== undefined && bf.nullable !== ft.optional) {
              fieldDetails.push({
                name: bf.name, backendType: bf.type, frontendType: ft.type, optional: ft.optional,
                backendNullable: bf.nullable, column: mapping?.column, jdbcType: mapping?.jdbcType,
                severity: 'warning', issue: 'nullable-mismatch',
              });
              nullableMismatches.push(bf.name);
            }
          }

          if (hasStatement && !mapping) {
            fieldDetails.push({
              name: bf.name, backendType: bf.type, optional: false,
              backendNullable: bf.nullable,
              severity: 'warning', issue: 'missing-db',
            });
            missingInDb.push(bf.name);
          }
        }
        for (const ff of (frontendFieldTypes || [])) {
          if (!backendFieldsTyped.find(bf => (bf.jsonName || bf.name) === ff.name)) {
            fieldDetails.push({
              name: ff.name, frontendType: ff.type, optional: ff.optional,
              severity: ff.optional ? 'info' : 'warning', issue: 'missing-backend',
            });
          }
        }

        const hasIssue = missingInFrontend.length > 0
          || missingInBackend.length > 0
          || missingInDb.length > 0
          || nullableMismatches.length > 0
          || fieldDetails.some(d => d.issue === 'type-mismatch' || d.issue === 'nullable-mismatch' || d.issue === 'missing-db');

        if (hasIssue) {
          mismatches.push({
            endpointPath,
            backendDto: dtoName,
            backendFields,
            frontendInterface: dtoName,
            frontendFields,
            missingInFrontend,
            missingInBackend,
            missingInDb,
            nullableMismatches,
            fieldDetails,
            backendSource,
            frontendSource,
          });
        }
      } else {
        // No frontend interface found — report as mismatch with no frontend
        const fieldDetails: FieldDetail[] = backendFieldsTyped.map(f => {
          const mapping = columnMappings?.get(f.name);
          return {
            name: f.name, backendType: f.type, optional: false, backendNullable: f.nullable,
            column: mapping?.column, jdbcType: mapping?.jdbcType,
            severity: 'critical' as const, issue: 'missing-frontend' as const,
          };
        });
        const missingInDb: string[] = hasStatement
          ? backendFieldsTyped.filter(bf => !columnMappings?.get(bf.name)).map(bf => bf.name)
          : [];
        if (missingInDb.length > 0) {
          for (const name of missingInDb) {
            fieldDetails.push({ name, optional: false, severity: 'warning', issue: 'missing-db' });
          }
        }

        mismatches.push({
          endpointPath,
          backendDto: dtoName,
          backendFields,
          frontendInterface: undefined,
          frontendFields: undefined,
          missingInFrontend: backendFields,
          missingInBackend: [],
          missingInDb,
          nullableMismatches: [],
          fieldDetails,
          backendSource,
          frontendSource: undefined,
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
