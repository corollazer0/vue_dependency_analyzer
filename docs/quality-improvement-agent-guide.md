# VDA Quality Improvement Agent Guide

작성일: 2026-04-08

## 목적

이 문서는 다른 에이전트가 [phase-plan-code-audit.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/phase-plan-code-audit.md)를 읽고, 실제로 이 프로젝트의 품질을 올리는 작업을 안전하고 효율적으로 수행하도록 돕기 위한 실행 가이드다.

핵심 원칙은 단순하다.

- 문서보다 코드를 믿는다.
- "완료"보다 "재현 가능하게 검증됨"을 우선한다.
- 판매 문구로 쓸 수 없는 기능은 먼저 고치거나, 최소한 문서에서 낮춰 쓴다.
- 한 번에 너무 많이 고치지 말고, 제품 리스크가 큰 항목부터 순차적으로 닫는다.

## 이 문서를 읽는 대상

- 이 저장소를 처음 읽는 다른 에이전트
- phase 문서와 현재 구현의 차이를 메우는 유지보수 에이전트
- 제품화 전 안정화 작업을 수행하는 에이전트

## 시작 전 반드시 읽을 문서

아래 순서로 읽어라.

1. [quality-improvement-agent-guide.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/quality-improvement-agent-guide.md)
2. [phase-plan-code-audit.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/phase-plan-code-audit.md)
3. [phase5-summary.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/phase5-summary.md)
4. [phase4-summary.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/phase4-summary.md)
5. [phase2-summary.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/phase2-summary.md)
6. 필요 시 원계획
   - [first-plan.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/first-plan.md)
   - [ultra-plan.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/ultra-plan.md)
   - [phase4-prd.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/phase4-prd.md)
   - [user-stories.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md)

## 먼저 이해해야 할 현재 상태

이 저장소는 "버릴 수준의 프로토타입"은 아니다. 기본 분석기, UI, 서버, 테스트는 이미 있다. 하지만 "바로 판매 가능한 제품"으로 부르기에는 몇 가지 핵심 결함이 남아 있다.

특히 다음 사실을 전제로 움직여야 한다.

- 루트 monorepo 검증 경로가 깨져 있다.
- `vda init`가 실제 ESM 런타임에서 크래시한다.
- deep analysis 문서가 실제 구현보다 앞서 있다.
- 일부 UX 기능은 존재하지만 stub 또는 반쪽 구현이다.
- 테스트 수는 많지만, 제품 리스크를 충분히 막지 못하는 영역이 있다.

## 절대 원칙

### 1. 문서 과장 상태를 악화시키지 말 것

- 구현되지 않은 기능을 문서에서 더 강하게 쓰지 말라.
- 구현이 불완전하면 두 가지 중 하나만 선택하라.
  - 기능을 고친다.
  - 문서를 현재 수준으로 낮춘다.

### 2. 제품 첫 진입 경로를 최우선으로 고칠 것

아래 항목은 고객/사용자가 제일 먼저 만난다.

- `npm run build`
- `npm test`
- `vda init`
- `vda analyze`
- `vda serve`

이 중 하나라도 불안정하면 deep analysis 기능보다 우선해서 처리한다.

### 3. 검증 없는 리팩터링을 하지 말 것

- 수정 전 재현
- 수정
- 동일 명령으로 재검증
- 영향 받는 문서/테스트 갱신

이 순서를 지켜라.

### 4. 한 작업 단위는 명확히 끊을 것

- "루트 빌드 복구"
- "`vda init` ESM 수정"
- "server 초기 캐시 채우기"
- "Command Palette stub 제거"

이런 식으로 작업 단위를 나눠라. "제품 전체 개선" 같은 광범위한 묶음 작업은 피하라.

## 권장 작업 순서

### Phase A. 제품 사용 불가 수준 결함부터 닫기

이 단계가 가장 중요하다.

1. 루트 monorepo 빌드/테스트 경로 복구
2. `vda init` 런타임 크래시 수정
3. 실제 사용자 여정 기준 smoke test 정착
   - `vda init`
   - `vda analyze`
   - `vda serve`

이 단계가 끝나기 전에는 deep analysis 확장에 들어가지 않는 편이 낫다.

### Phase B. 계획 대비 부분 구현을 제품 수준으로 끌어올리기

우선순위가 높은 항목은 아래와 같다.

1. `services[]`를 실제 CLI/server 분석 경로에 연결
2. server 초기 캐시 채우기
3. XML fallback scan 및 resource watch 보강
4. cluster edge kind 보존
5. cancel API 또는 최소한 "취소 아님"으로 UI/문서 정정

### Phase C. UX/documentation debt 정리

1. Command Palette stub 제거
2. 리사이즈 영속화 수정
3. URL hash/view 동기화 완성
4. MiniMap 실제 연결 또는 문서에서 제거
5. 디자인 토큰 전환 마무리
6. A11y 최소 기준 추가

### Phase D. Deep analysis를 실제 판매 가능한 수준까지 보강

이 단계는 앞 단계를 정리한 뒤 진행하는 것이 맞다.

1. Vue router entry / `route-renders`
2. MyBatis interface parsing/linking
3. frontend event virtual edges
4. DTO flow
5. DTO consistency API

## 우선순위 판단 기준

작업 우선순위를 정할 때 아래 순서를 따른다.

1. 실행 즉시 실패하는가
2. 고객이 첫 10분 내 만나는가
3. 문서/세일즈 문구와 직접 충돌하는가
4. 잘못된 분석 결과를 만들 가능성이 큰가
5. 고치기 쉬운가

예시:

- `packageManager` 누락: 1, 2, 3 모두 해당
- Command Palette recent item 미표시: 4, 5는 낮음
- DTO consistency 미구현: 3은 높지만 1, 2는 낮음

## 파일별 읽기 지도

### 루트 운영 품질

- [package.json](/home/ubuntu/workspace/vue_dependency_analyzer/package.json)
- [turbo.json](/home/ubuntu/workspace/vue_dependency_analyzer/turbo.json)

여기서는 아래를 먼저 본다.

- `packageManager`
- workspace scripts
- 실제 존재하지 않는 `lint`/eslint 경로
- monorepo 표준 진입점이 작동하는지

### CLI

- [config.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/config.ts)
- [init.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/init.ts)
- [analyze.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/analyze.ts)
- [serve.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/serve.ts)

여기서는 아래를 본다.

- `services[]` 소비 여부
- XML fallback 포함 여부
- cache write/read 균형
- ESM-safe 코드 여부
- CLI 출력이 실제 분석 계층을 숨기지 않는지

### Server

- [engine.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts)
- [analysisRoutes.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/routes/analysisRoutes.ts)
- [graphRoutes.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/routes/graphRoutes.ts)

여기서는 아래를 본다.

- 초기 캐시 채우기
- watch 경로
- `services[]` 소비
- cluster 데이터 보존도
- cancel/abort 가능성

### Core

- [ParallelParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/engine/ParallelParser.ts)
- [ParseCache.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/engine/ParseCache.ts)
- [JavaFileParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/java/JavaFileParser.ts)
- [TsFileParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/typescript/TsFileParser.ts)
- [TemplateAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/TemplateAnalyzer.ts)
- [ScriptAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/ScriptAnalyzer.ts)
- [CrossBoundaryResolver.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/CrossBoundaryResolver.ts)
- [MyBatisLinker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/MyBatisLinker.ts)

여기서는 아래를 본다.

- parser가 문서 요구사항을 실제로 생성하는지
- type enum만 있고 실제 edge/node 생성은 없는지
- unresolved edge가 UI까지 살아남는지
- synthetic test가 실제 parser 한계를 가리고 있지 않은지

### Web UI

- [App.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/App.vue)
- [graphStore.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/stores/graphStore.ts)
- [ui.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/stores/ui.ts)
- [ForceGraphView.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/ForceGraphView.vue)
- [GraphLegend.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/GraphLegend.vue)
- [CommandPalette.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/CommandPalette.vue)
- [OnboardingGuide.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/OnboardingGuide.vue)
- [AnalysisProgress.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/AnalysisProgress.vue)
- [MiniMap.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/MiniMap.vue)
- [types/graph.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/types/graph.ts)
- [style.css](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/style.css)

여기서는 아래를 본다.

- 문서와 실제 UX 행동 일치 여부
- stub 명령 존재 여부
- 토큰 미전환 잔존 여부
- 기본 필터가 중요한 계층을 숨기지 않는지
- 상태 영속화가 실제 store setter를 타는지

## 작업 착수 전 체크리스트

작업 전 반드시 아래를 확인하라.

- 감사 문서에서 해당 항목의 discrepancy 번호를 찾았다.
- 재현 명령이 있다.
- 영향 파일 목록을 적었다.
- 성공 조건을 한 문장으로 정의했다.

예시:

- 목표: "`vda init packages/web-ui`가 ESM 환경에서 크래시 없이 `.vdarc.json`을 생성한다."

## 수정 후 최소 검증 세트

작업 종류별로 아래 검증을 권장한다.

### 운영/루트 설정 수정 시

```bash
npm run build
npm test
```

### CLI 수정 시

```bash
node packages/cli/dist/bin/vda.js init packages/web-ui
node packages/cli/dist/bin/vda.js analyze test-project --config .vdarc.json
```

필요 시:

```bash
npm -w @vda/cli run build
```

### server/core 수정 시

```bash
npm -w @vda/core test
npm -w @vda/server test
```

캐시/성능 관련이면 별도로 로그를 눈으로 확인하라.

```bash
npm -w @vda/core test -- src/__tests__/performance.test.ts
```

주의:

- 현재 성능 테스트는 0 cache hit 상태로도 통과할 수 있다.
- "통과"만 보지 말고 로그 내용도 같이 확인하라.

### web-ui 수정 시

```bash
npm -w @vda/web-ui run build
```

추가로 아래를 수동 점검하라.

- Command Palette 실제 동작
- URL hash 변경
- detail/sidebar width persistence
- cluster expand/collapse 상호작용

## 문서 수정 원칙

코드를 고쳤으면 문서도 같이 맞춰라.

### 코드를 고친 경우

- 감사 문서의 해당 discrepancy가 해결되었는지 업데이트
- phase summary 문구가 과장 상태였으면 수정
- user stories가 잘못된 기대를 심고 있으면 수정

### 코드를 바로 못 고치는 경우

- 최소한 문서 표현을 낮춘다.
- 표현 예시
  - "지원" → "부분 지원"
  - "자동 연결" → "조건부 연결"
  - "완전 추적" → "기본 체인 추적"

## 이 저장소에서 특히 주의할 함정

### 1. 테스트가 있다고 해서 제품 품질이 보장되는 것은 아니다

- synthetic graph를 직접 구성하는 테스트가 많다.
- parser end-to-end 한계를 가리는 경우가 있다.

### 2. enum/type 추가만으로 기능이 있다고 착각하기 쉽다

대표 예시:

- `dto-flows`
- `route-renders`
- event 관련 일부 흐름

타입 선언과 실제 생성 로직은 분리해서 봐야 한다.

### 3. UI에 파일이 있어도 실제로 쓰이지 않을 수 있다

대표 예시:

- `MiniMap.vue`
- 일부 store setter

### 4. CLI와 server의 품질 수준이 다를 수 있다

- cache
- file discovery
- MSA 처리

이 셋은 특히 경로별 차이가 있다.

## 에이전트 권장 출력 형식

작업을 끝낸 뒤 다른 사람이나 다음 에이전트가 바로 이어받을 수 있게 아래 형식으로 남겨라.

1. 이번에 닫은 discrepancy 번호
2. 수정한 파일
3. 재현한 명령
4. 결과
5. 아직 남은 리스크

예시:

- 해결: `P1-02`, `P2-07`
- 수정 파일: `packages/cli/src/commands/init.ts`, `docs/user-stories.md`
- 검증: `node packages/cli/dist/bin/vda.js init packages/web-ui`
- 결과: 크래시 제거, alias 추출 정상
- 잔여 리스크: `services[]`는 아직 analyze/serve에 미연결

## 추천 첫 작업 세트

다른 에이전트가 지금 바로 시작한다면 이 순서를 추천한다.

1. `P1-02` 고치기: `vda init` ESM 크래시 제거
2. `P1-01` 고치기: 루트 `packageManager` 및 monorepo build/test 복구
3. `P2-02`, `P2-03` 고치기: server cache/file discovery 보강
4. `P3-02`, `P3-03` 고치기: Command Palette stub 제거 + width persistence 복구
5. `P4-01`, `P4-02`를 설계 재검토 후 진짜 구현할지, 문서를 낮출지 결정

## 마지막 원칙

이 프로젝트의 품질을 올리는 가장 빠른 방법은 "새 기능 추가"가 아니라 "현재 문서와 실제 코드의 신뢰 관계를 복구"하는 것이다.

즉, 아래 순서를 지켜라.

1. 깨진 진입점 복구
2. 문서와 코드의 사실 관계 일치
3. 부분 구현을 제품 수준으로 완성
4. 그 다음에만 고급 분석 기능 확장
