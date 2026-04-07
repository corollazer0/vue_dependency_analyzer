import { DependencyGraph } from '../graph/DependencyGraph.js';
import type { GraphEdge, GraphNode } from '../graph/types.js';

export class NativeBridgeLinker {
  link(graph: DependencyGraph): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];

    // Find all native-call edges and create bridge/method nodes if they don't exist
    const nativeCallEdges = graph.getAllEdges().filter(e => e.kind === 'native-call');
    const createdBridges = new Set<string>();
    const createdMethods = new Set<string>();

    for (const edge of nativeCallEdges) {
      const interfaceName = edge.metadata.interfaceName as string;
      const methodName = edge.metadata.methodName as string;

      if (!interfaceName) continue;

      // Create bridge node if not exists
      const bridgeNodeId = `native-bridge:${interfaceName}`;
      if (!graph.hasNode(bridgeNodeId) && !createdBridges.has(bridgeNodeId)) {
        const bridgeNode: GraphNode = {
          id: bridgeNodeId,
          kind: 'native-bridge',
          label: interfaceName,
          filePath: '',
          metadata: {
            interfaceName,
            platform: guessPlatform(interfaceName),
            methods: [],
          },
        };
        graph.addNode(bridgeNode);
        newNodes.push(bridgeNode);
        createdBridges.add(bridgeNodeId);
      }

      // Create method node if not exists
      if (methodName) {
        const methodNodeId = `native-method:${interfaceName}.${methodName}`;
        if (!graph.hasNode(methodNodeId) && !createdMethods.has(methodNodeId)) {
          const methodNode: GraphNode = {
            id: methodNodeId,
            kind: 'native-method',
            label: `${interfaceName}.${methodName}`,
            filePath: '',
            metadata: { interfaceName, methodName },
          };
          graph.addNode(methodNode);
          newNodes.push(methodNode);
          createdMethods.add(methodNodeId);

          // Link method to bridge
          const bridgeEdge: GraphEdge = {
            id: `${bridgeNodeId}:api-serves:${methodNodeId}`,
            source: bridgeNodeId,
            target: methodNodeId,
            kind: 'api-serves',
            metadata: {},
          };
          graph.addEdge(bridgeEdge);
          newEdges.push(bridgeEdge);
        }

        // Update the native-call edge target to point to the method node
        edge.target = `native-method:${interfaceName}.${methodName}`;
      }

      // Track methods on bridge node
      const bridgeNode = graph.getNode(bridgeNodeId);
      if (bridgeNode && methodName) {
        const methods = (bridgeNode.metadata.methods as string[]) || [];
        if (!methods.includes(methodName)) {
          methods.push(methodName);
          bridgeNode.metadata.methods = methods;
        }
      }
    }

    return { nodes: newNodes, edges: newEdges };
  }
}

function guessPlatform(interfaceName: string): string {
  const lower = interfaceName.toLowerCase();
  if (lower.includes('android')) return 'android';
  if (lower.includes('ios') || lower.includes('webkit')) return 'ios';
  return 'unknown';
}
