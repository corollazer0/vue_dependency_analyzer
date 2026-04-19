import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphEdge, GraphNode } from '../graph/types.js';

const DTO_SUFFIXES = /(?:DTO|Dto|Request|Response|VO|Summary|Detail)$/;

export interface DtoFieldChainEntry {
  fieldName: string;                // canonical backend field name
  backendType?: string;
  backendNullable?: boolean;
  jsonName?: string;                // if backend has @JsonProperty override
  frontendType?: string;
  frontendOptional?: boolean;
  column?: string;
  jdbcType?: string;
  mappedJavaType?: string;          // javaType on <result>/<id>
  sourceTier: 'backend' | 'frontend';  // where this field originated from when unmatched
}

export interface DtoFieldChain {
  dtoName: string;
  backendNode?: GraphNode;
  frontendNode?: GraphNode;
  frontendInterface?: string;
  statementNodes: GraphNode[];      // MyBatis statements whose resultMap/param type matches
  tableNodes: GraphNode[];          // db-table nodes reachable from those statements
  entries: DtoFieldChainEntry[];
}

/**
 * Wire DTO-related nodes into a canonical 4-tier chain (Phase 7a-2):
 *
 *   spring-endpoint → spring-dto → mybatis-statement → db-table
 *                            ↑
 *                            ts-module / vue-component (frontend interface)
 *
 * Earlier versions emitted `dto-flows` between any pair of nodes that
 * referenced the same DTO type, which produced noisy
 * `spring-endpoint → spring-endpoint` edges. The all-pairs loop is gone;
 * every emitted edge now has a tier and one well-defined direction.
 */
export class DtoFlowLinker {
  link(graph: DependencyGraph): GraphEdge[] {
    const newEdges: GraphEdge[] = [];

    // Index DTOs by class name (label). Pure DTO nodes are `spring-dto` —
    // legacy `spring-service` + isDto metadata is no longer recognised.
    const dtoByName = new Map<string, GraphNode>();
    for (const node of graph.nodesIter()) {
      if (node.kind === 'spring-dto') dtoByName.set(node.label, node);
    }

    // Tier 1: spring-endpoint → spring-dto for every DTO type referenced
    // on the endpoint signature (return type or any param type).
    for (const node of graph.nodesIter()) {
      if (node.kind !== 'spring-endpoint') continue;
      const dtoNames = new Set<string>();
      const returnType = node.metadata.returnType as string | undefined;
      const paramTypes = node.metadata.paramTypes as string[] | undefined;
      if (returnType) {
        const n = extractDtoName(returnType);
        if (n) dtoNames.add(n);
      }
      if (paramTypes) {
        for (const pt of paramTypes) {
          const n = extractDtoName(pt);
          if (n) dtoNames.add(n);
        }
      }
      for (const dtoName of dtoNames) {
        const dto = dtoByName.get(dtoName);
        if (!dto) continue;
        const edge = this.makeChainEdge(node.id, dto.id, { dtoName, tier: 'endpoint-dto' });
        if (edge && !graph.getEdge(edge.id)) {
          graph.addEdge(edge);
          newEdges.push(edge);
        }
      }
    }

    // Tiers 2 & 3: frontend ts-module/vue-component → spring-dto and
    // spring-dto → mybatis-statement, with field-level metadata.
    const chains = this.buildFieldChains(graph);
    for (const chain of chains) {
      const entriesMeta = chain.entries;

      if (chain.frontendNode && chain.backendNode) {
        const edge = this.makeChainEdge(
          chain.frontendNode.id,
          chain.backendNode.id,
          { dtoName: chain.dtoName, tier: 'frontend-backend', entries: entriesMeta },
        );
        if (edge && !graph.getEdge(edge.id)) {
          graph.addEdge(edge);
          newEdges.push(edge);
        }
      }

      if (chain.backendNode) {
        for (const stmt of chain.statementNodes) {
          const edge = this.makeChainEdge(
            chain.backendNode.id,
            stmt.id,
            { dtoName: chain.dtoName, tier: 'backend-mapper', entries: entriesMeta },
          );
          if (edge && !graph.getEdge(edge.id)) {
            graph.addEdge(edge);
            newEdges.push(edge);
          }
        }
      } else if (chain.frontendNode) {
        // Frontend-only DTO still wants to reach the mapper if one matches by name
        for (const stmt of chain.statementNodes) {
          const edge = this.makeChainEdge(
            chain.frontendNode.id,
            stmt.id,
            { dtoName: chain.dtoName, tier: 'frontend-mapper', entries: entriesMeta },
          );
          if (edge && !graph.getEdge(edge.id)) {
            graph.addEdge(edge);
            newEdges.push(edge);
          }
        }
      }
    }

    return newEdges;
  }

  private makeChainEdge(sourceId: string, targetId: string, metadata: Record<string, unknown>): GraphEdge | null {
    if (sourceId === targetId) return null;
    return {
      id: `${sourceId}:dto-flows:${targetId}`,
      source: sourceId,
      target: targetId,
      kind: 'dto-flows',
      metadata,
    };
  }

  /**
   * Build a field-level chain for each DTO that participates in the
   * Vue TS interface ↔ Spring DTO ↔ MyBatis ResultMap ↔ DB column flow.
   *
   * The returned chains are pure data — they do not mutate the graph.
   * `link()` (step 4-2) consumes these chains to emit `dto-flows` edges.
   */
  buildFieldChains(graph: DependencyGraph): DtoFieldChain[] {
    const chains: DtoFieldChain[] = [];

    // 1. Index backend DTO nodes by class name (Phase 7a-2: spring-dto)
    const backendDtos = new Map<string, GraphNode>();
    for (const node of graph.nodesIter()) {
      if (node.kind === 'spring-dto') backendDtos.set(node.label, node);
    }

    // 2. Index frontend TS interface definitions by name → node that hosts the interface
    const frontendInterfaces = new Map<string, { node: GraphNode; fieldTypes: FrontendField[] }>();
    for (const node of graph.getAllNodes()) {
      if (node.kind !== 'ts-module' && node.kind !== 'vue-component') continue;
      const interfaces = node.metadata.interfaces as TsInterface[] | undefined;
      const exportedTypes = node.metadata.exportedTypes as TsInterface[] | undefined;
      const all = [...(interfaces || []), ...(exportedTypes || [])];
      for (const iface of all) {
        if (!frontendInterfaces.has(iface.name)) {
          frontendInterfaces.set(iface.name, {
            node,
            fieldTypes: iface.fieldTypes || iface.fields.map(f => ({ name: f, type: 'unknown', optional: false })),
          });
        }
      }
    }

    // 3. Index MyBatis statements by resultMapTypeSimple / parameterTypeSimple
    const statementsByDtoName = new Map<string, GraphNode[]>();
    for (const node of graph.getAllNodes()) {
      if (node.kind !== 'mybatis-statement') continue;
      const simple = node.metadata.resultMapTypeSimple as string | undefined;
      const paramSimple = node.metadata.parameterTypeSimple as string | undefined;
      for (const name of [simple, paramSimple]) {
        if (!name) continue;
        if (!statementsByDtoName.has(name)) statementsByDtoName.set(name, []);
        statementsByDtoName.get(name)!.push(node);
      }
    }

    // 4. Walk every DTO the backend knows about. Optionally, also walk frontend-only DTOs.
    const dtoNames = new Set<string>([
      ...backendDtos.keys(),
      ...Array.from(frontendInterfaces.keys()).filter(n => DTO_SUFFIXES.test(n)),
    ]);

    for (const dtoName of dtoNames) {
      const backendNode = backendDtos.get(dtoName);
      const frontend = frontendInterfaces.get(dtoName);
      const statementNodes = statementsByDtoName.get(dtoName) ?? [];

      const backendFields = (backendNode?.metadata.fields as BackendField[] | undefined) ?? [];
      const frontendFields = frontend?.fieldTypes ?? [];

      // Aggregate column/mapping info across all matching statements.
      // Prefer explicit resultMap mappings over synthesized inline ones — if any
      // entry ever set a jdbcType/javaType, keep it.
      const mappingsByProperty = new Map<string, { column: string; javaType?: string; jdbcType?: string }>();
      for (const stmt of statementNodes) {
        const fm = stmt.metadata.fieldMappings as Array<{ property: string; column: string; javaType?: string; jdbcType?: string }> | undefined;
        if (!fm) continue;
        for (const m of fm) {
          const existing = mappingsByProperty.get(m.property);
          if (!existing || (m.javaType && !existing.javaType) || (m.jdbcType && !existing.jdbcType)) {
            mappingsByProperty.set(m.property, { column: m.column, javaType: m.javaType, jdbcType: m.jdbcType });
          }
        }
      }

      const tableNodes: GraphNode[] = [];
      const seenTables = new Set<string>();
      for (const stmt of statementNodes) {
        for (const edge of graph.getOutEdges(stmt.id)) {
          if (edge.kind !== 'reads-table' && edge.kind !== 'writes-table') continue;
          if (seenTables.has(edge.target)) continue;
          const tableNode = graph.getNode(edge.target);
          if (tableNode) {
            tableNodes.push(tableNode);
            seenTables.add(edge.target);
          }
        }
      }

      // Build entries — backend-field-centric, then append frontend-only leftovers
      const entries: DtoFieldChainEntry[] = [];
      const claimedFrontend = new Set<string>();

      for (const bf of backendFields) {
        const lookupName = bf.jsonName || bf.name;
        const ff = frontendFields.find(f => f.name === lookupName);
        if (ff) claimedFrontend.add(ff.name);
        const mapping = mappingsByProperty.get(bf.name);
        entries.push({
          fieldName: bf.name,
          backendType: bf.type,
          backendNullable: bf.nullable,
          jsonName: bf.jsonName,
          frontendType: ff?.type,
          frontendOptional: ff?.optional,
          column: mapping?.column,
          jdbcType: mapping?.jdbcType,
          mappedJavaType: mapping?.javaType,
          sourceTier: 'backend',
        });
      }

      for (const ff of frontendFields) {
        if (claimedFrontend.has(ff.name)) continue;
        entries.push({
          fieldName: ff.name,
          frontendType: ff.type,
          frontendOptional: ff.optional,
          sourceTier: 'frontend',
        });
      }

      chains.push({
        dtoName,
        backendNode,
        frontendNode: frontend?.node,
        frontendInterface: frontend ? dtoName : undefined,
        statementNodes,
        tableNodes,
        entries,
      });
    }

    return chains;
  }
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
