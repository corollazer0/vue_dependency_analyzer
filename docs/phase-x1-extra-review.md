# Phase X-1 Extra Review

> 작성일: 2026-04-10  
> 리뷰 대상 문서: `docs/review-target/phase-x1-extra-implementation.md`  
> 원 계획 문서: `docs/phase-x1-extra-plan.md`  
> 리뷰 목적: Phase X-1 Extra 구현이 계획 대비 적정한지, 실제 코드와 실행 결과 기준으로 판정하고 후속 에이전트가 오해 없이 개선 작업을 이어갈 수 있도록 근거와 보강 요구사항을 정리한다.

---

## 1. 최종 결론

### 종합 평점

`6.0 / 10`

### 한 줄 판정

Phase X-1 Extra는 "여러 UI 진입점과 일부 파서 보강이 실제로 추가된 배치"로는 볼 수 있으나, 문서가 주장하는 수준의 "12개 항목 완전 종료"로 보기는 어렵다.

### 핵심 이유

1. 원 계획의 `C-1 E2E 체인 경로 요약`이 실제 구현에서 누락되었다.
2. `B-2 소스 코드 스니펫 뷰어`는 UI는 생겼지만 현재 구조상 대부분 동작하지 않을 가능성이 높다.
3. `B-3 DTO 불일치 뷰`는 화면은 있으나 분석 결과 신뢰도가 낮다.
4. `D-3 중첩 routes children 파싱`은 파싱량 증가는 맞지만, 최종 그래프 유효성 개선으로 이어지지 않는다.
5. 문서가 "완료"라고 표현한 일부 항목은 실제로는 `부분 구현`, `범위 축소`, `제한적 동작` 수준이다.

---

## 2. 리뷰 범위와 방법

### 리뷰 기준

이번 리뷰는 아래 5개 축으로 판단했다.

1. 계획 문서 대비 범위 충족 여부
2. 실제 코드 존재 여부
3. 사용자 입장에서 기능이 실제로 동작 가능한지
4. 의존성 분석 결과의 신뢰도에 기여하는지
5. 테스트와 실행 검증으로 재현 가능한지

### 실제 확인한 항목

- 대상 문서: `docs/review-target/phase-x1-extra-implementation.md`
- 원 계획: `docs/phase-x1-extra-plan.md`
- UI 구현:
  - `packages/web-ui/src/stores/graphStore.ts`
  - `packages/web-ui/src/components/graph/ForceGraphView.vue`
  - `packages/web-ui/src/components/sidebar/FilterPanel.vue`
  - `packages/web-ui/src/App.vue`
  - `packages/web-ui/src/components/graph/PathfinderPanel.vue`
  - `packages/web-ui/src/components/graph/SourceSnippet.vue`
  - `packages/web-ui/src/components/graph/NodeDetail.vue`
  - `packages/web-ui/src/components/DtoConsistencyPanel.vue`
  - `packages/web-ui/src/components/ParseErrorPanel.vue`
  - `packages/web-ui/src/components/CommandPalette.vue`
  - `packages/web-ui/src/types/graph.ts`
- 서버/API 구현:
  - `packages/server/src/routes/analysisRoutes.ts`
  - `packages/server/src/routes/graphRoutes.ts`
  - `packages/server/src/engine.ts`
- 코어 파서/링커:
  - `packages/core/src/parsers/java/KotlinFileParser.ts`
  - `packages/core/src/parsers/java/JavaFileParser.ts`
  - `packages/core/src/parsers/typescript/TsFileParser.ts`
  - `packages/core/src/parsers/vue/VueSfcParser.ts`
  - `packages/core/src/analyzers/DtoConsistencyChecker.ts`
  - `packages/core/src/linkers/CrossBoundaryResolver.ts`
  - `packages/core/src/graph/query.ts`
  - `packages/core/src/graph/types.ts`

### 실행/검증 명령

다음 검증을 실제로 수행했다.

```bash
npm test
node packages/cli/dist/bin/vda.js analyze test-project-ecommerce
```

또한 `packages/cli/dist/config.js`의 `runAnalysis()`를 사용해 아래 런타임 수치를 직접 확인했다.

- `test-project-ecommerce` 기준 `route-renders` 엣지 15개
- 그중 실제 컴포넌트 노드로 해소된 엣지 0개
- TS/Vue 노드 중 `interfaces/exportedTypes` 메타데이터가 있는 노드 0개
- `edge.loc` 가 있는 엣지 182개, `edge.metadata.filePath/line` 이 있는 엣지 0개
- DTO mismatch 49개

### 주의

이 리뷰는 문서에 적힌 커밋 해시를 신뢰하지 않고, 현재 워크스페이스의 실제 코드와 실행 결과를 기준으로 작성했다.

---

## 3. 총평 요약

### 잘된 점

- 오버레이, 프리셋, 히스토리, 파싱 오류 패널, Pathfinder 패널 등 사용자가 바로 체감하는 UI 표면은 실제로 추가되었다.
- Kotlin `@Service/@Repository/@Component/@Mapper` 및 Java `@Component` 감지는 실제 코드와 테스트가 추가되었다.
- `npm test`는 현재 통과한다.

### 부족한 점

- 누락된 계획 항목이 있음에도 문서가 "12개 완료"로 쓰였다.
- 일부 기능은 "컴포넌트가 존재한다"와 "실제로 유효하게 쓸 수 있다" 사이의 간극이 크다.
- 의존성 분석기 본질에 가까운 DTO/route 관련 신뢰도 문제는 여전히 남아 있다.

---

## 4. 항목별 판정

## 4.1 A-1 순환/고아/허브 그래프 하이라이트

### 판정

`적정`, `7.5 / 10`

### 구현 확인

- 오버레이 상태 저장: `packages/web-ui/src/stores/graphStore.ts:13`
- `/api/analysis/overlays` 호출: `packages/web-ui/src/stores/graphStore.ts:75`
- Cytoscape overlay 스타일: `packages/web-ui/src/components/graph/ForceGraphView.vue:239`
- Overlay 토글 버튼: `packages/web-ui/src/components/graph/ForceGraphView.vue:492`
- 서버 API: `packages/server/src/routes/graphRoutes.ts:75`
- 엔진 계산: `packages/server/src/engine.ts:451`

### 평가

이 항목은 문서 설명과 실제 구현이 대체로 일치한다. API, 상태 저장, 그래프 클래스 적용, 토글 UI까지 연결되어 있다.

### 남은 한계

- 현재는 노드에만 적용되며, edge 수준의 보조 하이라이트는 없다.
- "왜 hub/orphan/circular인가"에 대한 상세 설명 패널은 없다.
- 클러스터 모드에서 사용자가 직관적으로 해석하기에는 설명성이 부족하다.

---

## 4.2 A-2 PNG 이미지 내보내기

### 판정

`부분 적정`, `6.0 / 10`

### 구현 확인

- PNG export 구현: `packages/web-ui/src/components/graph/ForceGraphView.vue:453`
- 버튼 UI: `packages/web-ui/src/components/graph/ForceGraphView.vue:504`
- Command Palette 명령: `packages/web-ui/src/components/CommandPalette.vue:31`

### 계획 대비 차이

원 계획은 PNG와 SVG 둘 다 포함했다.

- 계획: `docs/phase-x1-extra-plan.md:68`
- 실제: `exportGraph(format)`가 사실상 PNG만 처리함 `packages/web-ui/src/components/graph/ForceGraphView.vue:453`

### 평가

PNG 내보내기는 실제로 구현되어 있다. 하지만 문서 제목과 원 계획을 기준으로 보면 `이미지/SVG 내보내기` 중 SVG는 빠져 있다. 따라서 "완료"보다는 `절반 완료`에 가깝다.

### 남은 한계

- SVG 미지원
- 파일명/타임스탬프/선택 영역 내보내기 없음
- 레전드/필터 상태/메타데이터 포함 옵션 없음

---

## 4.3 A-3 필터 프리셋

### 판정

`적정`, `7.0 / 10`

### 구현 확인

- 프리셋 정의: `packages/web-ui/src/stores/graphStore.ts:212`
- 프리셋 적용 함수: `packages/web-ui/src/stores/graphStore.ts:250`
- UI 버튼: `packages/web-ui/src/components/sidebar/FilterPanel.vue:14`

### 평가

All/None/Vue/Spring/DB/API 프리셋은 실제로 존재하고 작동 구조도 단순하며 유지보수성도 나쁘지 않다.

### 감점 이유

1. "All"이 진짜 전체가 아니다.  
   코어는 `vue-event`, `spring-event`를 지원하지만 UI 타입은 이를 선언하지 않는다.
   - 코어: `packages/core/src/graph/types.ts:3`
   - UI 타입: `packages/web-ui/src/types/graph.ts:1`
2. 프리셋은 있지만 사용자 저장/불러오기는 없다.
3. 프리셋 적용 후 현재 프리셋 상태 표시가 없다.

### 결론

필터 UX 강화로서는 의미가 있으나, "분석 결과 전체를 다루는 프리셋 체계"라고 보기에는 아직 부족하다.

---

## 4.4 B-1 Pathfinder UI

### 판정

`부분 적정`, `5.0 / 10`

### 구현 확인

- 패널 컴포넌트 존재: `packages/web-ui/src/components/graph/PathfinderPanel.vue:1`
- `/api/search` 자동완성: `packages/web-ui/src/components/graph/PathfinderPanel.vue:22`
- `/api/graph/paths` 호출: `packages/web-ui/src/components/graph/PathfinderPanel.vue:66`
- App 진입 버튼: `packages/web-ui/src/App.vue:197`
- API 라우트: `packages/server/src/routes/graphRoutes.ts:60`
- 엔진 경로 탐색: `packages/server/src/engine.ts:447`
- 경로 탐색 알고리즘: `packages/core/src/graph/query.ts:92`

### 실제 상태

경로 탐색 자체는 가능하다. 다만 결과는 노드 라벨이 아니라 노드 ID를 그대로 출력한다.

- 경로 API 반환형: `string[][]`
- 실제 UI 출력: `{{ node }}` 형태 `packages/web-ui/src/components/graph/PathfinderPanel.vue:231`

### 계획 대비 차이

원 계획은 아래를 포함했다.

- 경로 클릭 시 그래프 하이라이트
- `ForceGraphView.vue`의 `.path-highlight`

그러나 실제 코드에는 `path-highlight` 스타일이 없고, 경로 클릭 하이라이트도 없다.

- 계획: `docs/phase-x1-extra-plan.md:59`
- 실제 코드 검색 결과: 없음

### 감점 이유

1. 가장 중요한 UX인 `경로 하이라이트`가 없다.
2. 사용자 친화적 라벨이 아니라 내부 node ID를 출력한다.
3. 깊이 조정 UI가 없다.
4. Edge kind를 보여주지 않아 경로 의미 해석이 어렵다.

### 결론

이 기능은 "경로 API를 사람이 호출해볼 수 있는 패널" 수준이다. 아직 "그래프 탐색을 돕는 완성된 사용자 기능"은 아니다.

---

## 4.5 B-2 소스 코드 스니펫 뷰어

### 판정

`부적정에 가까운 부분 구현`, `3.5 / 10`

### 구현 확인

- 스니펫 모달: `packages/web-ui/src/components/graph/SourceSnippet.vue:1`
- NodeDetail 연동: `packages/web-ui/src/components/graph/NodeDetail.vue:11`
- 스니펫 API: `packages/server/src/routes/graphRoutes.ts:80`
- 파일 읽기 구현: `packages/server/src/engine.ts:471`

### 핵심 문제

UI는 `edge.metadata.filePath` 와 `edge.metadata.line` 을 보고 📄 버튼을 노출한다.

- `hasLoc()` 구현: `packages/web-ui/src/components/graph/NodeDetail.vue:16`

하지만 코어 그래프의 위치 정보 설계는 `edge.loc` 이다.

- 그래프 타입: `packages/core/src/graph/types.ts:57`

실측 결과:

- 전체 엣지: 546
- `edge.loc` 존재: 182
- `edge.metadata.filePath/line` 존재: 0

즉 현재 구현은 "loc가 없는 것이 문제"가 아니라 "loc를 읽지 않는 UI"가 더 큰 문제다.

### 계획 대비 차이

원 계획은 다음 둘 중 하나를 요구했다.

1. NodeDetail의 View Source 버튼
2. 또는 그래프 edge 클릭 팝업

현재는 1번도 사실상 대부분 비노출 상태이고, 2번은 없다.

### 감점 이유

1. 핵심 버튼 노출 조건이 잘못되어 있다.
2. 실제 사용자 사용 가능성이 매우 낮다.
3. 키워드 색상 처리도 사실상 없다.
4. edge 클릭 기반 진입도 없다.

### 결론

이 항목은 "컴포넌트 파일 생성"은 됐지만, `유효 동작` 기준으로는 아직 미완성이다.

---

## 4.6 B-3 DTO 불일치 뷰

### 판정

`UI는 존재하나 기능 신뢰도 부족`, `3.0 / 10`

### 구현 확인

- 패널 존재: `packages/web-ui/src/components/DtoConsistencyPanel.vue:1`
- Command Palette 이벤트 연동: `packages/web-ui/src/components/CommandPalette.vue:32`
- API 라우트: `packages/server/src/routes/analysisRoutes.ts:19`
- 엔진 DTO 검사: `packages/server/src/engine.ts:443`
- DTO 분석기: `packages/core/src/analyzers/DtoConsistencyChecker.ts:23`

### 핵심 문제

DTO 분석기는 프런트엔드 쪽 `interfaces` 또는 `exportedTypes` 메타데이터를 기대한다.

- `packages/core/src/analyzers/DtoConsistencyChecker.ts:37`

하지만 현재 TS/Vue 파서는 그 메타데이터를 만들지 않는다.

- TS 파서 메타데이터: `packages/core/src/parsers/typescript/TsFileParser.ts:19`
- Vue 파서 메타데이터: `packages/core/src/parsers/vue/VueSfcParser.ts:33`

반면 실제 프런트 타입 선언은 존재한다.

- 예: `test-project-ecommerce/frontend/src/types/api.ts:1`

실측 결과:

- 프런트 타입 메타데이터 노드 수: 0
- DTO mismatch: 49건

즉 이 패널은 현재 상태에서 실제 불일치보다 `프런트 타입을 못 읽어서 생긴 false positive`를 대량으로 보여줄 가능성이 높다.

### 감점 이유

1. 분석 결과 신뢰도가 낮다.
2. 이름 기반 매칭만 하고 타입/nullable/배열 차이를 비교하지 않는다.
3. 서버 API 테스트에 DTO consistency 라우트 검증이 없다.

### 결론

UI 연결만으로는 충분하지 않다. 이 항목은 `파서 보강` 없이는 운영 가능한 기능으로 보기 어렵다.

---

## 4.7 B-4 파싱 오류 패널

### 판정

`적정`, `7.0 / 10`

### 구현 확인

- 상태바 배지: `packages/web-ui/src/App.vue:247`
- 패널 컴포넌트: `packages/web-ui/src/components/ParseErrorPanel.vue:1`
- API 라우트: `packages/server/src/routes/graphRoutes.ts:99`
- 엔진 구현: `packages/server/src/engine.ts:489`

### 평가

이 기능은 문서 설명과 구현이 비교적 잘 맞는다. 배지, 패널, refresh 흐름이 단순하고 이해하기 쉽다.

### 계획 대비 차이

원 계획은 "파일명 클릭 → 해당 노드 선택"을 언급했다.

- 계획: `docs/phase-x1-extra-plan.md:97`
- 실제 패널 구현: 파일 클릭 기능 없음 `packages/web-ui/src/components/ParseErrorPanel.vue:97`

### 감점 이유

1. 오류에서 바로 관련 노드/파일로 이동하는 액션이 없다.
2. 오류 stale 상태를 해소하는 UX가 약하다.

### 결론

기본 기능은 적정하지만, 디버깅 생산성 도구로서는 한 단계 더 필요하다.

---

## 4.8 C-1 E2E 체인 경로 요약

### 판정

`미구현`, `0 / 10`

### 근거

원 계획에는 명확히 존재한다.

- `docs/phase-x1-extra-plan.md:107`

그러나 구현 문서에는 해당 항목이 사라지고, Batch C는 히스토리만 남아 있다.

- 구현 문서 Batch C: `docs/review-target/phase-x1-extra-implementation.md:217`

실제 `NodeDetail.vue`에도 chain 섹션이 없다.

- `packages/web-ui/src/components/graph/NodeDetail.vue:64`

### 왜 중요한가

이 기능은 단순 UI 장식이 아니라, 사용자가 `현재 노드가 어디까지 이어지는지`를 빠르게 이해하게 해주는 핵심 요약 기능이다. 특히 이 프로젝트의 가치가 "의존성 분석"에 있는 점을 생각하면, 누락의 영향이 작지 않다.

### 결론

이 항목이 빠진 상태에서 "12개 전부 닫았다"는 문구는 사실과 다르다.

---

## 4.9 C-2 탐색 히스토리

### 판정

`적정`, `7.0 / 10`

### 구현 확인

- 히스토리 상태: `packages/web-ui/src/stores/graphStore.ts:130`
- back/forward 함수: `packages/web-ui/src/stores/graphStore.ts:150`
- 키보드 단축키: `packages/web-ui/src/App.vue:105`
- 툴바 버튼: `packages/web-ui/src/App.vue:199`

### 평가

기능은 실제로 존재하고 구조도 단순하다. 문서와 실제 구현도 대체로 일치한다.

### 남은 한계

- 히스토리 길이 제한 없음
- session 저장 없음
- 그래프/트리 탭, 필터 상태까지 함께 복원하지 않음

---

## 4.10 D-1 Kotlin Service/Repository/Component 파싱

### 판정

`부분 적정`, `6.0 / 10`

### 구현 확인

- 어노테이션 감지: `packages/core/src/parsers/java/KotlinFileParser.ts:22`
- `class|interface` 감지: `packages/core/src/parsers/java/KotlinFileParser.ts:17`
- primary constructor injection: `packages/core/src/parsers/java/KotlinFileParser.ts:90`
- 테스트: `packages/core/src/parsers/java/__tests__/JavaFileParser.test.ts:101`

### 평가

문서가 말한 범위 내에서는 실제 개선이 들어갔다. `@Service/@Repository/@Component/@Mapper` 와 기본 생성자 주입은 확인된다.

### 감점 이유

1. DTO 추출 없음
2. Kotlin controller의 returnType/paramTypes 추출이 Java 수준으로도 확장되지 않음
3. event, bean, complex generic, suspend, multiline pattern 등 실무 Kotlin 지원이 얕음

### 결론

이 항목은 "Controller-only"에서 벗어났다는 점은 인정할 수 있으나, 아직 `Kotlin Spring 지원이 충분하다`고 말할 수준은 아니다.

---

## 4.11 D-2 Java @Component 감지

### 판정

`적정`, `8.0 / 10`

### 구현 확인

- `isComponent` 추가: `packages/core/src/parsers/java/JavaFileParser.ts:27`
- 노드 생성 분기 반영: `packages/core/src/parsers/java/JavaFileParser.ts:47`
- 테스트: `packages/core/src/parsers/java/__tests__/JavaFileParser.test.ts:72`

### 평가

범위가 작고, 실제 구현과 테스트가 모두 간단명료하다. 계획 대비 충족도가 높다.

### 남은 한계

- `@Component` 계열 stereotype 세분화는 없다.
- `@ConfigurationProperties` 같은 주변 패턴은 여전히 별도 처리되지 않는다.

---

## 4.12 D-3 중첩 routes children 파싱

### 판정

`부분 적정`, `4.5 / 10`

### 구현 확인

- 테스트 추가: `packages/core/src/parsers/typescript/__tests__/TsFileParser.test.ts:96`
- route-renders 생성: `packages/core/src/parsers/typescript/TsFileParser.ts:142`

### 문서 주장

구현 문서는 "기존 regex가 이미 children 내부도 잡고 있으므로 코드 변경 없이 테스트만 추가했다"고 설명한다.

- `docs/review-target/phase-x1-extra-implementation.md:306`

### 문제

이 설명은 "파싱 결과 일부가 늘어난다"는 수준에서는 맞지만, 사용자가 원하는 최종 그래프 품질로는 부족하다.

실제 그래프에서:

- `route-renders`: 15개
- resolved `route-renders`: 0개

즉 route-renders는 여전히 `component:...` 또는 `unresolved:...` 상태로 남는다.

또한 resolver는 `uses-component`, `uses-store`, `uses-composable`만 해소하고 `route-renders`는 해소하지 않는다.

- `packages/core/src/linkers/CrossBoundaryResolver.ts:24`

### 결론

이 항목은 "nested route regex 감지 확인"은 맞지만, 제품 가치 관점에서는 `완성도 보강`이라고 보기 어렵다.

---

## 5. 문서 자체의 문제점

## 5.1 "12개 완료" 표현이 사실과 다름

- 문서 주장: `12개를 전부 닫는 작업` `docs/review-target/phase-x1-extra-implementation.md:11`
- 실제 완료 목록 행 수: 11개 `docs/review-target/phase-x1-extra-implementation.md:15`
- 원 계획의 `C-1` 누락

이 문제는 단순 숫자 실수가 아니라, 후속 에이전트가 "남은 작업 없음"으로 오해하게 만든다.

## 5.2 완료와 부분 구현의 경계가 모호함

다음 항목은 "존재"는 하지만 "완료"로 보기 어렵다.

- A-2: SVG 없음
- B-1: 하이라이트 없음, node ID 직접 노출
- B-2: loc 연동 오류
- B-3: 분석 신뢰도 낮음
- D-3: route-renders 해소 미완

## 5.3 테스트 설명이 부족함

문서의 테스트 현황은 숫자를 보여주지만, 신규 UI 기능의 자동 검증 부재가 크다.

- 문서: `UI 컴포넌트 테스트: 미포함` `docs/review-target/phase-x1-extra-implementation.md:345`

이 문장은 매우 중요하며, 사실상 "사용자 기능은 수동 검증 의존"이라는 뜻이다.

---

## 6. 실제 실행 검증 결과

## 6.1 테스트

`npm test`는 현재 통과했다.

- Core: 229 tests passed
- CLI: 4 tests passed
- Server: 16 tests passed
- 총합: 249 tests

## 6.2 추가 런타임 확인 결과

### route-renders

- `test-project-ecommerce` 분석 시 `route-renders = 15`
- resolved `route-renders = 0`

해석:

- nested route를 포함해 route-renders 자체는 만들어지고 있음
- 그러나 최종 그래프에서 컴포넌트 노드로 연결되지 않아 사용 가치가 낮음

### DTO metadata

- 프런트 타입 선언 파일 존재:
  - `test-project-ecommerce/frontend/src/types/api.ts`
- 그래프상 `interfaces/exportedTypes` 메타데이터 노드 수: 0

해석:

- DTO panel은 현재 프런트 타입 선언을 제대로 활용하지 못함

### source snippet loc

- 전체 edge: 546
- `edge.loc` 있음: 182
- `edge.metadata.filePath/line` 있음: 0

해석:

- SourceSnippet 노출 실패의 주원인은 loc 부재가 아니라 UI 쪽 참조 필드 불일치

---

## 7. 세부 감점 사유

## 7.1 계획 충족도 감점

- `C-1` 누락
- `A-2` SVG 미구현
- `B-1` 그래프 하이라이트 미구현
- `B-4` 오류 항목 클릭 이동 미구현

## 7.2 기능 사용 가능성 감점

- `B-2`는 현재 상태로 실제 버튼 노출률이 매우 낮음
- `B-1`은 결과 표시가 지나치게 내부 표현 중심
- `B-3`는 false positive 가능성이 큼

## 7.3 분석 신뢰도 감점

- route-renders unresolved
- DTO frontend metadata 부재
- 이벤트 노드가 UI 필터 체계 밖에 존재

## 7.4 문서 품질 감점

- "완료" 표현이 실제보다 강함
- 누락 기능을 문서에서 조용히 제외함

---

## 8. 후속 에이전트를 위한 우선순위 보강 요구사항

## 8.1 P0: 반드시 보완해야 하는 항목

### P0-1. C-1 E2E 체인 경로 요약 복구

목표:

- `NodeDetail.vue`에 체인 섹션 추가
- 선택 노드 기준 대표 경로 1~3개 표시
- 각 노드 클릭 시 선택 이동

수용 기준:

- API/DB/API-call/route 노드 중 하나를 선택했을 때 체인 요약이 보인다.
- 경로는 node ID가 아니라 사용자 친화적 label을 사용한다.

### P0-2. SourceSnippet loc 연동 수정

목표:

- `NodeDetail.vue`의 `hasLoc()` 와 `viewSource()`가 `edge.loc`를 읽도록 수정

수용 기준:

- `test-project-ecommerce` 기준 loc 있는 edge에 📄 버튼이 실제 노출된다.
- 버튼 클릭 시 스니펫 팝업이 열린다.

### P0-3. 프런트 TypeScript interface/type 추출 추가

목표:

- `TsFileParser` 또는 별도 타입 추출기에서 `interfaces/exportedTypes` 메타데이터 생성

수용 기준:

- `test-project-ecommerce/frontend/src/types/api.ts`의 `UserResponse`, `ProductResponse` 등이 그래프 메타데이터에 반영된다.
- DTO mismatch 수가 "무조건 없음" 또는 "무조건 있음"이 아니라 실제 차이를 반영한다.

### P0-4. route-renders 해소기 추가

목표:

- `route-renders`의 `component:...` 및 lazy import를 실제 vue-component 노드로 연결

수용 기준:

- `test-project-ecommerce` 기준 resolved route-renders가 0이 아니어야 한다.

---

## 8.2 P1: 현재 기능의 완성도 강화

### P1-1. Pathfinder 하이라이트

- 경로 클릭 시 그래프에서 해당 노드/엣지 강조
- `path-highlight` 스타일 추가

### P1-2. Pathfinder 결과 라벨화

- node ID 대신 `label + kind` 표시
- 필요 시 tooltip에 full ID 노출

### P1-3. ParseErrorPanel 이동성 강화

- 파일명 클릭 시 관련 노드 검색 또는 파일 오픈 이벤트 발행

### P1-4. SVG export 추가

- 계획과 문서 제목에 맞게 PNG+SVG 모두 제공

### P1-5. 이벤트 노드 UI 노출

- `vue-event`, `spring-event` 를 `packages/web-ui/src/types/graph.ts`에 추가
- 프리셋과 필터에서 조작 가능하게 변경

---

## 8.3 P2: 다양한 기능 제공 측면의 확장 항목

다음은 이번 Phase X-1 Extra의 직접 범위는 아니지만, 완성도를 높이는 방향에서 가치가 큰 항목이다.

### P2-1. 사용자 저장형 필터 프리셋

- 현재 프리셋은 고정값만 존재
- 팀/역할별 프리셋 저장 기능이 있으면 활용성이 급격히 올라감

### P2-2. unresolved edge 전용 패널

- 현재 unresolved import/route/component를 따로 볼 수 없음
- 분석기가 확신하지 못한 관계를 보여주는 패널이 필요

### P2-3. 경로 탐색 옵션 확장

- shortest only / all paths / edge kind filter
- maxDepth UI 조절

### P2-4. 체인별 설명 텍스트

- 단순 경로 나열 대신 "Vue → API → Controller → Service → Mapper → Table" 같은 semantic label 제공

### P2-5. DTO 비교 고도화

- 타입 비교
- nullable 차이
- 배열/객체 중첩 비교
- rename candidate 힌트

### P2-6. 분석 신뢰도 표시

- 추론 기반 관계인지, 직접 파싱 관계인지 구분 배지 제공

---

## 9. 다른 에이전트가 오해하면 안 되는 점

1. `PathfinderPanel.vue`, `SourceSnippet.vue`, `DtoConsistencyPanel.vue`, `ParseErrorPanel.vue` 파일이 존재한다고 해서 기능 완성도가 높다고 판단하면 안 된다.
2. 현재 가장 위험한 착시는 `UI가 생겼으니 기능이 끝났다`는 판단이다.
3. `npm test` 통과는 중요하지만, 이번 배치의 신규 UI 기능이 충분히 검증됐다는 뜻은 아니다.
4. `D-3 nested routes`는 실제로는 "감지 확인" 수준이며, 최종 route graph 품질 문제는 남아 있다.
5. `B-3 DTO panel`은 파서 보강 없이는 오탐이 많을 가능성이 높다.
6. `B-2 SourceSnippet`은 현재 코드 기준으로 `edge.loc` 연동 수정이 선행되어야 한다.
7. 원 계획의 `C-1`은 여전히 남은 작업으로 봐야 한다.

---

## 10. 최종 권고

현재 Phase X-1 Extra는 `병합 자체를 즉시 되돌려야 할 정도의 실패`는 아니다. 그러나 `문서 표현을 그대로 수용하여 완료 처리`하는 것도 적절하지 않다.

권고 판정은 아래와 같다.

### 권고 판정

`조건부 수용`

### 조건

1. `C-1`을 미구현으로 명시할 것
2. `B-2`를 실제 동작 가능하도록 수정할 것
3. `B-3`의 신뢰도 문제를 별도 기술 부채가 아니라 우선 백로그로 승격할 것
4. `D-3`를 "nested route parse test added" 수준으로 표현을 낮출 것
5. 완료 문구를 "12개 전부 완료"에서 "11개 반영, 1개 누락, 일부 항목 추가 보완 필요" 수준으로 정정할 것

---

## 11. 부록: 추천 후속 작업 순서

1. `NodeDetail.vue`의 source snippet loc 수정
2. `NodeDetail.vue`의 chain 섹션 구현
3. `TsFileParser` 또는 별도 타입 추출기로 interface/type metadata 추가
4. `CrossBoundaryResolver`에 `route-renders` 해소 추가
5. `PathfinderPanel.vue` 결과 라벨화 + 경로 하이라이트
6. `web-ui/src/types/graph.ts`에 event node 반영
7. DTO/Pathfinder/SourceSnippet 최소 통합 테스트 추가

이 순서가 좋은 이유는 다음과 같다.

- 1~4는 현재 "보이는 UI"보다 더 치명적인 신뢰도 결함을 줄이는 작업이다.
- 5~7은 그 위에 사용자 경험과 유지보수성을 강화하는 작업이다.

