# Phase 6 Post-Fix Full Project Reaudit

작성일: 2026-04-08

## 범위

- `docs/` 하위 문서 재확인
- 루트 설정과 `packages/cli`, `packages/core`, `packages/server`, `packages/web-ui` 재검토
- 실제 제품 경로 기준 명령 재실행
  - `npm run build`
  - `npm test`
  - `node packages/cli/dist/bin/vda.js analyze test-project --config .vdarc.json`
  - `node packages/cli/dist/bin/vda.js serve test-project --watch`
  - `curl`로 `/api/graph`, `/api/stats`, `/api/analysis/overlays`, `/api/search`, `/api/source-snippet`, `/api/analysis/parse-errors`, `/api/graph/node/:id`, `/api/graph/node/:id/impact` 재검증

## 총평

- 이전 감사에서 지적한 일부 핵심 결함은 실제로 수정됐다.
  - 루트 `npm run build`, `npm test`가 통과한다.
  - `vda init`의 ESM `require is not defined` 크래시는 해소됐다.
  - 서버의 `analysis/overlays`, `source-snippet`, `parse-errors` API가 실제 구현되어 있다.
  - UI는 패널 너비 localStorage 영속화, URL hash 복원, 커맨드 팔레트를 실제로 갖췄다.
- 그러나 실제 제품 경로에서 아직 남아 있는 결함도 명확하다.
  - warm-cache 분석에서 `db-table` 노드가 전부 사라진다.
  - `/api/graph/node/:nodeId`와 `/api/graph/node/:nodeId/impact`는 대부분의 file-backed node ID에서 404가 난다.
  - CLI `analyze` 출력의 `Node Types`가 node/edge 통계를 섞어서 잘못 보여준다.
- 문서는 이전보다 일부 정정됐지만 아직 코드보다 앞서가는 부분이 적지 않다.

## 이번 재검증에서 확인된 개선점

### 1. 빌드/테스트 루트 경로는 복구됨

- `package.json`에 `packageManager`가 들어가 있어 루트 turbo 실행이 정상 동작한다.
- `npm run build` 통과.
- `npm test` 통과.
- 다만 `@vda/web-ui` 번들은 여전히 크다.
  - 실제 빌드 출력: `dist/assets/index-CFmViEKL.js 741.21 kB`

### 2. `vda init` ESM 크래시는 해결됨

- `packages/cli/src/commands/init.ts:1-2,221-229`에서 `pathParse` 기반 `findUp()`를 사용한다.
- 이전처럼 `require` 때문에 초기화가 죽지 않는다.

### 3. 서버 API 확장은 실제 구현됨

- `packages/server/src/routes/graphRoutes.ts:71-96`
  - `/api/analysis/overlays`
  - `/api/source-snippet`
  - `/api/analysis/parse-errors`
- `npm test`에서 `packages/server/src/__tests__/api.test.ts` 15개가 통과한다.

### 4. UI 일부 UX 보완은 실제 반영됨

- 패널 너비 영속화: `packages/web-ui/src/stores/ui.ts:5-23`
- URL hash 복원/갱신: `packages/web-ui/src/App.vue:37-64`
- 분석 진행 오버레이는 이제 실제 의미에 맞게 `Dismiss`로 표시됨: `packages/web-ui/src/components/AnalysisProgress.vue:65-72`
- 커맨드 팔레트는 stub가 아니라 실제 동작한다: `packages/web-ui/src/components/CommandPalette.vue:26-215`

## 주요 잔여 결함

### P1-01. warm-cache 분석이 `db-table` 노드를 유실시켜 E2E DB 체인을 깨뜨린다

증상:

- 실제 런타임 경로에서 warm-cache 결과는 `900 nodes`, `0 db-table`이다.
- 같은 프로젝트를 no-cache로 돌리면 `910 nodes`, `10 db-table`이다.
- `reads-table`/`writes-table` edge는 남아 있는데 target node는 사라져 있다.

실제 재현 결과:

- warm-cache 런타임
  - `node packages/cli/dist/bin/vda.js analyze test-project --config .vdarc.json`
  - 출력: `Nodes: 900`
  - `Node Types`에 `db-table` 없음
- no-cache 런타임
  - dist 모듈로 `runAnalysis(config, { noCache: true })` 직접 실행
  - 결과: `totalNodes: 910`, `dbTableNodes: 10`, `hasCarts: true`
- warm-cache dist 모듈 직접 실행
  - 결과: `totalNodes: 900`, `dbTableNodes: 0`, `hasCarts: false`
  - 동시에 `reads-table`/`writes-table` 50개는 유지

원인:

- `packages/core/src/parsers/java/MyBatisXmlParser.ts:63-72`
  - `db-table` 노드를 만들 때 `filePath: ''`를 넣는다.
- CLI 캐시 저장 로직 `packages/cli/src/config.ts:121-131`
  - `graph.getNodesByFile(filePath)` 기반으로만 cache entry를 만든다.
- 서버 캐시 저장 로직 `packages/server/src/engine.ts:122-132`
  - `result.nodes.filter(n => n.filePath === filePath)` 기반으로만 cache entry를 만든다.
- 결과적으로 XML 파일에서 나온 `db-table` 노드는 cache entry에 저장되지 않는다.
- 다음 warm run에서는 statement/edge만 복원되고 table node는 빠진 채 그래프가 만들어진다.

사업 영향:

- Phase 4의 핵심 가치인 프론트엔드→백엔드→DB table 체인이 warm-cache 제품 경로에서 깨진다.
- 실제 UI와 API에서 DB 레이어를 신뢰할 수 없다.

### P1-02. `/api/graph/node/:nodeId`와 `/api/graph/node/:nodeId/impact`는 대부분의 file-backed node ID에서 404가 난다

증상:

- `spring-service:/home/.../CacheConfig.java` 같은 실제 노드 ID는 404.
- `mybatis-mapper:com.example.mapper.CartMapper` 같이 slash가 없는 ID는 200.

실제 재현 결과:

- 404 예시
  - `GET /api/graph/node/spring-service%3A%2Fhome%2F...%2FCacheConfig.java`
  - 응답: `Route GET:/api/graph/node/... not found`
- 200 예시
  - `GET /api/graph/node/mybatis-mapper%3Acom.example.mapper.CartMapper`
- 동일 현상은 `/api/graph/node/:nodeId/impact`에도 재현됨

근거 코드:

- 라우트 정의: `packages/server/src/routes/graphRoutes.ts:35-52`
- 대부분의 node ID는 절대경로를 포함한다. 예: `spring-service:/...`, `vue:/...`
- 테스트는 이 실패를 사실상 허용한다.
  - `packages/server/src/__tests__/api.test.ts:60-77`
  - valid node ID에서 404가 나와도 테스트가 통과하도록 작성돼 있다.

사업 영향:

- 문서에 적힌 node detail / impact API는 대부분의 실제 노드에서 사용할 수 없다.
- 외부 연동, deep-link, 상세 조회 API 확장에 바로 걸림돌이 된다.

### P2-01. CLI `analyze`의 `Node Types` 출력이 node/edge 통계를 섞는다

실제 재현 결과:

- `node packages/cli/dist/bin/vda.js analyze test-project --config .vdarc.json`
- `Node Types` 아래에 아래 값이 함께 출력됨
  - `spring-injects`
  - `api-serves`
  - `mybatis-maps`
  - `api-call`

근거 코드:

- `packages/core/src/graph/DependencyGraph.ts:182-191`
  - `getStats()`가 node kinds와 edge kinds를 한 객체로 합친다.
- `packages/cli/src/commands/analyze.ts:38-45`
  - 이 합쳐진 객체를 prefix만 보고 `Node Types`로 출력한다.

영향:

- CLI 요약이 실제 그래프 상태를 오해하게 만든다.
- 특히 `db-table` warm-cache 유실 같은 문제를 더 숨긴다.

### P2-02. `services[]`와 `include[]`는 아직 analyze/serve에서 사실상 무시된다

근거 코드:

- `vda init`는 `services[]`를 기록한다: `packages/cli/src/commands/init.ts:15-50`
- 그러나 실제 로드/실행은 `vueRoot`, `springBootRoot`만 본다.
  - CLI: `packages/cli/src/config.ts:34-56`
  - 서버: `packages/server/src/engine.ts:43-68`
- 파일 탐색도 hard-coded pattern만 사용한다.
  - CLI: `packages/cli/src/config.ts:71-98`
  - 서버: `packages/server/src/engine.ts:157-185`

추가 확인:

- `test-project/.vdarc.json`에는 `include`가 있지만 실제 discover 단계는 이 값을 읽지 않는다.

영향:

- MSA/monorepo 대응 문서가 실제 제품 동작을 과장한다.
- 커스텀 include/exclude 기대치와 실제 결과가 어긋날 수 있다.

### P2-03. 성능 테스트는 cache correctness를 검증하지 못한다

실제 테스트 출력:

- `npm test` 중 `packages/core`
  - `Cached run: 225ms (0 cache hits out of 510)`

근거 코드:

- `packages/core/src/__tests__/performance.test.ts:52-83`
  - 두 번째 실행에서 `elapsed < 2000ms`만 확인한다.
  - `cacheHits > 0` 또는 expected node integrity는 검증하지 않는다.

영향:

- warm-cache 결함이 있어도 테스트가 계속 초록으로 남는다.
- 실제로 이번 재감사에서 발견한 `db-table` 유실도 이 테스트가 막지 못했다.

### P3-01. UI는 개선됐지만 “전 컴포넌트 token화”와 A11y 문서 수준까지는 아직 아니다

실제 코드:

- token 기반 공통 스타일은 존재한다: `packages/web-ui/src/style.css:1-79`
- 그러나 일부 핵심 컴포넌트는 여전히 hard-coded gray 계열을 직접 사용한다.
  - `packages/web-ui/src/components/sidebar/SearchPanel.vue:20-38`
  - `packages/web-ui/src/components/sidebar/FilterPanel.vue:15-47`
  - `packages/web-ui/src/components/graph/NodeDetail.vue:16-90`

추가 관찰:

- `packages/web-ui/src/App.vue`에는 semantic `main`, `aside`, `header`, `footer`는 있으나, 문서가 주장한 explicit `role="main"`, `aria-label`류는 없다.
- 커맨드 팔레트는 구현됐지만 `recentItems`는 저장만 하고 template에서 렌더링하지 않는다.
  - 저장: `packages/web-ui/src/components/CommandPalette.vue:33-45`
  - 결과 목록 렌더링: `packages/web-ui/src/components/CommandPalette.vue:183-203`

영향:

- 문서상 “제품 수준 UX” 표현과 실제 구현 사이에 아직 간극이 있다.

### P3-02. Deep-analysis의 남은 기술 부채는 여전히 존재한다

근거 코드:

- `packages/core/src/engine/ParallelParser.ts:70-170`
  - 여전히 worker 분리가 아니라 main-thread chunked `Promise.all`
- `packages/core/src/parsers/typescript/TsFileParser.ts:159-162`
  - router file을 `vue-router-route`로 태깅만 하고 `route-renders`를 만들지 않음
- `packages/core/src/parsers/vue/TemplateAnalyzer.ts:76-98`
  - custom directive/component 분석만 있고 event listener virtual edge는 없음
- `packages/core/src/parsers/vue/ScriptAnalyzer.ts:157-160,254-261`
  - `defineEmits` metadata만 기록, parent listener linkage 없음
- `packages/core/src/parsers/java/JavaFileParser.ts:109-116`
  - `class` 기준 파싱, `interface` 파싱 경로 없음
- `packages/core/src/linkers/MyBatisLinker.ts:10-34`
  - MyBatis matcher는 `spring-service`/`spring-controller` node를 대상으로만 동작
- `packages/core/src/analyzers/OrphanDetector.ts:12-20`
  - `findUnusedComponents()`는 `route-renders`를 전제하지만 생산 쪽이 없음

영향:

- Phase 4/7로 미뤄둔 심층 기능은 아직 실제 제품 수준으로 닫히지 않았다.

## 문서 드리프트

### 1. `docs/phase2-summary.md`

- `:24`
  - 현재 구현은 double-click이 아니라 single click cluster expand/collapse이다.
  - 실제 구현: `packages/web-ui/src/components/graph/ForceGraphView.vue:280-296`
- `:41`
  - “취소 버튼” 표현은 여전히 과장이다.
  - 실제 구현은 dismiss이며 서버 분석은 계속된다: `packages/web-ui/src/components/AnalysisProgress.vue:65-72`
- `:65-68`
  - MiniMap은 코드상 존재하지 않는다.
  - status bar도 하단에 file/time만 보여주며 node/edge 수는 좌측 sidebar footer에 있다.

### 2. `docs/phase3-summary.md`

- `:10-12`
  - “모든 컴포넌트에서 var(--token)”은 사실이 아니다.
- `:30`
  - 온보딩 설명의 double-click은 stale하다.
- `:45`
  - 최근 사용 항목 localStorage 저장은 맞지만, 결과 상단 표시까지는 구현되지 않았다.
- `:54-56`
  - explicit ARIA landmark/label 적용 주장은 현재 코드 근거가 부족하다.

### 3. `docs/phase4-summary.md`

- `:4,36-37`
  - “프론트엔드→백엔드→DB까지 E2E 추적 가능”은 cold/no-cache 기준으로만 부분적으로 맞다.
  - warm-cache 제품 경로에서는 `db-table` 노드가 사라져 DB layer가 끊어진다.

### 4. `docs/phase5-summary.md`

- `:45`
  - `GET /api/graph/node/:id`는 대부분의 실제 file-backed node에서 검증된 상태가 아니다.
- `:62-64`
  - cache benchmark 수치는 현재 `npm test` 출력과 다르며, 무엇보다 cache hit 0이어도 통과한다.
- `:68`
  - nodeId route 이슈는 “영향 없음”이 아니라 실제 API 가용성 문제다.

### 5. `docs/user-stories.md`

- `:524`
  - recent items를 결과 상단에 표시한다는 내용은 현재 미구현
- `:534`
  - cluster 확장은 double-click이 아니라 click
- `:583`
  - cancel button은 분석 중단이 아니라 overlay dismiss
- `:664`
  - 모든 컴포넌트가 token 기반은 아님

## 권장 수정 순서

1. cache 저장 구조를 고쳐 `db-table` 같은 synthetic node를 절대 유실하지 않게 만들 것
2. node detail/impact API에서 path param 대신 query param 또는 base64url ID로 바꿀 것
3. `DependencyGraph.getStats()`를 `nodeKinds`, `edgeKinds`로 분리하고 CLI/server 소비부를 수정할 것
4. `services[]`, `include[]`를 실제 discover/watch 경로에 연결할 것
5. 회귀 테스트를 보강할 것
   - warm-cache에서도 `db-table` 10개 유지
   - valid file-backed node detail/impact 200
   - CLI node types에 edge kinds 비노출
6. 문서를 현재 구현 수준으로 다시 정리할 것

## 최종 판단

- 이 저장소는 이전 감사 대비 분명히 좋아졌다.
- 그러나 지금 상태를 “판매 가능한 솔루션”으로 보려면 아래 두 축이 먼저 닫혀야 한다.
  - 실제 런타임에서 그래프 무결성이 깨지지 않을 것
  - 공개 API와 문서가 현실과 일치할 것
- 현재 가장 위험한 지점은 warm-cache DB layer 유실과 file-backed node detail API 실패다.
