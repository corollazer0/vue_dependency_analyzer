# Phase 4 — Benchmark Record

> Generated: 2026-04-19
> Branch: `feature/ultra-phase`
> Commits: `394c289` (4-1) … `58fb897` (4-6)

## Phase 4 gate (FINAL-PLAN §6)

| # | Target |
|---|---|
| E1 | 3 Vue↔Spring↔DB 3-tier drift fixtures all produce correct mismatches |
| E2 | Existing 332 tests stay green |

## Exit-condition verdict

| Gate | Verdict |
|---|---|
| E1 (3 fixtures detect drift) | **MET** — `packages/core/src/__tests__/dto-3tier-mismatch.test.ts` covers Case A (missing-db), Case B (type-mismatch), Case C (nullable-mismatch); all 3 green. |
| E2 (no baseline regression) | **MET** — full suite: core 296 + server 50 + cli 4 = **350** tests green (332 baseline + 18 new cases). |

## What shipped

| # | Change | Primary files |
|---|---|---|
| 4-1 | `<resultMap>` / `resultType` / `parameterType` parsing; `DtoFlowLinker.buildFieldChains` stitches TS interface ↔ Spring DTO ↔ MyBatis mapping ↔ db-table at field level. | `parsers/java/MyBatisXmlParser.ts`, `linkers/DtoFlowLinker.ts` |
| 4-2 | `link()` materialises chain edges with per-field `entries` metadata and `tier` tags (`frontend-backend`, `backend-mapper`, `frontend-mapper`). | `linkers/DtoFlowLinker.ts`, `core/index.ts` re-exports |
| 4-3 | `DtoConsistencyChecker` reports `missing-db` when a mapper statement targets the DTO but omits a field, and `nullable-mismatch` when declared Java nullability disagrees with TS optional. Every mismatch carries `backendSource` / `frontendSource` refs. | `analyzers/DtoConsistencyChecker.ts` |
| 4-4 | `extractDtoFields` understands Java 17 records, `@JsonProperty(value=…)`, `@NotNull/@NotBlank/@NotEmpty/@NonNull`, `@Nullable`, and `Optional<T>` unwrap. | `parsers/java/JavaFileParser.ts` |
| 4-5 | `DtoConsistencyPanel` deep-links violations to the existing `SourceSnippet` modal using the new source refs. | `web-ui/src/components/DtoConsistencyPanel.vue` |
| 4-6 | End-to-end fixtures drive `TsFileParser + JavaFileParser + MyBatisXmlParser + DtoFlowLinker + checkDtoConsistency` for all three drift modes. | `core/src/__tests__/dto-3tier-mismatch.test.ts` |

## Test parity

| Package | Baseline (Phase 3) | Now | Δ |
|---|---:|---:|---:|
| `@vda/core` | 278 | 296 | +18 |
| `@vda/server` | 50 | 50 | — |
| `@vda/cli` | 4 | 4 | — |
| **Total** | **332** | **350** | **+18** |

New tests:
- `parsers/java/__tests__/MyBatisXmlParser.test.ts` — +4 (`resultMap`, inline `resultType`, `parameterType`, synthesized column mappings)
- `linkers/__tests__/DtoFlowLinker.test.ts` — +3 (`buildFieldChains`, chain edge emission, empty-chain degradation)
- `analyzers/__tests__/DtoConsistencyChecker.test.ts` — +3 (nullable mismatch, missing-db, source refs)
- `parsers/java/__tests__/DtoFieldExtraction.test.ts` — +5 (record, `@JsonProperty`, `@NotNull` family, `@Nullable`, `Optional<T>`)
- `__tests__/dto-3tier-mismatch.test.ts` — +3 (Cases A, B, C)

## Notes for downstream phases

- `DtoFieldChainEntry` carries enough information (backendType, frontendType, column, jdbcType, backendNullable, frontendOptional, jsonName) to drive richer UI visualisations without re-walking the graph.
- `tier` on dto-flows edges is the hook for any future "full flow view" that wants to render the end-to-end chain explicitly.
- The checker's `backendSource` / `frontendSource` refs are the source of the new snippet links; the backend DTO node currently has no `loc.line`, so the modal opens at line 1 — a small follow-up could capture the class declaration line during `JavaFileParser.parse` without touching the checker contract.
