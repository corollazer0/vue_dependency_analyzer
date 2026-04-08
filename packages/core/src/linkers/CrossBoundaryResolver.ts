import { DependencyGraph } from '../graph/DependencyGraph.js';
import { ApiCallLinker } from './ApiCallLinker.js';
import { NativeBridgeLinker } from './NativeBridgeLinker.js';
import { MyBatisLinker } from './MyBatisLinker.js';
import { ImportResolver } from '../parsers/typescript/ImportResolver.js';
import type { AnalysisConfig, GraphEdge, GraphNode } from '../graph/types.js';

export class CrossBoundaryResolver {
  private apiCallLinker: ApiCallLinker;
  private nativeBridgeLinker: NativeBridgeLinker;
  private myBatisLinker: MyBatisLinker;
  private importResolver: ImportResolver;

  constructor(config: AnalysisConfig, projectRoot: string) {
    this.apiCallLinker = new ApiCallLinker(config.apiBaseUrl);
    this.nativeBridgeLinker = new NativeBridgeLinker();
    this.myBatisLinker = new MyBatisLinker();
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
  }

  private resolveImports(graph: DependencyGraph): void {
    const unresolvedEdges = graph.getAllEdges().filter(
      e => e.kind === 'imports' && e.target.startsWith('unresolved:')
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
  }

  private resolveComponentReferences(graph: DependencyGraph): void {
    const componentEdges = graph.getAllEdges().filter(
      e => e.kind === 'uses-component' && e.target.startsWith('component:')
    );

    for (const edge of componentEdges) {
      const componentName = (edge.metadata.componentName as string) || '';
      // Find a vue-component node whose label matches
      const match = graph.getAllNodes().find(
        n => n.kind === 'vue-component' && n.label === componentName
      );
      if (match) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:uses-component:${match.id}`,
          target: match.id,
        });
      }
    }
  }

  private resolveStoreReferences(graph: DependencyGraph): void {
    const storeEdges = graph.getAllEdges().filter(
      e => e.kind === 'uses-store' && e.target.startsWith('store:')
    );

    for (const edge of storeEdges) {
      const storeName = (edge.metadata.storeName as string) || '';
      // Find a pinia-store node whose exported functions include this store name
      const match = graph.getAllNodes().find(
        n => n.kind === 'pinia-store' && (
          (n.metadata.exportedFunctions as string[] || []).includes(storeName) ||
          n.label.toLowerCase().includes(storeName.replace(/^use/, '').replace(/Store$/, '').toLowerCase())
        )
      );
      if (match) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:uses-store:${match.id}`,
          target: match.id,
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
    const listenEdges = graph.getAllEdges().filter(e => e.kind === 'listens-event' && e.target.startsWith('component:'));

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
    for (const edge of graph.getAllEdges()) {
      if (edge.kind === 'uses-component') {
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

  private resolveComposableReferences(graph: DependencyGraph): void {
    const composableEdges = graph.getAllEdges().filter(
      e => e.kind === 'uses-composable' && e.target.startsWith('composable:')
    );

    for (const edge of composableEdges) {
      const composableName = (edge.metadata.composableName as string) || '';
      const match = graph.getAllNodes().find(
        n => n.kind === 'vue-composable' && (
          (n.metadata.exportedFunctions as string[] || []).includes(composableName) ||
          n.label === composableName.replace(/^use/, '').charAt(0).toLowerCase() + composableName.replace(/^use/, '').slice(1)
        )
      );
      if (match) {
        graph.removeEdge(edge.id);
        graph.addEdge({
          ...edge,
          id: `${edge.source}:uses-composable:${match.id}`,
          target: match.id,
        });
      }
    }
  }
}

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
