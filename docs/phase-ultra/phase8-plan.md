# Phase 8 Plan — Breaking Change Detector (F6)

> 작성일: 2026-04-19
> 브랜치: `feature/phase8` (Phase 7 머지 후)
> 전제: Phase 7b 의 F5 PR Report 포맷이 안정화된 상태

---

## 0. 배경

painpoint-analysis.md §4 F6 을 단독 phase 로 승격. Phase 7 에서 F5 (PR Report 포맷 + GH Action) 를 선행했기 때문에, Phase 8 은 PR Report 에 실제로 채울 **"breaking risk"** 데이터를 수집하는 단일 목표의 phase.

변경 영향 예측 painpoint (P1) 커버리지를 **70% → 95%** 로 끌어올리는 것이 목표.

---

## 1. 범위

### 1-1. 탐지할 breaking change 4종

| # | 종류 | 신호 | 감지 난이도 |
|---|---|---|---|
| B1 | DTO 필드 제거 | `spring-dto` 노드의 `fields[]` diff | 낮음 (Phase 7a-2 로 DTO 노드가 이미 1차 시민) |
| B2 | DTO 필드 필수화 (Optional → 필수) | `spring-dto` metadata 의 `nullable` flip | 낮음 |
| B3 | Spring endpoint 시그니처 변경 | endpoint metadata 의 method/path/param types diff | 중간 |
| B4 | DB 컬럼 삭제 (MyBatis 참조 끊김) | `db-table` 노드의 `columns[]` diff + `reads-table`/`writes-table` 엣지 참조 | 중간 |

### 1-2. 명시적 제외

- Java method body 변경 — 시그니처가 아닌 이상 breaking 아님
- 컴포넌트 template slot name 변경 — 런타임 계약이지만 정적 분석 신뢰도 낮음
- Kotlin data class copy-method 시그니처 — 우선순위 낮음

---

## 2. 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 8-1 | **Signature Snapshot Store**: 분석 결과를 `.vda-cache/signatures.sqlite` (Phase 2-1 better-sqlite3 ParseCache 와 동일 DB, 별도 테이블) 에 스냅샷 저장. **안정 ID 정의**: (a) DTO = `${fqn}#${fieldName}` (파일 이동 시 `previousFqn` 메타로 별개 표기), (b) endpoint = `${controllerFqn}#${methodName}` (path 자체는 변경 가능 항목이라 ID 에서 제외), (c) db-column = `${tableName}.${columnName}` (스키마 prefix 는 `.vdarc` 의 `dbDefaultSchema` 로 정규화). **해시 입력 격리 정책**: hash 는 노드-로컬 정보(자신의 metadata 필드)만 입력으로 사용. 인접 엣지·in/out degree 등 graph-level 비결정성을 가질 수 있는 값은 입력 금지 — Phase 0 게이트의 엣지 <5% drift 가 false positive 로 새지 않도록 함 | `packages/core/src/engine/SignatureStore.ts` 신규 |
| 8-2 | **B1/B2 DTO diff**: 이전 스냅샷 vs 현재 분석의 DTO 노드 diff → 제거된 field / 필수로 flip된 field 목록 | `packages/core/src/analyzers/BreakingChangeDetector.ts` 신규 |
| 8-3 | **B3 endpoint signature diff**: path · method · param types · response type 각각 diff | 위와 동일 analyzer |
| 8-4 | **B4 db-column diff**: MyBatis XML `<resultMap>` + column refs 스냅샷 diff. 참조가 살아있는데 column 이 사라진 경우 경고 | 위와 동일 analyzer |
| 8-5 | **CLI**: `vda impact --diff <range> --breaking` 플래그. 기존 `--format github-pr` 출력에 "⚠️ Breaking risks" 섹션 실제 채움 | `packages/cli/src/commands/impact.ts` |
| 8-6 | **서버 API**: `POST /api/analysis/breaking-changes` — body 는 두 스냅샷의 경로 (또는 현재/이전 두 분석), response 는 B1-B4 레포트 | `packages/server/src/routes/analysisRoutes.ts` |
| 8-7 | **UI 통합**: ChangeImpactPanel 에 "Breaking risks" 하단 섹션. severity 색상 (B1 red / B2 orange / B3 red / B4 red) | `packages/web-ui/src/components/ChangeImpactPanel.vue` |
| 8-8 | **Waiver 지원**: `.vdaignore` 에 `breaking B1 file=X reason=Y until=Z` 문법 (Phase 7b-5 의 WaiverEngine 재사용) | `core/src/analyzers/WaiverEngine.ts` |
| 8-9 | **Fixture 4종**: test-project-ecommerce 에 breaking change 시뮬레이션용 "이전/이후" 두 git tag 준비. **B1, B2, B3, B4 각 1건 이상 포함** (B2: 기존 `Optional<String> phone` 필드를 `String phone` 으로 flip 하는 변경 등). | `scripts/prepare-phase8-fixture.sh`, `test-project-ecommerce/.phase8-fixtures/` |
| 8-10 | **E2E 테스트**: 8-9 에서 만든 fixture 로 `SignatureStore.snapshot(before) → analyze(after) → detect()` 호출, **B1·B2·B3·B4 각 1건 이상 검출** | `packages/core/src/__tests__/breaking-change.test.ts` |
| 8-11 | **Baseline 추출 전략**: `vda impact --diff <ref-from>..<ref-to> --breaking` 호출 시 baseline 스냅샷 확보 절차를 픽스. 우선순위: (1) `.vda-cache/signatures.sqlite` 에 `<ref-from>` 의 commit-sha 키로 캐시된 스냅샷이 있으면 즉시 사용, (2) 없으면 git worktree 를 임시 디렉토리에 checkout 후 `analyze --no-cache --signatures-only` 모드로 스냅샷만 추출 (full 분석 회피), (3) CI 에서는 main 브랜치 push 마다 baseline 스냅샷을 nightly 로 갱신해 (1) 경로가 적중하도록 함. **`--signatures-only` 플래그**가 8-1 SignatureStore 의 핵심 부산물 — 풀 분석 비용의 ~30% 목표 | `packages/cli/src/commands/analyze.ts`, `packages/cli/src/commands/impact.ts`, `.github/workflows/vda-baseline-refresh.yml` |

---

## 3. 성공 지표 (Q9)

| 기준 | 측정 |
|---|---|
| B1~B4 모두 검출 | fixture 3종 E2E 테스트 green |
| PR Report 에 실제 데이터 | Phase 7b 의 `vda impact --format github-pr` 출력의 "Breaking risks" 섹션이 snapshot mismatch 시 **0이 아님** |
| False positive 통제 | test-project-ecommerce 현재 상태끼리 diff 했을 때 breaking 0건 (identity 테스트) |
| Waiver 정상 작동 | waiver 로 B1 억제 테스트 green + expires 지난 waiver 는 재등장 |

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | DTO·endpoint·db-column 의 "안정 ID" 정의가 모호 | 8-1 에서 픽스: DTO=`fqn#fieldName`, endpoint=`controllerFqn#methodName`, db-column=`tableName.columnName`. 파일 이동·rename 은 `previousId` 메타로 별개 표기 |
| R2 | MyBatis 동적 SQL 에서 column 이름 파싱 실패 → false positive | "확신도 낮음" 플래그로 표시, waiver 우선 권장. 완벽한 파싱은 Phase 10+ |
| R3 | B3 response type diff 가 TS interface 와 이름만 같을 수도 | Phase 7a-2 의 `spring-dto` 노드가 교량. `dto-flows` 엣지가 연결돼야만 매칭 |
| R4 | 스냅샷 파일 크기 폭발 (10K 노드 프로젝트) | 필요한 필드만 추출 (`id`, `signature hash`, `source ref`). raw 노드 저장 금지 |

---

## 5. 의존

- Phase 7a-2 + **7a-12 필수** (spring-dto 노드 + 메타데이터 스키마 동결)
- Phase 7b-6 의 **`<!-- vda:breaking-risks:start/end -->` 마커 contract** — 8-5 가 채울 슬롯 픽스
- Phase 7b F5 (PR Report 포맷) 권장 — 없어도 CLI JSON 모드로 쓸 수는 있음
- Phase 7b F7 (Waiver) 필수 — waiver 없으면 legacy 코드에서 쓸모 낮음
- Phase 2-1 (better-sqlite3 ParseCache) — 8-1 의 SignatureStore 가 동일 DB 재사용

---

## 6. 커밋 단위

체크리스트 항목 하나당 독립 커밋. 8-9 (fixture) 와 8-10 (test) 은 같은 커밋으로 묶어도 됨.

---

## 7. Phase 8 종료 조건 (게이트)

- B1, B2, B3, B4 각각 검출하는 fixture 테스트 green (4종 모두)
- PR Report 의 7b-6 marker 슬롯에 breaking section 실제 데이터 채워진 snapshot 출력
- test-project-ecommerce 현재 상태 self-diff 에서 false positive 0
- `--signatures-only` 모드로 baseline 추출이 풀 분석 대비 실측 시간 ≤ 35% (게이트 35% 초과 시 Phase 9 의 PR-CI workflow 실용성 저하)
- Phase 7 gate 들 전부 유지 (회귀 없음)
