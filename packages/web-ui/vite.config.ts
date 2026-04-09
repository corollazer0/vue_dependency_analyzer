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
    chunkSizeWarningLimit: 600, // cytoscape alone is ~567KB, this is an external lib limit
    rollupOptions: {
      output: {
        manualChunks: {
          'cytoscape': ['cytoscape', 'cytoscape-fcose'],
          'd3': ['d3-hierarchy', 'd3-selection', 'd3-zoom'],
          'vue-vendor': ['vue', 'pinia'],
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
