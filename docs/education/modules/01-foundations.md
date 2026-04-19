# Module 01. 기초 개념

## 1. 이 모듈의 목적

이 모듈은 이후 모든 학습의 바닥이다. 여기서 막히면 파일을 많이 읽어도 시스템이 보이지 않는다.

## 2. 반드시 이해해야 하는 개념

### 정적 분석

- 프로그램을 실행하지 않고 코드를 읽어 사실을 추출한다.
- 따라서 런타임 변수, reflection, 동적 경로는 약하거나 불가능할 수 있다.

### AST

- 코드를 문자열이 아니라 구조로 읽기 위한 표현이다.
- Vue와 TypeScript는 AST 친화적이다.
- Java는 이 저장소에서 완전 AST 기반이라기보다 정규식/구조 추출 혼합 접근도 포함한다.

### 그래프

- 이 시스템의 최종 산출물은 표가 아니라 그래프다.
- 노드는 구성요소, 엣지는 관계다.
- 방향이 중요하다. `A -> B`는 "A가 B에 의존한다"는 뜻이다.

### 파서 / 링커 / 분석기

- 파서: 파일 단위 사실 수집
- 링커: 수집된 사실 연결
- 분석기: 연결된 그래프를 계산

이 셋을 섞으면 설계가 무너진다.

### cold / warm / incremental

- cold: 처음부터 다 분석
- warm: cache 재사용
- incremental: 일부만 다시 분석

정답은 세 방식이 논리적으로 같은 결과를 내는 것이다.

## 3. 이 프로젝트에서의 데이터 흐름

1. 파일을 찾는다.
2. 파일별 parser가 `nodes`, `edges`, `errors`를 만든다.
3. `DependencyGraph`에 합친다.
4. `CrossBoundaryResolver`가 unresolved 관계를 실제 target으로 바꾼다.
5. analyzer가 impact, circular, consistency 등을 계산한다.
6. CLI, server, UI가 결과를 보여준다.

## 4. 초보자가 가장 많이 하는 오해

- 모든 edge가 파서 단계에서 완성된다고 생각한다.
- UI를 보면 엔진을 이해한 것이라고 착각한다.
- 지원 패턴 문서만 보면 실제 구현도 완전할 것이라 생각한다.
- 방향성이 없는 그래프로 이해한다.
- cache는 성능 기능일 뿐이라고 생각한다.

마지막 오해가 특히 위험하다. 분석 도구에서 cache는 성능뿐 아니라 정확도와도 연결된다.

## 5. 먼저 읽어야 하는 파일

- `packages/core/src/index.ts`
- `packages/core/src/graph/types.ts`
- `packages/core/src/engine/ParallelParser.ts`
- `packages/server/src/engine.ts`

## 6. 이 모듈 완료 기준

- 파서, 링커, 분석기의 차이를 설명할 수 있다.
- 정적 분석이 왜 동적 패턴에 약한지 설명할 수 있다.
- 그래프의 방향성이 왜 중요한지 설명할 수 있다.
- cold/warm/incremental 결과가 같아야 하는 이유를 설명할 수 있다.

## 7. 체크 질문

- 이 시스템의 입력은 무엇이고 출력은 무엇인가
- 왜 parser는 unresolved edge를 허용해야 하는가
- impact 분석은 왜 reverse traversal이 필요한가
- 왜 지원/미지원 패턴 문서가 중요하며, 동시에 코드 검증이 필요한가
