# Module 06. 링커와 경계 연결

## 1. 목적

파서가 수집한 단편 정보를 실제 그래프로 묶는 핵심 단계인 linker를 이해한다.

## 2. 핵심 파일

- `packages/core/src/linkers/CrossBoundaryResolver.ts`
- `packages/core/src/linkers/ApiCallLinker.ts`
- `packages/core/src/linkers/MyBatisLinker.ts`
- `packages/core/src/linkers/DtoFlowLinker.ts`
- `packages/core/src/linkers/NativeBridgeLinker.ts`

## 3. CrossBoundaryResolver가 중요한 이유

이 클래스는 실질적 오케스트레이터다.

주요 순서는 아래다.

1. import 해석
2. API call <-> endpoint 연결
3. native bridge 연결
4. MyBatis mapper 연결 및 table dedupe
5. Vue emit/listener event node 생성
6. Spring event node 생성
7. spring-injects target 실제 해석
8. Repository -> Mapper 연결
9. DTO flow 연결

## 4. ApiCallLinker 핵심

### 정규화 규칙

- leading slash 보정
- trailing slash 제거
- `:id` 와 `{id}` 정규화
- `${...}` 를 path param placeholder로 정규화
- method match

즉, 문자열 일치가 아니라 정규화 후 구조 match다.

## 5. MyBatisLinker 핵심

- Java side mapper interface와 XML namespace 연결
- className, fqn, label 등으로 점진 매칭
- 중복 `db-table` 노드 정리

## 6. DTO flow의 의미

DTO를 공유하는 endpoint와 DTO node를 느슨하게 연결해 데이터 흐름 관점을 추가한다.

이는 코드 import와는 다른 종류의 관계다.

## 7. 이벤트 virtual node

### Vue event

- child component emits
- parent listens
- 두 사실을 연결해 `vue-event` synthetic node 생성

### Spring event

- publishEvent와 listener를 이어 `spring-event` synthetic node 생성

## 8. 의미상 역방향 edge

실제 edge는 아래 방향으로 저장되더라도, trace 관점에서는 반대로 따라가야 하는 경우가 있다.

예:

- `api-serves`
- `mybatis-maps`

이 개념을 모르면 tree view와 bottom-up view를 이해할 수 없다.

## 9. 실습 포인트

- unresolved import가 실제 file target으로 어떻게 바뀌는지 추적
- API call site와 endpoint가 어떻게 연결되는지 추적
- DTO flow edge를 별도로 표기해보기
- 왜 synthetic node가 필요한지 설명하기

## 10. 체크 질문

- 왜 import resolution은 parser 안이 아니라 linker 단계가 더 적절한가
- path normalization 없이 API linker를 만들면 어떤 문제가 생기는가
- event를 edge만으로 표현하지 않고 node로 올리는 이유는 무엇인가
- reverse semantic edge를 모르면 어떤 화면이 틀리게 보이는가
