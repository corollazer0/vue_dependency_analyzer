# Module 05. 백엔드 분석

## 1. 목적

Spring Boot와 MyBatis 계층에서 endpoint, service, DTO, mapper, table을 어떻게 추출하는지 이해한다.

## 2. 핵심 파일

- `packages/core/src/parsers/java/JavaFileParser.ts`
- `packages/core/src/parsers/java/KotlinFileParser.ts`
- `packages/core/src/parsers/java/MyBatisXmlParser.ts`
- `docs/supported-patterns.md`

## 3. JavaFileParser가 하는 일

### 클래스 식별

- package
- className
- annotations
- basePath

### Spring 계층 노드 생성

- controller
- service
- repository
- mapper
- configuration
- component

### endpoint 생성

- HTTP method
- normalized path
- handler method
- returnType
- paramTypes

### DTO 식별

이 저장소는 DTO를 이름 규칙으로 많이 식별한다.

예:

- `UserRequest`
- `UserResponse`
- `DashboardDto`
- `OrderSummary`

## 4. 의존성 주입 추정

`spring-injects`는 실제 DI container 실행 결과가 아니라 정적 추정이다.

주요 근거는 아래다.

- `@Autowired`
- 생성자 주입
- `@RequiredArgsConstructor`
- mapper/repository/service 타입명

## 5. MyBatisXmlParser가 하는 일

### mapper node

- XML `namespace`에서 mapper node 생성

### statement node

- `select`, `insert`, `update`, `delete` 추출

### table node

- SQL에서 `FROM`, `JOIN`, `INTO`, `UPDATE` 등을 보고 `db-table` 생성

### table edge

- `select`는 `reads-table`
- 나머지는 `writes-table`

## 6. 지원 한계

- MyBatis annotation SQL은 미지원
- JPA는 미지원
- Lombok 메서드 생성 자체는 직접 분석하지 않음
- record, Kotlin data class, 복잡한 generic DTO는 제한적
- 동적 SQL 조건 분기 정확도는 제한적

## 7. 실무적으로 중요한 포인트

- endpoint metadata의 `returnType`, `paramTypes`는 DTO consistency와 DTO flow의 기반이다.
- table 추출은 완벽 SQL parser 수준이 아니라 실용적 패턴 파싱이다.
- 그러므로 운영 시에는 "정확도 범위"를 사용자에게 설명할 수 있어야 한다.

## 8. 이 모듈 실습

- `test-project/backend/src/main/java/.../UserController.java`에서 endpoint를 추출한다.
- 대응되는 service와 mapper를 찾는다.
- XML mapper에서 table을 찾는다.
- 이 흐름을 하나의 표로 정리한다.

## 9. 체크 질문

- endpoint node에 왜 `returnType`, `paramTypes` metadata가 필요한가
- service와 repository, mapper는 왜 모두 `spring-service` 계열로 다뤄지는가
- table node는 왜 synthetic node로 보는 것이 맞는가
- MyBatis XML 기반 분석이 JPA 분석과 구조적으로 어떻게 다른가
