import { DependencyGraph } from '../graph/DependencyGraph.js';
import { ApiCallLinker } from './ApiCallLinker.js';
import { NativeBridgeLinker } from './NativeBridgeLinker.js';
import { ImportResolver } from '../parsers/typescript/ImportResolver.js';
import type { AnalysisConfig, GraphEdge } from '../graph/types.js';

export class CrossBoundaryResolver {
  private apiCallLinker: ApiCallLinker;
  private nativeBridgeLinker: NativeBridgeLinker;
  private importResolver: ImportResolver;

  constructor(config: AnalysisConfig, projectRoot: string) {
    this.apiCallLinker = new ApiCallLinker(config.apiBaseUrl);
    this.nativeBridgeLinker = new NativeBridgeLinker();
    this.importResolver = new ImportResolver(config, projectRoot);
  }

  resolve(graph: DependencyGraph): void {
    // 1. Resolve import paths to actual files
    this.resolveImports(graph);

    // 2. Link API calls to Spring endpoints
    this.apiCallLinker.link(graph);

    // 3. Create native bridge nodes and link calls
    this.nativeBridgeLinker.link(graph);
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
