# Phase 8 — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/phase8`
> Commits: `e9f8e44` (8-1 .. 8-4) → `abdff77` (8-5 .. 8-11)
> Plan: `docs/phase-ultra/phase8-plan.md`

## Phase 8 scope (11 / 11 done)

| # | Item | Commit |
|---|---|---|
| 8-1 | SignatureStore (sqlite, stable IDs, hash-isolation policy) | `e9f8e44` |
| 8-2 | B1 DTO field removed / typeRef changed | `e9f8e44` |
| 8-3 | B3 endpoint signature diff | `e9f8e44` |
| 8-4 | B4 db column removed / type changed | `e9f8e44` |
| 8-5 | `vda impact --breaking [--baseline]` fills PR Report marker | `abdff77` |
| 8-6 | `GET /api/analysis/breaking-changes?baseline=` | `abdff77` |
| 8-7 | ChangeImpactPanel "Breaking risks" section | `abdff77` |
| 8-8 | WaiverEngine `breaking <code>` integration | `abdff77` |
| 8-9 + 8-10 | E2E fixture + B1/B2/B3/B4 detection test | `abdff77` |
| 8-11 | `vda analyze --signatures-only` + nightly baseline workflow | `abdff77` |

## Phase 8 gate verdict (plan §7)

| Gate | Verdict | Evidence |
|---|---|---|
| B1 / B2 / B3 / B4 fixture tests green | **MET** | `breaking-change.test.ts > detects B1, B2, B3, B4 each at least once on the canonical fixture` exercises every code with the expected signature ids (`UserDto#email`, `UserDto#phone`, `UserController#list`, `users.created_at`). |
| PR Report marker slot filled with real data | **MET** | `vda impact --breaking --format github-pr` calls `formatPrReport({ breakingRisksMarkdown: renderBreakingMarkdown(report.changes) })` — Phase 7b-6 snapshot still passes because the `_(detected in Phase 8)_` placeholder remains the default when the user *doesn't* pass `--breaking`. The Phase 8-side rendering goes through the marker-fill round-trip test that already lives in `prReport.test.ts`. |
| False-positive 0 (identity diff) | **MET** | Two tests pin this — `SignatureStore.test.ts > snapshot + load round-trip` and `breaking-change.test.ts > identity diff returns 0 changes`. |
| `--signatures-only` ≤ 35% of full analyse time | **PARTIALLY MET** | The mode skips the reporting + JSON dump and stops before the report walk; the parse phase (which dominates wall time) is unchanged. On test-project (510 files, ~1.1s parse) the full run takes ~1.4s end-to-end and `--signatures-only` ends at ~1.15s, i.e. ≈82% — well above the 35% target. **Reaching 35% requires skipping linkers / cross-boundary resolvers** (only DTO / endpoint / db-column metadata is needed for signatures), which is a follow-up because it changes the parse pipeline shape. Tracked in the deferred section below. |
| Phase 7 gates regression-free | **MET** | All Phase 7a PR-A / PR-B / 7b tests green. `node scripts/perf-budget-check.mjs` → 0 violations across 107 files. |

## Cross-phase contracts honored (briefing §5)

| Contract | Status |
|---|---|
| `SpringDtoNode` metadata (PR-A 7a-12) | **Consumed.** SignatureStore reads `metadata.fqn` + `metadata.fields[].typeRef/nullable/jsonName`. |
| `WaiverEngine` `breaking <code>` line (7b-5) | **Consumed.** `isWaived({ ruleId: 'breaking', target: '<B-code>', file: <sourceFile> })` filters detector output. The forward-compat test 7b-5 pinned for this line shape covers the case end-to-end. |
| PR Report marker (`<!-- vda:breaking-risks:start --> … :end -->`, 7b-6) | **Filled.** `formatPrReport({ breakingRisksMarkdown })` slots the rendered list between the markers. The 7b-6 snapshot still passes because the placeholder default holds when `--breaking` is unset. |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 8-1 | `SignatureStore` — better-sqlite3 (`.vda-cache/signatures.sqlite`, separate from ParseCache for connection-lifecycle clarity), `snapshot(label, graph)` walks `spring-dto`/`spring-endpoint`/`db-table` nodes, hashes the per-record metadata only (no graph topology), exposes `load(label)` + `diff(before, after)`. Stable id formats per plan. | `packages/core/src/engine/SignatureStore.ts`, `packages/core/src/index.ts` |
| 8-2/3/4 | `BreakingChangeDetector` reads `SignatureDiff` and emits `BreakingChange[]` with `{ code, severity, signatureId, message, before?, after? }`. B1 covers removal *and* typeRef change; B2 only fires on `nullable: true → false`; B3 fires on removal and any signature-hash mismatch on endpoint; B4 fires on removal and on type change (warning). | `packages/core/src/analyzers/BreakingChangeDetector.ts`, `packages/core/src/index.ts` |
| 8-5 | `vda impact --breaking --baseline <label>` snapshots current under `__pending__`, diffs against baseline, applies waivers, fills the PR-Report marker slot when `--format github-pr`. | `packages/cli/src/commands/impact.ts`, `packages/cli/src/index.ts` |
| 8-6 | `engine.getBreakingChanges({ baseline })` + route. Returns `{ baseline, found, report }` so the UI can render either the data or the "no baseline yet" hint. | `packages/server/src/engine.ts`, `packages/server/src/routes/analysisRoutes.ts` |
| 8-7 | ChangeImpactPanel parallel `Promise.all` for impact + breaking; colour-coded list with B-code badges. | `packages/web-ui/src/components/ChangeImpactPanel.vue` |
| 8-11 | `vda analyze --signatures-only --label <name>` short-circuits before reporting, persists the SignatureStore. New `.github/workflows/vda-baseline-refresh.yml` snapshots `main` on every push + nightly cron, uploads `.vda-cache/signatures.sqlite` artifact. | `packages/cli/src/commands/analyze.ts`, `packages/cli/src/index.ts`, `.github/workflows/vda-baseline-refresh.yml` |

## Test parity

| Package | Pre-Phase 8 | Post-Phase 8 | Δ |
|---|---:|---:|---:|
| `@vda/core`   | 332 | 349 | +17 (8 SignatureStore + 7 BreakingChangeDetector + 2 e2e) |
| `@vda/server` | 61  | 62  | +1  (breaking-changes empty-baseline route) |
| `@vda/cli`    | 11  | 11  | — (breaking flag covered indirectly through e2e) |
| `@vda/bench`  | 17  | 17  | — |
| **Total**     | **421** | **439** | **+18** |

## Risk-table follow-up (plan §4)

| # | Risk | Outcome |
|---|---|---|
| R1 | Stable-ID definition ambiguity | Resolved — pinned in SignatureStore comments + tests for each kind. `previousId` rename tracking deferred to Phase 9 (rare in practice). |
| R2 | MyBatis dynamic-SQL column parsing failures | Not exercised — db-column extraction reads `db-table.metadata.columns[]` only, which Phase 4 MyBatis parser fills from `<resultMap>` `<result>` tags. Dynamic SQL columns remain a known gap; recommended path: waiver per-column with `breaking B4 file=… reason=…`. |
| R3 | B3 response type vs TS interface mismatch | Sidestepped by 7a-2 / 7a-12: `spring-dto` node carries the canonical signature, so endpoint `returnType: 'List<UserDto>'` diffs without crossing into TS land. |
| R4 | Snapshot file size on 10K-node projects | Mitigated. Per-record payload is `{ typeRef, nullable, jsonName }` (DTO) / `{ httpMethod, path, returnType, paramTypes }` (endpoint) / `{ type, jdbcType }` (column). Raw node objects never persisted. Test-project (510 files, 89 DTOs × ~6 fields, 99 endpoints, 10 tables × ~5 columns) → ~700 records, ~70 KB sqlite. |

## Deferred / not in this PR

- **Real `--signatures-only` speedup to ≤35% of full-analyse time** — needs a parser-pipeline split that emits dto/endpoint/db nodes without running the post-parse linkers. The current implementation re-uses `runAnalysis` and skips only the *reporting* phase, so most of the wall time still goes to parse + linkers. The hot path will be cracked in Phase 9 when the entrypoint reachability work makes a similar partial-walk requirement.
- **`previousId` rename tracking** — when a DTO file moves, the old fqn shows up as removed and the new one as added. Treating those as a rename instead of B1+add is a Phase 9+ enhancement.

## How to reproduce

```bash
# Build everything
npx turbo run build --force

# Snapshot a baseline (would normally happen on main via the workflow)
node packages/cli/dist/bin/vda.js analyze test-project --signatures-only --label main --no-cache

# Now make a "breaking" change in test-project (e.g., delete a field)
# and re-run impact:
node packages/cli/dist/bin/vda.js impact test-project --breaking --baseline main --format github-pr
```

## What's next

Phase 9 (Feature Slice + Anti-Pattern + OTel reader PoC) on
`feature/phase9a` (F4) and `feature/phase9b` (F9 + APM). 9-3 reuses
the `EntrypointCollector` + `reachableFromEntrypoints` API frozen in
7b-1.
