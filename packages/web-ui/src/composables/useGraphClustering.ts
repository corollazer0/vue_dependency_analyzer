import { ref, computed } from 'vue';
import type { GraphNode, GraphEdge } from '@/types/graph';
import { apiFetch } from '@/api/client';

const CLUSTER_THRESHOLD = 200;

interface ClusterNode {
  id: string;
  label: string;
  childCount: number;
  childKinds: Record<string, number>;
}

interface ClusterEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  kinds: string[];
}

interface ClusterData {
  clusters: ClusterNode[];
  edges: ClusterEdge[];
}

const expandedClusters = ref<Set<string>>(new Set());
const clusterData = ref<ClusterData | null>(null);
const expandedNodeCache = ref<Map<string, { nodes: GraphNode[]; edges: GraphEdge[] }>>(new Map());

export function useGraphClustering() {
  const shouldCluster = computed(() => {
    return (clusterData.value?.clusters.length || 0) > 0;
  });

  async function fetchClustered(depth: number = 1): Promise<ClusterData | null> {
    try {
      const res = await apiFetch(`/api/graph?cluster=true&depth=${depth}`);
      const data = await res.json();
      clusterData.value = data;
      return data;
    } catch {
      return null;
    }
  }

  async function expandCluster(clusterId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] } | null> {
    if (expandedNodeCache.value.has(clusterId)) {
      expandedClusters.value.add(clusterId);
      return expandedNodeCache.value.get(clusterId)!;
    }

    try {
      const res = await apiFetch(`/api/graph/cluster/${encodeURIComponent(clusterId)}`);
      const data = await res.json();
      expandedNodeCache.value.set(clusterId, data);
      expandedClusters.value.add(clusterId);
      return data;
    } catch {
      return null;
    }
  }

  function collapseCluster(clusterId: string): void {
    expandedClusters.value.delete(clusterId);
  }

  function isExpanded(clusterId: string): boolean {
    return expandedClusters.value.has(clusterId);
  }

  function needsClustering(totalNodes: number): boolean {
    return totalNodes > CLUSTER_THRESHOLD;
  }

  return {
    clusterData,
    expandedClusters,
    expandedNodeCache,
    shouldCluster,
    fetchClustered,
    expandCluster,
    collapseCluster,
    isExpanded,
    needsClustering,
  };
}
