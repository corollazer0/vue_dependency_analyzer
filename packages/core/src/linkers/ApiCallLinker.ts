import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphEdge } from '../graph/types.js';

export class ApiCallLinker {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '') {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
  }

  link(graph: DependencyGraph): GraphEdge[] {
    const newEdges: GraphEdge[] = [];

    // Collect all spring endpoints
    const endpoints = graph.getAllNodes().filter(n => n.kind === 'spring-endpoint');
    // Collect all api-call-site nodes
    const apiCallSites = graph.getAllNodes().filter(n => n.kind === 'api-call-site');

    for (const callSite of apiCallSites) {
      const callUrl = callSite.metadata.url as string;
      const callMethod = (callSite.metadata.httpMethod as string) || 'GET';

      if (!callUrl) continue;

      const normalizedCallUrl = this.normalizeUrl(callUrl);

      for (const endpoint of endpoints) {
        const endpointPath = endpoint.metadata.path as string;
        const endpointMethod = endpoint.metadata.httpMethod as string;

        if (!endpointPath) continue;

        // Match HTTP method
        if (callMethod.toUpperCase() !== endpointMethod.toUpperCase()) continue;

        // Match URL path — normalize both sides the same way
        const normalizedEndpointPath = this.normalizeUrl(endpointPath);
        if (this.pathsMatch(normalizedCallUrl, normalizedEndpointPath)) {
          const edge: GraphEdge = {
            id: `${callSite.id}:api-call:${endpoint.id}`,
            source: callSite.id,
            target: endpoint.id,
            kind: 'api-call',
            metadata: {
              matchedUrl: callUrl,
              matchedEndpoint: endpointPath,
              httpMethod: callMethod,
            },
          };
          newEdges.push(edge);
          graph.addEdge(edge);
        }
      }
    }

    return newEdges;
  }

  private normalizeUrl(url: string): string {
    let normalized = url;

    // Remove base URL prefix if configured
    if (this.apiBaseUrl && normalized.startsWith(this.apiBaseUrl)) {
      normalized = normalized.slice(this.apiBaseUrl.length);
    }

    // Ensure leading slash
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    // Remove trailing slash
    normalized = normalized.replace(/\/+$/, '');

    // Normalize path parameters: :id → {id}, ${xxx} → {param}
    normalized = normalized.replace(/:(\w+)/g, '{$1}');
    normalized = normalized.replace(/\$\{[^}]+\}/g, '{param}');
    // :param from template literal extraction
    normalized = normalized.replace(/:param/g, '{param}');

    return normalized || '/';
  }

  private pathsMatch(callPath: string, endpointPath: string): boolean {
    const callParts = callPath.split('/').filter(Boolean);
    const endpointParts = endpointPath.split('/').filter(Boolean);

    if (callParts.length !== endpointParts.length) return false;

    for (let i = 0; i < callParts.length; i++) {
      const cp = callParts[i];
      const ep = endpointParts[i];

      // Both are path parameters
      if (this.isPathParam(cp) && this.isPathParam(ep)) continue;

      // One is a path parameter, the other is a literal — still matches
      if (this.isPathParam(cp) || this.isPathParam(ep)) continue;

      // Literal comparison
      if (cp !== ep) return false;
    }

    return true;
  }

  private isPathParam(segment: string): boolean {
    return /^\{.+\}$/.test(segment);
  }
}
