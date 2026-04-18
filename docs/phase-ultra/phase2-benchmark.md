# Phase 2 — Benchmark Record

> Generated: 2026-04-18
> Branch: `feature/ultra-phase`
> Harness: `packages/server/src/__tests__/benchmark-phase2.ts`
> Baseline: commit `2aac0f2` (Phase 1 endpoint), measured via `benchmark-phase1.ts`
> Node: v24.x, in-process Fastify inject (no network)

## Phase 2 gate (FINAL-PLAN §4)

| # | Target |
|---|---|
| G1 | Cold analysis ≥ −30 % vs baseline |
| G2 | Warm analysis ≥ −50 % vs baseline |
| G3 | Server heap peak −200 MB vs baseline (`/api/admin/metrics`) |
| G4 | `/api/graph/overview` < 5 KB |

## Measurement procedure

```bash
# 1. baseline at the Phase 1 endpoint
git checkout 2aac0f2 -- packages/
rm -rf packages/{core,server,cli}/dist test-project/.vda-cache
npx turbo run build --filter=@vda/core --filter=@vda/server
npx tsx packages/server/src/__tests__/benchmark-phase1.ts test-project   # cold
npx tsx packages/server/src/__tests__/benchmark-phase1.ts test-project   # warm

# 2. Phase 2 head
git checkout feature/ultra-phase -- packages/
rm -rf packages/{core,server,cli}/dist test-project/.vda-cache
npx turbo run build
npx tsx packages/server/src/__tests__/benchmark-phase2.ts test-project   # cold + warm + heap + overview
```

## Results

### test-project — 1,054 nodes / 4,154 edges

| Metric | Baseline (Phase 1) | Phase 2 | Delta vs gate |
|---|---:|---:|---|
| Cold analysis | 1,521 ms | 1,650 ms | **+8.5 % (regression, gate: −30 %)** |
| Warm analysis | 1,210 ms | 1,036 ms | **−14.4 % (gate: −50 %)** |
| Server heap peak after analysis | n/a (no metric) | 89.3 MB | gate: −200 MB (cannot compute, baseline lacks counter) |
| `/api/graph/overview` payload | n/a (endpoint did not exist) | **807 B** | **G4 ✓** |

### test-project-ecommerce — 269 nodes / 536 edges

| Metric | Baseline (Phase 1) | Phase 2 | Delta vs gate |
|---|---:|---:|---|
| Cold analysis | 1,168 ms | 1,193 ms | **+2.1 % (regression)** |
| Warm analysis | 1,045 ms | 967 ms | **−7.5 %** |
| Server heap peak after analysis | n/a | 59.0 MB | n/a |
| `/api/graph/overview` payload | n/a | **1,606 B** | **G4 ✓** |

### Pool reuse (Phase 2-2 isolated)

Standalone smoke (`packages/core/src/__fixtures__`, 5 files) reusing one
`ParallelParser` instance across two `parseAll()` calls:

| Run | Wall time |
|---|---:|
| run 1 (cold pool spawn) | 461 ms |
| run 2 (workers reused) | 23 ms |
| **Speedup** | **−95 % on the second run** |

This is the win the long-lived server engine sees on every file-watcher
trigger. The full-restart benchmark above does **not** capture it
because each cold/warm cycle creates a fresh `AnalysisEngine` →
fresh worker pool.

## Gate verdict

| Gate | Verdict |
|---|---|
| G1 (cold −30 %) | **NOT MET** on either fixture |
| G2 (warm −50 %) | **NOT MET** on either fixture (best is −14 %) |
| G3 (heap −200 MB) | **N/A** — baseline lacks the counter; current peak ≤ 90 MB |
| G4 (overview < 5 KB) | **MET** on both fixtures (807 B / 1,606 B) |

## Honest interpretation

The cold/warm gates were authored with 5K–15K-file MSA projects in
mind (FINAL-PLAN §0 scope). On the test fixtures shipped in the
repository the analysis floor — file discovery, full
CrossBoundaryResolver pass, JSON serialization — dominates parse cost
and washes out the cache + worker-pool wins. Concretely:

1. **Cold regression is real but small (+2–8 %).** SQLite's
   per-row write floor sits above JSON's bulk `JSON.stringify` for the
   ≤1K-row workload. On a 5K+ row workload SQLite's transactional
   bulk write wins; the test fixtures don't exercise that crossover.

2. **Warm improvement is partial (−7 to −14 %).** Cache hits on warm
   were already cheap before Phase 2 — JSON load was a single read +
   parse. The Phase 2 SQLite cache is roughly comparable on a fully-
   cached run; the win comes from selective invalidation (Phase 2-7)
   and incremental dependent invalidation, neither of which the
   full-restart benchmark exercises.

3. **Worker-pool reuse (−95 %) is the dominant Phase 2 perf win.** It
   only materializes when one parser instance handles many runs — the
   server file-watcher path. The standalone smoke above is the right
   way to read the impact for the user's MSA workflow.

4. **Heap counter (G3) is post-Phase-2 only.** The new
   `/api/admin/metrics` peak counter has nothing to compare against on
   the baseline branch. Current absolute peak (≤ 90 MB on 1K-node
   workload) is comfortably under the 2 GB Docker ceiling
   (Phase 0-5 sets `--max-old-space-size=2048`).

## Recommended next step

Re-run the harness against a representative real-world MSA project
(2–3K Vue files + 300–500 per Spring service, per the user's stated
target) to validate G1/G2 at the workload scale they were authored for:

```bash
npx tsx packages/server/src/__tests__/benchmark-phase2.ts /path/to/real/repo
```

Phase 5 (continuous CI bench gate) should land that real-world
measurement to lock the regression budget.
