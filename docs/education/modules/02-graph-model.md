# Module 02. 그래프 모델

## 1. 목적

이 시스템의 모든 계산은 그래프 모델 위에서 이뤄진다. 따라서 파서를 보기 전에 graph contract를 먼저 이해해야 한다.

## 2. 핵심 파일

- `packages/core/src/graph/types.ts`
- `packages/core/src/graph/DependencyGraph.ts`
- `packages/core/src/graph/query.ts`
- `packages/core/src/graph/serializer.ts`

## 3. 반드시 알아야 하는 구조

### NodeKind

현재 핵심 노드 종류는 아래 계열로 묶어 이해하면 된다.

- Vue 계열: `vue-component`, `vue-composable`, `pinia-store`, `vue-directive`, `vue-router-route`
- TypeScript 계열: `ts-module`, `api-call-site`
- Spring 계열: `spring-controller`, `spring-endpoint`, `spring-service`
- 연동 계열: `native-bridge`, `native-method`, `vue-event`, `spring-event`
- DB 계열: `mybatis-mapper`, `mybatis-statement`, `db-table`

### EdgeKind

- 코드 구조: `imports`, `uses-component`, `uses-store`, `uses-composable`, `uses-directive`
- 데이터 흐름: `dto-flows`
- 런타임/연계: `api-call`, `api-serves`, `native-call`
- 백엔드 연결: `spring-injects`, `mybatis-maps`, `reads-table`, `writes-table`
- 이벤트: `emits-event`, `listens-event`
- 기타: `provides`, `injects`, `route-renders`

## 4. DependencyGraph의 핵심 책임

- 노드 저장
- 엣지 저장
- 정방향 인접 인덱스
- 역방향 인접 인덱스
- 파일 경로 인덱스
- merge 및 removeByFile

파일 인덱스가 중요한 이유는 `change impact`, `watch mode`, `incremental reparse` 때문이다.

## 5. query 함수가 중요한 이유

### reachableFrom

이 함수가 사실상 impact, subgraph, 경로 탐색의 기반이다.

### findPaths

두 노드 사이 경로를 찾는다. Pathfinder UI와 직접 연결된다.

### filterByKind

UI filter, rule evaluation, 분석 축소에 사용된다.

## 6. 이 모듈에서 반드시 정리할 것

- 각 NodeKind는 어떤 parser 또는 linker에서 생성되는가
- 각 EdgeKind는 어떤 단계에서 생성되는가
- 어떤 node ID는 파일 경로 기반이고, 어떤 것은 논리 이름 기반인가
- 어떤 graph query가 UI 기능과 연결되는가

## 7. 실무적으로 중요한 포인트

- node identity는 매우 중요하다.
- ID scheme이 흔들리면 API, deep-link, cache, diff impact가 모두 흔들린다.
- file-backed node와 synthetic node를 구분해야 한다.

예:

- file-backed: `vue:/.../HomeView.vue`
- synthetic: `spring-endpoint:GET:/api/users/{id}`
- synthetic: `db-table:users`

## 8. 체크 질문

- 왜 `DependencyGraph`는 reverse adjacency를 별도로 가지는가
- `getNodesByFile()`는 어디에 쓰이는가
- `db-table` 같은 synthetic node는 왜 cache 설계에서 특히 주의해야 하는가
- 왜 query 계층을 파서 코드와 분리해야 하는가
