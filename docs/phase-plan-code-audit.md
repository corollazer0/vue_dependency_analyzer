# VDA Phase Plan vs Code Audit

> 품질 개선 작업을 시작하는 에이전트는 먼저 [quality-improvement-agent-guide.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/quality-improvement-agent-guide.md)를 읽고, 그 다음 이 문서를 근거 문서로 사용하십시오.

작성일: 2026-04-08

## 목적

`docs/` 하위 문서 전체와 현재 저장소의 실제 소스를 대조해, phase 계획/요약 문서와 다르게 구현되었거나 문서가 구현보다 앞서 있는 부분을 정리했다.

이 문서는 "현재 코드가 무엇을 실제로 제공하는가"를 기준으로 작성했다. 마케팅/제품 문구로 바로 사용하면 위험한 항목을 우선순위 높게 표시했다.

## 검토 범위

- 문서 전수 검토
  - `docs/first-plan.md`
  - `docs/ultra-plan.md`
  - `docs/user-stories.md`
  - `docs/phase1-summary.md`
  - `docs/phase2-summary.md`
  - `docs/phase3-summary.md`
  - `docs/phase4-prd.md`
  - `docs/phase4-summary.md`
  - `docs/phase5-plan.md`
  - `docs/phase5-summary.md`
  - `docs/user-stories-review.md`
- 소스 전수 검토 대상
  - 루트 설정: `package.json`, `turbo.json`, `tsconfig.base.json`, `.gitignore`
  - 제품 소스: `packages/core/src`, `packages/cli/src`, `packages/server/src`, `packages/web-ui/src`
  - 테스트/픽스처: `packages/core/src/__tests__`, `packages/server/src/__tests__`, `packages/core/src/__fixtures__`, `scripts/generate-fixtures.js`, `test-project`
- 제외
  - `dist/` 산출물은 구현 근거가 아니라 빌드 결과이므로 감사 대상에서 제외했다. 단, CLI 런타임 오류 재현을 위해 `packages/cli/dist/bin/vda.js`는 실행 검증에 사용했다.

## 실행 검증

아래 명령은 실제로 재현했다.

- `npm run build`
  - 실패: `Missing packageManager field in package.json`
- `npm test`
  - 실패: `Missing packageManager field in package.json`
- `npm -w @vda/core test`
  - 통과
- `npm -w @vda/server test`
  - 통과
- `npm -w @vda/core run build`
  - 통과
- `npm -w @vda/server run build`
  - 통과
- `npm -w @vda/cli run build`
  - 통과
- `npm -w @vda/web-ui run build`
  - 통과, 단 `dist/assets/index-CP0SjN78.js` 740.34 kB 경고 발생
- `node packages/cli/dist/bin/vda.js init packages/web-ui`
  - 실패: `ReferenceError: require is not defined`
- `node packages/cli/dist/bin/vda.js analyze test-project --config .vdarc.json`
  - 통과

## Executive Summary

- Critical: 루트 monorepo 빌드/테스트 경로가 깨져 있다. 개별 패키지 빌드는 되지만 제품 기준의 표준 진입점인 `npm run build`, `npm test`가 실패한다.
- Critical: `vda init`가 실제 Vue 프로젝트에서 런타임 크래시한다. 제품 온보딩 경로가 막혀 있다.
- Critical: Phase 4 문서가 주장하는 "프론트엔드→백엔드→DB 완전 추적"은 현재 구현 기준으로 과장이다. MyBatis interface linking, Vue router entry edges, frontend event virtual edges, DTO flow/consistency는 완성되지 않았다.
- High: Phase 2 문서가 강조한 병렬 파싱/캐시/MSA/watch는 부분 구현 상태다. 특히 `worker_threads`, server 초기 캐시, `services` 소비, XML fallback, 리소스 watch가 계획과 다르다.
- High: Phase 3 문서의 제품 polish는 일부만 구현되었고, 커맨드 팔레트/온보딩/리사이즈 영속화/토큰 전환/A11y는 문서가 실제보다 앞서 있다.
- High: Phase 5의 성능/품질 검증은 통과 숫자 자체보다 검증 강도가 약하다. 캐시 테스트는 0 cache hit 상태로도 통과하고, 500-file fixture는 실행 가능한 현실 프로젝트가 아니라 분석기용 합성 데이터에 가깝다.

## 상세 발견 사항

### Phase 1 / Foundation

#### P1-01. 스캐폴딩 계획과 달리 루트 품질 파이프라인이 완성되지 않았다

- 계획 근거
  - `docs/first-plan.md:22-27`
  - `docs/ultra-plan.md:28-39`
- 실제 구현
  - 루트 `package.json`에는 `eslint` devDependency가 없고 `packageManager`도 없다. `package.json:1-25`
  - 루트에 `.eslintrc.cjs`, `eslint.config.*`, `vitest.workspace.ts`가 없다. 저장소 검색 결과 매치 0건.
  - `npm run build`, `npm test` 모두 `Missing packageManager field in package.json`로 실패한다.
- 차이
  - 문서는 "monorepo scaffolding + ESLint + workspace Vitest + turbo 파이프라인"을 약속했지만, 실제로는 루트 진입점 자체가 실패한다.
- 제품 영향
  - CI/CD, 온보딩, 배포 검증, 고객 납품용 릴리스 파이프라인을 바로 붙일 수 없다.

#### P1-02. `vda init`가 실제 ESM 런타임에서 크래시한다

- 계획 근거
  - `docs/first-plan.md:278-284`
  - `docs/phase2-summary.md:53-60`
- 실제 구현
  - `packages/cli/src/commands/init.ts:221-229`의 `findUp()`가 ESM 코드에서 `require('path')`를 호출한다.
  - 실제 재현: `node packages/cli/dist/bin/vda.js init packages/web-ui` 실행 시 `ReferenceError: require is not defined`.
- 차이
  - 문서는 `vda init`를 제품 온보딩 기능처럼 설명하지만, 실제로는 Vue 프로젝트를 찾은 직후 alias 탐색 단계에서 죽는다.
- 제품 영향
  - 첫 진입 사용자 여정이 막힌다. 데모/세일즈/PoC에서 바로 치명상이다.

#### P1-03. MSA 설계와 실제 설정 모델이 다르고, 분석 경로는 `services`를 소비하지 않는다

- 계획 근거
  - `docs/first-plan.md:267-283`
  - `docs/phase2-summary.md:49-52`
- 실제 구현
  - 문서는 `AnalysisConfig.springBootRoots: string[]`와 서비스별 라벨링을 언급하지만, 실제 타입은 `springBootRoot?: string` + `services?: ServiceConfig[]`다. `packages/core/src/graph/types.ts:77-87`
  - CLI 분석은 `config.services`를 읽지 않고 `vueRoot`, `springBootRoot`만 사용한다. `packages/cli/src/config.ts:71-97`
  - 서버 분석도 `config.services`를 읽지 않는다. `packages/server/src/engine.ts:146-174`
- 차이
  - `init` 단계에서만 MSA를 감지/기록하고, 실제 분석/서빙은 단일 루트 중심으로 동작한다.
- 제품 영향
  - "MSA 지원"을 판매 문구로 쓰기 어렵다. 현재는 감지 수준이지 분석 완결 기능이 아니다.

### Phase 2 / Performance & UX

#### P2-01. `ParallelParser`는 문서가 암시하는 worker 기반 병렬 파서가 아니다

- 계획 근거
  - `docs/first-plan.md:207-210`
  - `docs/phase2-summary.md:8-12`
- 실제 구현
  - `packages/core/src/engine/ParallelParser.ts:1-5`는 `worker_threads`를 import하지만 실제 worker를 생성하지 않는다.
  - 주석도 `Promise.all with controlled concurrency instead of worker_threads`라고 명시한다. `packages/core/src/engine/ParallelParser.ts:70-74`
  - 모든 파일을 메인 스레드에서 먼저 `readFileSync`로 읽는다. `packages/core/src/engine/ParallelParser.ts:96-110`
  - 이후 청크 단위 `Promise.all`로 순회할 뿐이다. `packages/core/src/engine/ParallelParser.ts:112-161`
- 차이
  - 문서는 CPU 코어 기반 병렬 파싱으로 읽히지만, 실제 구현은 메인 스레드 동기 파일 읽기 + 동시 루프다.
- 제품 영향
  - 대형 리포지토리에서 기대 성능과 실제 한계가 다를 수 있다. 성능 수치가 환경 의존적이다.

#### P2-02. server 초기 분석 경로는 캐시를 거의 채우지 않는다

- 계획 근거
  - `docs/first-plan.md:212-219`
  - `docs/phase2-summary.md:13-17`
- 실제 구현
  - CLI는 분석 후 파일별 결과를 `cache.set()`으로 채운다. `packages/cli/src/config.ts:117-133`
  - server 초기 분석은 `cache.get()`만 쓰고 끝난 뒤 `save()`만 호출한다. `packages/server/src/engine.ts:95-125`
  - `ParseCache.save()`는 `dirty === false`면 아무 것도 저장하지 않는다. `packages/core/src/engine/ParseCache.ts:58-60`
- 차이
  - 문서상 cache가 CLI/server 모두 일관되게 동작하는 것처럼 보이지만, 실제로는 server는 watch 변경 경로에서만 실질적으로 캐시가 채워진다.
- 제품 영향
  - 재시작 후 warm cache 체감이 CLI와 server에서 다르다.

#### P2-03. MyBatis XML 탐색과 watch 경로가 계획보다 좁다

- 계획 근거
  - `docs/phase2-summary.md:49-60`
  - `docs/phase4-summary.md:8-13`
- 실제 구현
  - CLI/Server 모두 `vueRoot`/`springBootRoot`가 없을 때 fallback 패턴에 `.xml`을 넣지 않는다.
  - CLI: `packages/cli/src/config.ts:89-95`
  - Server: `packages/server/src/engine.ts:161-163`
  - watch 경로도 `vueRoot`와 `springBootRoot`만 감시하고 `resources` sibling이나 `services[]`는 포함하지 않는다. `packages/server/src/engine.ts:176-188`
- 차이
  - 문서는 project scan이 충분히 폭넓은 것처럼 보이지만, 설정이 비어 있거나 MSA/resource 구조가 다르면 MyBatis XML이 빠질 수 있다.
- 제품 영향
  - "XML→DB table" 체인이 프로젝트 설정 방식에 따라 조용히 누락될 수 있다.

#### P2-04. 클러스터링 구현이 문서보다 단순하며 상호작용도 다르다

- 계획 근거
  - `docs/first-plan.md:237-255`
  - `docs/phase2-summary.md:19-23`
- 실제 구현
  - 실제 상호작용은 double-click이 아니라 single `tap`이다. `packages/web-ui/src/components/graph/ForceGraphView.vue:280-296`
  - 온보딩 문구는 여전히 double-click이라고 안내한다. `packages/web-ui/src/components/OnboardingGuide.vue:6-10`
  - 서버는 고정 `MIN_CLUSTER_SIZE = 5`를 사용하고, 문서상의 임계값/정책을 외부 설정으로 노출하지 않는다. `packages/server/src/engine.ts:259-287`
  - 클러스터 엣지의 실제 종류를 UI에서 모두 `'imports'`로 덮어쓴다. `packages/web-ui/src/components/graph/ForceGraphView.vue:98-103`
- 차이
  - 문서가 말하는 "의미 보존형 클러스터링"보다 실제 구현은 단순한 directory grouping에 가깝다.
- 제품 영향
  - clustered view에서 edge semantic이 손실된다. 사용자가 API/MyBatis/event 흐름을 오해할 수 있다.

#### P2-05. MiniMap은 생성됐지만 실제 UI에 연결되지 않았다

- 계획 근거
  - `docs/first-plan.md:287-289`
  - `docs/phase2-summary.md:62-67`
  - `docs/ultra-plan.md:609-614`
- 실제 구현
  - `packages/web-ui/src/components/graph/MiniMap.vue` 파일은 존재한다.
  - 그러나 `rg -n "MiniMap" packages/web-ui/src` 결과, 참조는 MiniMap 파일 내부뿐이다.
- 차이
  - 문서상 제공 기능처럼 보이지만, 앱에서 렌더링되지 않는다.
- 제품 영향
  - 50+ 노드 탐색 보조 UX가 없다.

#### P2-06. 분석 취소 버튼은 실제 분석을 취소하지 않는다

- 계획 근거
  - `docs/first-plan.md:227-235`
  - `docs/phase2-summary.md:37-41`
- 실제 구현
  - 버튼은 `cancel` 이벤트만 emit한다. `packages/web-ui/src/components/AnalysisProgress.vue:65-72`
  - `App.vue`는 이를 받아 `analyzing = false`로 오버레이만 숨긴다. `packages/web-ui/src/App.vue:84-85`
  - server에는 cancel/abort API가 없고 `analysisRoutes.ts`는 `/api/analyze`, `/api/stats`만 노출한다. `packages/server/src/routes/analysisRoutes.ts:4-12`
- 차이
  - UI 문구는 취소처럼 보이지만 서버 작업은 계속 돈다.
- 제품 영향
  - 대형 저장소 분석 중 잘못 누르면 UI와 실제 상태가 분리된다.

#### P2-07. `init` 단계의 tsconfig alias 추출은 문서보다 약하다

- 계획 근거
  - `docs/user-stories.md:15-30`
  - `docs/phase2-summary.md:43-47`
- 실제 구현
  - `init`의 `readTsconfigAliases()`는 단일 tsconfig만 읽고 부모 `extends` 체인을 재귀 해석하지 않는다. `packages/cli/src/commands/init.ts:164-185`
  - 반면 실제 import 해석기 `ImportResolver`는 `extends`를 재귀 해석한다. `packages/core/src/parsers/typescript/ImportResolver.ts:18-35`
- 차이
  - 문서만 보면 `init`과 분석 엔진이 동일한 alias 해상도를 제공하는 것처럼 읽히지만, 실제로는 다르다.
- 제품 영향
  - `vda init`로 생성된 alias 설정이 실제 분석기의 해석 범위보다 좁을 수 있다.

#### P2-08. Native bridge 감지 정책이 `init` 단계와 분석 단계에서 다르다

- 계획 근거
  - `docs/user-stories.md:19-21`
  - `docs/user-stories.md:25-30`
  - `docs/user-stories.md:351-359`
- 실제 구현
  - `init`의 auto-detect는 browser globals를 필터링하며 `nativeBridges` 목록을 만든다. `packages/cli/src/commands/init.ts:188-218`
  - Vue parser는 known bridge 외에도 일반적인 `window.X.method()` 패턴을 모두 `native-call`로 본다. `packages/core/src/parsers/vue/ScriptAnalyzer.ts:109-120` `packages/core/src/parsers/vue/ScriptAnalyzer.ts:223-231`
- 차이
  - 문서는 detection 정책이 하나인 것처럼 보이지만, 실제로는 "init용 스캔 규칙"과 "분석 시 파싱 규칙"이 다르다.
- 제품 영향
  - 프로젝트 초기 설정 결과와 실제 분석 결과가 어긋날 수 있다.

#### P2-09. CLI 결과 요약은 일부 node kind를 누락한다

- 계획 근거
  - `docs/user-stories.md:39-48`
- 실제 구현
  - CLI 출력은 `vue-`, `pinia-`, `spring-`, `ts-`, `api-`, `native-` prefix만 표시한다. `packages/cli/src/commands/analyze.ts:38-45`
  - `mybatis-*`, `db-table`, `dto-flows` 관련 카운트는 표시되지 않는다.
- 차이
  - 문서의 "노드 종류별 카운트 표시"는 현재 구현보다 넓게 들린다.
- 제품 영향
  - 사용자가 CLI만 보면 DB/MyBatis 계층이 분석되지 않은 것으로 오해할 수 있다.

### Phase 3 / UX Design Excellence

#### P3-01. 디자인 토큰 전환이 미완료 상태다

- 계획 근거
  - `docs/first-plan.md:378-403`
  - `docs/phase3-summary.md:8-13`
- 실제 구현
  - `packages/web-ui/src/style.css:6-27`에 토큰 정의는 있다.
  - 그러나 여전히 하드코딩 색상/gray 유틸이 광범위하게 남아 있다.
  - 대표 예시
    - `packages/web-ui/src/types/graph.ts:79-137`
    - `packages/web-ui/src/components/AnalysisProgress.vue:36-74`
    - `packages/web-ui/src/components/sidebar/SearchPanel.vue:24-38`
    - `packages/web-ui/src/components/sidebar/FilterPanel.vue:15-47`
    - `packages/web-ui/src/components/graph/NodeDetail.vue:16-90`
    - `packages/web-ui/src/components/graph/MiniMap.vue:27-61`
    - `packages/web-ui/src/components/graph/ForceGraphView.vue:135-217`
    - `packages/web-ui/src/components/graph/TreeView.vue:104-143`
- 차이
  - 문서는 "모든 컴포넌트에서 `var(--token)` 참조"라고 요약하지만 실제는 부분 치환이다.
- 제품 영향
  - 테마 일관성, 브랜드화, 디자인 시스템 확장성이 약하다.

#### P3-02. Command Palette는 문서보다 기능이 덜 완성됐다

- 계획 근거
  - `docs/first-plan.md:454-465`
  - `docs/phase3-summary.md:39-46`
- 실제 구현
  - `Fit graph to view`는 no-op이다. `packages/web-ui/src/components/CommandPalette.vue:26-30`
  - recent items는 localStorage에 저장하지만 리스트 상단 렌더링이 없다. `packages/web-ui/src/components/CommandPalette.vue:33-45`
  - `Reset all filters`는 상태 복원이 아니라 `window.location.reload()`다. `packages/web-ui/src/components/CommandPalette.vue:128-130`
- 차이
  - 문서는 product-grade command center처럼 보이지만 실제로는 일부 stub이 남아 있다.
- 제품 영향
  - UX 데모 시 신뢰도가 떨어진다. 특히 reset 동작이 상태 기반이 아니라 full reload라는 점이 약하다.

#### P3-03. 사이드바/디테일 패널 너비 영속화가 실제로는 동작하지 않는다

- 계획 근거
  - `docs/phase3-summary.md:47-52`
- 실제 구현
  - 영속화 로직은 store setter 안에 있다. `packages/web-ui/src/stores/ui.ts:12-20`
  - 그런데 `App.vue`는 `v-model="uiStore.sidebarWidth"`와 `v-model="uiStore.detailWidth"`를 직접 바인딩한다. `packages/web-ui/src/App.vue:148` `packages/web-ui/src/App.vue:185`
  - setter `setSidebarWidth`, `setDetailWidth`는 실제 사용되지 않는다.
- 차이
  - 드래그는 되지만 localStorage 저장 경로를 우회한다.
- 제품 영향
  - 사용자가 조정한 레이아웃이 새로고침 후 유지되지 않는다.

#### P3-04. Legend 동작이 문서보다 제한적이다

- 계획 근거
  - `docs/first-plan.md:413-420`
  - `docs/phase3-summary.md:20-25`
- 실제 구현
  - legend의 노드 목록은 `filteredNodes` 기준 count가 0인 종류를 아예 숨긴다. `packages/web-ui/src/components/graph/GraphLegend.vue:14-24`
  - 따라서 legend에서 꺼버린 종류를 다시 켜기 어렵고, "전체 종류를 dim 상태로 보여주는 범례"가 아니다.
- 차이
  - 문서는 범례가 FilterPanel과 동등한 토글 UX를 제공하는 것처럼 설명하지만 실제는 축소된 뷰다.
- 제품 영향
  - 사용자 입장에서는 "사라진 종류"를 legend만으로 복구할 수 없다.

#### P3-05. 온보딩 행동과 문서/문구가 다르다

- 계획 근거
  - `docs/first-plan.md:424-431`
  - `docs/phase3-summary.md:26-31`
- 실제 구현
  - 문서는 3초간 표시되는 가이드라고 적지만, 실제 컴포넌트는 타이머 없이 사용자가 직접 닫을 때까지 남는다. `packages/web-ui/src/components/OnboardingGuide.vue:18-69`
  - 문서는 double-click cluster 확장을 말하지만 실제 interaction은 tap 1회다. `packages/web-ui/src/components/OnboardingGuide.vue:8` `packages/web-ui/src/components/graph/ForceGraphView.vue:281-290`
- 차이
  - 문서/온보딩 문구/실제 동작이 동시에 어긋나 있다.
- 제품 영향
  - 첫 사용자 경험에서 학습 비용이 늘어난다.

#### P3-06. A11y 요약은 현재 코드 기준으로 과장돼 있다

- 계획 근거
  - `docs/phase3-summary.md:53-58`
- 실제 구현
  - 저장소 검색 기준 `packages/web-ui/src`에 `role=` 또는 `aria-` 사용이 없다.
  - `Escape`는 `App.vue`에서 노드 선택 해제만 처리한다. `packages/web-ui/src/App.vue:77-79`
  - `/`, `Cmd+K`는 Command Palette 전역 리스너로 존재하지만, 문서가 말한 ARIA landmark는 구현 흔적이 없다.
- 차이
  - "접근성 polish 완료"보다는 일부 keyboard shortcut만 있는 상태다.
- 제품 영향
  - 엔터프라이즈 납품 시 접근성 항목이 바로 질문될 수 있다.

#### P3-07. URL 해시와 상태바는 부분 구현이다

- 계획 근거
  - `docs/phase2-summary.md:63-67`
  - `docs/phase3-summary.md:26-31`
- 실제 구현
  - URL hash는 `selectedNodeId` 변경 시에만 갱신한다. `packages/web-ui/src/App.vue:37-43`
  - view 버튼은 `activeView`만 바꾸고 hash를 갱신하지 않는다. `packages/web-ui/src/App.vue:159-160`
  - 상태바는 파일 수와 분석 시각만 보여주고 watch 상태는 노출하지 않는다. `packages/web-ui/src/App.vue:204-209`
- 차이
  - 문서상 공유 가능한 상태 링크와 watching status가 완성된 것처럼 읽히지만 실제는 부분 반영이다.
- 제품 영향
  - 링크 공유/재현성이 떨어지고, watch 모드 가시성이 없다.

### Phase 4 / Full-Stack Deep Analysis

#### P4-01. MyBatis XML ↔ Java `@Mapper interface` 자동 연결은 end-to-end로 성립하지 않는다

- 계획 근거
  - `docs/phase4-prd.md:41-45`
  - `docs/phase4-summary.md:8-20`
- 실제 구현
  - Java parser는 `class`만 찾고 `interface`는 파싱하지 않는다. `packages/core/src/parsers/java/JavaFileParser.ts:102-136`
  - `@Mapper`가 붙어도 생성되는 노드는 `spring-service` 한 종류다. `packages/core/src/parsers/java/JavaFileParser.ts:46-56`
  - `MyBatisLinker`는 이미 생성된 `spring-service`/`spring-controller` 노드만 대상으로 matching한다. `packages/core/src/linkers/MyBatisLinker.ts:8-44`
  - `test-project`에도 실제 `@Mapper` 또는 `interface *Mapper`가 없다. 검색 결과 0건.
- 차이
  - 문서는 "Java Mapper interface와 XML namespace 자동 연결"이라고 쓰지만, 실제로는 parser가 interface 자체를 만들지 못한다.
- 제품 영향
  - 판매 문구로 쓰면 과장 광고 위험이 있다.

#### P4-02. Vue Router 진입점/`route-renders` 분석은 구현되지 않았다

- 계획 근거
  - `docs/phase4-prd.md:36-39`
  - `docs/first-plan.md:31-34`
- 실제 구현
  - `TsFileParser`는 router 파일을 `vue-router-route` 노드로 분류만 한다. `packages/core/src/parsers/typescript/TsFileParser.ts:159-162`
  - `route-renders` edge를 생성하는 코드는 없다. 저장소 검색 기준 선언만 존재한다.
  - `TemplateAnalyzer`는 `router-view`를 builtin으로 무시한다. `packages/core/src/parsers/vue/TemplateAnalyzer.ts:14-26`
- 차이
  - 문서가 말한 page entry dependency 도출은 아직 없다.
- 제품 영향
  - "unused component"나 화면 중심 impact analysis의 신뢰도가 낮다.

#### P4-03. 프론트엔드 event flow와 백엔드 event flow는 부분 구현 상태다

- 계획 근거
  - `docs/phase4-prd.md:52-55`
  - `docs/phase4-summary.md:19-20`
- 실제 구현
  - Vue 쪽은 `defineEmits` 메타데이터만 수집하고, 부모 `@event` listener와 연결하는 virtual edge는 없다. `packages/core/src/parsers/vue/ScriptAnalyzer.ts:157-160` `packages/core/src/parsers/vue/TemplateAnalyzer.ts:76-93`
  - backend는 `emits-event`, `listens-event` edge를 만들지만 대상 `event:*` 노드는 생성하지 않는다. `packages/core/src/parsers/java/JavaFileParser.ts:284-318`
  - 기본 UI 필터에서 event edge는 꺼져 있다. `packages/web-ui/src/stores/graphStore.ts:20-24`
- 차이
  - 문서는 event flow visualization을 설명하지만 실제 graph completeness와 UI 노출이 둘 다 부족하다.
- 제품 영향
  - 느슨한 결합 분석을 제품 차별점으로 내세우기 어렵다.

#### P4-04. DTO flow, DTO consistency, API spec impact 전파는 구현 흔적이 거의 없다

- 계획 근거
  - `docs/phase4-prd.md:43-50`
- 실제 구현
  - `dto-flows`는 타입 열거형과 색상 정의에만 있다. `packages/core/src/graph/types.ts:20-38` `packages/web-ui/src/types/graph.ts:119-137`
  - `dto-consistency` API, DTO linker, frontend-backend 필드 대조 로직은 저장소 검색 기준 없다.
  - 현재 impact API는 일반 graph path/impact 수준이다. `packages/server/src/routes/graphRoutes.ts:47-53`
- 차이
  - PRD의 핵심 엔터프라이즈 기능이 아직 구현되지 않았다.
- 제품 영향
  - "DTO 정합성 자동 검출"을 판매 포인트로 쓰면 안 된다.

#### P4-05. "프론트→백엔드→DB 완전 추적" 문구는 조건부로만 성립한다

- 계획 근거
  - `docs/phase4-summary.md:30-36`
- 실제 구현
  - API endpoint linking은 존재한다.
  - 그러나 MyBatis mapper interface linking, DTO flow, router entry, frontend event, project-root XML fallback은 빈틈이 있다.
  - 특히 project root fallback에서는 `.xml`을 탐색하지 않아 설정 없는 상태에선 DB 레이어가 빠질 수 있다. `packages/cli/src/config.ts:89-95` `packages/server/src/engine.ts:161-163`
- 차이
  - "완전한 E2E 의존성 체인 추적 가능"은 현재 코드 기준으로 과장이다.
- 제품 영향
  - 세일즈 문구는 "부분 지원"으로 낮추거나 기능 보강이 필요하다.

#### P4-06. MyBatis/DB/Event 레이어는 기본 UI에서 숨겨져 있다

- 계획 근거
  - `docs/phase4-summary.md:4-20`
  - `docs/user-stories.md:274-321`
- 실제 구현
  - 기본 node filter는 `mybatis-mapper`, `mybatis-statement`, `db-table`을 포함하지 않는다. `packages/web-ui/src/stores/graphStore.ts:14-19`
  - 기본 edge filter도 `emits-event`, `listens-event`, `mybatis-maps`, `reads-table`, `writes-table`, `dto-flows`를 포함하지 않는다. `packages/web-ui/src/stores/graphStore.ts:20-24`
- 차이
  - 분석은 일부 존재해도 기본 UI 여정에서는 보이지 않는다.
- 제품 영향
  - 사용자는 "기능이 없다"고 느낄 수 있다.

#### P4-07. 미사용 컴포넌트 여정은 문서가 실제보다 앞서 있다

- 계획 근거
  - `docs/user-stories.md:376-383`
- 실제 구현
  - analyzer에는 `findUnusedComponents()`가 있다. `packages/core/src/analyzers/OrphanDetector.ts:12-20`
  - 그러나 그 기준인 `route-renders`는 현재 생성되지 않는다. `packages/core/src/parsers/typescript/TsFileParser.ts:159-162`
  - server stats는 `unusedEndpoints`만 외부로 내보내고 `unusedComponents`는 노출하지 않는다. `packages/server/src/engine.ts:359-373`
  - `analysisRoutes.ts`도 `/api/stats` 반환만 하고 unused component 전용 노출은 없다. `packages/server/src/routes/analysisRoutes.ts:10-12`
- 차이
  - 문서는 "미사용 컴포넌트 감지"가 완결된 사용자 기능처럼 쓰여 있지만, 실제로는 기준 edge와 노출 경로가 둘 다 부족하다.
- 제품 영향
  - dead code 탐지 기능을 판매 포인트로 쓰기 어렵다.

### Phase 5 / Quality Verification

#### P5-01. "145 tests, ALL PASSING"은 패키지 단위에 한정되며 루트 검증 경로는 실패한다

- 계획 근거
  - `docs/phase5-summary.md:6-29`
- 실제 구현
  - `npm -w @vda/core test`, `npm -w @vda/server test`는 통과한다.
  - 그러나 루트 `npm test`는 `Missing packageManager field in package.json`로 실패한다.
- 차이
  - 테스트 스위트 숫자는 맞더라도, 제품 리포지토리 전체 검증 경로는 PASS 상태가 아니다.
- 제품 영향
  - CI에 바로 넣었을 때 "전체 green repo"가 아니다.

#### P5-02. 캐시 성능 테스트는 실제 cache hit을 검증하지 않는다

- 계획 근거
  - `docs/phase5-plan.md:37`
  - `docs/phase5-summary.md:59-64`
- 실제 구현
  - 테스트 코드에는 "Save results to cache ... simplified — in real code the CLI handles this"라는 주석이 있다. `packages/core/src/__tests__/performance.test.ts:58-65`
  - 실제 재현 로그: `Cached run: 189ms (0 cache hits out of 510)`
  - 테스트는 cache hit이 1건 이상인지 검증하지 않고, 단지 `< 2초`만 본다. `packages/core/src/__tests__/performance.test.ts:68-80`
- 차이
  - 요약 문서는 "캐시 재분석 457ms"를 성능 달성처럼 말하지만, 현재 테스트는 캐시 효과 자체를 보장하지 않는다.
- 제품 영향
  - 성능 수치를 고객에게 약속하면 재현성 문제가 생길 수 있다.

#### P5-03. MyBatis 관련 테스트는 parser 한계를 우회한 synthetic graph에 의존한다

- 계획 근거
  - `docs/phase5-summary.md:54-57`
- 실제 구현
  - `MyBatisLinker.test.ts`는 실제 Java source를 parse하지 않고, `spring-service` 노드를 수동으로 넣는다. `packages/core/src/linkers/__tests__/MyBatisLinker.test.ts:11-23`
  - `CrossBoundaryResolver.test.ts`의 MyBatis 케이스도 동일하게 수동 노드를 만든다. `packages/core/src/linkers/__tests__/CrossBoundaryResolver.test.ts:97-108`
- 차이
  - unit test는 linker 자체는 검증하지만, Phase 4 문서가 말한 "Java interface ↔ XML namespace end-to-end"는 검증하지 않는다.
- 제품 영향
  - deep analysis 기능의 실전 신뢰도를 과대평가하기 쉽다.

#### P5-04. CLI 사용자 여정은 여전히 전용 테스트가 없다

- 계획 근거
  - `docs/phase5-plan.md:28-37`
- 실제 구현
  - `packages/cli/src`에는 테스트 파일이 없다.
  - integration test는 CLI 명령 실행이 아니라 core API를 직접 호출/조립한다. `packages/core/src/__tests__/integration.test.ts:27-52`
- 차이
  - "CLI 첫 분석 여정"이 문서상으로는 있으나 실제 검증은 core integration에 더 가깝다.
- 제품 영향
  - `vda analyze`, `vda export`, `vda serve`, `vda init`의 실제 UX/출력/실패 케이스가 덜 검증돼 있다.

#### P5-05. 500-file fixture는 "현실적인 테스트 프로젝트"라기보다 분석기 전용 합성 데이터다

- 계획 근거
  - `docs/phase5-plan.md:73-79`
  - `docs/phase5-summary.md:59-65`
- 실제 구현
  - 생성 스크립트는 자신을 "realistic Vue 3 + Spring Boot test fixture project"라고 설명한다. `scripts/generate-fixtures.js:2-5`
  - 그러나 생성 코드에는 즉시 보이는 무결성 문제가 있다.
  - 예시 1: Vue component가 정의되지 않은 `id`를 template literal에 사용하고 `const response`를 중복 선언한다. `scripts/generate-fixtures.js:250-255` `test-project/frontend/src/components/product/ProductList.vue:47-52`
  - 예시 2: Java controller가 누락 import, 잘못된 제네릭 `ResponseEntity<void>`, 존재하지 않는 service method 호출을 가진다. `test-project/backend/src/main/java/com/example/controller/ProductController.java:29-52` `test-project/backend/src/main/java/com/example/controller/AuthController.java:19-37`
  - 예시 3: MyBatis XML namespace에 대응하는 `@Mapper interface`가 fixture에 없다. `test-project/backend/src/main/resources/mapper/ProductMapper.xml:3`
  - 예시 4: `test-project`는 `package.json`, `pom.xml`, `build.gradle`, `tsconfig.json`이 없어 `vda init test-project`로는 프로젝트 감지가 되지 않는다.
- 차이
  - 성능용 fixture는 분석기의 parser에는 충분할 수 있지만, 현실적인 빌드 가능한 앱이나 사용자 여정용 fixture는 아니다.
- 제품 영향
  - 성능 벤치마크는 가능해도 "실사용 프로젝트 수준 검증"으로 마케팅하기 어렵다.

## 제품화 관점 우선순위

### 1. 즉시 막아야 하는 항목

- 루트 `packageManager` 추가 및 monorepo `npm run build/test/lint` 복구
- `vda init` ESM 크래시 수정
- 문서/세일즈 문구에서 MSA, DTO consistency, MyBatis interface linking, event virtualization의 현재 상태를 낮춰서 표기

### 2. 다음 스프린트에서 반드시 맞춰야 하는 항목

- `services[]`를 CLI/server 실제 분석 경로에 연결
- server 초기 캐시 채우기
- project-root fallback에 XML 포함, resources watch 포함
- cluster edge kind 보존
- cancel API/abortable analysis 추가

### 3. 제품 polish 전에 정리해야 하는 항목

- design token migration 완료
- Command Palette stub 제거
- panel width persistence 수정
- URL hash/view sync 완성
- A11y landmark/ARIA 추가
- MiniMap 실제 연결 또는 문서에서 제외

### 4. 판매 전 반드시 정직하게 표현해야 하는 항목

- 현재 강점
  - Vue/TS/Java/MyBatis 기본 파싱
  - API endpoint 매칭
  - graph 탐색/검색/클러스터 기본기
  - package-level test coverage 자체는 꽤 많음
- 현재 약점
  - monorepo 운영 품질
  - 초기 온보딩
  - deep analysis completeness
  - benchmark fixture realism

## 결론

현재 저장소는 "연구/프로토타입 단계를 넘어선 준제품"으로는 볼 수 있지만, 문서가 묘사하는 수준의 "판매 가능한 엔터프라이즈 제품"이라고 보기에는 아직 중요한 간극이 있다.

가장 위험한 간극은 세 가지다.

- 제품 첫 실행 경로(`npm run build/test`, `vda init`)가 깨져 있음
- Phase 4 deep analysis 문구가 실제 구현 범위를 초과함
- Phase 5 검증 문서가 테스트 수치에 비해 실제 보장 범위를 과장함

이 세 가지를 정리하지 않고 외부 판매 자료를 만들면, 기술 검증 단계에서 바로 신뢰를 잃을 가능성이 높다.
