# 숙련도 맵

## 1. 숙련도 레벨

### L0. 미인지

- 용어를 모른다.
- 파일을 봐도 역할이 구분되지 않는다.

### L1. 용어 인지

- `AST`, `NodeKind`, `api-call`, `spring-endpoint` 정도의 뜻은 안다.
- 하지만 시스템 안에서 어떻게 연결되는지는 모른다.

### L2. 흐름 이해

- 한 개의 기능 흐름을 끝까지 추적할 수 있다.
- 예: Vue API 호출이 Spring endpoint에 연결되는 흐름

### L3. 구조 설명

- 레이어 간 역할 차이와 제약을 설명할 수 있다.
- 지원 패턴과 미지원 패턴을 구분할 수 있다.

### L4. 재설계 가능

- 이 시스템을 다시 설계할 수 있다.
- 축소판 MVP와 제품형 버전을 구분해 설계할 수 있다.

이 교육의 목표는 최소 `L4`다.

## 2. 필수 학습 도메인

### A. 그래프 모델

- 노드와 엣지 종류
- ID 규칙
- 메타데이터
- adjacency / reverse adjacency
- reachability, pathfinding, impact traversal

### B. 파싱 엔진

- 파일 발견
- 파일 단위 파싱
- parse result 구조
- worker와 cache
- parse error 처리

### C. 프론트엔드 분석

- Vue SFC 분해
- script 분석
- template 분석
- TS/JS 모듈 분석
- store/composable/router/API 감지

### D. 백엔드 분석

- controller/service/repository 구분
- endpoint 추출
- DTO 추출
- DI 추정
- MyBatis XML과 table 추출

### E. 경계 연결

- import 해석
- component/store/composable 연결
- API call <-> endpoint 연결
- mapper/xml 연결
- DTO flow
- event virtual node

### F. 분석 기능

- circular dependency
- orphan detection
- hub/complexity
- impact analysis
- DTO consistency
- architecture rule engine
- git diff impact

### G. 제품 인터페이스

- CLI
- server API
- WebSocket
- UI views
- overlays
- source snippet

### H. 운영과 제품화

- cache correctness
- watch/incremental
- monorepo/MSA
- 폐쇄망 배포
- 보안, 권한, 감사

## 3. Golden Path 6개

이 6가지는 반드시 끝까지 추적해야 한다.

1. `route -> vue-component`
2. `vue-component -> composable/store`
3. `vue-component -> api-call-site -> spring-endpoint`
4. `spring-controller -> spring-service -> mybatis-mapper -> mybatis-statement -> db-table`
5. `db-table -> upstream impact -> vue-component`
6. `changed file -> graph node -> direct/transitive impact`

## 4. 꼭 외워야 하는 질문

- 이 노드는 어디서 생성되는가
- 이 엣지는 어느 단계에서 생기는가
- unresolved 상태로 남는 이유는 무엇인가
- 나중에 어떤 linker가 이걸 해소하는가
- 이 결과는 어떤 분석기에 사용되는가
- 이 경로가 끊기는 케이스는 무엇인가

## 5. 학습 우선순위

### 반드시 먼저

- 정적 분석
- 그래프 모델
- Golden Path

### 그 다음

- 프론트/백엔드 파서 디테일
- CrossBoundaryResolver
- analyzers

### 마지막

- UI 세부 인터랙션
- 제품화와 운영화
- zero-base 재설계

## 6. 자기 점검 기준

아래를 보면 현재 레벨을 판단할 수 있다.

- 파일은 읽었지만 설명이 안 된다: L1
- 흐름 하나는 따라간다: L2
- 코드 없는 화이트보드에서도 구조를 설명한다: L3
- 장단점과 대안을 함께 제시한다: L4
