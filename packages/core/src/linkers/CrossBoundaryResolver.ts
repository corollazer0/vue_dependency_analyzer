import { DependencyGraph } from '../graph/DependencyGraph.js';
import { ApiCallLinker } from './ApiCallLinker.js';
import { NativeBridgeLinker } from './NativeBridgeLinker.js';
import { MyBatisLinker } from './MyBatisLinker.js';
import { DtoFlowLinker } from './DtoFlowLinker.js';
import { ImportResolver } from '../parsers/typescript/ImportResolver.js';
import type { AnalysisConfig, GraphEdge, GraphNode } from '../graph/types.js';

export class CrossBoundaryResolver {
  private apiCallLinker: ApiCallLinker;
  private nativeBridgeLinker: NativeBridgeLinker;
  private myBatisLinker: MyBatisLinker;
  private dtoFlowLinker: DtoFlowLinker;
  private importResolver: ImportResolver;

  constructor(config: AnalysisConfig, projectRoot: string) {
    this.apiCallLinker = new ApiCallLinker(config.apiBaseUrl);
    this.nativeBridgeLinker = new NativeBridgeLinker();
    this.myBatisLinker = new MyBatisLinker();
    this.dtoFlowLinker = new DtoFlowLinker();
    this.importResolver = new ImportResolver(config, projectRoot);
  }

  resolve(graph: DependencyGraph): void {
    // 1. Resolve import paths to actual files
    this.resolveImports(graph);

    // 2. Link API calls to Spring endpoints
    this.apiCallLinker.link(graph);

    // 3. Create native bridge nodes and link calls
    this.nativeBridgeLinker.link(graph);

    // 4. Link MyBatis mappers to Java interfaces and deduplicate tables
    this.myBatisLinker.link(graph);

    // 5. Resolve Vue emit/listen event pairs
    this.resolveEmitListeners(graph);

    // 6. Create virtual nodes for Spring event targets
    this.createSpringEventNodes(graph);

    // 7. Resolve spring-injects targets from type names to actual node IDs
    this.resolveSpringInjects(graph);

    // 8. Link Repository → Mapper (same domain name matching)
    this.resolveRepositoryToMapper(graph);

    // 9. Link DTO flows between controllers/services sharing DTO types
    this.dtoFlowLinker.link(graph);
  }

  private resolveImports(graph: DependencyGraph): void {
    const unresolvedEdges = graph.getEdgesByKind('imports').filter(
      e => e.target.startsWith('unresolved:')
    );

    for (const edge of unresolvedEdges) {
      const importPath = edge.metadata.importPath as string;
      if (!importPath) continue;

      // Find the source node to get its file path
      const sourceNode = graph.getNode(edge.source);
      if (!sourceNode) continue;

      const resolvedFile = this.importResolver.resolve(importPath, sourceNode.filePath);
      if (resolvedFile) {
        // Find the target node by file path
        const targetNodes = graph.getNodesByFile(resolvedFile);
        if (targetNodes.length > 0) {
          // Update the edge target to point to the actual node
          graph.removeEdge(edge.id);
          const newEdge: GraphEdge = {
            ...edge,
            id: `${edge.source}:imports:${targetNodes[0].id}`,
            target: targetNodes[0].id,
            metadata: { ...edge.metadata, confidence: 'high' },
          };
          graph.addEdge(newEdge);
        }
      }
    }

    // Resolve component references from template
    this.resolveComponentReferences(graph);
    // Resolve store references
    this.resolveStoreReferences(graph);
    // Resolve composable references
    this.resolveComposableReferences(graph);
    // Resolve route-renders targets
    this.resolveRouteRenders(graph);
  }

  private resolveComponentReferences(graph: DependencyGraph): void {
    const componentEdges = graph.getEdgesByKind('uses-component').filter(
      e => e.target.startsWith('component:')
    );
    if (componentEdges.length === 0) return;

    // Pre-index vue-components by label once — the prior pattern rescanned
    // every node on every edge (O(edges × nodes)).
    const componentsByLabel = new Map<string, GraphNode>();
    for (const node of graph.nodesIter()) {
      if (node.kind === 'vue-component') componentsByLabel.set(node.label, node);
    }

    for (const edge of componentEdges) {
      const componentName = (edge.metadata.componentName as string) || '';
      const match = componentsByLabel.get(componentName);
      if (match) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:uses-component:${match.id}`,
          target: match.id,
          metadata: { ...edge.metadata, confidence: 'medium' },
        });
      }
    }
  }

  private resolveStoreReferences(graph: DependencyGraph): void {
    const storeEdges = graph.getEdgesByKind('uses-store').filter(
      e => e.target.startsWith('store:')
    );
    if (storeEdges.length === 0) return;

    // Single sweep over nodes: bucket by exported function name + by label,
    // so the inner loop becomes O(1) lookups.
    const storeByExportedName = new Map<string, GraphNode>();
    const piniaStores: GraphNode[] = [];
    for (const node of graph.nodesIter()) {
      if (node.kind !== 'pinia-store') continue;
      piniaStores.push(node);
      const exports = (node.metadata.exportedFunctions as string[] | undefined) ?? [];
      for (const name of exports) storeByExportedName.set(name, node);
    }

    for (const edge of storeEdges) {
      const storeName = (edge.metadata.storeName as string) || '';
      let match = storeByExportedName.get(storeName);
      if (!match) {
        const needle = storeName.replace(/^use/, '').replace(/Store$/, '').toLowerCase();
        // Fallback label-substring match preserves the legacy heuristic for
        // stores that don't export a useXxx function by that exact name.
        match = piniaStores.find(n => n.label.toLowerCase().includes(needle));
      }
      if (match) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:uses-store:${match.id}`,
          target: match.id,
          metadata: { ...edge.metadata, confidence: 'medium' },
        });
      }
    }
  }

  /**
   * Connect parent @event listeners to child defineEmits via virtual event nodes.
   *
   * For each `listens-event` edge from a parent component to a child component,
   * check if the child has that event in its `emits` metadata. If so, create:
   *   - A virtual `vue-event` node for the event
   *   - An `emits-event` edge from the child to the event node
   *   - Re-target the parent's `listens-event` edge to the event node
   */
  private resolveEmitListeners(graph: DependencyGraph): void {
    const listenEdges = graph.getEdgesByKind('listens-event').filter(e => e.target.startsWith('component:'));

    // Build a map: resolved child component id -> set of emitted event names
    const childEmitsMap = new Map<string, Set<string>>();
    for (const node of graph.getAllNodes()) {
      if (node.kind === 'vue-component') {
        const emits = node.metadata.emits as string[] | undefined;
        if (emits && emits.length > 0) {
          childEmitsMap.set(node.id, new Set(emits));
        }
      }
    }

    // Build a map: component label -> node id (for matching unresolved component:X targets)
    const labelToNodeId = new Map<string, string>();
    for (const node of graph.getAllNodes()) {
      if (node.kind === 'vue-component') {
        labelToNodeId.set(node.label, node.id);
      }
    }

    // Also build from resolved uses-component edges
    const parentToChildren = new Map<string, Map<string, string>>(); // parent -> (componentName -> childNodeId)
    for (const edge of graph.edgesByKindIter('uses-component')) {
      const childNodeId = edge.target.startsWith('component:')
        ? labelToNodeId.get(edge.target.replace('component:', ''))
        : edge.target;
      if (childNodeId) {
        if (!parentToChildren.has(edge.source)) {
          parentToChildren.set(edge.source, new Map());
        }
        const componentName = edge.metadata.componentName as string;
        parentToChildren.get(edge.source)!.set(componentName, childNodeId);
      }
    }

    const createdEventNodes = new Set<string>();

    for (const listenEdge of listenEdges) {
      const parentId = listenEdge.source;
      const componentName = listenEdge.metadata.componentName as string;
      const eventName = listenEdge.metadata.eventName as string;

      // Find the resolved child node id
      const childMap = parentToChildren.get(parentId);
      const childNodeId = childMap?.get(componentName) ?? labelToNodeId.get(componentName);

      if (!childNodeId) continue;

      const childEmits = childEmitsMap.get(childNodeId);
      // Normalize event name for comparison: kebab-case to camelCase
      const normalizedEventName = kebabToCamel(eventName);
      const matchedEvent = childEmits?.has(eventName) ? eventName
        : childEmits?.has(normalizedEventName) ? normalizedEventName
        : undefined;

      if (!matchedEvent) continue;

      // Create virtual event node
      const eventNodeId = `vue-event:${childNodeId}:${matchedEvent}`;
      if (!createdEventNodes.has(eventNodeId)) {
        createdEventNodes.add(eventNodeId);
        const childNode = graph.getNode(childNodeId);
        graph.addNode({
          id: eventNodeId,
          kind: 'vue-event',
          label: `${childNode?.label ?? componentName}::${matchedEvent}`,
          filePath: childNode?.filePath ?? '',
          metadata: { eventName: matchedEvent, componentId: childNodeId },
        });

        // Create emits-event edge from child to event node
        graph.addEdge({
          id: `${childNodeId}:emits-event:${eventNodeId}`,
          source: childNodeId,
          target: eventNodeId,
          kind: 'emits-event',
          metadata: { eventName: matchedEvent },
        });
      }

      // Re-target the listens-event edge to the event node
      graph.removeEdge(listenEdge.id);
      graph.addEdge({
        ...listenEdge,
        id: `${parentId}:listens-event:${eventNodeId}`,
        target: eventNodeId,
        kind: 'listens-event',
      });
    }
  }

  /**
   * Create virtual spring-event nodes for any edge targets/sources that start with `event:` but have no corresponding node.
   */
  private createSpringEventNodes(graph: DependencyGraph): void {
    const eventIds = new Set<string>();

    for (const edge of graph.getAllEdges()) {
      if (edge.target.startsWith('event:') && !graph.hasNode(edge.target)) {
        eventIds.add(edge.target);
      }
      if (edge.source.startsWith('event:') && !graph.hasNode(edge.source)) {
        eventIds.add(edge.source);
      }
    }

    for (const eventId of eventIds) {
      const eventClass = eventId.replace('event:', '');
      graph.addNode({
        id: eventId,
        kind: 'spring-event',
        label: eventClass,
        filePath: '',
        metadata: { eventClass, virtual: true },
      });
    }
  }

  /**
   * Resolve spring-injects edges whose targets are type names (e.g. "spring-service:UserService")
   * to actual graph nodes (e.g. "spring-service:/path/to/UserService.java").
   *
   * The JavaFileParser creates edges like:
   *   source: "spring-controller:/path/UserController.java"
   *   target: "spring-service:UserService"  ← type name, NOT a real node ID
   *
   * Real nodes have IDs like "spring-service:/path/UserService.java".
   * We match by className metadata or label.
   */
  private resolveSpringInjects(graph: DependencyGraph): void {
    // Build lookup: className/label → node ID for all spring-service nodes
    const nameToNodeId = new Map<string, string>();
    for (const node of graph.getAllNodes()) {
      if (node.kind === 'spring-service' || node.kind === 'spring-controller') {
        const className = (node.metadata.className as string) || node.label;
        if (className) nameToNodeId.set(className, node.id);
      }
      // Also match mybatis-mapper nodes by label
      if (node.kind === 'mybatis-mapper') {
        nameToNodeId.set(node.label, node.id);
      }
    }

    const edgesToResolve = graph.getEdgesByKind('spring-injects').filter(
      e => !graph.hasNode(e.target)
    );

    for (const edge of edgesToResolve) {
      // Target is like "spring-service:UserService" — extract the type name
      const typeName = edge.target.replace(/^spring-service:/, '');
      const realNodeId = nameToNodeId.get(typeName);

      if (realNodeId && realNodeId !== edge.source) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:spring-injects:${realNodeId}`,
          target: realNodeId,
          metadata: { ...edge.metadata, confidence: 'medium' },
        });
      }
    }
  }

  /**
   * Link Repository nodes to their corresponding Mapper nodes.
   * Matches by domain name: UserRepository → UserMapper (both @Mapper interface and mybatis-mapper XML).
   * This completes the chain: Service → Repository → Mapper → XML → DB Table.
   */
  private resolveRepositoryToMapper(graph: DependencyGraph): void {
    const repositories = graph.getAllNodes().filter(n =>
      n.kind === 'spring-service' && (n.metadata.isRepository || n.label.endsWith('Repository'))
    );
    const mappers = graph.getAllNodes().filter(n =>
      n.kind === 'spring-service' && n.metadata.isMapper
    );
    const mybatisMappers = graph.getAllNodes().filter(n => n.kind === 'mybatis-mapper');

    for (const repo of repositories) {
      const domain = repo.label.replace('Repository', '');

      // O(out-degree) edge-existence check vs. the prior O(|E|) full scan.
      const repoOutTargets = new Set(graph.getOutEdges(repo.id).map((e) => e.target));

      // Find matching @Mapper interface
      const mapper = mappers.find(m => m.label === domain + 'Mapper');
      if (mapper && !repoOutTargets.has(mapper.id)) {
        graph.addEdge({
          id: `${repo.id}:spring-injects:${mapper.id}`,
          source: repo.id,
          target: mapper.id,
          kind: 'spring-injects',
          metadata: { viaDomainMatch: true, confidence: 'low' },
        });
      }

      // Also link directly to mybatis-mapper if no @Mapper interface exists
      if (!mapper) {
        const mbMapper = mybatisMappers.find(m => m.label === domain + 'Mapper');
        if (mbMapper && !repoOutTargets.has(mbMapper.id)) {
          graph.addEdge({
            id: `${repo.id}:spring-injects:${mbMapper.id}`,
            source: repo.id,
            target: mbMapper.id,
            kind: 'spring-injects',
            metadata: { viaDomainMatch: true, confidence: 'low' },
          });
        }
      }
    }
  }

  /**
   * Resolve route-renders edges:
   * - `unresolved:` prefixed targets (lazy imports) → resolve via ImportResolver
   * - `component:` prefixed targets (static refs) → match by vue-component label
   */
  private resolveRouteRenders(graph: DependencyGraph): void {
    // 1. Resolve lazy route-renders (unresolved: prefix)
    const unresolvedRouteEdges = graph.getEdgesByKind('route-renders').filter(
      e => e.target.startsWith('unresolved:')
    );

    for (const edge of unresolvedRouteEdges) {
      const importPath = edge.metadata.importPath as string;
      if (!importPath) continue;

      const sourceNode = graph.getNode(edge.source);
      if (!sourceNode) continue;

      const resolvedFile = this.importResolver.resolve(importPath, sourceNode.filePath);
      if (resolvedFile) {
        const targetNodes = graph.getNodesByFile(resolvedFile);
        if (targetNodes.length > 0) {
          graph.removeEdge(edge.id);
          graph.addEdge({
            ...edge,
            id: `${edge.source}:route-renders:${targetNodes[0].id}`,
            target: targetNodes[0].id,
            metadata: { ...edge.metadata, confidence: 'high' },
          });
        }
      }
    }

    // 2. Resolve static route-renders (component: prefix). Re-fetch the kind
    // bucket — pass 1 may have rewritten edge ids, so the earlier snapshot is stale.
    const staticRouteEdges = graph.getEdgesByKind('route-renders').filter(
      e => e.target.startsWith('component:')
    );

    if (staticRouteEdges.length > 0) {
      // Reuse the component label index — same vue-component pool as the
      // uses-component resolver.
      const componentsByLabel = new Map<string, GraphNode>();
      for (const node of graph.nodesIter()) {
        if (node.kind === 'vue-component') componentsByLabel.set(node.label, node);
      }
      for (const edge of staticRouteEdges) {
        const componentName = (edge.metadata.componentName as string) || edge.target.replace('component:', '');
        const match = componentsByLabel.get(componentName);
        if (match) {
          graph.removeEdge(edge.id);
          graph.addEdge({
            ...edge,
            id: `${edge.source}:route-renders:${match.id}`,
            target: match.id,
            metadata: { ...edge.metadata, confidence: 'medium' },
          });
        }
      }
    }
  }

  private resolveComposableReferences(graph: DependencyGraph): void {
    const composableEdges = graph.getEdgesByKind('uses-composable').filter(
      e => e.target.startsWith('composable:')
    );
    if (composableEdges.length === 0) return;

    const composableByExportedName = new Map<string, GraphNode>();
    const composableByLabel = new Map<string, GraphNode>();
    for (const node of graph.nodesIter()) {
      if (node.kind !== 'vue-composable') continue;
      composableByLabel.set(node.label, node);
      const exports = (node.metadata.exportedFunctions as string[] | undefined) ?? [];
      for (const name of exports) composableByExportedName.set(name, node);
    }

    for (const edge of composableEdges) {
      const composableName = (edge.metadata.composableName as string) || '';
      let match = composableByExportedName.get(composableName);
      if (!match) {
        const stripped = composableName.replace(/^use/, '');
        const normalised = stripped.charAt(0).toLowerCase() + stripped.slice(1);
        match = composableByLabel.get(normalised);
      }
      if (match) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:uses-composable:${match.id}`,
          target: match.id,
          metadata: { ...edge.metadata, confidence: 'medium' },
        });
      }
    }
  }
}

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
