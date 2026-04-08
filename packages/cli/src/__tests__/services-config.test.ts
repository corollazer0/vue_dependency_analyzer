import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { loadConfig, runAnalysis } from '../config.js';

const msaFixturesDir = resolve(import.meta.dirname, '__fixtures__/msa-project');

describe('services[] configuration', () => {
  it('should discover files from services[] roots', async () => {
    const config = {
      projectRoot: msaFixturesDir,
      services: [
        { id: 'frontend', root: 'frontend/src', type: 'vue' as const },
        { id: 'backend', root: 'backend/src/main/java', type: 'spring-boot' as const },
      ],
    };

    const result = await runAnalysis(config, { noCache: true });
    const filePaths = result.graph.getAllNodes().map(n => n.filePath);

    // Should have discovered files from both service roots
    const vueFiles = filePaths.filter(f => f.endsWith('.vue'));
    const javaFiles = filePaths.filter(f => f.endsWith('.java'));

    expect(vueFiles.length).toBeGreaterThanOrEqual(1);
    expect(javaFiles.length).toBeGreaterThanOrEqual(1);

    // Check that App.vue from frontend was found
    expect(vueFiles.some(f => f.includes('frontend/src/App.vue'))).toBe(true);
    // Check that HelloController.java from backend was found
    expect(javaFiles.some(f => f.includes('backend/src/main/java/HelloController.java'))).toBe(true);
  });

  it('should tag nodes with serviceId from services[]', async () => {
    const config = {
      projectRoot: msaFixturesDir,
      services: [
        { id: 'frontend', root: 'frontend/src', type: 'vue' as const },
        { id: 'backend', root: 'backend/src/main/java', type: 'spring-boot' as const },
      ],
    };

    const result = await runAnalysis(config, { noCache: true });
    const nodes = result.graph.getAllNodes();

    // Every node should have a serviceId
    const frontendNodes = nodes.filter(n => n.metadata.serviceId === 'frontend');
    const backendNodes = nodes.filter(n => n.metadata.serviceId === 'backend');

    expect(frontendNodes.length).toBeGreaterThanOrEqual(1);
    expect(backendNodes.length).toBeGreaterThanOrEqual(1);

    // Frontend nodes should be vue files
    expect(frontendNodes.every(n => n.filePath.includes('frontend/src'))).toBe(true);
    // Backend nodes should be java files
    expect(backendNodes.every(n => n.filePath.includes('backend/src/main/java'))).toBe(true);
  });

  it('should fall back to projectRoot when no vueRoot, springBootRoot, or services', async () => {
    const config = {
      projectRoot: msaFixturesDir,
    };

    const result = await runAnalysis(config, { noCache: true });
    // Should still discover files (falls back to scanning everything)
    expect(result.graph.getAllNodes().length).toBeGreaterThanOrEqual(1);
  });

  it('should combine vueRoot/springBootRoot with services[]', async () => {
    const config = {
      projectRoot: msaFixturesDir,
      vueRoot: resolve(msaFixturesDir, 'frontend/src'),
      services: [
        { id: 'backend', root: 'backend/src/main/java', type: 'spring-boot' as const },
      ],
    };

    const result = await runAnalysis(config, { noCache: true });
    const filePaths = result.graph.getAllNodes().map(n => n.filePath);

    // Both vueRoot files and services[] files should be present
    const vueFiles = filePaths.filter(f => f.endsWith('.vue'));
    const javaFiles = filePaths.filter(f => f.endsWith('.java'));

    expect(vueFiles.length).toBeGreaterThanOrEqual(1);
    expect(javaFiles.length).toBeGreaterThanOrEqual(1);
  });
});
