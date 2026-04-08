# Phase 5: Quality Verification — User Journey Based Testing

## Context

Phase 1-4를 거치며 73개 단위 테스트가 존재하나, **서버 API 0개, CLI 0개, 핵심 엔진(ParallelParser/ParseCache) 0개, CrossBoundaryResolver 0개 테스트**로 실제 사용 시나리오 검증이 없다. 이 Phase는 "사용자 여정(User Journey)" 기반으로 테스트를 설계하여 기능적/비기능적 결함을 체계적으로 검출한다.

## 현재 테스트 현황

| 영역 | 테스트 수 | 커버리지 |
|------|----------|---------|
| Graph 모델/쿼리/직렬화 | 18 | ✅ 양호 |
| Vue 파서 | 14 | ⚠️ 기본만 |
| TS 파서 | 7 | ⚠️ 기본만 |
| Java 파서 | 8 | ⚠️ 기본만 |
| MyBatis 파서 | 9 | ⚠️ 기본만 |
| 링커 (ApiCall+NativeBridge) | 7 | ⚠️ 부분 |
| 분석기 | 10 | ✅ 양호 |
| **ParallelParser** | 0 | ❌ |
| **ParseCache** | 0 | ❌ |
| **CrossBoundaryResolver** | 0 | ❌ |
| **MyBatisLinker** | 0 | ❌ |
| **Server API** | 0 | ❌ |
| **CLI** | 0 | ❌ |
| **E2E (전체 파이프라인)** | 0 | ❌ |

## 사용자 여정 정의

### Journey 1: "프로젝트 첫 분석" (CLI)
사용자가 `vda analyze ./my-project`를 실행하여 분석 결과를 확인하는 여정.

**테스트 시나리오:**
1. fixture 프로젝트에 대해 `runAnalysis()` 호출 → 노드/엣지 수 검증
2. Vue 컴포넌트 → Pinia store → composable 의존성 체인 검증
3. Vue → Spring Boot API endpoint 매칭 검증
4. MyBatis XML → DB 테이블 체인 검증
5. 순환 의존성 감지 검증
6. 캐시 동작: 첫 실행 → 두 번째 실행(캐시 히트) 검증

**테스트 파일:** `packages/core/src/__tests__/integration.test.ts`

### Journey 2: "서버 API로 그래프 조회" (Server)
사용자가 `vda serve` 실행 후 브라우저에서 API를 통해 그래프 데이터를 조회하는 여정.

**테스트 시나리오:**
1. `GET /api/graph` → 전체 그래프 반환 검증
2. `GET /api/graph?cluster=true&depth=3` → 클러스터 구조 검증
3. `GET /api/graph/node/:id` → 노드 상세 + in/out 엣지 검증
4. `GET /api/search?q=User` → 검색 결과 검증
5. `GET /api/graph/paths?from=A&to=B` → 경로 탐색 검증
6. `GET /api/analysis/overlays` → 순환/고아/허브 ID 검증
7. `GET /api/stats` → 통계 검증
8. `GET /api/source-snippet?file=X&line=N` → 소스 코드 스니펫 검증
9. 404/400 에러 응답 검증

**테스트 파일:** `packages/server/src/__tests__/api.test.ts`

### Journey 3: "핵심 엔진 안정성" (Core Units)
ParallelParser, ParseCache, CrossBoundaryResolver, MyBatisLinker의 단위 검증.

**테스트 시나리오:**
- ParseCache: get/set/invalidate/save/load, config hash 변경 시 캐시 무효화
- ParallelParser: 병렬 파싱 + 진행률 콜백 + 캐시 연동
- CrossBoundaryResolver: import 해석, 컴포넌트/스토어/composable 참조 해석
- MyBatisLinker: namespace↔Java 매칭, 테이블 노드 중복 병합

**테스트 파일:**
- `packages/core/src/engine/__tests__/ParseCache.test.ts`
- `packages/core/src/engine/__tests__/ParallelParser.test.ts`
- `packages/core/src/linkers/__tests__/CrossBoundaryResolver.test.ts`
- `packages/core/src/linkers/__tests__/MyBatisLinker.test.ts`

### Journey 4: "대규모 프로젝트 성능" (Performance)
500+ 파일 프로젝트에서 분석 시간, 캐시 효과, API 응답 크기를 검증.

**테스트 시나리오:**
1. 500 파일 분석: 5초 이내 완료
2. 캐시 재분석: 1초 이내
3. 클러스터 API 응답: 5KB 이내 (500+ 노드 그래프에서)
4. 전체 그래프 API 응답: 합리적 크기

**테스트 파일:** `packages/core/src/__tests__/performance.test.ts`

## Implementation Steps

### Step 1: Core Unit Tests (누락된 핵심 모듈)
- ParseCache: 10개 테스트
- ParallelParser: 5개 테스트
- CrossBoundaryResolver: 8개 테스트
- MyBatisLinker: 5개 테스트

### Step 2: Integration Test (전체 파이프라인)
- fixture 프로젝트 분석 → 전체 의존성 체인 검증
- Vue→API→Spring→MyBatis→DB 체인 E2E

### Step 3: Server API Tests
- Fastify inject()로 HTTP 요청 시뮬레이션
- 모든 API 엔드포인트 정상/에러 응답 검증

### Step 4: Performance Benchmarks
- test-project (500 파일) 기반 성능 측정
- 캐시 효과 검증

## Implementation Order
Step 1 → Step 2 → Step 3 → Step 4

## Verification
- `npx -w @vda/core vitest run` — 모든 core 테스트 통과
- `npx -w @vda/server vitest run` — 모든 server 테스트 통과 (신규)
- 총 테스트 수: 73 기존 + ~60 신규 = 130+ 목표
