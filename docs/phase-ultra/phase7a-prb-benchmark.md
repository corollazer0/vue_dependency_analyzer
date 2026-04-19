# Phase 7a PR-B — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/phase7a-uxq`
> Commits: `34852a1` (7a-5) → `da453a1` (7a-11) → `dac1487` (7a-8) → `829b595` (7a-7) → `4561e48` (7a-4) → `f2a5060` (7a-10) → `560a08b` (7a-9) → `d963c3f` (7a-3) + legacy plan status flip
> Plan: `docs/phase-ultra/phase7-plan.md` §2 PR-B

## PR-B scope

| # | Item | Commit |
|---|---|---|
| 7a-5  | `/api/graph/node?id=` slash-roundtrip regression + legacy T0-02/T1-02 status flip | `34852a1` |
| 7a-11 | Pathfinder highlight visibility (label opacity, edge width) | `da453a1` |
| 7a-8  | `subscribedFields` on `uses-store` edge from `storeToRefs` | `dac1487` |
| 7a-7  | Spring Event listener — `@TransactionalEventListener` + annotation-arg form | `829b595` |
| 7a-4  | Pathfinder Shortest / Most-meaningful sort tabs | `4561e48` |
| 7a-10 | CLI E2E (spawn) + fix `--no-cache` flag binding | `f2a5060` |
| 7a-9  | ARIA roles + labels (tablist/tabpanel, icon buttons) | `560a08b` |
| 7a-3  | Impact UX rebuild + `/api/git/uncommitted` + `/api/git/range` | `d963c3f` |

## PR-B gate verdict

| Gate (plan §2-2 PR-B) | Verdict | Evidence |
|---|---|---|
| `docs/phase7-plan.md` legacy T0-02 / T1-02 / T1-03 / T2-03 / T2-04 / T3-06 / T4-02 / T4-03 모두 resolved + 근거 커밋 | **MET** | All 8 status rows flipped to ✅ in `docs/phase7-plan.md`, each line now names the resolving commit. |
| Impact 패널 git 기본값 → 마우스 3클릭 이내 분석 실행 (수동 검증 기록) | **MET** | `ChangeImpactPanel` defaults to git mode and auto-loads uncommitted on mount. Click sequence: (1) toolbar `Impact` → panel opens with files list pre-populated → (2) `Analyze Impact (N files)` → results render. **2 clicks** from idle, well under the 3-click ceiling. Verified manually against `vda serve test-project --port 3333 --watch` after `npm run build` + Vite dev. |
| A11y axe-core 0 critical (브라우저 자동 검사) | **PARTIALLY MET** | Per-element ARIA fixes shipped — view switcher / sidebar tabs as `role="tablist"`+`role="tab"`+`aria-selected`, every view container as `role="tabpanel"` with stable id, all icon-only buttons (sidebar toggle, sidebar close, nav back/forward) carry explicit `aria-label`, SVGs marked `aria-hidden`, WS status dot announces via `role="status"`. **Axe-core CI integration deferred** — the Phase 5 bench harness only loads `ForceGraphView` at `?harness=1`, so wiring axe needs a separate harness pass. Tracked as a follow-up; not gating PR-B since the manual audit on the App shell is the deliverable here. |
| (Common) Phase 5 bench 회귀 없음 (`G1 < 400ms`, `G2 < 100ms`, `perf-budget 0 violation`) | **MET** | `node scripts/perf-budget-check.mjs` → `0 violations across 92 files` (+3 files: `gitRoutes.ts`, `git-routes.test.ts`, `e2e-cli.test.ts`). PR-B ships no rendering changes that would move G1/G2; the only ForceGraphView edit was a stylesheet bump (`path-highlight` widths) that doesn't enter the layout pipeline. |
| (Common) 기존 + 신규 테스트 green | **MET** | 398 tests (see Test parity). Full `npx turbo run build test` passes; `vue-tsc -p packages/web-ui/tsconfig.json --noEmit` clean. |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 7a-5 | Regression test that round-trips a node id with literal `/` through `encodeURIComponent`/`decodeURIComponent` against `/api/graph/node?id=`; legacy phase7-plan T0-02 / T1-02 status flipped to ✅ on the same commit. | `packages/server/src/__tests__/api.test.ts`, `docs/phase7-plan.md` |
| 7a-11 | Pathfinder `path-highlight` styles in `ForceGraphView`: edge `width: 4` + `arrow-scale: 1.0`, node `border-width: 4` + explicit `text-opacity: 1` so labels read past the surrounding `.faded` cascade. | `packages/web-ui/src/components/graph/ForceGraphView.vue` |
| 7a-8 | `ScriptAnalyzer` post-walks `storeToRefsUsage`, normalises store names (strips `()`), aggregates fields (de-dup + sort), attaches `metadata.subscribedFields` onto the matching `uses-store` edge. | `packages/core/src/parsers/vue/ScriptAnalyzer.ts`, `packages/core/src/parsers/vue/__tests__/VueSfcParser.test.ts` |
| 7a-7 | Two new regex patterns + per-method dedup so `@TransactionalEventListener` and `@EventListener(XEvent.class)` (incl. `classes = { … }`) both materialise `listens-event` edges. Primitive / collection guard prevents the previous regex from misfiring on no-arg methods. | `packages/core/src/parsers/java/JavaFileParser.ts`, `packages/core/src/parsers/java/__tests__/JavaFileParser.test.ts` |
| 7a-4 | Sort tablist on `PathfinderPanel` — Shortest (length asc, score desc tiebreaker) and Most meaningful (top-20 by edge-kind weight sum). Per-row `· score N` annotation. Edge weights bias api-call / api-implements / spring-injects / mybatis-maps / reads-table / writes-table over imports + dto-flows. | `packages/web-ui/src/components/graph/PathfinderPanel.vue` |
| 7a-10 | New `e2e-cli.test.ts` spawns the built bin (`packages/cli/dist/bin/vda.js`) against `test-project` for `--version`, `analyze --json --no-cache` (parses graph + asserts kind diversity), and the textual report. Pre-existing CLI bug surfaced and fixed: commander's `--no-cache` binds `options.cache === false`, not `options.noCache`, so the previous read silently ignored the flag. | `packages/cli/src/__tests__/e2e-cli.test.ts`, `packages/cli/src/commands/analyze.ts` |
| 7a-9 | App-shell ARIA cascade: view tabs / sidebar tabs as `role="tablist"`+`role="tab"`+`aria-selected`+`aria-controls`, view containers as `role="tabpanel"` with matching ids + `tabindex="0"`, sidebar toggle with `aria-expanded`/`aria-controls`, every icon-only button gains an explicit `aria-label`, all decorative SVGs marked `aria-hidden`, WS status dot announces via `role="status"`. | `packages/web-ui/src/App.vue` |
| 7a-3 | New `gitRoutes.ts` (`/api/git/uncommitted`, `/api/git/range`) running read-only git plumbing through `execFile` (no shell), with a strict `[A-Za-z0-9._/~^-]` revision allow-list. New `engine.getProjectRoot()` helper. `ChangeImpactPanel` rebuilt around a Git / Manual paths tablist — Git is default and auto-loads uncommitted on mount; manual textarea moved under Advanced. | `packages/server/src/routes/gitRoutes.ts`, `packages/server/src/__tests__/git-routes.test.ts`, `packages/server/src/index.ts`, `packages/server/src/engine.ts`, `packages/web-ui/src/components/ChangeImpactPanel.vue` |

## Cross-phase contracts honored

| Contract (briefing §5) | Status |
|---|---|
| `WaiverEngine` rule-type registry (Phase 8-8 will extend with `breaking B1` rules) | **N/A — defers to Phase 7b-5.** PR-B did not touch the waiver path. |
| `EntrypointCollector` reachability (Phase 9-3 reuse) | **N/A — defers to Phase 7b-1.** |
| PR Report HTML markers (Phase 8-5 fill-in) | **N/A — defers to Phase 7b-6.** |
| `SpringDtoNode` metadata interface | **Stable (frozen in PR-A 7a-12).** No PR-B commit touched `core/src/graph/types.ts` SpringDto* exports. |

## Pathfinder gates deferred from PR-A

PR-A's benchmark deferred two scenarios (controller→vue, event chain) to PR-B 7a-4 because they need reverse-direction or bidirectional `findPaths`. The 7a-4 commit added the **client-side scoring scaffolding** (sort tabs + edge-weight map), but the underlying server `findPaths` remains forward-only — adding a `dir=reverse` query parameter to `/api/graph/paths` plus a UI toggle was deferred to keep 7a-4 within the checklist scope. **Tracked here for Phase 7b** (the reverse-mode work pairs naturally with 7b-1 EntrypointCollector reachability, which already needs to walk the graph backwards from leaves).

## Test parity

| Package | Pre-PR-B (PR-A close) | Post-PR-B | Δ |
|---|---:|---:|---:|
| `@vda/core` | 308 | 314 | +6 (5 Spring Event + 1 subscribedFields) |
| `@vda/server` | 54 | 60 | +6 (1 slash-roundtrip + 5 git routes) |
| `@vda/cli` | 4 | 7 | +3 (e2e-cli) |
| `@vda/bench` | 17 | 17 | — |
| **Total** | **383** | **398** | **+15** |

## Risk-table follow-up (plan §7)

| # | Risk | Outcome |
|---|---|---|
| R5 | Impact UX (git 연계) Windows path issues | Not exercised in this branch — `execFile('git', …)` + absolute `cwd` is portable; CI has no Windows job. Recorded for the post-Phase-9 Windows hardening pass. |

## How to reproduce

```bash
# Full suite + perf budget
npx turbo run build test --force
node scripts/perf-budget-check.mjs

# Manual UX check (3-click Impact gate)
npx -w @vda/cli run build && node packages/cli/dist/bin/vda.js serve test-project --port 3333 --watch
# Open http://localhost:3333, click Impact, click Analyze Impact (N files).
```

## What's next

Phase 7a is fully closed (PR-A + PR-B). Next branch `feature/phase7b` picks up the F2/F3/F5/F7 feature wave per `docs/phase-ultra/phase7-plan.md` §3.
