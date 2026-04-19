import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../DependencyGraph.js';
import { toMermaid, toPlantUML } from '../serializer.js';

function buildTestGraph(): DependencyGraph {
  const graph = new DependencyGraph();
  graph.addNode({ id: 'vue:Login', kind: 'vue-component', label: 'Login', filePath: '/Login.vue', metadata: {} });
  graph.addNode({ id: 'api:getUsers', kind: 'api-call-site', label: 'GET /api/users', filePath: '/api.ts', metadata: {} });
  graph.addNode({ id: 'spring:UserController', kind: 'spring-controller', label: 'UserController', filePath: '/UserController.java', metadata: {} });
  graph.addEdge({ id: 'e1', source: 'vue:Login', target: 'api:getUsers', kind: 'api-call', metadata: {} });
  graph.addEdge({ id: 'e2', source: 'api:getUsers', target: 'spring:UserController', kind: 'api-call', metadata: {} });
  return graph;
}

describe('toMermaid', () => {
  it('should produce valid Mermaid graph', () => {
    const graph = buildTestGraph();
    const mermaid = toMermaid(graph);

    expect(mermaid).toContain('graph LR');
    expect(mermaid).toContain('Login');
    expect(mermaid).toContain('UserController');
    expect(mermaid).toContain('-->|api-call|');
    expect(mermaid).toContain('classDef vue_component');
    expect(mermaid).toContain('classDef api_call_site');
  });

  it('should filter by nodeKinds', () => {
    const graph = buildTestGraph();
    const mermaid = toMermaid(graph, { nodeKinds: ['vue-component'] });

    expect(mermaid).toContain('Login');
    expect(mermaid).not.toContain('UserController');
  });

  it('should handle empty graph', () => {
    const graph = new DependencyGraph();
    const mermaid = toMermaid(graph);

    expect(mermaid).toContain('graph LR');
  });
});

describe('toPlantUML', () => {
  it('should produce valid PlantUML', () => {
    const graph = buildTestGraph();
    const puml = toPlantUML(graph);

    expect(puml).toContain('@startuml');
    expect(puml).toContain('@enduml');
    expect(puml).toContain('component');
    expect(puml).toContain('Login');
    expect(puml).toContain('UserController');
    expect(puml).toContain('--> ');
    expect(puml).toContain(': api-call');
  });

  it('should filter by edgeKinds', () => {
    const graph = buildTestGraph();
    // Filter to only imports (none exist) — should have nodes but no edges
    const puml = toPlantUML(graph, { edgeKinds: ['imports'] });

    expect(puml).toContain('@startuml');
    // No edges should be present since no 'imports' edges exist
    expect(puml).not.toContain(': api-call');
  });

  it('should handle empty graph', () => {
    const graph = new DependencyGraph();
    const puml = toPlantUML(graph);

    expect(puml).toContain('@startuml');
    expect(puml).toContain('@enduml');
  });
});
