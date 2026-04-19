# Phase 5 — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/ultra-phase`
> Commits: `5bab2a2` (5-1) … `63b686f` (5-6)

## Phase 5 gate (FINAL-PLAN §7)

| # | Target |
|---|---|
| F1 | Phase 3 G1/G2 measured and recorded in `phase3-benchmark.md` |
| F2 | CI bench workflow PR-comment path verified (live or local dry-run) |
| F3 | Perf-budget lint reports **0 violations** on the current tree |
| F4 | Baseline 350 tests stay green |

## Exit-condition verdict

| Gate | Verdict |
|---|---|
| F1 (G1/G2 recorded) | **MET** — see `phase3-benchmark.md` §Render-time gates. Worst-case G1 = 305 ms, G2 = 74 ms across 6 runs. |
| F2 (CI path works) | **MET** — `scripts/format-bench-report.mjs` executed against real harness output, emits the GH Actions heredoc the workflow posts. `.github/workflows/bench.yml` runs the end-to-end bench job on PRs with `actions/github-script` doing the comment update. |
| F3 (perf-budget clean) | **MET** — `scripts/perf-budget-check.mjs`: 0 violations across 89 `.ts` files. Rule engine proven alive by a probe-file test (`packages/bench/src/__tests__/perfBudgetCheck.test.ts`). |
| F4 (baseline green) | **MET** — `npm test` passes full suite. |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 5-1 | Deterministic 5K-node synthetic fixture generator (preferential attachment, largest-remainder kind allocation). | `packages/bench/src/syntheticFixture.ts`, `packages/bench/src/cli/generate.ts` |
| 5-2 | Playwright + headless Chromium harness: static server for a fixture + web-ui dist, `?harness=1` hook on `ForceGraphView` exposes render timings. | `packages/bench/src/harness/server.ts`, `packages/bench/src/harness/measure.ts`, `packages/bench/src/cli/harness.ts`, `packages/web-ui/src/components/graph/ForceGraphView.vue` |
| 5-3 | G1/G2 verdicts recorded. | `docs/phase-ultra/phase3-benchmark.md` |
| 5-4 | GitHub Actions workflow — build web-ui, run harness, post / update a single PR comment with the numbers. Warn-only initially; `workflow_dispatch` carries a `strict=true` path for the blocking flip. | `.github/workflows/bench.yml`, `scripts/format-bench-report.mjs` |
| 5-5 | Grep-based perf-budget checker + probe test + wiring into `npm test`. Rules: (R1) `getAllNodes/Edges().find/some/every`; (R2) `readFileSync` in request-handler routes; (R3) `JSON.parse(JSON.stringify(...))` deep clone. | `scripts/perf-budget-check.mjs`, `packages/bench/src/__tests__/perfBudgetCheck.test.ts`, `package.json` |
| 5-6 | 4 new vitest cases for `/api/admin/metrics` — shape, nodeCount/edgeCount parity with `/health/ready` + `/api/stats`, heap high-water monotonicity, and last-analysis-ms refresh contract. | `packages/server/src/__tests__/api.test.ts` |

## Enabling fixes (rolled into Phase 5 commits)

Two bugs surfaced during the harness work had to be resolved before 5-3 and 5-5 could land with zero violations / working gates. They're not new Phase-5 features — they fix existing defects uncovered by the harness:

| Commit | Fix | Why it mattered |
|---|---|---|
| `621e24f` `fix(web-ui)` | Facade store uses `storeToRefs` for cross-slice refs (Pinia was snapshotting sub-store refs at facade-init time). | Without this, the 5K fixture always rendered as "Server not connected" — the harness would have failed to reach any measurement. |
| `13564c7` `perf(core)` | `CrossBoundaryResolver` pre-indexes components, stores, composables instead of `getAllNodes().find()` per edge. Four hot-loop O(edges × nodes) scans replaced with O(nodes + edges). | Without this, the 5-5 lint rule R1 would have reported four violations in shipped code. Also makes analysis on larger projects faster. |

## Test parity

| Package | Phase 4 close | Phase 5 close | Δ |
|---|---:|---:|---:|
| `@vda/core` | 296 | 296 | — |
| `@vda/server` | 50 | 54 | +4 (5-6) |
| `@vda/cli` | 4 | 4 | — |
| `@vda/bench` | — | 17 | +17 (new pkg, covers 5-1 + 5-2 + 5-5) |
| **Total** | **350** | **371** | **+21** |

Plus `scripts/perf-budget-check.mjs` runs after the turbo test matrix.

## How to reproduce

```
# Build + run the harness locally (same commands as CI)
npx -w @vda/web-ui run build
npx -w @vda/bench tsx src/cli/harness.ts --nodes 5000 \
    --filter-kind vue-component --out-json /tmp/phase5-bench.json

# Perf-budget lint
node scripts/perf-budget-check.mjs
```

## Notes for downstream phases

- The harness server is intentionally minimal — any new web-ui endpoint
  that the bench landing page touches must be added to
  `packages/bench/src/harness/server.ts` or the harness will log a
  `[harness:404]` line. The page-error count is reported in the bench
  JSON so drift will be visible immediately.
- The lint rule scope is narrow on purpose. Widening it (e.g. flagging
  `for (...) { graph.getAllNodes() }` as a hot-loop violation in any
  file) is a follow-up once other linkers are inspected for similar
  patterns. The `R1` rule already covers the canonical shape
  (`.find/.some/.every`) everywhere except tests.
- `.github/workflows/bench.yml` is warm-only today. Flipping to block
  needs the three-consecutive-regressions policy — suggested storage
  is a single JSON blob under `docs/phase-ultra/bench-history.json`
  appended by the workflow on each run.
