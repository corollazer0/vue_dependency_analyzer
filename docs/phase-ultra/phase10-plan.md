# Phase 10 Plan — Polish & Promises (Carry-over Round-up)

> 작성일: 2026-04-19
> 브랜치: `feature/phase10` (Phase 9b 머지 후)
> 추정: 2-3w
> 목표: Phase 7~9 의 모든 benchmark "Deferred" 행을 한 번에 정리한다. 새 기능보다 신뢰 회복 + 후속 phase (11~14) 의 의존 면 동결이 본질.

---

## 0. 배경

Phase 7~9 는 시간 압박으로 다음을 deferred 처리했다:
- 7a-PR-A benchmark §"Notes on the gate interpretation": Pathfinder reverse-direction (controller→vue, event chain forward)
- 7a-PR-B benchmark §"Deferred": axe-core CI integration, file-tree picker, gitlab-mr format
- 7b benchmark §"Deferred / not in this PR": `act` dry-run validation, gitlab-mr 재언급, Layer DSL `where:` predicate
- 8 benchmark §"Deferred": `--signatures-only` 35% 목표, previousId rename tracking
- 9b benchmark §"Deferred": parser `lineCount`/`packageCount` metadata, anti-pattern fixture seeding

본 phase 는 위 10건을 모두 닫는다. 단순 정리지만 후속 phase 가 의존하는 인터페이스도 함께 동결하므로 가볍게 보지 말 것.

---

## 1. 범위

### 1-1. 카리오버 항목 (10건)

| # | 항목 | 출처 | 영향 |
|---|---|---|---|
| 10-1 | Pathfinder `dir=reverse` 모드 | 7a-PR-A bench | UI controller→vue / event-chain 게이트 흐름 정리 |
| 10-2 | Parser `lineCount`/`packageCount` metadata | 9b bench | 9-7 god-object 자연 발생 |
| 10-3 | SignatureStore `signaturesOnly` parser-pipeline 분기 | 8 bench | 35% wall-time 게이트 충족 |
| 10-4 | SignatureStore `previousId` rename tracking | 8 bench R1 | DTO 파일 이동 시 B1+add 이중 보고 제거 |
| 10-5 | Layer DSL `where:` predicate | 7b bench | metadata-aware 레이어 정의 |
| 10-6 | Impact 패널 file-tree picker (input source C) | 7a-3 bench | git 외 시나리오 커버 |
| 10-7 | PR Report `--format gitlab-mr` 템플릿 | 7b bench R4 | GitLab 채택 |
| 10-8 | axe-core CI 통합 (bench harness 확장) | 7a-9 / 7b bench | A11y 자동 검증 |
| 10-9 | `act` 기반 GH Action dry-run 검증 | 7b-7 bench | vda-pr-report.yml 라이브 검증 |
| 10-10 | Anti-pattern 합성 fixture (`.phase9-fixtures/anti-patterns/`) | 9-10b / 9b bench | 4 태그 모두 자연 분류 가능 |

### 1-2. 명시적 제외

- F8 git blame — Phase 11
- F10 MSA — Phase 12
- F11 schema drift — Phase 13
- F13/F14/F15 IDE/C4/LLM — Phase 14

---

## 2. 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 10-1 | `findPaths` reverse 모드 — 신규 옵션 `direction: 'forward'|'reverse'`. reverse = `getInEdges` 따라 DFS. CLI / 서버 / UI 모두 dir 파라미터 통과. **계약 freeze**: `/api/graph/paths?from&to&dir=reverse` 응답 형식 = forward 와 동일 (paths[][]) | `core/src/graph/query.ts`, `server/src/routes/graphRoutes.ts`, `web-ui/src/components/graph/PathfinderPanel.vue` |
| 10-2 | TS/Java 파서가 `metadata.lineCount: number` (파일 라인수) + `metadata.packageCount: number` (파일이 import 하는 distinct top-level 패키지 수) 를 모든 노드에 emit. 0 fallback 보장 — 후속 phase 가 옵셔널 체크 필요 없음 | `core/src/parsers/typescript/TsFileParser.ts`, `core/src/parsers/vue/VueSfcParser.ts`, `core/src/parsers/java/JavaFileParser.ts` |
| 10-3 | `runAnalysis(config, { signaturesOnly: true })` — parser 단계는 그대로, **linker / cross-boundary resolver / dto-flow / waiver 단계 skip**. `vda analyze --signatures-only` 가 이 path 를 사용하도록 갱신. 게이트: test-project 기준 풀 분석 대비 ≤ 35% wall time 측정 + benchmark 에 기록 | `core/src/engine/runAnalysis.ts` (또는 동등 위치), `cli/src/commands/analyze.ts` |
| 10-4 | `SignatureRecord` 에 `previousId?: string` 옵셔널 필드. JavaFileParser 가 file-rename heuristic (이전 같은 className 이 다른 파일에 존재) 발견 시 채움. BreakingChangeDetector 가 `removed[a]` 와 `added[b]` 를 `previousId === a` 로 페어링해 단일 "renamed" 이벤트로 마킹 (B1 카운트에서 제외) | `core/src/engine/SignatureStore.ts`, `core/src/analyzers/BreakingChangeDetector.ts` |
| 10-5 | `LayerDefinition.where?: { [metadataKey]: string|boolean }` — 매칭 시 NodeKind 일치 + metadata 모든 키 일치. 충돌 정책은 기존 (hand-written 우선) 그대로 적용 | `core/src/analyzers/LayerDsl.ts` |
| 10-6 | ChangeImpactPanel 에 3번째 모드 "Files (tree)" 추가. 서버 `GET /api/files/tree?root=&depth=` (디렉토리 리프 / 파일 리프 marker 포함). 다중 선택 → analyze. **3-clicks 게이트 위배 금지** — 모드 전환은 1클릭, 파일 선택 ≥ 1, Analyze | `web-ui/src/components/ChangeImpactPanel.vue`, `server/src/routes/analysisRoutes.ts` |
| 10-7 | `formatPrReport({ format: 'gitlab-mr', … })` — GitHub 마커 (`<!-- vda:breaking-risks:start -->`) 와 동일한 의미의 마커지만 GitLab 호환 HTML 주석으로 emit. `vda impact --format gitlab-mr` 추가. 기존 7b-6 snapshot 깨지 않게 default 유지 | `cli/src/commands/prReport.ts`, `cli/src/index.ts` |
| 10-8 | `@vda/bench` harness 가 `--audit` 옵션 받으면 axe-core 를 페이지에 주입하고 `audit.json` 산출. `.github/workflows/bench.yml` 의 strict 모드 분기에 axe critical = 0 게이트 추가 | `bench/src/harness/measure.ts`, `.github/workflows/bench.yml` |
| 10-9 | `.github/workflows/vda-pr-report.yml` 에 self-test step 추가 (`act -j pr-report --dryrun`) — 워크플로 syntax 회귀 방지. `act` 미설치 환경에서는 graceful skip | `.github/workflows/vda-pr-report.yml`, `scripts/validate-workflow.sh` |
| 10-10 | `test-project-ecommerce/.phase9-fixtures/anti-patterns/` 에 god-object/entry-hub/utility-sink/cyclic-cluster 각 1건 합성. e2e-fixture 에 4 태그 모두 ≥1 검출 게이트 (9b 의 ≥3 대신 ≥4) | `test-project-ecommerce/.phase9-fixtures/anti-patterns/*`, `core/src/__tests__/e2e-fixture.test.ts` |

---

## 3. 성공 지표 (게이트)

- 10건 모두 commit + 회귀 0
- `/api/graph/paths?dir=reverse` 응답 = forward 와 동일 형식 (계약 freeze test 1건)
- `--signatures-only` 실측 ≤ 35% wall-time (benchmark 에 수치 기록)
- LayerDsl `where:` 매칭 단위 테스트 ≥ 2건
- ChangeImpactPanel 3 모드 (git / manual / files) 토글 회귀 없음
- gitlab-mr / github-pr snapshot 모두 marker 동일
- axe-core CI 가 strict 모드에서 critical = 0 시 통과, > 0 시 실패
- 9b 의 e2e anti-pattern 게이트 ≥3 → ≥4 로 강화

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | `--signatures-only` 35% 미달 | parser-pipeline split 이 충분치 않으면 worker 풀에 별도 모드 도입. PoC 결과가 50% 이상이면 게이트 완화 + benchmark 에 명시 |
| R2 | reverse Pathfinder 에서 cycle 무한 루프 | 기존 forward DFS 의 `onPath` set 동일 적용. 추가 비용 없음 |
| R3 | axe-core 가 cytoscape canvas 영역에서 false positive | aria-hidden 처리 + canvas 노드 단위 test ID 추가 |
| R4 | gitlab-mr 마커가 GitLab MR rendering 에서 깨짐 | snapshot 만 지원, 실제 GitLab 통합 검증은 후속 |
| R5 | file-tree picker 가 노드 만 인 프로젝트 (50K 파일) 에서 느림 | lazy load (depth 1 + on-demand expand) |

---

## 5. 의존

- Phase 9b 머지 완료 (필수)
- 10-3 (signaturesOnly) 가 Phase 8 의 baseline workflow 를 다시 가동시키므로 8-11 의 `vda-baseline-refresh.yml` 와 함께 검증 (회귀 없으면 그대로)
- 10-2 (parser meta) 가 9b 의 god-object 자연 검출을 가능케 함 — 10-10 의 fixture 와 합쳐 4-tag 게이트 강화

---

## 6. 커밋 단위 & PR 단위

- 각 카리오버 1 commit (10건)
- 단일 PR `feature/phase10` — 작은 정리 묶음
- 머지 전 `docs/phase-ultra/phase10-benchmark.md` 작성

---

## 7. Phase 10 종료 조건 (게이트 요약)

- 10건 체크리스트 전부 ✅ + 각 항목 cross-link 된 7~9 benchmark deferred 행 업데이트
- 회귀 0 (기존 454 tests + Phase 10 신규 ≥ 12개)
- perf-budget 0 violations 유지
- cross-phase 계약 freeze test (Pathfinder dir, signaturesOnly mode, parser meta, previousId, layer where) 5건 추가
