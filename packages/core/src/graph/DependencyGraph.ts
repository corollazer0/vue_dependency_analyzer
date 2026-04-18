import type { GraphNode, GraphEdge, GraphMetadata, ParseError, AnalysisConfig, EdgeKind } from './types.js';

export class DependencyGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private adjacency = new Map<string, Set<string>>();
  private reverseAdjacency = new Map<string, Set<string>>();
  private fileIndex = new Map<string, Set<string>>();
  // Phase 2-4: edge-kind index. Built incrementally on add/remove so callers
  // can avoid scanning every edge to filter by kind. Backs CrossBoundary
  // resolution (2-5) and any analyzer that operates on a single edge kind.
  private edgesByKind = new Map<EdgeKind, Set<string>>();
  // Monotonic mutation counter used by transport-layer dirty caches (ETag, toJSON cache).
  // Bumped on every add/remove — callers treat it as an opaque revision id.
  private version = 0;

  public metadata: GraphMetadata = {
    projectRoot: '',
    analyzedAt: new Date().toISOString(),
    fileCount: 0,
    parseErrors: [],
    config: {},
  };

  getVersion(): number {
    return this.version;
  }

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
    this.version++;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove all edges connected to this node (keeps every secondary index in sync)
    const dropEdge = (edgeId: string) => {
      const edge = this.edges.get(edgeId);
      if (!edge) return;
      this.adjacency.get(edge.source)?.delete(edgeId);
      this.reverseAdjacency.get(edge.target)?.delete(edgeId);
      const bucket = this.edgesByKind.get(edge.kind);
      if (bucket) {
        bucket.delete(edgeId);
        if (bucket.size === 0) this.edgesByKind.delete(edge.kind);
      }
      this.edges.delete(edgeId);
    };
    const outEdges = this.adjacency.get(id);
    if (outEdges) {
      for (const edgeId of [...outEdges]) dropEdge(edgeId);
    }
    const inEdges = this.reverseAdjacency.get(id);
    if (inEdges) {
      for (const edgeId of [...inEdges]) dropEdge(edgeId);
    }

    this.adjacency.delete(id);
    this.reverseAdjacency.delete(id);
    this.nodes.delete(id);

    // Remove from file index
    if (node.filePath) {
      this.fileIndex.get(node.filePath)?.delete(id);
    }
    this.version++;
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  // Iterator variant — use on hot paths that only need to iterate once and don't
  // need index access. Avoids materializing a full array copy (getAllNodes allocates
  // O(n) per call; the analysis engine calls it multiple times on warm-cache runs).
  nodesIter(): IterableIterator<GraphNode> {
    return this.nodes.values();
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  // ─── Edge Operations ───

  addEdge(edge: GraphEdge): void {
    // Idempotent on edge id — re-adding the same edge must not double-index.
    const existed = this.edges.has(edge.id);
    this.edges.set(edge.id, edge);
    if (!this.adjacency.has(edge.source)) {
      this.adjacency.set(edge.source, new Set());
    }
    this.adjacency.get(edge.source)!.add(edge.id);

    if (!this.reverseAdjacency.has(edge.target)) {
      this.reverseAdjacency.set(edge.target, new Set());
    }
    this.reverseAdjacency.get(edge.target)!.add(edge.id);

    if (!existed) {
      let bucket = this.edgesByKind.get(edge.kind);
      if (!bucket) { bucket = new Set(); this.edgesByKind.set(edge.kind, bucket); }
      bucket.add(edge.id);
    }
    this.version++;
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  removeEdge(id: string): void {
    const edge = this.edges.get(id);
    if (!edge) return;
    this.adjacency.get(edge.source)?.delete(id);
    this.reverseAdjacency.get(edge.target)?.delete(id);
    const bucket = this.edgesByKind.get(edge.kind);
    if (bucket) {
      bucket.delete(id);
      if (bucket.size === 0) this.edgesByKind.delete(edge.kind);
    }
    this.edges.delete(id);
    this.version++;
  }

  getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  edgesIter(): IterableIterator<GraphEdge> {
    return this.edges.values();
  }

  getEdgeCount(): number {
    return this.edges.size;
  }

  /**
   * Phase 2-4 — return every edge of the given kind, backed by an
   * incremental index. O(k) where k is the number of edges of that kind,
   * vs. the prior `getAllEdges().filter(e => e.kind === k)` pattern which
   * was O(|E|). Hot-path consumers: CrossBoundaryResolver, analyzers.
   */
  getEdgesByKind(kind: EdgeKind): GraphEdge[] {
    const ids = this.edgesByKind.get(kind);
    if (!ids || ids.size === 0) return [];
    const out: GraphEdge[] = [];
    for (const id of ids) {
      const e = this.edges.get(id);
      if (e) out.push(e);
    }
    return out;
  }

  edgesByKindIter(kind: EdgeKind): IterableIterator<GraphEdge> {
    const ids = this.edgesByKind.get(kind);
    const edges = this.edges;
    function* gen() {
      if (!ids) return;
      for (const id of ids) {
        const e = edges.get(id);
        if (e) yield e;
      }
    }
    return gen();
  }

  /** O(1) in-degree (number of edges where this node is the target). */
  getInDegree(nodeId: string): number {
    return this.reverseAdjacency.get(nodeId)?.size ?? 0;
  }

  /** O(1) out-degree (number of edges where this node is the source). */
  getOutDegree(nodeId: string): number {
    return this.adjacency.get(nodeId)?.size ?? 0;
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
