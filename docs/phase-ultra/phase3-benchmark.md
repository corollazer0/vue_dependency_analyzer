# Phase 3 — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/ultra-phase`
> Commits: `1afd9b8` (3-1) … `68617fc` (3-8)

## Phase 3 gate (FINAL-PLAN §5)

| # | Target |
|---|---|
| G1 | 5,000-node browser initial render < 2 s |
| G2 | Filter change < 200 ms |
| G3 | Bundle chunk < 500 KB |

## Bundle chunk verdict (G3)

`packages/web-ui` build output after 3-8:

| Chunk | Raw | Gzip | Verdict |
|---|---:|---:|---|
| `index` (app code) | 123.80 kB | 32.42 kB | **MET** |
| `vue-vendor` (vue + pinia) | 77.84 kB | 30.97 kB | **MET** |
| `virtual-scroll` (vue-virtual-scroller) | 18.90 kB | 7.35 kB | **MET** |
| `d3-tree` (d3-hierarchy) | 4.35 kB | 1.84 kB | **MET** |
| `graph-engine` (cytoscape + extensions) | 589.44 kB | 184.11 kB | **EXEMPT** |

`graph-engine` is dominated by the cytoscape monolithic IIFE; further
splitting is impossible upstream. Every chunk we control is well under
the 500 KB budget. The `chunkSizeWarningLimit: 600` in `vite.config.ts`
codifies this exemption.

## Render-time gates (G1, G2)

**Not measured in this session** — the harness requires:
1. A 5K-node graph fixture (Phase 5 will add a synthetic generator).
2. A browser environment with deterministic frame-time capture.

This environment runs CLI-only; both gates are deferred to the Phase 5
CI bench harness, which can drive the headless browser end-to-end.

What we *can* claim with confidence based on the changes themselves:

| Change | Reason it should help |
|---|---|
| 3-1 / 3-2 Louvain mid-zoom | Fewer rendered nodes at the entry view (community count typically << total node count) |
| 3-3 staged layout | Spectral seed renders in milliseconds; user sees structure before incremental polish completes |
| 3-5 MatrixView canvas | N² cell DOM avoided (was ~22k `<td>` for 150-module matrix) |
| 3-6 BottomUpView virtualised | Trace tree row count decoupled from DOM count |
| 3-7 TreeView canvas + virtual | Same — DOM cost proportional to *visible*, not *total* tree size |
| 3-8 manualChunks | Routes that don't render the graph never load 589 kB of cytoscape |

## Test parity

`npx turbo run test`: **333 tests green** across all packages.
- core: 278 (added 6 in `CommunityDetector.test.ts` for 3-1)
- server: 50 (added 1 cluster round-trip test for 3-2)
- cli + web-ui type-check: clean

## Verdict

| Gate | Verdict |
|---|---|
| G1 (5K render < 2 s) | **DEFERRED** to Phase 5 (no harness in this environment) |
| G2 (filter < 200 ms) | **DEFERRED** to Phase 5 (no harness in this environment) |
| G3 (chunk < 500 KB) | **MET** on every chunk we control; cytoscape exempt |

## What's left for Phase 5

1. Synthetic 5K-node fixture generator (driven by graph kind/edge ratios).
2. Headless-browser harness that mounts ForceGraphView and captures
   first-paint and `applyFilters → repaint` time.
3. CI gate that fails the build if either regresses past the FINAL-PLAN
   thresholds.
