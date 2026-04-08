import { describe, it, expect } from 'vitest';
import { analyzeTemplate } from '../TemplateAnalyzer.js';

describe('TemplateAnalyzer', () => {
  const componentNodeId = 'vue:/test/Parent.vue';

  describe('event listener detection on custom components', () => {
    it('should detect @event listeners on custom components', () => {
      const template = `
        <div>
          <ChildComponent @submit="handleSubmit" @cancel="handleCancel" />
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(2);

      const eventNames = listenEdges.map(e => e.metadata.eventName);
      expect(eventNames).toContain('submit');
      expect(eventNames).toContain('cancel');

      // All should target the unresolved component
      for (const edge of listenEdges) {
        expect(edge.source).toBe(componentNodeId);
        expect(edge.target).toBe('component:ChildComponent');
        expect(edge.metadata.componentName).toBe('ChildComponent');
      }
    });

    it('should detect v-on:event syntax', () => {
      const template = `
        <div>
          <MyDialog v-on:close="onClose" />
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(1);
      expect(listenEdges[0].metadata.eventName).toBe('close');
      expect(listenEdges[0].metadata.componentName).toBe('MyDialog');
    });

    it('should detect kebab-case event names', () => {
      const template = `
        <div>
          <data-grid @row-selected="onSelect" @update-page="onPage" />
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(2);
      const eventNames = listenEdges.map(e => e.metadata.eventName);
      expect(eventNames).toContain('row-selected');
      expect(eventNames).toContain('update-page');
      expect(listenEdges[0].metadata.componentName).toBe('DataGrid');
    });

    it('should NOT detect @event on HTML elements', () => {
      const template = `
        <div>
          <button @click="handleClick">OK</button>
          <input @change="handleChange" />
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(0);
    });

    it('should NOT detect @event on Vue built-in components', () => {
      const template = `
        <div>
          <transition @after-enter="onEnter">
            <p>Hello</p>
          </transition>
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(0);
    });

    it('should still detect uses-component alongside event listeners', () => {
      const template = `
        <div>
          <ChildComponent @submit="handle" />
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const componentEdges = result.edges.filter(e => e.kind === 'uses-component');
      expect(componentEdges).toHaveLength(1);
      expect(componentEdges[0].metadata.componentName).toBe('ChildComponent');

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(1);
    });

    it('should create unique edge IDs for multiple events on same component', () => {
      const template = `
        <div>
          <FormWidget @save="onSave" @validate="onValidate" />
        </div>
      `;
      const result = analyzeTemplate(template, '/test/Parent.vue', componentNodeId);

      const listenEdges = result.edges.filter(e => e.kind === 'listens-event');
      expect(listenEdges).toHaveLength(2);

      const ids = listenEdges.map(e => e.id);
      expect(new Set(ids).size).toBe(2); // all unique
    });
  });
});
