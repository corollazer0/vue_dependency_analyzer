# Module 09. Zero-Base 재설계

## 1. 목적

이제 기존 코드를 이해하는 단계를 넘어, 같은 급의 시스템을 처음부터 다시 설계할 수 있어야 한다.

## 2. 재설계 원칙

### 원칙 1. 파서와 링크를 절대 섞지 않는다

파일 단위 사실 수집과 전역 연결은 분리해야 한다.

### 원칙 2. graph contract를 먼저 고정한다

노드 종류, 엣지 종류, ID, metadata schema를 먼저 정해야 한다.

### 원칙 3. supported pattern spec를 코드보다 먼저 쓴다

무엇을 감지할지, 무엇을 못 감지할지 먼저 문서화해야 한다.

### 원칙 4. cache correctness를 초기에 검증한다

성능 기능이 아니라 정확도 요구사항으로 다뤄야 한다.

### 원칙 5. 제품형 요구사항을 뒤로 미루되, 경계는 지금 정한다

MVP라도 아래 경계는 초기 설계에 반영해야 한다.

- auth 가능성
- audit 가능성
- service boundary
- API versioning
- offline deployment

## 3. 추천 재설계 순서

1. graph schema 설계
2. parser contract 설계
3. fixture 프로젝트 설계
4. import/link strategy 설계
5. analyzer 최소셋 설계
6. CLI/REST surface 설계
7. cache/incremental contract 설계
8. 폐쇄망 패키징/운영 설계

## 4. MVP에 포함할 것

- Vue parser
- TS parser
- Spring endpoint parser
- MyBatis XML parser
- API linker
- graph query
- impact analyzer
- CLI analyze
- REST `/api/graph`

## 5. Phase 2 이후에 붙여도 되는 것

- advanced clustering
- command palette
- onboarding UX
- multi-view advanced graph UI
- full rule engine 확장
- enterprise auth/RBAC

## 6. 재설계 시 꼭 문서화할 것

- NodeKind / EdgeKind 정의서
- ID scheme 정의서
- supported patterns 문서
- 미지원 패턴 문서
- cache invariants
- incremental update invariants
- API contract
- 운영 runbook

## 7. 팀 단위로 재구현할 때의 작업 분할

- Track A: graph + parser contracts
- Track B: frontend parsers
- Track C: backend parsers
- Track D: linkers + analyzers
- Track E: CLI/server/UI
- Track F: fixture + regression tests + docs

## 8. 최종 설계 검증 질문

- 지원 패턴과 미지원 패턴이 문서화되었는가
- file-backed와 synthetic node가 모두 보존되는가
- cold/warm/incremental 결과가 논리적으로 동일한가
- API와 UI가 graph contract를 누수 없이 사용하는가
- 폐쇄망 설치 시 외부 의존성이 제거되었는가

## 9. 산출물

이 모듈이 끝나면 아래 문서를 써야 한다.

- `재설계 개요`
- `graph schema`
- `supported pattern spec`
- `cache/incremental invariants`
- `폐쇄망 운영 설계`
- `단계별 구현 로드맵`
