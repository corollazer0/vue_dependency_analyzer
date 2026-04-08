# Phase 4: Full-Stack Deep Analysis - Implementation Summary

## Overview
PRD의 핵심 요구사항인 프론트엔드→백엔드→DB까지 E2E 의존성 추적을 구현.

## 구현된 기능

### 1. MyBatis XML Parser + DB 테이블 레이어 (PRD 3.5, 3.8)
- `MyBatisXmlParser.ts`: `<mapper namespace=>`로 시작하는 XML 파일 파싱
- SQL문(`SELECT/INSERT/UPDATE/DELETE`)에서 테이블명 자동 추출 (FROM, INTO, UPDATE, JOIN 패턴)
- 새 NodeKind: `mybatis-mapper`, `mybatis-statement`, `db-table`
- 새 EdgeKind: `mybatis-maps`, `reads-table`, `writes-table`
- `MyBatisLinker.ts`: XML namespace ↔ Java @Mapper 인터페이스 자동 매칭 + 중복 테이블 노드 병합
- 9개 테스트 추가 (전체 73 tests)

### 2. Spring Boot 심층 분석 강화 (PRD 3.5, 3.7)
- **Lombok @RequiredArgsConstructor**: `private final` 필드를 constructor injection으로 자동 처리
- **@Configuration + @Bean**: Config 클래스의 Bean 팩토리 메서드에서 생성 타입 추출 → 주입 엣지
- **@Repository, @Mapper**: 어노테이션 감지 + FQN 메타데이터 → MyBatis 매칭용
- **Spring Events**: `publishEvent(new XxxEvent)` → `emits-event` 엣지, `@EventListener` → `listens-event` 엣지

### 3. 경로 추적 API + 분석 오버레이 (PRD 3.3)
- `GET /api/graph/paths?from=X&to=Y&maxDepth=10` — 기존 findPaths() 활용한 A→B 경로 탐색
- `GET /api/analysis/overlays` — 순환 의존성 노드 ID, 고아 노드 ID, 허브 노드 ID 반환
- `GET /api/source-snippet?file=X&line=N&context=5` — 소스 코드 스니펫 반환
- `GET /api/analysis/parse-errors` — 파싱 오류 목록

### 4. 새로운 데이터 흐름

```
Vue Component → axios.post('/api/users') → Spring @PostMapping("/api/users")
    → @Autowired UserService → @Mapper UserMapper
    → MyBatis XML <insert id="insert"> → DB: users 테이블
```

프론트엔드부터 DB 테이블까지 기본 체인 추적 가능. (조건: API URL 매칭 성공 + MyBatis XML 발견 시. Mapper interface 자동 연결, DTO flow, event virtual edge는 부분 구현.)

## 새 파일 목록
- `core/src/parsers/java/MyBatisXmlParser.ts` — MyBatis XML 파서
- `core/src/linkers/MyBatisLinker.ts` — XML↔Java 매칭 + 테이블 병합
- `core/src/__fixtures__/UserMapper.xml` — 테스트 픽스처
- `core/src/parsers/java/__tests__/MyBatisXmlParser.test.ts` — 9개 테스트

## API 추가
| Method | Path | 설명 |
|--------|------|------|
| GET | /api/graph/paths?from=X&to=Y | 두 노드 간 경로 탐색 |
| GET | /api/analysis/overlays | 순환/고아/허브 노드 ID |
| GET | /api/source-snippet?file=X&line=N | 소스 코드 스니펫 |
| GET | /api/analysis/parse-errors | 파싱 오류 목록 |

## 테스트
- 73 unit tests 통과 (7 test suites)
- 전체 빌드 성공 (core, server, cli, web-ui)
