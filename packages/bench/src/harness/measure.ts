// Phase 5-2 harness measurement. Drives a headless Chromium via Playwright,
// records G1 (first render) and G2 (filter repaint) against the synthetic
// fixture served by the harness server.
import type { Browser, BrowserContext, Page } from 'playwright';

export interface MeasureOptions {
  /** Full URL to the harness server root, e.g. http://127.0.0.1:12345 */
  baseUrl: string;
  /** Node kind to toggle for the G2 filter measurement. */
  filterKind: string;
  /** Max wall-time to wait for first render, ms. Default 30_000. */
  firstPaintTimeoutMs?: number;
  /** Max wall-time to wait for filter repaint, ms. Default 10_000. */
  filterTimeoutMs?: number;
}

// Declare the in-page globals `@vda/bench` cares about; the measurement
// callbacks run in the browser so `window.performance` / `document` exist there.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const globalThis: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface MeasurementResult {
  firstPaintMs: number;
  filterMs: number;
  nodeCount: number;
  edgeCount: number;
  userAgent: string;
  chromiumVersion: string;
  pageErrors: string[];
}

export async function runMeasurement(opts: MeasureOptions): Promise<MeasurementResult> {
  // Dynamic import so importing `@vda/bench` doesn't require playwright at
  // build time — only the measurement path needs it.
  const { chromium } = await import('playwright');
  const firstPaintTimeout = opts.firstPaintTimeoutMs ?? 30_000;
  const filterTimeout = opts.filterTimeoutMs ?? 10_000;

  let browser: Browser | null = null;
  let ctx: BrowserContext | null = null;
  let page: Page | null = null;
  const pageErrors: string[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    const chromiumVersion = browser.version();
    ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    page = await ctx.newPage();
    page.on('pageerror', (e) => {
      pageErrors.push(String(e));
      process.stderr.write(`[harness:pageerror] ${e}\n`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        pageErrors.push(`[console] ${msg.text()}`);
        process.stderr.write(`[harness:console] ${msg.text()}\n`);
      }
    });
    page.on('requestfailed', (req) => {
      process.stderr.write(`[harness:requestfailed] ${req.url()} — ${req.failure()?.errorText}\n`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400) {
        process.stderr.write(`[harness:${res.status()}] ${res.url()}\n`);
      }
    });

    const url = `${opts.baseUrl.replace(/\/$/, '')}/?harness=1`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // G1 — first render time. Wait for the harness hook (installed inside
    // ForceGraphView's initCytoscape()) to record `firstPaintAt`. Value is
    // relative to the page's `performance.timeOrigin`, which matches navigation
    // start closely enough for a <2s gate check.
    const firstPaintHandle = await page.waitForFunction(
      // `window` is the page-context window, not the Node-context one.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => {
        const h = (globalThis as any).__vdaHarness;
        return h && typeof h.firstPaintAt === 'number' ? h.firstPaintAt : false;
      },
      null,
      { timeout: firstPaintTimeout },
    );
    const firstPaintMs = (await firstPaintHandle.jsonValue()) as number;

    // Let the layout settle before the filter run — a still-running fcose stage
    // would confound the G2 measurement.
    await page.waitForTimeout(500);

    // G2 — filter repaint. Invoke the harness-exposed toggle, which resolves
    // with the delta between calling `toggleNodeKind()` and the next Cytoscape
    // render event.
    const filterMs = await page.evaluate(async (kind: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = (globalThis as any).__vdaHarness;
      if (!h || typeof h.toggleFilter !== 'function') throw new Error('harness not ready');
      return h.toggleFilter(kind) as Promise<number>;
    }, opts.filterKind);

    const userAgent = await page.evaluate(() => navigator.userAgent);

    // Pull the fixture counts out of the served graph for the bench report.
    const graphCounts = await page.evaluate(async () => {
      const res = await fetch('/api/graph');
      const g = (await res.json()) as { nodes: unknown[]; edges: unknown[] };
      return { nodeCount: g.nodes.length, edgeCount: g.edges.length };
    });

    return {
      firstPaintMs: Math.round(firstPaintMs),
      filterMs: Math.round(filterMs as number),
      nodeCount: graphCounts.nodeCount,
      edgeCount: graphCounts.edgeCount,
      userAgent,
      chromiumVersion,
      pageErrors,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (ctx) await ctx.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
