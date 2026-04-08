import type { GraphNode, GraphEdge, GraphMetadata, ParseError, AnalysisConfig } from './types.js';

export class DependencyGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private adjacency = new Map<string, Set<string>>();
  private reverseAdjacency = new Map<string, Set<string>>();
  private fileIndex = new Map<string, Set<string>>();

  public metadata: GraphMetadata = {
    projectRoot: '',
    analyzedAt: new Date().toISOString(),
    fileCount: 0,
    parseErrors: [],
    config: {},
  };

  // ─── Node Operations ───

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set());
    }
    if (!this.reverseAdjacency.has(node.id)) {
      this.reverseAdjacency.set(node.id, new Set());
    }
    // Index by file path
    if (!this.fileIndex.has(node.filePath)) {
      this.fileIndex.set(node.filePath, new Set());
    }
    this.fileIndex.get(node.filePath)!.add(node.id);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove all edges connected to this node
    const outEdges = this.adjacency.get(id);
    if (outEdges) {
      for (const edgeId of outEdges) {
        const edge = this.edges.get(edgeId);
        if (edge) {
          this.reverseAdjacency.get(edge.target)?.delete(edgeId);
          this.edges.delete(edgeId);
        }
      }
    }
    const inEdges = this.reverseAdjacency.get(id);
    if (inEdges) {
      for (const edgeId of inEdges) {
        const edge = this.edges.get(edgeId);
        if (edge) {
          this.adjacency.get(edge.source)?.delete(edgeId);
          this.edges.delete(edgeId);
        }
      }
    }

    this.adjacency.delete(id);
    this.reverseAdjacency.delete(id);
    this.nodes.delete(id);

    // Remove from file index
    if (node.filePath) {
      this.fileIndex.get(node.filePath)?.delete(id);
    }
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  // ─── Edge Operations ───

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
    if (!this.adjacency.has(edge.source)) {
      this.adjacency.set(edge.source, new Set());
    }
    this.adjacency.get(edge.source)!.add(edge.id);

    if (!this.reverseAdjacency.has(edge.target)) {
      this.reverseAdjacency.set(edge.target, new Set());
    }
    this.reverseAdjacency.get(edge.target)!.add(edge.id);
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  removeEdge(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) return;
    this.adjacency.get(edge.source)?.delete(id);
    this.reverseAdjacency.get(edge.target)?.delete(id);
    this.edges.delete(id);
  }

  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  getEdgeCount(): number {
    return this.edges.size;
  }

  // ─── Adjacency Queries ───

  getOutEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => this.edges.get(id)!).filter(Boolean);
  }

  getInEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.reverseAdjacency.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(id => this.edges.get(id)!).filter(Boolean);
  }

  getNeighbors(nodeId: string, direction: 'out' | 'in' | 'both' = 'both'): GraphNode[] {
    const ids = new Set<string>();
    if (direction === 'out' || direction === 'both') {
      for (const edge of this.getOutEdges(nodeId)) {
        ids.add(edge.target);
      }
    }
    if (direction === 'in' || direction === 'both') {
      for (const edge of this.getInEdges(nodeId)) {
        ids.add(edge.source);
      }
    }
    return Array.from(ids).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  // ─── File-based Operations ───

  getNodesByFile(filePath: string): GraphNode[] {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return [];
    return Array.from(ids).map(id => this.nodes.get(id)!).filter(Boolean);
  }

  removeByFile(filePath: string): void {
    const ids = this.fileIndex.get(filePath);
    if (!ids) return;
    for (const id of [...ids]) {
      this.removeNode(id);
    }
    this.fileIndex.delete(filePath);
  }

  // ─── Merge ───

  merge(other: DependencyGraph): void {
    for (const node of other.getAllNodes()) {
      this.addNode(node);
    }
    for (const edge of other.getAllEdges()) {
      this.addEdge(edge);
    }
    this.metadata.parseErrors.push(...other.metadata.parseErrors);
  }

  // ─── Stats ───

  getStats(): { nodesByKind: Record<string, number>; edgesByKind: Record<string, number>; totalNodes: number; totalEdges: number } {
    const nodesByKind: Record<string, number> = {};
    const edgesByKind: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      nodesByKind[node.kind] = (nodesByKind[node.kind] || 0) + 1;
    }
    for (const edge of this.edges.values()) {
      edgesByKind[edge.kind] = (edgesByKind[edge.kind] || 0) + 1;
    }
    return { nodesByKind, edgesByKind, totalNodes: this.nodes.size, totalEdges: this.edges.size };
  }
}
