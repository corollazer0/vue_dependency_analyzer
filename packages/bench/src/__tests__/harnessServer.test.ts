import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateSyntheticGraph } from '../syntheticFixture.js';
import { startHarnessServer, type HarnessServerHandle } from '../harness/server.js';

// Self-contained web-ui dist stub — the server only needs index.html + one
// asset to exercise both routes.
function writeMinimalWebUi(dir: string) {
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body>stub</body></html>');
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log("stub");');
}

describe('harness server', () => {
  let server: HarnessServerHandle;
  let baseUrl: string;
  let tmp: string;

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'vda-harness-test-'));
    const fixturePath = join(tmp, 'graph.json');
    const webUiDist = join(tmp, 'web-ui-dist');
    writeFileSync(fixturePath, JSON.stringify(generateSyntheticGraph({ nodeCount: 300, seed: 1 })));
    writeMinimalWebUi(webUiDist);
    server = await startHarnessServer({ fixturePath, webUiDist });
    baseUrl = `http://127.0.0.1:${server.port}`;
  });

  afterAll(async () => {
    await server.close();
  });

  it('serves the fixture at /api/graph', async () => {
    const res = await fetch(`${baseUrl}/api/graph`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    const body = await res.json() as { nodes: unknown[]; edges: unknown[] };
    expect(body.nodes.length).toBe(300);
    expect(body.edges.length).toBeGreaterThan(0);
  });

  it('serves empty overlays', async () => {
    const res = await fetch(`${baseUrl}/api/graph/overlays`);
    expect(res.status).toBe(200);
    const body = await res.json() as { circularNodeIds: unknown[] };
    expect(body.circularNodeIds).toEqual([]);
  });

  it('reports auth disabled', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    const body = await res.json() as { authEnabled: boolean; user: null };
    expect(body.authEnabled).toBe(false);
    expect(body.user).toBeNull();
  });

  it('returns 404 for unknown /api/* paths', async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it('serves static assets from webUiDist', async () => {
    const res = await fetch(`${baseUrl}/assets/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
    expect(await res.text()).toContain('stub');
  });

  it('falls back to index.html for SPA routes', async () => {
    const res = await fetch(`${baseUrl}/arbitrary/deep/path`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('stub');
  });

  it('rejects a fixture that is not SerializedGraph-shaped', async () => {
    const tmp2 = mkdtempSync(join(tmpdir(), 'vda-harness-bad-'));
    const badFixture = join(tmp2, 'bad.json');
    const webUiDist = join(tmp2, 'web-ui-dist');
    writeFileSync(badFixture, JSON.stringify({ not: 'graph-shaped' }));
    writeMinimalWebUi(webUiDist);
    await expect(startHarnessServer({ fixturePath: badFixture, webUiDist })).rejects.toThrow(/SerializedGraph/);
  });

  it('rejects a missing web-ui dist', async () => {
    const fixturePath = join(tmp, 'graph.json');
    expect(existsSync(fixturePath)).toBe(true);
    await expect(startHarnessServer({ fixturePath, webUiDist: '/definitely/does/not/exist' }))
      .rejects.toThrow(/index\.html not found/);
  });
});
