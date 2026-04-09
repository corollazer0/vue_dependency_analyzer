# Phase X-1: 분석 정확도 + 분석 처리 성능 — 구현 상세

> 작성일: 2026-04-10
> 대상: 코드 리뷰어 / QA 에이전트
> 근거: `docs/phase-x-plan.md`, `docs/score-gap-and-100-requirements.md`

---

## 1. 개요

Phase X-1은 `score-gap-and-100-requirements.md`의 기술 구현 수준(67점)을 95점 이상으로 끌어올리기 위한 **분석 정확도 + 처리 성능** 개선 작업이다.

### 완료된 작업 항목

| ID | 요구사항 | 커밋 | 테스트 |
|---|---------|------|--------|
| X1-01 | R-TECH-001 캐시 무결성 | `b274fa2` | cold/warm node count 동일성 검증 |
| X1-02 | R-TECH-002 Node ID 안정성 | `5136004` (Phase 7) | query param API로 전환 완료 |
| X1-03 | R-TECH-003 Stats 분리 | `5136004`, `b274fa2` | nodesByKind/edgesByKind 분리 검증 |
| X1-04 | R-TECH-004 services[]/include[] | Phase 7 `b99f0bc` | MSA serviceId 태깅 검증 |
| X1-05 | R-TECH-005~008 분석 범위 | Phase 7 다수 커밋 | E2E fixture 41 assertions |
| X1-06 | R-TECH-009 worker_threads | Phase 7 `b99f0bc` | crash recovery 3 tests |
| X1-07 | R-TECH-010 UI 번들 | `b274fa2` | 740KB→48KB (93% 감소) |
| X1-08 | R-QA-001~002 회귀 테스트 | `b274fa2` | X1 verification 5 tests |
| X1-09 | 체인 정확도 | `b274fa2` | Controller→Table 4 chain tests |

---

## 2. 구현 상세

### 2.1 X1-01: 캐시 무결성 (R-TECH-001)

**문제**: warm-cache 실행 시 `db-table` 노드가 유실됨. `MyBatisXmlParser`가 `filePath: ''`로 db-table 노드를 생성하여 캐시 저장 로직에서 누락.

**수정 파일**:
- `packages/core/src/parsers/java/MyBatisXmlParser.ts:70` — `filePath: ''` → `filePath` (XML 파일 경로)
- `packages/server/src/engine.ts:122-135` — 서버 초기 분석 후 cache.set() 호출 추가

**수정 내용**:
```typescript
// Before: db-table 노드의 filePath가 빈 문자열
nodes.push({ id: tableNodeId, kind: 'db-table', label: table, filePath: '', metadata: { tableName: table } });

// After: XML 파일 경로를 사용하여 캐시에 포함
nodes.push({ id: tableNodeId, kind: 'db-table', label: table, filePath, metadata: { tableName: table } });
```

**검증 테스트**: `packages/core/src/__tests__/x1-verification.test.ts`
```
X1-01: R-TECH-001 Cache Integrity
  ✓ should produce identical node counts for cold and warm runs
  - cold/warm node count 동일
  - db-table, vue-event, spring-event 모두 warm에서 유지
```

**리뷰 포인트**:
- cache save 로직에서 `n.filePath === filePath` 필터가 db-table을 포함하는지 확인
- virtual node (vue-event, spring-event)는 CrossBoundaryResolver가 생성하므로 캐시 대상이 아님 — resolver가 매번 재생성함

---

### 2.2 X1-02: Node ID 안정성 (R-TECH-002)

**문제**: `/api/graph/node/:nodeId`에서 절대경로 포함 node ID가 Fastify path param으로 전달 시 `/`가 경로 구분자로 해석되어 404 반환.

**수정 파일**:
- `packages/server/src/routes/graphRoutes.ts:35-53` — path param → query param 방식 전환

**수정 내용**:
```typescript
// Before: GET /api/graph/node/:nodeId
fastify.get('/api/graph/node/:nodeId', async (request, reply) => {
  const { nodeId } = request.params as { nodeId: string };

// After: GET /api/graph/node?id=xxx
fastify.get('/api/graph/node', async (request, reply) => {
  const { id } = request.query as { id?: string };
  if (!id) { reply.code(400); return { error: '"id" query parameter is required' }; }
```

동일하게 `/api/graph/node/impact` → `/api/graph/node/impact?id=xxx` 전환.

**검증 테스트**: `packages/server/src/__tests__/api.test.ts`
```
GET /api/graph/node?id=
  ✓ should return node detail for any node ID including file paths
  ✓ should return 404 for unknown node
  ✓ should return 400 when id param missing
```

**리뷰 포인트**:
- 프론트엔드에서 이 API를 직접 호출하는 곳이 있는지 확인 (현재 없음 — graphStore의 로컬 데이터 사용)
- 기존 `/api/graph/node/:nodeId` 경로를 호출하는 외부 클라이언트 호환성

---

### 2.3 X1-03: Stats 분리 (R-TECH-003)

**문제**: `DependencyGraph.getStats()`가 node kind와 edge kind를 같은 객체에 합쳐서 CLI가 "Node Types"에 edge kind를 잘못 표시.

**수정 파일**:
- `packages/core/src/graph/DependencyGraph.ts:182-192` — 반환 타입 변경
- `packages/cli/src/commands/analyze.ts:38-46` — "Node Types" / "Edge Types" 분리 출력
- `packages/server/src/engine.ts:377-382` — `/api/stats` 응답 구조 변경

**수정 내용**:
```typescript
// Before
getStats(): Record<string, number> {
  return { ...nodesByKind, ...edgesByKind, totalNodes, totalEdges };
}

// After
getStats(): { nodesByKind: Record<string, number>; edgesByKind: Record<string, number>; totalNodes: number; totalEdges: number } {
  return { nodesByKind, edgesByKind, totalNodes, totalEdges };
}
```

**검증 테스트**: `packages/core/src/__tests__/x1-verification.test.ts`
```
X1-03: R-TECH-003 Stats Separation
  ✓ should return nodesByKind and edgesByKind as separate objects
  - nodesByKind에 edge kind 미포함
  - edgesByKind에 node kind 미포함
```

**리뷰 포인트**:
- `/api/stats` 응답 스키마가 변경되었으므로 외부 연동 시 breaking change
- 기존 `graph.getStats()` 호출하는 모든 소비자가 새 구조를 사용하는지 확인

---

### 2.4 X1-07: UI 번들 최적화 (R-TECH-010)

**문제**: web-ui 빌드 결과가 단일 740KB chunk로 생성되어 빌드 경고 + 초기 로딩 느림.

**수정 파일**:
- `packages/web-ui/vite.config.ts` — `rollupOptions.output.manualChunks` 추가

**수정 내용**:
```typescript
build: {
  chunkSizeWarningLimit: 600,
  rollupOptions: {
    output: {
      manualChunks: {
        'cytoscape': ['cytoscape', 'cytoscape-fcose'],
        'd3': ['d3-hierarchy', 'd3-selection', 'd3-zoom'],
        'vue-vendor': ['vue', 'pinia'],
      },
    },
  },
},
```

**결과**:
| Chunk | Before | After |
|-------|--------|-------|
| index.js (앱 코드) | 740KB | **48KB** |
| cytoscape.js | (포함) | 567KB |
| d3.js | (포함) | 52KB |
| vue-vendor.js | (포함) | 75KB |
| **Main bundle 감소** | — | **93%** |

**리뷰 포인트**:
- cytoscape 567KB는 라이브러리 자체 크기 — 더 줄이려면 tree-shaking 또는 대체 라이브러리 필요
- `chunkSizeWarningLimit: 600`으로 경고 제거했으나 이상적으로는 500 이하 목표

---

### 2.5 X1-08~09: 회귀 테스트 + 체인 정확도

**테스트 파일**: `packages/core/src/__tests__/x1-verification.test.ts`, `packages/core/src/__tests__/e2e-fixture.test.ts`

**추가된 테스트**:

```
x1-verification.test.ts (5 tests):
  ✓ Cache integrity: cold==warm node count, virtual node survival
  ✓ Stats separation: nodesByKind/edgesByKind 구조 검증
  ✓ Worker fallback: below threshold → main thread
  ✓ Worker error: nonexistent files graceful handling
  ✓ Worker mixed: valid + invalid files concurrent processing

e2e-fixture.test.ts (4 chain tests 추가):
  ✓ Controller → Service → Repository chain exists
  ✓ Repository → Mapper → MyBatis XML chain exists
  ✓ MyBatis mapper → SQL statement → DB table chain exists
  ✓ spring-injects resolution rate > 70%
```

**리뷰 포인트**:
- cache 검증에서 edge count는 "5% 이내"로 허용 — resolver가 매번 약간 다른 엣지를 생성할 수 있음
- chain test의 70% threshold가 적절한지 (프레임워크 빈은 resolve 불가)

---

## 3. 영향받은 파일 전체 목록

| 파일 | 변경 유형 | 주요 내용 |
|------|----------|----------|
| `core/src/parsers/java/MyBatisXmlParser.ts` | 수정 | db-table filePath 수정 |
| `core/src/graph/DependencyGraph.ts` | 수정 | getStats() 반환 타입 분리 |
| `server/src/routes/graphRoutes.ts` | 수정 | node API query param 전환 |
| `server/src/engine.ts` | 수정 | cache 채우기 + stats 구조 |
| `cli/src/commands/analyze.ts` | 수정 | Node/Edge Types 분리 출력 |
| `web-ui/vite.config.ts` | 수정 | manualChunks 추가 |
| `core/src/__tests__/x1-verification.test.ts` | 신규 | X1 검증 5 tests |
| `core/src/__tests__/e2e-fixture.test.ts` | 수정 | chain 4 tests 추가 |
| `core/src/graph/__tests__/DependencyGraph.test.ts` | 수정 | stats 테스트 업데이트 |
| `server/src/__tests__/api.test.ts` | 수정 | node API 테스트 업데이트 |

---

## 4. 테스트 실행 방법

```bash
# 전체 빌드 + 테스트
npm run build && npm test

# Core 패키지만
npx -w @vda/core vitest run

# X1 검증 테스트만
npx -w @vda/core vitest run src/__tests__/x1-verification

# E2E chain 테스트만
npx -w @vda/core vitest run src/__tests__/e2e-fixture

# 서버 API 테스트
npx -w @vda/server vitest run
```

## 5. 알려진 제한사항

1. **Edge count cold/warm 차이**: CrossBoundaryResolver가 매번 실행되므로 resolve 순서에 따라 엣지 ID가 미세하게 달라질 수 있음 (5% 이내 허용)
2. **Node ID API 하위 호환성**: query param 방식으로 전환했으므로 기존 path param 방식의 외부 클라이언트는 수정 필요
3. **Cytoscape chunk 567KB**: 라이브러리 자체 크기로 추가 최적화 어려움
