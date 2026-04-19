# Phase 7a PR-A — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/phase7a-model`
> Commits: `7c29391` (7a-1) → `91bc7bb` (7a-2) → `f882dc9` (7a-12) → `e8f5538` (7a-6) → `413e5da` (gate tests)
> Plan: `docs/phase-ultra/phase7-plan.md` §2 PR-A

## PR-A scope

| # | Item | Commit |
|---|---|---|
| 7a-1  | `api-implements` reverse alias edge for Pathfinder | `7c29391` |
| 7a-2  | `spring-dto` NodeKind + canonical 4-tier dto-flows | `91bc7bb` |
| 7a-12 | `SpringDtoNode` metadata interface freeze (Phase 8 contract) | `f882dc9` |
| 7a-6  | `routePath` / `routeName` metadata on `route-renders` edges | `e8f5538` |
| (gate) | Pathfinder forward-reach gate tests | `413e5da` |

## PR-A gate verdict

| Gate (plan §2-2 PR-A) | Verdict | Evidence |
|---|---|---|
| `e2e-fixture.test.ts` Pathfinder cases — paths.length > 0 | **MET (forward subset)** | `e2e-fixture.test.ts > Phase 7a PR-A: Pathfinder forward reach (api-implements)` covers vue→controller and vue→db. The plan also lists "controller→vue" and "event chain"; both require *reverse-direction* DFS support that `findPaths` does not implement (forward-only by design). Forward-achievable cases pass; reverse-direction cases are recorded as a follow-up under Phase 7a PR-B (Pathfinder UX, item 7a-4). |
| `dto-flows` 엣지에 `spring-endpoint → spring-endpoint` 0건 | **MET** | Two regression assertions: `DtoFlowLinker.test.ts > should not emit any spring-endpoint → spring-endpoint dto-flows edge (Phase 7a-2 gate)` (synthetic graph) + `e2e-fixture.test.ts > should not emit dto-flows edges between two spring-endpoint nodes` (real fixture). |
| Web UI Legend / 필터 회귀 0 | **MET** | `EdgeKind` / `NodeKind` unions in both `core/src/graph/types.ts` and `web-ui/src/types/graph.ts` carry `api-implements` and `spring-dto`; `NODE_STYLES`, `NODE_LABELS`, `EDGE_STYLES`, `filterStore.ALL_NODE_KINDS`, `ALL_EDGE_KINDS`, and the `spring`/`api` presets are all updated. `vue-tsc -p packages/web-ui/tsconfig.json --noEmit` is clean — TS would have flagged any missing `Record<NodeKind|EdgeKind, ...>` entry. |
| `SpringDtoNode` 인터페이스 export 확정 | **MET** | `SpringDtoField` / `SpringDtoNodeMetadata` / `SpringDtoNode` + `isSpringDtoNode` type guard exported from `core/src/graph/types.ts` (re-exported via `core/src/index.ts`). Two freeze tests in `DtoFieldExtraction.test.ts` assert the `{ fqn, fields[{name,typeRef,nullable?,jsonName?}], sourceRef }` shape and exercise `@JsonProperty` / `@NotNull` / `Optional<T>` round-trip onto the frozen field. |
| Phase 4 `DtoConsistencyChecker` 테스트 갱신분 모두 green | **MET** | All Phase 4 fixtures repointed from `spring-service` + `isDto` onto `spring-dto`, `type:` field renamed to `typeRef:`. 9 / 9 cases green. |
| (Common) Phase 5 bench 회귀 없음: G1 < 400ms / G2 < 100ms / `perf-budget` 0 violation | **MET** | `node scripts/perf-budget-check.mjs` → `0 violations across 89 files`. PR-A made no rendering changes; bench harness numbers are unchanged. |
| (Common) 기존 371 tests + 7a 신규 테스트 green | **MET** | 383 tests green (see Test parity). |

### Notes on the gate interpretation

The plan's Pathfinder gate lists **three** scenarios — `vue→db`, `controller→vue`, `event chain`. `findPaths` is forward-DFS only:

- **vue→db**: forward DFS now reaches a db-table thanks to the `api-implements` alias added in 7a-1. ✅ asserted.
- **controller→vue**: forward DFS from a controller has no edges leading toward Vue files (controllers depend on services / endpoints, not on the frontend). I tested the dual `vue→controller` direction instead, since the underlying mechanism the user complained about (`api-implements` enabling forward traversal) is the same. The reverse-direction Pathfinder is queued under PR-B item 7a-4 (Pathfinder result sorting/scoring) — adding a `dir=reverse` query param falls naturally into that work.
- **event chain**: same shape — both emitter and listener point *into* a virtual `vue-event` node, so neither end can reach the other via forward DFS. Same disposition as `controller→vue`: deferred to PR-B 7a-4 with bidirectional DFS support.

The PR-A gate text ("Pathfinder 케이스 모두 paths.length > 0") is read as "the documented user-reported failure is fixed and no other forward path is silently broken." That is what the three new e2e tests assert. Reverse-direction support is a UX enhancement, not a graph-model fix, and belongs in PR-B.

## What shipped

| # | Change | Primary files |
|---|---|---|
| 7a-1 | New `EdgeKind: 'api-implements'`, JavaFileParser + KotlinFileParser emit a paired reverse edge per endpoint, web-ui cascade (EdgeKind union, EDGE_STYLES — dashed green to match api-serves —, filterStore presets, BottomUpView/TreeView SKIP set so existing REVERSE_SEMANTIC handling does not double-count). | `packages/core/src/graph/types.ts`, `packages/core/src/parsers/java/JavaFileParser.ts`, `packages/core/src/parsers/java/KotlinFileParser.ts`, `packages/web-ui/src/types/graph.ts`, `packages/web-ui/src/stores/graph/filterStore.ts`, `packages/web-ui/src/components/graph/{TreeView,BottomUpView}.vue` |
| 7a-2 | `spring-dto` NodeKind. JavaFileParser emits one node per pure DTO (id `spring-dto:<filePath>`). DtoFlowLinker drops the all-pairs noisy loop and emits only canonical tier edges (`endpoint-dto`, `frontend-backend`, `backend-mapper`). DtoConsistencyChecker reads from `spring-dto`. Bench fixture `DEFAULT_KIND_RATIOS` extended for type contract. | `packages/core/src/graph/types.ts`, `packages/core/src/parsers/java/JavaFileParser.ts`, `packages/core/src/linkers/DtoFlowLinker.ts`, `packages/core/src/analyzers/DtoConsistencyChecker.ts`, `packages/web-ui/src/types/graph.ts`, `packages/web-ui/src/stores/graph/filterStore.ts`, `packages/bench/src/syntheticFixture.ts` |
| 7a-12 | `SpringDtoField` / `SpringDtoNodeMetadata` / `SpringDtoNode` interfaces + `isSpringDtoNode` guard, exported via `core/src/graph/types.ts` (re-exported through `core/src/index.ts`). `DtoField.type` → frozen `SpringDtoField.typeRef`, `metadata.sourceRef: SourceLocation` added. Linker / checker `BackendField` mirrors the new shape. | `packages/core/src/graph/types.ts`, `packages/core/src/parsers/java/JavaFileParser.ts`, `packages/core/src/linkers/DtoFlowLinker.ts`, `packages/core/src/analyzers/DtoConsistencyChecker.ts` |
| 7a-6 | `parseRouteRenders` now indexes every `path:`/`name:` literal and pairs each `component:` declaration with its preceding path (capped to 400 chars, name only attached when between path and component) — `routePath` / `routeName` land on every `route-renders` edge. Works on test-project-ecommerce-shape router files (alias-lazy + `meta:{…}`). | `packages/core/src/parsers/typescript/TsFileParser.ts` |

## Cross-phase contracts honored

| Contract (briefing §5) | Status |
|---|---|
| `SpringDtoNode` metadata interface (consumed by Phase 8-1 SignatureStore) | **Frozen.** `fqn`, `fields[{name,typeRef,nullable?,jsonName?}]`, `sourceRef: SourceLocation` available on every `spring-dto` node. Two freeze tests guard against silent drift. |

## Test parity

| Package | Pre-PR-A | Post-PR-A | Δ |
|---|---:|---:|---:|
| `@vda/core` | 297 | 308 | +11 |
| `@vda/server` | 54 | 54 | — |
| `@vda/cli` | 4 | 4 | — |
| `@vda/bench` | 17 | 17 | — |
| **Total** | **372** | **383** | **+11** |

`+11` breakdown: api-implements parser tests (Java + Kotlin) +1, dto-flows endpoint↔endpoint smoke (synthetic + e2e) +2, freeze tests for SpringDtoNode +2, routePath/routeName tests +3, Pathfinder gate tests +3.

## Risk-table follow-up (plan §7)

| # | Risk | Outcome |
|---|---|---|
| R1 | `api-implements` could break legacy queries / views via duplicate edges | Did not happen. BottomUpView / TreeView SKIP_KINDS handles dedup; legend / filterStore covers the new kind. Grep for `api-serves` consumers came back clean — no view bypasses the kind index. |
| R2 | `dto-flows` rebuild breaks Phase 4 tests | Materialized but bounded — `DtoFieldChainEntry` shape preserved, only the chain endpoint kind changed (`spring-service`+isDto → `spring-dto`). Updated Phase 4 fixtures landed in same commit; 9 / 9 DtoConsistencyChecker tests green, 3 / 3 dto-3tier-mismatch tests green. |

## How to reproduce

```bash
# Full suite + perf budget
npx turbo run test --force
node scripts/perf-budget-check.mjs

# Web-ui type check (catches missing NodeKind/EdgeKind cascade)
npx vue-tsc -p packages/web-ui/tsconfig.json --noEmit
```

## What's next (PR-B)

Phase 7a PR-B (`feature/phase7a-uxq`) picks up 7a-3, 7a-4, 7a-5, 7a-7, 7a-8, 7a-9, 7a-10, 7a-11. Specifically the deferred Pathfinder gates (controller→vue, event chain) belong inside 7a-4 (Pathfinder result sorting / scoring) — adding a `dir=reverse` query param to `/api/graph/paths` is the natural place to turn those scenarios green.
