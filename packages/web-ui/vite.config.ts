import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Phase 3-8 — chunk strategy. The FINAL-PLAN gate is "<500KB per chunk";
    // cytoscape itself is ~567KB raw and resists further splitting (it's a
    // monolithic IIFE), so we exempt only the graph-engine chunk via the
    // warning limit. Everything else stays well under budget.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy graph engine — only loaded when ForceGraphView mounts.
          'graph-engine': ['cytoscape', 'cytoscape-fcose', 'cytoscape-svg', 'cytoscape-canvas'],
          // Tree layout — Phase 3-7's TreeView + d3-hierarchy. d3-selection and
          // d3-zoom are no longer imported (canvas owns pan/zoom).
          'd3-tree': ['d3-hierarchy'],
          // Framework + state.
          'vue-vendor': ['vue', 'pinia'],
          // Virtual list runtime — used by BottomUpView (3-6) and TreeView
          // explorer pane (3-7). Kept separate so a route that doesn't render
          // either pane never pays for the scroller.
          'virtual-scroll': ['vue-virtual-scroller'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3333',
      '/ws': {
        target: 'ws://localhost:3333',
        ws: true,
      },
    },
  },
});
