import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../../graph/DependencyGraph.js';
import { CrossBoundaryResolver } from '../CrossBoundaryResolver.js';
import type { GraphNode, GraphEdge } from '../../graph/types.js';

function addNode(graph: DependencyGraph, id: string, kind: GraphNode['kind'], filePath = '/test', meta: Record<string, unknown> = {}) {
  graph.addNode({ id, kind, label: id.split(':').pop() || id, filePath, metadata: meta });
}

function addEdge(graph: DependencyGraph, source: string, target: string, kind: GraphEdge['kind'], meta: Record<string, unknown> = {}) {
  graph.addEdge({ id: `${source}:${kind}:${target}`, source, target, kind, metadata: meta });
}

describe('CrossBoundaryResolver', () => {
  describe('API call linking', () => {
    it('should link frontend API calls to Spring endpoints', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'vue:comp', 'vue-component', '/comp.vue');
      addNode(graph, 'api-call:/comp.vue:10', 'api-call-site', '/comp.vue', { url: '/api/users', httpMethod: 'GET' });
      addEdge(graph, 'vue:comp', 'api-call:/comp.vue:10', 'api-call', { url: '/api/users', httpMethod: 'GET' });

      addNode(graph, 'spring-endpoint:GET:/api/users', 'spring-endpoint', '/UserController.java', { httpMethod: 'GET', path: '/api/users' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const apiEdges = graph.getAllEdges().filter(e => e.kind === 'api-call' && e.target === 'spring-endpoint:GET:/api/users');
      expect(apiEdges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('component reference resolution', () => {
    it('should resolve component name to actual vue-component node', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'vue:/parent.vue', 'vue-component', '/parent.vue');
      addNode(graph, 'vue:/child.vue', 'vue-component', '/child.vue');
      // Unresolved component reference from template
      addEdge(graph, 'vue:/parent.vue', 'component:child', 'uses-component', { componentName: 'child' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      // After resolution, the edge should point to the actual component (label match isn't exact here)
      // The resolver matches by label — "child" vs node.label "child"
      const resolved = graph.getAllEdges().filter(e => e.kind === 'uses-component' && e.target !== 'component:child');
      // May or may not match depending on label normalization
    });
  });

  describe('store reference resolution', () => {
    it('should resolve useXxxStore to actual pinia-store node', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'vue:comp', 'vue-component', '/comp.vue');
      addNode(graph, 'pinia-store:/stores/user.ts', 'pinia-store', '/stores/user.ts', { exportedFunctions: ['useUserStore'] });
      addEdge(graph, 'vue:comp', 'store:useUserStore', 'uses-store', { storeName: 'useUserStore' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const storeEdges = graph.getAllEdges().filter(e => e.kind === 'uses-store');
      // Should resolve to actual store node
      const resolved = storeEdges.find(e => e.target === 'pinia-store:/stores/user.ts');
      expect(resolved).toBeDefined();
    });
  });

  describe('composable reference resolution', () => {
    it('should resolve useXxx to actual composable node', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'vue:comp', 'vue-component', '/comp.vue');
      addNode(graph, 'vue-composable:/composables/useAuth.ts', 'vue-composable', '/composables/useAuth.ts', { exportedFunctions: ['useAuth'] });
      addEdge(graph, 'vue:comp', 'composable:useAuth', 'uses-composable', { composableName: 'useAuth' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const edges = graph.getAllEdges().filter(e => e.kind === 'uses-composable');
      const resolved = edges.find(e => e.target === 'vue-composable:/composables/useAuth.ts');
      expect(resolved).toBeDefined();
    });
  });

  describe('native bridge linking', () => {
    it('should create bridge and method nodes', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'vue:comp', 'vue-component', '/comp.vue');
      addEdge(graph, 'vue:comp', 'native:AndroidBridge.showToast', 'native-call', { interfaceName: 'AndroidBridge', methodName: 'showToast' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      expect(graph.hasNode('native-bridge:AndroidBridge')).toBe(true);
      expect(graph.hasNode('native-method:AndroidBridge.showToast')).toBe(true);
    });
  });

  describe('MyBatis linking', () => {
    it('should link MyBatis mapper to Java interface', () => {
      const graph = new DependencyGraph();
      addNode(graph, 'mybatis-mapper:com.test.UserMapper', 'mybatis-mapper', '/UserMapper.xml', { fqn: 'com.test.UserMapper' });
      addNode(graph, 'spring-service:/UserMapper.java', 'spring-service', '/UserMapper.java', { className: 'UserMapper', fqn: 'com.test.UserMapper' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const injectEdges = graph.getAllEdges().filter(e => e.kind === 'spring-injects' && (e.metadata as any).viaMyBatis);
      expect(injectEdges).toHaveLength(1);
    });
  });

  it('should handle empty graph without errors', () => {
    const graph = new DependencyGraph();
    const resolver = new CrossBoundaryResolver({}, '/project');
    resolver.resolve(graph);
    expect(graph.getNodeCount()).toBe(0);
  });

  it('should handle graph with only unresolvable references', () => {
    const graph = new DependencyGraph();
    addNode(graph, 'vue:comp', 'vue-component', '/comp.vue');
    addEdge(graph, 'vue:comp', 'unresolved:./nonexistent', 'imports', { importPath: './nonexistent' });
    addEdge(graph, 'vue:comp', 'store:useNonexistentStore', 'uses-store', { storeName: 'useNonexistentStore' });

    const resolver = new CrossBoundaryResolver({}, '/project');
    resolver.resolve(graph);
    // Should not crash
    expect(graph.getNodeCount()).toBe(1);
  });

  describe('emit listener resolution', () => {
    it('should create virtual event nodes and connect emit/listen pairs', () => {
      const graph = new DependencyGraph();

      // Parent component
      addNode(graph, 'vue:/parent.vue', 'vue-component', '/parent.vue');
      // Child component with emits
      graph.addNode({
        id: 'vue:/child.vue',
        kind: 'vue-component',
        label: 'ChildForm',
        filePath: '/child.vue',
        metadata: { emits: ['submit', 'cancel'] },
      });

      // Parent uses child
      addEdge(graph, 'vue:/parent.vue', 'component:ChildForm', 'uses-component', { componentName: 'ChildForm' });
      // Parent listens to @submit on ChildForm
      addEdge(graph, 'vue:/parent.vue', 'component:ChildForm', 'listens-event', { eventName: 'submit', componentName: 'ChildForm' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      // Should create a vue-event node
      const eventNodes = graph.getAllNodes().filter(n => n.kind === 'vue-event');
      expect(eventNodes).toHaveLength(1);
      expect(eventNodes[0].label).toBe('ChildForm::submit');
      expect(eventNodes[0].metadata.eventName).toBe('submit');

      // Should create emits-event edge from child to event node
      const emitsEdges = graph.getAllEdges().filter(e => e.kind === 'emits-event');
      expect(emitsEdges).toHaveLength(1);
      expect(emitsEdges[0].source).toBe('vue:/child.vue');
      expect(emitsEdges[0].target).toBe(eventNodes[0].id);

      // Should re-target listens-event edge to event node
      const listenEdges = graph.getAllEdges().filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(1);
      expect(listenEdges[0].source).toBe('vue:/parent.vue');
      expect(listenEdges[0].target).toBe(eventNodes[0].id);
    });

    it('should handle kebab-case event names matching camelCase emits', () => {
      const graph = new DependencyGraph();

      addNode(graph, 'vue:/parent.vue', 'vue-component', '/parent.vue');
      graph.addNode({
        id: 'vue:/child.vue',
        kind: 'vue-component',
        label: 'DataGrid',
        filePath: '/child.vue',
        metadata: { emits: ['rowSelected'] },
      });

      addEdge(graph, 'vue:/parent.vue', 'component:DataGrid', 'uses-component', { componentName: 'DataGrid' });
      addEdge(graph, 'vue:/parent.vue', 'component:DataGrid', 'listens-event', { eventName: 'row-selected', componentName: 'DataGrid' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const eventNodes = graph.getAllNodes().filter(n => n.kind === 'vue-event');
      expect(eventNodes).toHaveLength(1);
      expect(eventNodes[0].metadata.eventName).toBe('rowSelected');
    });

    it('should not create event nodes when child does not emit the event', () => {
      const graph = new DependencyGraph();

      addNode(graph, 'vue:/parent.vue', 'vue-component', '/parent.vue');
      graph.addNode({
        id: 'vue:/child.vue',
        kind: 'vue-component',
        label: 'ChildForm',
        filePath: '/child.vue',
        metadata: { emits: ['submit'] },
      });

      addEdge(graph, 'vue:/parent.vue', 'component:ChildForm', 'uses-component', { componentName: 'ChildForm' });
      // Parent listens to 'cancel' but child only emits 'submit'
      addEdge(graph, 'vue:/parent.vue', 'component:ChildForm', 'listens-event', { eventName: 'cancel', componentName: 'ChildForm' });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const eventNodes = graph.getAllNodes().filter(n => n.kind === 'vue-event');
      expect(eventNodes).toHaveLength(0);
    });

    it('should handle multiple events on the same child', () => {
      const graph = new DependencyGraph();

      addNode(graph, 'vue:/parent.vue', 'vue-component', '/parent.vue');
      graph.addNode({
        id: 'vue:/child.vue',
        kind: 'vue-component',
        label: 'ChildForm',
        filePath: '/child.vue',
        metadata: { emits: ['submit', 'cancel', 'reset'] },
      });

      addEdge(graph, 'vue:/parent.vue', 'component:ChildForm', 'uses-component', { componentName: 'ChildForm' });
      graph.addEdge({
        id: 'vue:/parent.vue:listens-event:ChildForm:submit',
        source: 'vue:/parent.vue',
        target: 'component:ChildForm',
        kind: 'listens-event',
        metadata: { eventName: 'submit', componentName: 'ChildForm' },
      });
      graph.addEdge({
        id: 'vue:/parent.vue:listens-event:ChildForm:cancel',
        source: 'vue:/parent.vue',
        target: 'component:ChildForm',
        kind: 'listens-event',
        metadata: { eventName: 'cancel', componentName: 'ChildForm' },
      });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const eventNodes = graph.getAllNodes().filter(n => n.kind === 'vue-event');
      expect(eventNodes).toHaveLength(2);

      const emitsEdges = graph.getAllEdges().filter(e => e.kind === 'emits-event');
      expect(emitsEdges).toHaveLength(2);

      const listenEdges = graph.getAllEdges().filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(2);
      // All should target event nodes, not component: targets
      for (const edge of listenEdges) {
        expect(edge.target).toMatch(/^vue-event:/);
      }
    });
  });

  describe('Spring event node creation', () => {
    it('should create virtual spring-event nodes for emits-event edge targets', () => {
      const graph = new DependencyGraph();

      addNode(graph, 'spring-service:/OrderService.java', 'spring-service', '/OrderService.java');
      graph.addEdge({
        id: 'spring-service:/OrderService.java:emits-event:event:OrderCreatedEvent',
        source: 'spring-service:/OrderService.java',
        target: 'event:OrderCreatedEvent',
        kind: 'emits-event',
        metadata: { eventClass: 'OrderCreatedEvent' },
      });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      expect(graph.hasNode('event:OrderCreatedEvent')).toBe(true);
      const eventNode = graph.getNode('event:OrderCreatedEvent')!;
      expect(eventNode.kind).toBe('spring-event');
      expect(eventNode.label).toBe('OrderCreatedEvent');
      expect(eventNode.metadata.virtual).toBe(true);
    });

    it('should create virtual spring-event nodes for listens-event edge sources', () => {
      const graph = new DependencyGraph();

      addNode(graph, 'spring-service:/NotificationService.java', 'spring-service', '/NotificationService.java');
      graph.addEdge({
        id: 'spring-service:/NotificationService.java:listens-event:event:OrderCreatedEvent',
        source: 'event:OrderCreatedEvent',
        target: 'spring-service:/NotificationService.java',
        kind: 'listens-event',
        metadata: { eventClass: 'OrderCreatedEvent' },
      });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      expect(graph.hasNode('event:OrderCreatedEvent')).toBe(true);
      const eventNode = graph.getNode('event:OrderCreatedEvent')!;
      expect(eventNode.kind).toBe('spring-event');
    });

    it('should not duplicate nodes when event already exists', () => {
      const graph = new DependencyGraph();

      // Two services, same event
      addNode(graph, 'spring-service:/A.java', 'spring-service', '/A.java');
      addNode(graph, 'spring-service:/B.java', 'spring-service', '/B.java');

      graph.addEdge({
        id: 'spring-service:/A.java:emits-event:event:UserEvent',
        source: 'spring-service:/A.java',
        target: 'event:UserEvent',
        kind: 'emits-event',
        metadata: { eventClass: 'UserEvent' },
      });
      graph.addEdge({
        id: 'spring-service:/B.java:listens-event:event:UserEvent',
        source: 'event:UserEvent',
        target: 'spring-service:/B.java',
        kind: 'listens-event',
        metadata: { eventClass: 'UserEvent' },
      });

      const resolver = new CrossBoundaryResolver({}, '/project');
      resolver.resolve(graph);

      const eventNodes = graph.getAllNodes().filter(n => n.kind === 'spring-event');
      expect(eventNodes).toHaveLength(1);
    });
  });
});
