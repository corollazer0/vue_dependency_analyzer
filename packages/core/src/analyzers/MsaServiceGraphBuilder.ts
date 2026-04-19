import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphNode, GraphEdge, ServiceConfig } from '../graph/types.js';

// Phase 12 — MSA Native (F10).
//
// Post-processing step that takes a fully-resolved graph (parsers +
// CrossBoundaryResolver done) and adds:
//   - one `msa-service` node per services[] entry (frontend included)
//     plus a synthetic `unassigned` service for nodes with no serviceId
//   - `service-calls` edges (cross-service HTTP)
//   - `service-shares-db` edges (cross-service db-table read/write)
//   - `service-shares-dto` edges (cross-service DTO references)
//
// Heuristics & contracts (per phase12-plan §1 / §4):
// - Service membership = node.metadata.serviceId (Phase 2-6 already tags
//   parser output). When missing, the node is considered part of
//   `unassigned`.
// - Cross-service link = endpoint nodes wired by ApiCallLinker
//   (api-call-site → spring-endpoint). The two sides' serviceId differing
//   triggers a service-calls edge.
// - DB ownership = "first service to *write* a table is the owner."
//   Conservative; UI surfaces "ownership: heuristic" tag.
// - DTO sharing = same `fqn` declared by spring-dto in service A but
//   referenced (via dto-flows or api-call return type) by spring-endpoint
//   in service B.

export const MSA_SERVICE_NODE_PREFIX = 'msa-service:';
export const UNASSIGNED_SERVICE_ID = 'unassigned';

export interface MsaBuildResult {
  /** msa-service nodes added to the graph (1 per services[] + 'unassigned' if any). */
  serviceNodes: GraphNode[];
  /** Inter-service edges added (service-calls / service-shares-db / service-shares-dto). */
  serviceEdges: GraphEdge[];
  /** For diagnostic / e2e gates: which serviceId owns which db-table. */
  tableOwners: Map<string, string>;
}

function serviceNodeId(serviceId: string): string {
  return `${MSA_SERVICE_NODE_PREFIX}${serviceId}`;
}

function nodeServiceId(node: GraphNode | undefined): string {
  if (!node) return UNASSIGNED_SERVICE_ID;
  const id = (node.metadata as Record<string, unknown> | undefined)?.serviceId;
  return typeof id === 'string' && id.length > 0 ? id : UNASSIGNED_SERVICE_ID;
}

export function buildMsaServiceGraph(
  graph: DependencyGraph,
  services: ServiceConfig[] | undefined,
): MsaBuildResult {
  const serviceIds = new Set<string>(services?.map(s => s.id) ?? []);

  // Step 1 — collect services that are actually present in the graph.
  // Any node without serviceId folds into UNASSIGNED_SERVICE_ID.
  const seenServiceIds = new Set<string>();
  for (const node of graph.getAllNodes()) {
    seenServiceIds.add(nodeServiceId(node));
  }
  // Always include declared services even if no nodes parsed (catches
  // misconfigured services[] before nodes get added).
  for (const id of serviceIds) seenServiceIds.add(id);

  const serviceNodes: GraphNode[] = [];
  for (const sid of seenServiceIds) {
    const id = serviceNodeId(sid);
    if (graph.hasNode(id)) continue;
    const declared = services?.find(s => s.id === sid);
    const node: GraphNode = {
      id,
      kind: 'msa-service',
      label: sid,
      filePath: '',
      metadata: {
        serviceId: sid,
        declared: !!declared,
        type: declared?.type ?? null,
        root: declared?.root ?? null,
      },
    };
    graph.addNode(node);
    serviceNodes.push(node);
  }

  // Step 2 — service-calls. ApiCallLinker rewires api-call-site → spring-
  // endpoint; we walk those resolved edges and emit service-calls when the
  // two sides live in different services.
  const serviceEdges: GraphEdge[] = [];
  function pushServiceEdge(
    sourceSid: string,
    targetSid: string,
    kind: 'service-calls' | 'service-shares-db' | 'service-shares-dto',
    metadata: Record<string, unknown>,
  ): void {
    if (sourceSid === targetSid) return;
    const id = `${serviceNodeId(sourceSid)}:${kind}:${serviceNodeId(targetSid)}`;
    if (graph.getEdge(id)) return; // de-dup if called twice
    const edge: GraphEdge = {
      id,
      source: serviceNodeId(sourceSid),
      target: serviceNodeId(targetSid),
      kind,
      metadata,
    };
    graph.addEdge(edge);
    serviceEdges.push(edge);
  }

  // service-calls — count per pair so we can record the call multiplicity.
  const serviceCallCount = new Map<string, { source: string; target: string; n: number }>();
  for (const edge of graph.getAllEdges()) {
    if (edge.kind !== 'api-call') continue;
    const callSite = graph.getNode(edge.source);
    const target = graph.getNode(edge.target);
    if (!callSite || !target || target.kind !== 'spring-endpoint') continue;
    const sourceSid = nodeServiceId(callSite);
    const targetSid = nodeServiceId(target);
    if (sourceSid === targetSid) continue;
    const key = `${sourceSid}→${targetSid}`;
    const prev = serviceCallCount.get(key);
    if (prev) prev.n += 1;
    else serviceCallCount.set(key, { source: sourceSid, target: targetSid, n: 1 });
  }
  for (const v of serviceCallCount.values()) {
    pushServiceEdge(v.source, v.target, 'service-calls', { callCount: v.n });
  }

  // Step 3 — table ownership + service-shares-db.
  // Owner = first service to write the table (writes-table edges).
  const tableOwners = new Map<string, string>();
  for (const edge of graph.getAllEdges()) {
    if (edge.kind !== 'writes-table') continue;
    const writer = graph.getNode(edge.source);
    if (!writer) continue;
    const sid = nodeServiceId(writer);
    if (sid === UNASSIGNED_SERVICE_ID) continue;
    if (!tableOwners.has(edge.target)) tableOwners.set(edge.target, sid);
  }
  // Tables that only got read also need an owner — fall back to first reader.
  for (const edge of graph.getAllEdges()) {
    if (edge.kind !== 'reads-table') continue;
    if (tableOwners.has(edge.target)) continue;
    const reader = graph.getNode(edge.source);
    if (!reader) continue;
    const sid = nodeServiceId(reader);
    if (sid === UNASSIGNED_SERVICE_ID) continue;
    tableOwners.set(edge.target, sid);
  }
  // Now emit service-shares-db when (reader|writer) serviceId !== owner.
  const dbPairCount = new Map<string, { source: string; target: string; tables: Set<string> }>();
  for (const edge of graph.getAllEdges()) {
    if (edge.kind !== 'reads-table' && edge.kind !== 'writes-table') continue;
    const accessor = graph.getNode(edge.source);
    if (!accessor) continue;
    const accessorSid = nodeServiceId(accessor);
    const owner = tableOwners.get(edge.target);
    if (!owner || accessorSid === owner || accessorSid === UNASSIGNED_SERVICE_ID) continue;
    const key = `${accessorSid}→${owner}`;
    const prev = dbPairCount.get(key);
    if (prev) prev.tables.add(edge.target);
    else dbPairCount.set(key, { source: accessorSid, target: owner, tables: new Set([edge.target]) });
  }
  for (const v of dbPairCount.values()) {
    pushServiceEdge(v.source, v.target, 'service-shares-db', {
      tableCount: v.tables.size,
      tables: [...v.tables].slice(0, 10),
      ownership: 'heuristic',
    });
  }

  // Step 4 — service-shares-dto.
  // Two flavours:
  //   (a) DTO declared in service A but referenced in a spring-endpoint in
  //       service B (returnType / paramTypes match the DTO's fqn).
  //   (b) Same DTO fqn declared in two different services (rare but valid
  //       for shared model libraries — surface as a single edge).
  const dtoByFqn = new Map<string, { sid: string; nodeId: string }>();
  for (const node of graph.getAllNodes()) {
    if (node.kind !== 'spring-dto') continue;
    const fqn = (node.metadata as Record<string, unknown>).fqn as string | undefined;
    if (!fqn) continue;
    const sid = nodeServiceId(node);
    // First-seen wins for the canonical owner.
    if (!dtoByFqn.has(fqn)) dtoByFqn.set(fqn, { sid, nodeId: node.id });
  }

  const dtoPairCount = new Map<string, { source: string; target: string; fqns: Set<string> }>();
  for (const node of graph.getAllNodes()) {
    if (node.kind !== 'spring-endpoint') continue;
    const md = node.metadata as Record<string, unknown>;
    const refs = new Set<string>();
    if (typeof md.returnType === 'string') refs.add(md.returnType);
    const paramTypes = md.paramTypes;
    if (Array.isArray(paramTypes)) {
      for (const p of paramTypes) if (typeof p === 'string') refs.add(p);
    }
    const accessorSid = nodeServiceId(node);
    if (accessorSid === UNASSIGNED_SERVICE_ID) continue;
    for (const ref of refs) {
      // Match either fully-qualified or simple-name suffix; the parser may
      // emit `UserDto` or `com.example.UserDto` depending on import shape.
      let owner: { sid: string; nodeId: string } | undefined;
      if (dtoByFqn.has(ref)) owner = dtoByFqn.get(ref);
      else {
        for (const [fqn, v] of dtoByFqn) {
          if (fqn === ref || fqn.endsWith('.' + ref)) { owner = v; break; }
        }
      }
      if (!owner || owner.sid === accessorSid || owner.sid === UNASSIGNED_SERVICE_ID) continue;
      const key = `${accessorSid}→${owner.sid}`;
      const prev = dtoPairCount.get(key);
      if (prev) prev.fqns.add(ref);
      else dtoPairCount.set(key, { source: accessorSid, target: owner.sid, fqns: new Set([ref]) });
    }
  }
  for (const v of dtoPairCount.values()) {
    pushServiceEdge(v.source, v.target, 'service-shares-dto', {
      dtoCount: v.fqns.size,
      dtos: [...v.fqns].slice(0, 10),
    });
  }

  return { serviceNodes, serviceEdges, tableOwners };
}
