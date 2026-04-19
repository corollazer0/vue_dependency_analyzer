# Phase 7 Plan (v2) — Completion + First Feature Wave

> 작성일: 2026-04-19
> 브랜치: `feature/ultra-phase` 머지 후 **신규 브랜치** `feature/phase7` 예정
> Supersedes: `docs/phase7-plan.md` (legacy, pre-Phase-Ultra — 잔여 항목만 여기로 이관)
> 의존성: Phase-Ultra 0~5 완료 전제

---

## 0. 인터뷰로 확정된 전제

| # | 결정 |
|---|---|
| Q1 | Phase 7 성격 = **완성도 + 신규 기능 혼합**. 길어지므로 7a / 7b로 분리 |
| Q2 | Pathfinder 엣지 방향성 → **역방향 alias 엣지 추가 (`api-implements`)**. 기존 `api-serves` 유지, `findPaths`는 수정 불요 |
| Q3 | `dto-flows` 리모델링 → **endpoint ↔ DTO 노드, DTO ↔ db-table** 2단 체인으로 재정비 |
| Q5 | F5 PR Report 를 Phase 7로 당김 (PR 통합이 제품 포지셔닝의 핵심) |
| Q6 | F7 Waiver 를 F3 Layer DSL 과 묶어 Phase 7에 포함 |
| Q7 | Impact UX 개편은 완성도 트랙 (= 7a) |
| Q9 | Phase 7 성공 기준 = *잔여 구-Phase7 항목 100% 해소 + 새 엣지 방향 버그 0건 + 새 F2/F3/F5/F7 end-to-end 테스트 green* |

### 명시적 제외
- P5 APM 통합은 Phase 9 후반 PoC (Q8)
- F10 MSA 서비스 그래프는 Phase 7 범위 밖 (데이터 수집만 선제)
- F8 git blame 통합은 Phase 9+

---

## 1. 구조

```
Phase 7a  (2-3w)  완성도 보강 + 오늘 발견된 버그 처리
Phase 7b  (3-4w)  신규 기능 1차 (F2 + F3 + F5 + F7)
```

7a 완료 전 7b 착수 금지 — 7b의 F2/F3 구현이 7a-3 (dto-flows 재구조화)의 결과를 의존.

---

## 2. Phase 7a — 완성도 트랙

> **PR 분할**: 7a 는 두 PR 로 나눈다.
> - **PR-A (그래프 모델)**: 7a-1, 7a-2, 7a-6, 7a-12 — 그래프 스키마·파서 변경. 단일 atomic 머지로 회귀 격리.
> - **PR-B (UX·품질)**: 7a-3, 7a-4, 7a-5, 7a-7, 7a-8, 7a-9, 7a-10, 7a-11 — PR-A 머지 후 착수.
> 사유: PR-A 가 NodeKind/EdgeKind/메타데이터 스키마를 변경하므로 Phase 4 테스트와 Web UI Legend 까지 cascade 회귀 가능. UX 변경과 섞이면 bisect 비용이 커진다.

### 2-1. 체크리스트

| # | 항목 | 파일 | 근거 |
|---|---|---|---|
| 7a-1 | **Pathfinder 방향성 버그 수정**: `api-implements` 신규 `EdgeKind` 추가, CrossBoundaryResolver 또는 Parser가 spring-endpoint → spring-controller 로 `api-implements` 엣지 생성. `api-serves` 는 그대로 유지 | `graph/types.ts`, `linkers/CrossBoundaryResolver.ts`, `parsers/java/JavaFileParser.ts` | 오늘 재현: `RegisterPage → db-table:users` 0 경로 |
| 7a-2 | `dto-flows` 엣지 리모델링: 현재 `spring-endpoint → spring-endpoint` 형태 제거. 대신 **spring-dto 노드** 를 명시적으로 만들고 endpoint ↔ dto ↔ mapper-statement ↔ db-table 4단 체인으로 재구성 | `graph/types.ts` (새 NodeKind `spring-dto`), `linkers/DtoFlowLinker.ts`, `analyzers/DtoConsistencyChecker.ts` | Pathfinder noise 제거 + DTO 중심 쿼리 가능 |
| 7a-12 | **`spring-dto` 메타데이터 스키마 동결** (Phase 8 의존). `SpringDtoNode.metadata` 에 `fqn: string`, `fields: Array<{name, typeRef, nullable, jsonName?}>`, `sourceRef: SourceLocation` 를 정식 인터페이스로 선언하고 `core/src/types.ts` 에 export. Phase 8 SignatureStore 가 이 스키마에 락인됨 — PR-A 머지 시점에 인터페이스 동결 명시 | `packages/core/src/graph/types.ts`, `packages/core/src/types.ts` (export 면), `parsers/java/JavaFileParser.ts` (필드 추출) | Phase 8-1 의 안정 ID 정의 전제 |
| 7a-3 | Impact UX 전면 개편: 3종 입력 수단 `(A) git uncommitted/last-N-commits (B) 그래프 노드 컨텍스트 메뉴 "Add to Impact" (C) 파일 트리 picker`. textarea 는 "고급 모드"로 접힘 | `packages/web-ui/src/components/ChangeImpactPanel.vue`, `packages/server/src/routes/analysisRoutes.ts` (`GET /api/git/uncommitted`, `GET /api/git/range?from&to` 신규) | 실사용 차단 요인 |
| 7a-4 | Pathfinder 결과 정렬/스코어링: 길이 오름차순 default + (선택) edge-kind 의미 가중치 (api-call > imports > dto-flows 등). 리스트 100건 cap 유지하되 "가장 의미 있는 상위 20" 탭 | `web-ui/src/components/graph/PathfinderPanel.vue`, `core/src/graph/query.ts` | 현재 DFS 결과가 정렬 없음 |
| 7a-5 | `GET /api/graph/node?id=<encoded>` — query param 기반으로 전환. path param 의 슬래시 404 제거 (legacy T0-02) | `packages/server/src/routes/graphRoutes.ts`, 클라이언트 호출부 | 구-Phase7 T0-02 |
| 7a-6 | `vue-router` `route-renders` 엣지 실제 생성. TsFileParser 가 routes 배열 AST 워킹, `{path, component}` 매핑 추출, `router.push('/x')` 도 탐지 (legacy T1-02) | `packages/core/src/parsers/typescript/TsFileParser.ts`, fixtures | 라우터 의존성 그래프 공백 |
| 7a-7 | Event virtual edge (emits/listens) **전수 검증** + 누락 fill. 현 `resolveEmitListeners` 가 부모 `@eventName` listener 와 자식 `defineEmits` 매칭만 처리. Spring Event `publishEvent`/`@EventListener` 매칭 보강 (legacy T1-03) | `linkers/CrossBoundaryResolver.ts`, `parsers/vue/TemplateAnalyzer.ts`, `parsers/java/JavaFileParser.ts` | 동적 이벤트 체인 누락 |
| 7a-8 | `storeToRefs(store)` 구독 필드 추적. `uses-store` 엣지 metadata 에 `subscribedFields: string[]` (legacy T2-03) | `parsers/vue/ScriptAnalyzer.ts` | 필드 단위 변경 영향도 축 |
| 7a-9 | A11y 기본: ARIA 랜드마크, 포커스 순서, 키보드 노드 네비 (legacy T3-06) | `packages/web-ui/src/App.vue`, 주요 패널 | 접근성 기본선 |
| 7a-10 | E2E API + CLI 테스트 (legacy T4-02, T4-03). test-project-ecommerce 기반 fastify inject + CLI spawn 테스트 | `packages/server/src/__tests__/e2e-api.test.ts`, `packages/cli/src/__tests__/e2e-cli.test.ts` | 회귀 방지 최후 보루 |
| 7a-11 | Pathfinder 경로 highlight 가시성 강화. 현재 `path-highlight` 클래스만 추가, 다른 엣지는 opacity 그대로 → 배경 덮임. 배경 opacity 0.2 로 강등 | `components/graph/ForceGraphView.vue` CSS | 오늘 "highlight 안 보여" 가능성 대응 |

### 2-2. Phase 7a 종료 조건 (게이트)

**PR-A 머지 게이트 (그래프 모델)**
- `e2e-fixture.test.ts` 에 **Pathfinder 케이스 3종** (vue→db / controller→vue / event 체인) 모두 `paths.length > 0`
- `dto-flows` 엣지에 `spring-endpoint → spring-endpoint` 0건 (신규 스모크 테스트)
- **Web UI Legend / 필터 회귀 0**: `api-implements` / `spring-dto` 추가 후 Legend 토글이 모든 NodeKind/EdgeKind 를 노출하고, 기본 필터에서 신규 종류가 누락되지 않음 (수동 + Vitest snapshot)
- **`SpringDtoNode` 인터페이스 export 확정** + Phase 8 SignatureStore 가 의존할 수 있도록 changelog 1줄 기록
- Phase 4 의 `DtoConsistencyChecker` 테스트 갱신분 모두 green (chain 끝점이 `spring-dto` 로 이전)

**PR-B 머지 게이트 (UX·품질)**
- `docs/phase7-plan.md` legacy 의 T0-02, T1-02, T1-03, T2-03, T2-04, T3-06, T4-02, T4-03 **모두 resolved 표시 + 근거 커밋**
- Impact 패널에서 git 기본값 선택으로 **마우스 3클릭 이내 분석 실행** (수동 검증 기록)
- A11y: axe-core 기본 룰 0 critical (브라우저 자동 검사)

**공통**
- Phase-Ultra Phase 5 bench 회귀 없음 (`G1 < 400ms`, `G2 < 100ms` 유지)
- 기존 371 tests + 7a 신규 테스트 green

---

## 3. Phase 7b — 신규 기능 1차

### 3-1. 체크리스트

| # | 항목 | 파일 | 근거 |
|---|---|---|---|
| 7b-1 | **F2 Entrypoint-aware Orphan**: `@RestController`, `@Scheduled`, `@EventListener`, Vue router 진입점, `main.ts`, worker 등록을 **엔트리 셋** 으로 선언. 엔트리에서 reachability 안 되는 노드를 `dead` 로 리포트. 기존 `findOrphanNodes()` 는 `findDeadNodes()` 로 교체 내지 공존 | `core/src/analyzers/OrphanDetector.ts` (또는 `DeadCodeDetector.ts` 신규), `core/src/analyzers/EntrypointCollector.ts` 신규 | painpoint §4 F2 |
| 7b-2 | **F2 Decommission helper** CLI: `vda decommission <file>` → 함께 지워도 되는 (역도달 불가) 의존 파일 리스트 | `packages/cli/src/commands/decommission.ts` | painpoint §4 F2 |
| 7b-3 | **F3 Layer DSL**: `.vdarc.json` 에 `layers[]` + `rules[]` (`layer A -> layer B`). YAML 같은 DSL 을 RuleEngine 의 `deny-direct` / `allow-only` 규칙으로 **컴파일**. **DSL 컴파일 규칙 vs hand-written `rules[]` 충돌 정책**: (a) DSL 산출 규칙은 `source: 'layer-dsl'` 메타 필드로 태깅, (b) 동일 (kind, from, to) 튜플의 hand-written 규칙이 있으면 hand-written 우선 + DSL 산출분은 `dropped` 로 마킹해 `vda lint --explain` 출력에 노출, (c) `vdarc.layerDsl.mode: 'strict'` 설정 시 충돌 자체를 lint error 로 승격 | `core/src/analyzers/LayerDsl.ts` 신규, RuleEngine 확장 (`source` 메타 + dedup hook), `vdarc` 스키마 업데이트 | painpoint §4 F3 |
| 7b-4 | **F3 레이어 컴플라이언스 뷰**: 선언된 레이어 간 격자 (준수 / 위반 / 미정의) 를 MatrixView 와 유사한 Canvas 2D | `packages/web-ui/src/components/graph/LayerComplianceView.vue` 신규, `App.vue` 의 view 탭에 추가 | 사용자가 Phase 7/8/9에서 요구 |
| 7b-5 | **F7 Waiver 체계**: `.vdaignore` 파일 (per-line `rule-id target reason expires`) 또는 inline 주석 `// vda:ignore deny-direct controller→repository reason=TICKET-123 until=2026-12-31`. 만료된 waiver 는 다시 위반 | `core/src/analyzers/WaiverEngine.ts` 신규, RuleEngine 에서 소비, CLI lint 출력 | painpoint §4 F7 |
| 7b-6 | **F5 PR Report (Markdown)**: `vda impact --diff HEAD~1..HEAD --format github-pr` → 구조화된 markdown 출력. 포함: 변경 파일 수, 직접/전이 영향 노드 수, 영향 endpoint/db-table 리스트, rule violation 델타, (stub) breaking risk 카운트 (실제 탐지는 Phase 8). **Phase 8-5 와의 contract**: "⚠️ Breaking risks" 섹션을 `<!-- vda:breaking-risks:start -->` ~ `<!-- vda:breaking-risks:end -->` HTML 주석 마커로 감싸 슬롯 픽스. 7b 단계는 마커 사이에 `_(detected in Phase 8)_` 플레이스홀더만 출력. snapshot 테스트도 마커 포함 형태로 고정 — Phase 8 가 마커 사이를 채우는 것만으로 호환 | `packages/cli/src/commands/impact.ts` 확장, `__snapshots__/pr-report.md` | painpoint §4 F5 |
| 7b-7 | **F5 GH Action 예시**: `.github/workflows/vda-pr-report.yml` — `vda impact` 실행 후 PR 코멘트 업데이트 (actions/github-script 사용). Phase 5-4 bench workflow 패턴 재사용 | `.github/workflows/vda-pr-report.yml` | painpoint §4 F5 |
| 7b-8 | **F3 레이어 예시 문서**: Spring Boot `controller→service→repository` + Vue `views→components→composables→stores` 두 개의 preset | `docs/layer-dsl-examples.md` 신규 | 도입 진입 장벽 |

### 3-2. Phase 7b 종료 조건 (게이트)

- **F2**: 엔트리 3종 (`@RestController`, vue-router, main.ts) 인식 확인 테스트 + decommission 출력이 test-project-ecommerce 에서 "삭제 불가 파일" ≥ 1건, "같이 지워도 됨" ≥ 3건 리스트업
- **F3**: presentation → application → infrastructure 레이어 선언 시 기존 ruleset 과 **동등한 violation 집합** 생성 (대조 테스트)
- **F3 뷰**: LayerComplianceView 에서 위반 셀 클릭 → 위반 edge 노드 리스트
- **F5**: test-project-ecommerce 에 가상 diff 2건 (file add / file delete) 돌렸을 때 `vda impact --format github-pr` 출력이 고정 포맷 (snapshot test) 맞춤
- **F5 GH Action**: workflow 를 `act` (또는 동등 dry-run 도구) 로 실행하여 (a) PR 코멘트 markdown 출력이 생성되고 (b) snapshot 테스트(`__snapshots__/pr-report.md`) 와 일치. 실 PR 코멘트 부착은 outside-CI workflow 의존이라 게이트에서 제외 — 별도 follow-up issue 로 추적
- **F7**: waiver 샘플 `.vdaignore` 로 violation 1건 억제 확인 + 만료 날짜 넘긴 테스트 케이스에서 재등장
- 기존 7a + Phase-Ultra 테스트 총량 유지 (green)

---

## 4. 신규 NodeKind / EdgeKind

| 타입 | 용도 | 도입 phase |
|---|---|---|
| EdgeKind `api-implements` | spring-endpoint → spring-controller (Pathfinder 방향 보완) | 7a-1 |
| NodeKind `spring-dto` | Java/TS DTO 모델 1차 시민 (메타 스키마는 7a-12 에서 동결) | 7a-2 / 7a-12 |
| EdgeKind `layer-violates` | LayerDsl 컴파일 결과 (warning/error) | 7b-3 |
| EdgeKind `waived` | Waiver가 억제한 위반 | 7b-5 |

전 NodeKind/EdgeKind 에 대해 web-ui `NODE_STYLES` / `EDGE_STYLES` 와 Legend 갱신 필요 (체크리스트 자동 포함).

---

## 5. 성공 지표 (Q9)

| 기준 | 측정 |
|---|---|
| 잔여 구-Phase7 100% 해소 | legacy `docs/phase7-plan.md` 의 T0/T1/T2/T3/T4 체크박스 모두 ✅ |
| 엣지 방향 버그 0 | `spring-endpoint → spring-endpoint dto-flows 0건`, `Pathfinder e2e 케이스 3/3 paths > 0` |
| F2/F3/F5/F7 E2E green | 각 F 항목마다 integration 테스트 1건 이상 + CLI smoke 1건 |
| Phase 5 회귀 없음 | `G1 < 400ms`, `G2 < 100ms`, `perf-budget 0 violation` 유지 |

---

## 6. 커밋 단위 & PR 단위

- 7a, 7b 는 **각 체크리스트 항목마다 독립 커밋**
- 7a 완료 → PR (#2) 머지 → 7b 시작 (각 phase 별 PR 분리)
- origin push 는 각 phase 게이트 통과 후

---

## 7. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | `api-implements` 도입으로 legacy 쿼리/뷰가 중복 엣지로 파손 | 구체적 쿼리/뷰 모두 `edgesByKindIter('api-serves')` 기반이면 영향 0, 단 legend/filter 는 갱신 필요. 도입 전 grep 으로 전수 확인 |
| R2 | `dto-flows` 리모델링이 Phase 4 테스트 다수 파손 | `spring-dto` 노드를 추가 도입하는 방식이라 **기존 DtoFieldChainEntry 구조는 유지**. Phase 4 테스트는 chain 의 끝점을 `spring-dto` 로 갱신 (세부 기대값 업데이트 필요) |
| R3 | Layer DSL 이 기존 RuleEngine 과 의미 중복 | DSL 은 **프론트**, RuleEngine 은 **런타임** 만 담당. DSL → 규칙 **컴파일** 경로만 두고 사용자 레벨에서 둘 중 하나만 쓰게 가이드 |
| R4 | F5 PR Report 를 GitHub 전용으로 해버리면 GitLab 팀에서 못 씀 | `vda impact --format github-pr` / `--format gitlab-mr` 두 templating. 내부는 같은 AST |
| R5 | Impact UX 개편 (git 연계) 이 Windows 경로 이슈 | child_process git 호출 시 `execFile` + 절대경로 사용. 테스트에 Windows CI job 추가는 Phase 10+ |

---

## 8. 기존 `docs/phase7-plan.md` 처리

- 삭제하지 않음. 파일 최상단에 `> ⚠️ Superseded by docs/phase-ultra/phase7-plan.md (v2)` 배너 추가
- legacy 의 Tier 0~4 항목에 해결 여부 표시 (Phase-Ultra 완료분 ✅, 본 Phase 7a/7b 에서 처리 예정 항목 🚧, 범위 밖 📦)
