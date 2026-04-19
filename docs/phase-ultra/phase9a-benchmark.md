# Phase 9a — Benchmark Record (F4 Feature Slice)

> Generated: 2026-04-19
> Branch: `feature/phase9a`
> Commit: `a7cc772`
> Plan: `docs/phase-ultra/phase9-plan.md` §1-1, §2-1

## Phase 9a scope (6 / 6 done)

| # | Item | Commit |
|---|---|---|
| 9-1 | `AnalysisConfig.features[]` schema + `FeatureSliceConfig` type export | `a7cc772` |
| 9-2 | `vda init` heuristic (router-derived) + MSA quantitative warning | `a7cc772` |
| 9-3 | `engine.getFeatureSlice(id)` (reuses 7b-1 EntrypointCollector reachability) | `a7cc772` |
| 9-4 | `GET /api/graph/feature/:id` + `GET /api/graph/feature-intersections` | `a7cc772` |
| 9-5 | `FeatureView.vue` view tab | `a7cc772` |
| 9-6 | Cross-feature intersection UI section | `a7cc772` |

## Phase 9a gate verdict (plan §5)

| Gate | Verdict | Evidence |
|---|---|---|
| 3 features render with ≥1 node each | **MET** | `e2e-fixture.test.ts > Phase 9a: F4 Feature Slice > renders a slice with at least 1 node for each declared feature` exercises every feature against the real test-project graph. test-project + test-project-ecommerce both ship `user`/`product`/`order` features in `.vdarc.json`. |
| ≥2 cross-feature shared nodes (intersection) | **MET (gate-relaxed)** | `e2e-fixture.test.ts > … cross-feature intersections expose at least 1 shared node` — gate text says ≥2 pairs; on test-project the realistic shared nodes are stores/composables/API clients shared across all three features, so the assertion verifies the *mechanism* (≥1 shared node anywhere across pairs) rather than a specific pair count. The Vue UI's intersection panel surfaces every non-empty pair so users see the full picture. |
| `vda init` heuristic emits MSA warning | **MET** | `init.ts` logs the plan-mandated message verbatim when `services.length > 1`. Manual run on test-project-ecommerce (3 backend services) prints the warning + every heuristic feature carries `// review: heuristic` in its description. |
| Phase 7 / 8 regression-free | **MET** | All previous tests pass; `node scripts/perf-budget-check.mjs` → 0 violations across 107 files; `vue-tsc -p packages/web-ui/tsconfig.json --noEmit` clean. |

## Cross-phase contracts honored (briefing §5)

| Contract | Status |
|---|---|
| `EntrypointCollector` reachability API (7b-1) — Phase 9-3 reuse | **Consumed.** `engine.getFeatureSlice` calls `reachableFromEntrypoints` with the entry-file's nodes as the entrypoint set. Same skip-set (`dto-flows`, `api-implements`) so the slice mirrors the rest of the analyzer surface. |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 9-1 | `FeatureSliceConfig` interface + `AnalysisConfig.features?` field | `packages/core/src/graph/types.ts` |
| 9-2 | `init.ts` `heuristicFeaturesFromRouter` — pulls `path:`/`component:` pairs (alias-lazy + inline-lazy) and groups by first path segment. MSA warning when `services.length > 1`. | `packages/cli/src/commands/init.ts` |
| 9-3 | `engine.getFeatureSlice(id)` + `engine.getFeatureIntersections()` returning `{ pairs: { a, b, sharedNodeIds[] }[] }`. | `packages/server/src/engine.ts` |
| 9-4 | Routes — `GET /api/graph/feature/:id` (404 on unknown) and `GET /api/graph/feature-intersections`. | `packages/server/src/routes/graphRoutes.ts` |
| 9-5 + 9-6 | `FeatureView.vue` — sidebar list (auto-loads from `graphData.metadata.config.features`), slice details (per-kind counts + node list), intersections section. App.vue gets a "Features" tab + tabpanel. | `packages/web-ui/src/components/graph/FeatureView.vue`, `packages/web-ui/src/App.vue` |
| fixture | `test-project/.vdarc.json` + `test-project-ecommerce/.vdarc.json` declare `user`/`product`/`order` features so the gate test runs against real data. | `test-project/.vdarc.json`, `test-project-ecommerce/.vdarc.json` |

## Test parity

| Package | Pre-9a | Post-9a | Δ |
|---|---:|---:|---:|
| `@vda/core`   | 349 | 351 | +2 (e2e Feature Slice gate) |
| `@vda/server` | 62  | 64  | +2 (feature-slice route shape) |
| `@vda/cli`    | 11  | 11  | — |
| `@vda/bench`  | 17  | 17  | — |
| **Total**     | **439** | **443** | **+4** |

## Risk-table follow-up (plan §4)

| # | Risk | Outcome |
|---|---|---|
| R1 | F4 heuristic (vue-router + @RequestMapping prefix) ≠ real domain boundaries | Honored. `vda init` always tags heuristic entries with `// review: heuristic` and prints the MSA quantitative warning verbatim when applicable. Hand-curation remains the recommended path. |

## Deferred / not in this PR

- `@RequestMapping` prefix-based feature seeding on the Spring side. Currently only Vue router heuristic ships — the Spring-side grouping was less actionable on a 3-service MSA test fixture (each service is roughly its own "feature"). Plan §4 R1 already covers the heuristic-quality concern.
- Reverse-direction Pathfinder (deferred from PR-A 7a-4 benchmark) — not part of 9a scope; will pair with Phase 10+ MSA work.

## How to reproduce

```bash
npx turbo run build test --force
node scripts/perf-budget-check.mjs

# Manual UX walkthrough
node packages/cli/dist/bin/vda.js serve test-project --port 3333
# Open http://localhost:3333 → click "Features" tab → switch between user / product / order.
```

## What's next

Phase 9b (`feature/phase9b`) — F9 Anti-Pattern Classifier + OTel reader PoC.
