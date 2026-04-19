# Phase 10 — Benchmark Record (Polish & Promises)

> Generated: 2026-04-19
> Branch: `feature/phase10`
> Plan: `docs/phase-ultra/phase10-plan.md`
> Carry-over scope: 10 deferred items from Phase 7~9 benchmarks

## Phase 10 scope (10 / 10 done)

| # | Item | Commit |
|---|---|---|
| 10-1  | Pathfinder `findPaths({direction: 'reverse'})` + `/api/graph/paths?dir=reverse` + UI Direction toggle | `f422431` |
| 10-2  | Universal parser `metadata.lineCount` + `metadata.packageCount` (TS / Vue / Java) | `3fbf685` |
| 10-3  | `runAnalysis({ signaturesOnly: true })` skips linker + analyzer stages | `607b335` |
| 10-4  | `SignatureRecord.previousId` + rename pairing heuristic; `BreakingChangeDetector` excludes paired removes from B1 | `a17d6fa` |
| 10-5  | `LayerDefinition.where:` metadata predicate, compiled into `ArchitectureRule.fromWhere/toWhere` and applied per-node by `RuleEngine` | `f88105e` |
| 10-6  | `GET /api/files/tree?root=&depth=` + ChangeImpactPanel "Files (tree)" mode (lazy, path-jailed) | `af5958c` |
| 10-7  | `formatPrReport({ format: 'gitlab-mr' })` + `vda impact --format gitlab-mr` (back-compat default) | `c5365a9` |
| 10-8  | `@vda/bench` `--audit` (axe-core injection) + `bench.yml` strict-mode A1 gate (critical = 0) | `d4f18f7` |
| 10-9  | `scripts/validate-workflow.sh` (`act --dryrun` with graceful skip) + `vda-pr-report.yml` self-test step | `d1baf12` |
| 10-10 | `test-project-ecommerce/.phase9-fixtures/anti-patterns/` synthetic fixtures + e2e 4-tag gate | `75fe5d3` |

## Phase 10 gate verdict (plan §3 / §7)

| Gate | Verdict | Evidence |
|---|---|---|
| 10건 모두 commit + 회귀 0 | **MET** | 10 commits on the branch, full suite green (493 tests, see Test parity), `npm test` → 0 perf-budget violations. |
| `/api/graph/paths?dir=reverse` 응답 = forward 와 동일 형식 (계약 freeze) | **MET** | `api.test.ts > should accept dir=reverse and return the same response shape as forward` asserts `{paths: string[][], count: number}` shape parity. Core also has `findPaths reverse and forward return the same response shape` (`DependencyGraph.test.ts`). |
| `--signatures-only` 실측 ≤ 35% wall-time | **WAIVED** | 35% target was set against large monorepos. Measured: test-project (small) = 88-91%, test-project-ecommerce (148 source files) = ~100%. **Why**: the linker + analyzer cost is sub-linear in file count and parsing already dominates on these fixtures. The `signaturesOnly` path correctly skips `CrossBoundaryResolver.resolve`, `findCircularDependencies`, `findOrphanNodes` (verified by `signatures-only.test.ts > skips linker`). The 35% gate is therefore tracked as a future-fixture concern (revisit when a >5K-file fixture lands). |
| LayerDsl `where:` 매칭 단위 테스트 ≥ 2건 | **MET** | `LayerDsl.test.ts > compiles where: into rule fromWhere/toWhere fields` + `where: predicate at evaluateRules narrows actual matched nodes` (2 dedicated tests; existing 5 LayerDsl tests still green). |
| ChangeImpactPanel 3 모드 (git / manual / files) 토글 회귀 없음 | **MET** | Tab markup includes `role="tablist"` with all 3 buttons; `mode === 'manual'` + `mode === 'files'` branches preserve the existing `mode === 'git'` path. `vue-tsc --noEmit` passes (no shape regressions in `activeFiles()` switch). |
| gitlab-mr / github-pr snapshot 모두 marker 동일 | **MET** | `prReport.test.ts > format=gitlab-mr swaps the breaking-risks markers but keeps all other content` confirms identical body up to marker prefix swap; `default format keeps the github-pr markers (back-compat)` keeps existing snapshot stable. |
| axe-core CI strict 모드: critical = 0 통과 / > 0 실패 | **MET (shape)** | `axeAudit.test.ts` asserts axe-core resolvability + the bucket taxonomy + the gate logic (`critical=0 → MET`, `critical=1 → NOT MET`). The CI workflow gate was extended in `bench.yml`. Live audit run against the rendered UI not exercised in this PR (workflow_dispatch strict), but the gate code path is unit-tested. |
| 9b 의 e2e anti-pattern 게이트 ≥3 → ≥4 로 강화 | **MET** | `e2e-fixture.test.ts > Phase 10-10 > classifies all 4 anti-pattern tags (4-tag gate)` — exact-match assertion on `['cyclic-cluster','entry-hub','god-object','utility-sink']`. The legacy ≥3 test on test-project remains untouched (now also passes 4/4 thanks to Phase 10-2 lineCount). |
| Phase 7 / 8 / 9a / 9b regression-free | **MET** | All previous suites green; `vue-tsc --noEmit` clean for `web-ui`; perf-budget 0 violations. |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 10-1 | `findPaths` accepts `direction: 'forward' \| 'reverse'`; reverse walks in-edges. Server route adds `dir` query param. UI gets a Forward/Reverse toggle in PathfinderPanel options. | `core/src/graph/query.ts`, `server/src/routes/graphRoutes.ts`, `server/src/engine.ts`, `web-ui/src/components/graph/PathfinderPanel.vue` |
| 10-2 | New `core/src/parsers/_shared/fileMetrics.ts` helpers (`countLines`, `topLevelPackage`, `distinctPackageCount`, `distinctJavaPackageCount`). All three parsers stamp `lineCount` + `packageCount` on every node they emit; child nodes inherit the same value (single-pass). | `core/src/parsers/typescript/TsFileParser.ts`, `core/src/parsers/vue/VueSfcParser.ts`, `core/src/parsers/java/JavaFileParser.ts`, `core/src/parsers/_shared/fileMetrics.ts` |
| 10-3 | `runAnalysis` accepts `{ signaturesOnly: true }`. When set, skips `CrossBoundaryResolver.resolve` + `findCircularDependencies` + `findOrphanNodes`. `vda analyze --signatures-only` flows through this path. SignatureStore.snapshot reads parser-emitted nodes directly so DTO/endpoint records are unchanged. | `cli/src/config.ts`, `cli/src/commands/analyze.ts` |
| 10-4 | `SignatureRecord.previousId?` + `SignatureDiff.renamed[]`. `SignatureStore.diff` runs a strict 1:1 simple-className+fieldName pairing pass on `removed[] / added[]` for `dto-field` records. `BreakingChangeDetector` skips B1 for ids in `diff.renamed`. | `core/src/engine/SignatureStore.ts`, `core/src/analyzers/BreakingChangeDetector.ts` |
| 10-5 | `LayerDefinition.where: { [k]: string\|boolean }` compiled onto `ArchitectureRule.fromWhere/toWhere`. `RuleEngine` checks the predicate against `node.metadata` for `deny-direct` and `allow-only` rule kinds. | `core/src/graph/types.ts`, `core/src/analyzers/LayerDsl.ts`, `core/src/analyzers/RuleEngine.ts` |
| 10-6 | `GET /api/files/tree?root=&depth=` returns repo-relative entries (lazy: depth=1 default + on-demand expand). Path-jailed to projectRoot, skips heavy/system dirs. UI: third tab "Files (tree)" with checkbox-per-file selection. | `server/src/routes/analysisRoutes.ts`, `web-ui/src/components/ChangeImpactPanel.vue` |
| 10-7 | `BREAKING_RISKS_START_GITLAB` / `_END_GITLAB` markers + `PrReportFormat` union. Default stays `github-pr`. `vda impact --format gitlab-mr` switches the marker prefix; everything else identical to GitHub output. | `cli/src/commands/prReport.ts`, `cli/src/commands/impact.ts`, `cli/src/index.ts` |
| 10-8 | `@vda/bench` adds `axe-core` devDep + `--audit` flag. `runMeasurement` injects `axe.min.js` after G1/G2 measurement, marks canvases aria-hidden, runs `axe.run()`, buckets violations by impact. CI strict mode runs `--audit --audit-out audit.json` and gates on `A1_verdict` alongside G1/G2. | `bench/package.json`, `bench/src/harness/measure.ts`, `bench/src/cli/harness.ts`, `.github/workflows/bench.yml` |
| 10-9 | `scripts/validate-workflow.sh` runs `act --dryrun` per workflow file. Graceful skip (exit 0) when act isn't installed (default GH runners). `vda-pr-report.yml` invokes the script as its first build step. | `scripts/validate-workflow.sh`, `.github/workflows/vda-pr-report.yml` |
| 10-10 | `test-project-ecommerce/.phase9-fixtures/anti-patterns/` — `god-object.ts` (10 imports + >400 lines + 10 packages), `hub.ts` + 10 importer-NN.ts (entry-hub fan-in 10), `sink.ts` (utility-sink fan-in 10, fan-out 0), `cyclic-A/B/C/D.ts` (4-node SCC). New e2e block parses only this dir + asserts the 4-tag gate. | `test-project-ecommerce/.phase9-fixtures/anti-patterns/*`, `core/src/__tests__/e2e-fixture.test.ts` |

## Test parity

| Package | Pre-10 (post-9b) | Post-10 | Δ |
|---|---:|---:|---:|
| `@vda/core`   | 377 | 387 | +10 (5 fileMetrics + 3 SignatureStore rename + 2 LayerDsl + 2 BreakingChangeDetector + 2 universal-metadata + 1 reverse-paths + 1 e2e Phase 10-10 minus 6 already-counted in 7 freeze) |
| `@vda/server` | 65  | 67  | +2 (file-tree + dir=reverse freeze) |
| `@vda/cli`    | 14  | 19  | +5 (signaturesOnly ×3, gitlab-mr ×2 minus existing prReport count diff) |
| `@vda/bench`  | 17  | 20  | +3 (axeAudit ×3) |
| **Total**     | **473** | **493** | **+20** |

(Phase 9b baseline tracked 454 total; Phase-Ultra has added 39 tests across Phase 10.)

## Cross-phase contracts (briefing §5)

Newly frozen this PR — each is unit-tested and listed here so future phases know the contract is in force:

| Contract | Frozen by | Freeze test | Consumed by (planned) |
|---|---|---|---|
| Pathfinder `dir=reverse` response shape (`paths: string[][], count: number`, identical to forward) | 10-1 (`graphRoutes.ts`) | `api.test.ts > should accept dir=reverse and return the same response shape as forward` + `DependencyGraph.test.ts > findPaths reverse and forward return the same response shape` | Phase 11 git-blame integration |
| `node.metadata.lineCount` + `node.metadata.packageCount` always present (number, 0 fallback) on all parser-emitted nodes | 10-2 (`fileMetrics.ts` + each parser) | `fileMetrics.test.ts` + per-parser `universal lineCount/packageCount metadata` tests (TS + Vue + Java) | Phase 11 hot-spot ranking, Phase 14 LLM context |
| `runAnalysis({ signaturesOnly: true })` skips linker + analyzer (parsers + SignatureStore.snapshot intact) | 10-3 (`config.ts`) | `signatures-only.test.ts > skips linker` + `> SignatureStore.snapshot collects DTO/endpoint records from the skip-mode graph` | Phase 13 schema-drift snapshot, Phase 8 baseline workflow |
| `SignatureRecord.previousId` + `SignatureDiff.renamed[]` populated by `SignatureStore.diff` rename heuristic | 10-4 (`SignatureStore.ts`) | `SignatureStore.test.ts > Phase 10-4 rename heuristic` ×3 + `BreakingChangeDetector.test.ts > does not fire B1 for fields paired by the rename heuristic` | Phase 13 schema-drift class-rename detection |
| `LayerDefinition.where:` → `ArchitectureRule.fromWhere/toWhere` predicate enforced per-node | 10-5 (`LayerDsl.ts`, `RuleEngine.ts`) | `LayerDsl.test.ts > compiles where: into rule fromWhere/toWhere fields` + `> where: predicate at evaluateRules narrows actual matched nodes` | (single phase use; future layer DSL extensions) |

## Risk-table follow-up (plan §4)

| # | Risk | Outcome |
|---|---|---|
| R1 | `--signatures-only` 35% 미달 | **Realised**. Mitigation per plan §4: gate WAIVED, recorded above with reproducible numbers and the rationale (parsing-dominant on small fixtures; linker overhead is sub-linear). The mode itself is correct (skip is verified by tests). Re-measure when a >5K-file fixture lands. |
| R2 | reverse Pathfinder 에서 cycle 무한 루프 | Mitigated. The same `onPath` set used by forward DFS short-circuits cycles; no extra cost. Verified by the 5-node fixture in `DependencyGraph.test.ts`. |
| R3 | axe-core canvas false positives | Mitigated. `runMeasurement` marks every `<canvas>` element `aria-hidden="true"` before `axe.run()` so cytoscape's lack of accessible name doesn't dominate the report. |
| R4 | gitlab-mr 마커 GitLab MR rendering 깨짐 | Out of scope for this PR. Snapshot-only test pins the marker shape. Real GitLab MR integration verification deferred (no GitLab fixture in this repo). |
| R5 | file-tree picker 50K 파일 fixture 느림 | Mitigated. Server returns one level at a time (depth ≤ 3 cap), client lazy-expands on click, dirs/files alpha-sorted, heavy dirs (`node_modules`/`.git`/`dist`/`build`/`.turbo`/`.vda-cache`) skipped. |

## Deferred / not in this PR

- **Live GitLab MR snapshot validation** — no GitLab repo wired to this CI; the marker freeze test plus the gitlab-mr smoke test cover the contract.
- **Real-page axe-core run in PR-side CI** — strict mode `workflow_dispatch` runs the audit; default PR runs stay warn-only to keep wall-time low. Flip to PR-blocking is a future call (mirrors the bench G1/G2 pattern).
- **Synthetic fixtures for 50K-file file-tree perf** — covered by lazy-load contract; harness fixture not built.

## How to reproduce

```bash
# 10-1 — reverse paths
curl 'http://localhost:3333/api/graph/paths?from=ts-module:.../A.ts&to=ts-module:.../B.ts&dir=reverse'

# 10-3 — signatures-only baseline (used by vda-baseline-refresh.yml)
node packages/cli/dist/bin/vda.js analyze test-project --signatures-only --label main --no-cache

# 10-7 — gitlab-mr report
node packages/cli/dist/bin/vda.js impact . --format gitlab-mr

# 10-8 — local axe audit (requires a built web-ui)
npx -w @vda/web-ui run build
npx -w @vda/bench tsx src/cli/harness.ts --nodes 5000 --audit --audit-out /tmp/axe.json --out-json /tmp/bench.json

# 10-9 — local workflow validation (no-op without act)
scripts/validate-workflow.sh

# 10-10 — 4-tag gate
npx -w @vda/core vitest run src/__tests__/e2e-fixture.test.ts -t "Phase 10-10"
```

## What's next

`docs/phase-ultra/post-phase9-roadmap.md` enumerates Phase 11 (History — F8 git blame + F12 architecture diff). With Phase 10 closed, every Phase-7~9 deferred row has a Phase 10 commit linked. `lineCount` / `packageCount` / `signaturesOnly` / `previousId` are now all dependable for downstream phases.
