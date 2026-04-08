# VDA User Stories Review

검토 대상: `docs/user-stories.md`

검토 기준:
- 현재 저장소의 실제 구현과의 정합성
- 사용자 여정 누락 여부
- 문서가 현재 구현을 설명하는지, 목표 스펙을 혼합하고 있는지 여부

검토 방식:
- 코드와 문서를 정적으로 대조
- 테스트는 실행하지 않음

## 총평

`docs/user-stories.md`는 "최종 검수 문서"라는 제목과 달리, 현재 구현 검수 문서라기보다 목표 스펙과 현재 구현이 혼합된 문서에 가깝다. 특히 MSA, MyBatis interface 링크, 미사용 컴포넌트, Command Palette, 분석 취소, URL 해시 동기화 같은 항목은 문서가 실제 구현보다 앞서가거나, 구현은 있으나 사용자 여정이 불완전하게 서술되어 있다.

## 주요 발견 사항

### 1. High: MSA 여정은 `init`까지만 있고 실제 분석/서빙 경로로 이어지지 않음

- 문서:
  - `US-001`은 여러 Spring 서비스를 감지하면 MSA로 처리된다고 적고 있다.
  - [user-stories.md:18](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L18)
  - [user-stories.md:28](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L28)
- 구현:
  - `vda init`은 여러 서비스를 찾아 `config.services`를 기록한다.
  - [init.ts:33](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/init.ts#L33)
  - [init.ts:48](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/init.ts#L48)
  - 하지만 실제 분석 경로는 `springBootRoot`만 보고 파일을 찾으며 `services`를 읽지 않는다.
  - [config.ts:75](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/config.ts#L75)
  - [engine.ts:151](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts#L151)
  - `AnalysisConfig`에는 `services`가 정의돼 있지만 소비 코드가 없다.
  - [types.ts:77](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/graph/types.ts#L77)
- 결론:
  - 문서상 MSA는 "검수 완료 기능"처럼 보이지만, 실제로는 init 단계의 감지/기록까지만 존재한다.

### 2. High: MyBatis XML namespace와 Java `@Mapper` 인터페이스 자동 연결은 현재 구현으로 성립하기 어려움

- 문서:
  - `US-031`은 MyBatis XML namespace가 Java `@Mapper` 인터페이스와 자동 연결된다고 적고 있다.
  - [user-stories.md:320](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L320)
- 구현:
  - Java 파서는 `class` 선언만 찾고 `interface`는 파싱하지 않는다.
  - [JavaFileParser.ts:102](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/java/JavaFileParser.ts#L102)
  - linker는 이미 생성된 `spring-service`/`spring-controller` 노드만 대상으로 MyBatis mapper를 연결한다.
  - [MyBatisLinker.ts:8](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/MyBatisLinker.ts#L8)
  - 따라서 실제 `@Mapper interface`가 존재해도 Java 쪽 노드가 안 생기면 링크가 성립하지 않는다.
- 결론:
  - 이 문장은 현재 구현 기준으로는 과장되었고, 최소한 "class 기반으로만 제한적 매칭" 또는 "interface 파싱 미지원"이 명시돼야 한다.

### 3. High: 미사용 컴포넌트 여정은 현재 그래프 모델과 노출 경로에 비해 문서가 앞서 있음

- 문서:
  - `US-051`은 미사용 컴포넌트를 `incoming uses-component/route-renders 없음`으로 정의한다.
  - [user-stories.md:376](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L376)
- 구현:
  - 코어 analyzer에는 `findUnusedComponents`가 있다.
  - [OrphanDetector.ts:12](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/analyzers/OrphanDetector.ts#L12)
  - 그러나 내가 확인한 범위에서 `route-renders`를 실제 생성하는 코드는 보이지 않았다.
  - 타입에는 정의돼 있으나 생성 경로는 확인되지 않았다.
  - [types.ts:20](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/graph/types.ts#L20)
  - [TsFileParser.ts:146](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/typescript/TsFileParser.ts#L146)
  - 서버 통계 API도 외부로는 `unusedEndpoints`만 제공하고 `unusedComponents`는 제공하지 않는다.
  - [engine.ts:359](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts#L359)
  - [analysisRoutes.ts:10](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/routes/analysisRoutes.ts#L10)
- 결론:
  - "미사용 컴포넌트 감지"는 문서에서 현재 제공 기능처럼 보이지만, 실제 사용자 여정으로는 완결되지 않았다.

### 4. Medium: Command Palette 여정은 일부 기능이 구현되지 않았거나 다른 방식으로 동작함

- 문서:
  - `US-074`는 `Fit to view`, `Reset filters`, 최근 항목 상단 표시까지 완성된 것처럼 적고 있다.
  - [user-stories.md:508](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L508)
  - [user-stories.md:521](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L521)
  - [user-stories.md:524](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L524)
- 구현:
  - `Fit graph to view` 명령은 action이 비어 있다.
  - [CommandPalette.vue:26](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/CommandPalette.vue#L26)
  - 최근 항목은 저장만 하고, UI 결과 상단에 렌더링하지 않는다.
  - [CommandPalette.vue:33](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/CommandPalette.vue#L33)
  - `Reset all filters`는 상태 복원이 아니라 `window.location.reload()`다.
  - [CommandPalette.vue:128](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/CommandPalette.vue#L128)
- 결론:
  - 문서는 실제보다 완성도가 높게 쓰여 있다.

### 5. Medium: 분석 진행 오버레이의 취소 버튼은 실제 분석을 중단하지 않음

- 문서:
  - `US-081`은 취소 버튼이 "분석 중단"을 수행한다고 적고 있다.
  - [user-stories.md:573](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L573)
- 구현:
  - 버튼은 단지 `cancel` 이벤트만 emit한다.
  - [AnalysisProgress.vue:67](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/AnalysisProgress.vue#L67)
  - `App.vue`는 그 이벤트를 받아 `analyzing = false`로 UI만 닫는다.
  - [App.vue:85](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/App.vue#L85)
  - 서버 쪽에 abort/cancel API나 파서 중단 로직은 보이지 않는다.
  - [engine.ts:77](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts#L77)
- 결론:
  - 이 항목은 현재 구현과 직접 충돌한다.

### 6. Medium: Native bridge 감지는 init 단계와 실제 분석 단계의 규칙이 다름

- 문서:
  - `US-001` 수락 조건은 browser globals 필터링을 명시한다.
  - `US-041`은 일반적인 `window.XXX.method()` 감지를 말한다.
  - [user-stories.md:21](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L21)
  - [user-stories.md:30](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L30)
  - [user-stories.md:351](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L351)
- 구현:
  - `init`의 bridge auto-detect는 globals를 걸러 `nativeBridges`를 만든다.
  - [init.ts:188](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/init.ts#L188)
  - 하지만 실제 Vue script parser는 알려진 bridge 외에도 모든 `window.X.method()` 패턴을 `native-call`로 본다.
  - [ScriptAnalyzer.ts:109](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/ScriptAnalyzer.ts#L109)
  - [ScriptAnalyzer.ts:223](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/ScriptAnalyzer.ts#L223)
- 결론:
  - 문서는 detection 정책을 하나로 서술하지만 실제로는 "init용 스캔 규칙"과 "분석용 파싱 규칙"이 다르다.

### 7. Medium: URL 해시 상태 여정이 완전히 동기화되지 않음

- 문서:
  - `US-099`는 노드 선택과 뷰 전환 모두 해시에 반영된다고 적고 있다.
  - [user-stories.md:712](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L712)
- 구현:
  - 해시 갱신은 `selectedNodeId` watch에서만 발생한다.
  - [App.vue:37](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/App.vue#L37)
  - Graph/Tree 버튼은 `activeView`만 바꾸고 해시는 갱신하지 않는다.
  - [App.vue:159](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/App.vue#L159)
- 결론:
  - 선택 노드가 유지된 채 view만 바뀌면 URL은 stale 상태가 될 수 있다.

### 8. Medium: Event/MyBatis/DB 여정에는 실제 사용자가 겪는 필터 선행 단계가 빠져 있음

- 문서:
  - Spring Event, MyBatis, DB table 분석이 바로 탐색 가능한 흐름처럼 적혀 있다.
  - [user-stories.md:274](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L274)
  - [user-stories.md:300](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L300)
- 구현:
  - 기본 필터는 `mybatis-*`, `db-table`, `emits-event`, `listens-event`를 활성화하지 않는다.
  - [graphStore.ts:14](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/stores/graphStore.ts#L14)
  - [graphStore.ts:20](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/stores/graphStore.ts#L20)
- 결론:
  - 실제 사용자 여정에는 "Filter/Legend에서 해당 종류를 켠다"가 선행 단계로 들어가야 한다.

## 보조 발견 사항

### 9. Low: CLI 노드 종류 카운트는 MyBatis/DB 종류를 출력하지 않음

- 문서:
  - `US-002`는 노드 종류별 카운트를 보여준다고 적는다.
  - [user-stories.md:46](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L46)
- 구현:
  - CLI 출력 필터는 `vue-`, `pinia-`, `spring-`, `ts-`, `api-`, `native-` prefix만 출력한다.
  - [analyze.ts:38](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/analyze.ts#L38)
- 결론:
  - MyBatis/DB 관련 카운트는 현재 CLI 결과에서 누락된다.

### 10. Low: `init` 단계의 tsconfig `extends` 재귀 해석은 문서와 다름

- 문서:
  - `US-001`은 init 단계에서 extends 체인 재귀 해석까지 된다고 적는다.
  - [user-stories.md:20](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L20)
- 구현:
  - `init`의 `readTsconfigAliases()`는 단일 tsconfig만 읽는다.
  - [init.ts:164](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/init.ts#L164)
  - 반면 실제 import 해석기 `ImportResolver`는 `extends`를 재귀 해석한다.
  - [ImportResolver.ts:18](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/typescript/ImportResolver.ts#L18)
- 결론:
  - 문구가 맞으려면 "분석 시 import 해석"과 "init 시 alias 추출"을 분리해서 적어야 한다.

### 11. Low: 캐시 시스템 설명은 CLI와 server의 동작 차이를 반영하지 않음

- 문서:
  - `US-090`은 캐시 시스템이 일관되게 동작하는 것처럼 보인다.
  - [user-stories.md:598](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L598)
- 구현:
  - CLI는 분석 후 캐시 엔트리를 실제로 채워 저장한다.
  - [config.ts:117](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/config.ts#L117)
  - server 초기 분석은 `save()`만 호출하고 새 엔트리 채우기는 하지 않는다.
  - [engine.ts:122](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts#L122)
  - watch 변경 시에는 해당 파일만 `cache.set()` 한다.
  - [engine.ts:203](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts#L203)
- 결론:
  - 현재 문서만 보면 CLI/server가 같은 캐시 품질을 제공하는 것처럼 오해할 수 있다.

### 12. Low: 온보딩과 실제 클러스터 상호작용 문구가 다름

- 문서:
  - 온보딩은 클러스터를 double-click으로 확장한다고 적는다.
  - [user-stories.md:534](/home/ubuntu/workspace/vue_dependency_analyzer/docs/user-stories.md#L534)
- 구현:
  - 실제 Cytoscape 이벤트는 `tap` 한 번으로 expand/collapse 한다.
  - [OnboardingGuide.vue:8](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/OnboardingGuide.vue#L8)
  - [ForceGraphView.vue:280](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/ForceGraphView.vue#L280)
- 결론:
  - 문서와 온보딩 문구 둘 다 현재 구현 기준으로 수정이 필요하다.

## 누락된 실제 사용자 여정

현재 문서에서 약하게 다뤄지거나 빠진 실제 여정은 아래와 같다.

1. Event/MyBatis/DB 레이어를 보려면 필터를 먼저 켜야 하는 여정
2. `config.services`가 실제 분석에 반영되지 않는 제한 사항
3. server 캐시는 초기 전체 분석보다 watch 갱신 경로에서 더 실질적으로 채워지는 여정
4. Command Palette의 "Reset filters"가 상태 초기화가 아니라 전체 새로고침이라는 사실
5. 분석 취소가 서버 중단이 아니라 UI 숨김이라는 제한 사항

## 권장 문서 수정 방향

1. `최종 검수 문서`라는 표현을 유지하려면, 현재 구현 기준으로 사실인 항목만 남기고 목표 스펙은 별도 "future scope"로 분리하는 것이 맞다.
2. `init 단계`, `분석 엔진 단계`, `UI 노출 단계`를 구분해서 써야 한다.
3. MSA, MyBatis interface linking, unused components, cancel analysis는 현재 상태를 "부분 구현" 또는 "미구현"으로 명시하는 편이 정확하다.
4. Event/MyBatis/DB 계층은 기본 필터에서 비활성이라는 UX 전제를 사용자 여정에 넣는 편이 좋다.
5. URL hash, Command Palette, onboarding 상호작용 문구는 실제 UI 행동에 맞춰 즉시 수정하는 것이 좋다.
