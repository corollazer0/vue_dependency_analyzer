# Phase 7b — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/phase7b`
> Commits: `a434634` (7b-1) → `24692a5` (7b-2) → `e5318c8` (7b-5) → `0b73079` (7b-6) → `a018a44` (7b-3 + 7b-8) → `664ac8f` (7b-7) → `d20bdc5` (7b-4)
> Plan: `docs/phase-ultra/phase7-plan.md` §3

## Phase 7b scope (8 / 8 done)

| # | Item | Commit |
|---|---|---|
| 7b-1 | EntrypointCollector + DeadCodeDetector (F2) | `a434634` |
| 7b-2 | `vda decommission <file>` helper (F2) | `24692a5` |
| 7b-3 | Layer DSL → ArchitectureRule compile (F3) | `a018a44` |
| 7b-4 | Layer compliance matrix view + `/api/analysis/layer-compliance` (F3) | `d20bdc5` |
| 7b-5 | WaiverEngine — `.vdaignore` + inline directives (F7) | `e5318c8` |
| 7b-6 | PR Report markdown w/ Phase 8-5 marker block (F5) | `0b73079` |
| 7b-7 | `vda-pr-report` GitHub Action workflow (F5) | `664ac8f` |
| 7b-8 | `docs/layer-dsl-examples.md` (F3) | `a018a44` |

## Phase 7b gate verdict

| Gate (plan §3-2) | Verdict | Evidence |
|---|---|---|
| **F2** entry 3종 + decommission report on test-project | **MET** | `EntrypointCollector` recognises @RestController, @Scheduled-bearing services, @EventListener targets, vue-router-route, app-entry, native-bridge — 7 unit tests pin every reason. `vda decommission test-project/frontend/src/components/dashboard/PieChart.vue` smoke test (CLI E2E) asserts both report sections render with the headline. Manual run on the same fixture: target carries 2 nodes, 0 safe-to-delete files (the dashboard component shares deps), 11 still-in-use referenced nodes. |
| **F3** layer ruleset == hand-written violation set | **MET** | `LayerDsl.test.ts > mergeWithLayerRules + evaluateRules — DSL deny actually flags a real graph edge` exercises the round-trip. Compiled rules carry `id: layer-dsl:…` so attribution stays distinguishable. Conflict-with-hand-written test pins the lenient drop and `mode === 'strict'` promotes to `isError: true`. |
| **F3 view** click violation cell → edge list | **MET** | `LayerComplianceView.vue` colours cells by status (denied=red / allowed=green / undefined=yellow). Click handler captures `focused = { row, col }` and surfaces `sampleEdgeIds` returned by the server route, plus jumps the graph view to the first edge's source via `graphStore.focusNode`. Server route `GET /api/analysis/layer-compliance` shape pinned by api.test.ts. |
| **F5** snapshot for github-pr format | **MET** | `prReport.test.ts > matches the snapshot for a typical small change`. The breaking-risks marker block is verified separately in two cases (Phase 8 placeholder + Phase 8-style detector slot fill). |
| **F5 GH Action** workflow valid + posts marker block | **PARTIALLY MET** | `.github/workflows/vda-pr-report.yml` shipped with single-comment-update via `<!-- vda:pr-report -->` marker. **`act`-based dry-run validation deferred** — the formatter snapshot test (`prReport.test.ts`) already pins the exact body shape the workflow uploads, and the Phase 5 bench workflow's identical pattern has been live for weeks. End-to-end PR-comment validation needs a real PR (out-of-CI dependency, plan §3-2 acknowledges this). |
| **F7** waiver suppresses + re-emits on expiry | **MET** | `WaiverEngine.test.ts > RuleEngine integration` covers both: a deny-direct violation gets moved to `waived[]` with the matching `waivedBy`; the same waiver with `expires < today` lets the violation through unchanged. Forward-compat test pins the `breaking B1 file=…` shape Phase 8-8 will use. |
| (Common) bench / perf-budget / test-count | **MET** | `node scripts/perf-budget-check.mjs` → `0 violations across 102 files`. Test count 398 → 411 (+13). |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 7b-1 | `EntrypointCollector` (controller / scheduled / event-listener / router / app-entry / native-bridge) + `reachableFromEntrypoints` (skips `dto-flows` and `api-implements`) + `findDeadNodes` with never-dead allowlist (`db-table`, `vue-event`, `spring-event`, `mybatis-statement`). JavaFileParser tags `metadata.hasScheduled` when `@Scheduled` is in source. | `packages/core/src/analyzers/{EntrypointCollector,DeadCodeDetector}.ts`, `packages/core/src/parsers/java/JavaFileParser.ts`, `packages/core/src/index.ts` |
| 7b-2 | `vda decommission <file>` — diffs forward reachability with vs. without the target's nodes; reports "safe to delete with the target" + "still in use". CLI E2E spawn smoke test pins the section headers. | `packages/cli/src/commands/decommission.ts`, `packages/cli/src/index.ts` |
| 7b-3 | `compileLayerRules(config, userRules)` translates `{ from, to, policy }` into `deny-direct` / `allow-only` rules. Each compiled rule's id is `layer-dsl:…`. Conflict resolution: hand-written wins, DSL drop reported in `dropped[]`; `layerDsl.mode === 'strict'` flips `isError: true`. `mergeWithLayerRules` returns `[hand-written, …compiled]` for the engine. | `packages/core/src/analyzers/LayerDsl.ts`, `packages/core/src/index.ts` |
| 7b-4 | Server: `engine.getLayerCompliance()` returns `{ layers, matrix }` (cell status: allowed / denied / undefined; sample edge ids per non-empty cell). Route: `GET /api/analysis/layer-compliance`. UI: `LayerComplianceView.vue` colour-coded grid + click-to-focus, App.vue view-tab + tabpanel. | `packages/server/src/engine.ts`, `packages/server/src/routes/analysisRoutes.ts`, `packages/web-ui/src/components/graph/LayerComplianceView.vue`, `packages/web-ui/src/App.vue` |
| 7b-5 | `WaiverEngine` reads `.vdaignore` + inline `// vda:ignore` comments. `evaluateRulesWithWaivers` partitions violations into `violations[]` + `waived[]`. Phase 8 forward-compat: `breaking <code> file=… reason=… until=…` lines parse with no engine changes. | `packages/core/src/analyzers/WaiverEngine.ts`, `packages/core/src/analyzers/RuleEngine.ts`, `packages/core/src/index.ts` |
| 7b-6 | `vda impact --format github-pr` → Markdown with `<!-- vda:breaking-risks:start --> … <!-- vda:breaking-risks:end -->` marker block. Snapshot test pins both placeholder (`_(detected in Phase 8)_`) and Phase 8-fill round-trip. | `packages/cli/src/commands/{prReport,impact}.ts`, `packages/cli/src/index.ts`, `packages/cli/src/__tests__/__snapshots__/prReport.test.ts.snap` |
| 7b-7 | `.github/workflows/vda-pr-report.yml` — runs the formatter on every PR, posts/updates a single comment via `<!-- vda:pr-report -->` marker. Mirrors Phase 5 bench workflow's pattern. | `.github/workflows/vda-pr-report.yml` |
| 7b-8 | Two preset configs (Spring controller→service→repository, Vue views→components→composables→stores), strict-mode example, programmatic-use snippet. | `docs/layer-dsl-examples.md` |

## Cross-phase contracts honored

| Contract (briefing §5) | Status |
|---|---|
| `EntrypointCollector` public API — Phase 9-3 (Feature Slice) reuses `collectEntrypoints` + `reachableFromEntrypoints` | **Frozen.** Exported from `core/src/index.ts` with their type aliases; 7 unit tests pin each entrypoint reason + the reachability skip-set. |
| `WaiverEngine` rule-type registry — Phase 8-8 extends with `breaking <code> file=…` lines | **Frozen.** Forward-compat test (`Phase 8 forward-compat: accepts rule-ids the engine has never seen before`) parses the exact line Phase 8-8 will emit and asserts a positive `isWaived` match. |
| PR Report marker block — Phase 8-5 fills `<!-- vda:breaking-risks:start --> … <!-- vda:breaking-risks:end -->` | **Frozen.** Snapshot test pins the marker shape and the placeholder; a separate test inserts a Phase-8-style detector body and asserts surrounding markdown is unchanged. |

## Test parity

| Package | Pre-7b (PR-B close) | Post-7b | Δ |
|---|---:|---:|---:|
| `@vda/core`   | 314 | 332 | +18 (7 EntrypointCollector + 6 WaiverEngine + 5 LayerDsl) |
| `@vda/server` | 60  | 61  | +1  (layer-compliance route shape) |
| `@vda/cli`    | 7   | 11  | +4  (decommission smoke + 3 prReport) |
| `@vda/bench`  | 17  | 17  | — |
| **Total**     | **398** | **421** | **+23** |

(Note: PR-B added some of the +18 already; running totals are vs. the **post-PR-B baseline** above. The "411" figure earlier was a typo in the gate row — actual is 421 = 332 + 61 + 11 + 17.)

## Risk-table follow-up (plan §7)

| # | Risk | Outcome |
|---|---|---|
| R3 | Layer DSL semantic overlap with RuleEngine | Mitigated. DSL is a *front-end* only; compile-time output flows into the same evaluator. Conflict policy explicitly resolved: hand-written wins, `dropped[]` reported, strict mode promotes to error. The `mergeWithLayerRules` helper is the canonical adoption path. |
| R4 | F5 PR Report locked to GitHub | Partly mitigated. Internal AST is the existing `analyzeChangeImpact` result; the markdown formatter is the only thing GitHub-specific. Adding `--format gitlab-mr` is a per-template addition (separate file, no engine changes). Recorded as a follow-up. |

## Deferred / not in this PR

- **`act` dry-run validation of the GH Action** (gate marked PARTIALLY MET) — the formatter snapshot pins the body shape; full PR-comment round-trip needs a real PR.
- **`--format gitlab-mr`** — same templating slot, separate output mode (R4).
- **Layer-DSL `where:` predicate** (e.g. `match: ['spring-service'], where: { isMapper: true }`) — listed in the plan example but not implemented; current DSL keys layer membership off NodeKind only. Adding the predicate is a parser-only change.

## How to reproduce

```bash
npx turbo run build test --force
node scripts/perf-budget-check.mjs

# F2 decommission walkthrough
rm -rf test-project/.vda-cache
node packages/cli/dist/bin/vda.js decommission \
  frontend/src/components/dashboard/PieChart.vue --dir test-project --no-cache

# F5 PR report markdown
node packages/cli/dist/bin/vda.js impact test-project \
  --diff HEAD~1..HEAD --format github-pr
```

## What's next

Phase 8 (Breaking Change Detector) on `feature/phase8`. Consumes
`SpringDtoNode` (PR-A 7a-12), `WaiverEngine` (7b-5 — extends with
`breaking <code>` rules), and the PR Report marker block (7b-6 — fills
the slot).
