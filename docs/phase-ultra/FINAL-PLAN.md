# Phase-Ultra Final Plan

> 작성일: 2026-04-18
> 브랜치: `feature/ultra-phase`
> 근거 문서:
> - `docs/phase-ultra/large-scale-optimization-plan_final.md`
> - `docs/phase-ultra/final-review-opinion.md`
> - `docs/phase-ultra/developer-painpoint-analysis.md`
> - 3 전문가 리뷰 (algorithm / frontend-lead / performance)

---

## 0. 범위 결정 (인터뷰 결과)

| 결정 | 확정 |
|---|---|
| 전체 범위 | **Phase-Ultra 0~3 (G6 PoC 제외) + F1 DTO Consistency 완성** |
| Phase 6 P1 (warm-cache db-table 유실) | **Phase 0 에 포함** |
| G6 v5 PoC | **보류** — Cytoscape 최적화(데이터 감축 + LOD + Louvain 중간 줌) 끝까지 |
| F 시리즈 | **F1 만** — `dto-flows` 엣지 미구현 상태 해결 (완성 부채) |

### 명시적 불변 사항 (Do-Not-Touch)
- Sigma.js 단독 이관 폐기 (compound node 부재)
- HTTP/2 Server Push 불사용
- MessagePack 불도입
- 자동 스크롤 기반 semantic zoom 금지 (명시적 드릴다운만)
- WebGL 은 Graph 뷰 한정
- `@sigma/vue` 사용 금지 (자체 composable 원칙)

---

## 1. Phase 구조

```
Phase 0  (3-5d)  긴급 버그 · 정합성 회복
Phase 1  (1-2w)  서버 직렬화 · 전송 최적화
Phase 2  (2-3w)  캐시·쿼리 구조 개선
Phase 3  (2-3w)  Cytoscape 데이터 감축 + 중간 줌 계층
Phase 4  (1-2w)  F1 DTO Consistency 완성 (성능과 독립 트랙)
Phase 5  (상시)  CI 벤치 게이트 · /api/admin/metrics · 회귀 방지
```

백엔드/쿼리와 프론트 작업은 Phase 0·1·2 내부에서 **파일 단위로 분리 가능**. 본 플랜은 단일 실행자 기준이므로 Phase 순차 진행.

---

## 2. Phase 0 — 긴급 버그 · 정합성 회복 (3-5일)

### 체크리스트

| # | 항목 | 파일 | 위험 완화 |
|---|---|---|---|
| 0-1 | `engine.ts:160-172` O(n*m) 캐시 저장 루프 재작성 | `packages/server/src/engine.ts` | 파일→노드 선인덱싱, `readFileSync` 중복 제거 |
| 0-2 | `query.ts reachableFrom` BFS `shift()` → 인덱스 큐 | `packages/core/src/graph/query.ts:31-62` | O(n²) → O(n+m) |
| 0-3 | `query.ts findPaths` `path.includes()` → Set + 결과 캡(기본 100) | `packages/core/src/graph/query.ts:97-128` | 최악 O(n!) 완화 |
| 0-4 | `ForceGraphView.vue:510-512` document listener 누수 해결 | `packages/web-ui/src/components/graph/ForceGraphView.vue:500-538` | `onUnmounted` 에 `removeEventListener` |
| 0-5 | Docker `--max-old-space-size=2048` 적용 + 컨테이너 메모리 3GB+ 권장 명시 | `Dockerfile`, `docker-compose.yml` | V8 heap 212MB 감안 OOMKill 방지 |
| 0-6 | **Phase 6 P1: warm-cache 시 db-table 노드 유실 회귀 테스트 + 임시 fix** | `packages/core/src/engine/ParseCache.ts`, `packages/core/src/linkers/MyBatisLinker.ts` 또는 `packages/server/src/engine.ts` | SQLite 전환 전에 정합성 보장 |

### Phase 0 종료 조건 (게이트)
- `npx -w @vda/core vitest run` 전 테스트 green + 신규 회귀 테스트 (warm-cache db-table ≥ 1 유지)
- `node packages/cli/dist/bin/vda.js analyze test-project-ecommerce` 2회 연속 실행 시 노드 수·엣지 수 완전 일치
- `ForceGraphView` 마운트/언마운트 10회 반복 시 document listener 카운트 누적 없음 (수동)

---

## 3. Phase 1 — 서버 직렬화 · 전송 최적화 (1-2주)

### 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 1-1 | `@fastify/compress` **brotli quality 4** 도입 (gzip 폴백) + 1KB 미만 skip | `packages/server/src/index.ts` (Fastify 등록부), routes |
| 1-2 | Fastify route schema 도입 → `fast-json-stringify` 자동 활성화 | `packages/server/src/routes/*.ts` |
| 1-3 | `/api/graph` `toJSON()` dirty-flag 캐시 + ETag + Cache-Control (graph 변이 시에만 무효화) | `packages/server/src/routes/graphRoutes.ts`, `packages/core/src/graph/DependencyGraph.ts` |
| 1-4 | `refreshGraph()` 전체 remove+add → Cytoscape `eles.diff()` 증분 업데이트 | `ForceGraphView.vue` (`refreshGraph`) |
| 1-5 | Tree View `svg.selectAll('*').remove()` → D3 `join()` 패턴 | `packages/web-ui/src/components/.../TreeView.vue` |
| 1-6 | `DependencyGraph.getAllNodes()` iterator 버전 추가 (hot path 회피) | `packages/core/src/graph/DependencyGraph.ts` |
| 1-7 | `cytoscape-canvas` 오버레이 레이어 분리 (저비용 개선) | `ForceGraphView.vue` overlay 관련 |

### Phase 1 종료 조건
- `/api/graph` 응답 사이즈 벤치 (500 파일 기준) 이전 대비 -80% 이상
- Lighthouse/수동으로 TTFB 개선 수치 1건 이상 기록
- 모든 기존 테스트 green

---

## 4. Phase 2 — 캐시·쿼리 구조 개선 (2-3주)

### 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 2-1 | `ParseCache` JSON → **better-sqlite3 (WAL, synchronous=NORMAL, mmap 256MB)** | `packages/core/src/engine/ParseCache.ts` + 마이그레이션 스크립트 |
| 2-2 | Worker Pool + Transferable Objects 도입, config-once 초기화 | `packages/core/src/engine/ParallelParser.ts` |
| 2-3 | Progressive Disclosure API: `/api/graph/overview`, `/api/graph/service/:id`, `/api/graph/directory?path=`, 기존 `/api/graph/node` | `packages/server/src/routes/graphRoutes.ts` + 클라이언트 대응 |
| 2-4 | `DependencyGraph` 인덱스 추가: `getEdgesByKind(kind)`, `getInDegree(id)`, `getOutDegree(id)` | `packages/core/src/graph/DependencyGraph.ts` |
| 2-5 | `CrossBoundaryResolver` 의 `getAllEdges().filter(kind === X)` 패턴 제거 → 2-4 인덱스 사용 | `packages/core/src/linkers/CrossBoundaryResolver.ts` |
| 2-6 | `ParallelParser` 노드 metadata 에 `serviceId` 주입 (MSA 파티셔닝 선행조건) | `packages/core/src/engine/ParallelParser.ts` |
| 2-7 | `DependencyGraph.removeByFile()` 1-hop 역의존성 재범위화 (캐시 무효화 정확도) | `packages/core/src/graph/DependencyGraph.ts` |
| 2-8 | `graphStore.ts` 4-way split: data / filter / interaction / overlay | `packages/web-ui/src/stores/graphStore.ts` |
| 2-9 | `graphStore` metadata HiddenClass 안정화 (Record→typed shape) | `packages/web-ui/src/stores/graphStore.ts`, `types/` |

### Phase 2 종료 조건
- Cold 분석 (test-project-ecommerce) 이전 대비 -30% 이상
- Warm 분석 이전 대비 -50% 이상
- Server heap 피크 -200MB 이상 (`/api/admin/metrics` 로 측정)
- `/api/graph/overview` 응답 <5KB

---

## 5. Phase 3 — Cytoscape 최적화 유지 (2-3주)

G6 PoC 를 보류했으므로 "Cytoscape 안에서" 15K-20K 파일 규모를 감당한다.

### 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 3-1 | Louvain 커뮤니티 탐지 도입 (`graphology-communities-louvain`) | `packages/core/src/analyzers/` 신규 |
| 3-2 | 중간 줌 계층을 directory 아닌 Louvain 커뮤니티로 | `packages/server/src/routes/graphRoutes.ts` (cluster endpoint), `ForceGraphView.vue` |
| 3-3 | 3-단계 레이아웃: Spectral init → FA2 theta=1.0 fast → FA2 theta=0.5 fine (취소 가능) | `ForceGraphView.vue` layout 교체 |
| 3-4 | 명시적 드릴다운 Semantic Zoom (더블클릭 전용) — 자동 스크롤 트리거 **없음** | `ForceGraphView.vue`, `graphStore` interaction |
| 3-5 | Matrix View HTML table → Canvas 2D heatmap | `MatrixView.vue` |
| 3-6 | BottomUp View `vue-virtual-scroller` 도입 | `BottomUpView.vue` |
| 3-7 | Tree View Canvas 2D(graphical) + `vue-virtual-scroller`(explorer) 하이브리드 | `TreeView.vue` |
| 3-8 | Vite `manualChunks`: graph-engine / d3-tree / vue-vendor / virtual-scroll 분할 | `packages/web-ui/vite.config.ts` |

### Phase 3 종료 조건
- 5K 노드 브라우저 초기 렌더 <2s
- 필터 변경 <200ms
- 번들 크기 chunk 당 <500KB

---

## 6. Phase 4 — F1 DTO Consistency 완성 (1-2주)

### 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 4-1 | Vue TS interface → Spring DTO → MyBatis ResultMap → DB column 필드 단위 연결 | `packages/core/src/linkers/DtoFlowLinker.ts` |
| 4-2 | `dto-flows` 엣지 실제 생성 (현재 타입만 정의됨) | `packages/core/src/linkers/DtoFlowLinker.ts`, `packages/core/src/types.ts` |
| 4-3 | `DtoConsistencyChecker` 강화: 필드 누락·타입 불일치·nullable 불일치 검출 | `packages/core/src/analyzers/DtoConsistencyChecker.ts` |
| 4-4 | Java `record`, `@JsonProperty`, Bean Validation 어노테이션 파싱 확장 | `packages/core/src/parsers/java/JavaFileParser.ts` |
| 4-5 | `DtoConsistencyPanel` UI 에서 위반 → 해당 소스 snippet 링크 | `packages/web-ui/src/components/DtoConsistencyPanel.vue` |
| 4-6 | 테스트 픽스처: Vue↔Spring↔DB 3-tier DTO 불일치 케이스 3종 | `packages/core/src/__tests__/` |

### Phase 4 종료 조건
- 테스트 픽스처 3건 모두 올바르게 불일치 검출
- 기존 145 테스트 green 유지

---

## 7. Phase 5 — 회귀 방지 (상시 · Phase 1 시작 시 기반 마련)

- `/api/admin/metrics`: heap, RSS, GC pause, lastAnalysisDuration, nodeCount, edgeCount
- CI benchmark gate: 초기 **경고 모드** (PR comment only), 3회 연속 회귀 확인 시 블로킹
- Performance budget lint rule: `getAllNodes()` in loops, `readFileSync` in hot paths, large-array spread 금지

---

## 8. 리스크 요약

| # | 리스크 | 대응 |
|---|---|---|
| R1 | SQLite 멀티 프로세스 쓰기 | WAL + 단일 writer (main) 원칙, worker 는 read-only |
| R2 | brotli streaming flush 약함 → NDJSON 은 이번 범위 밖 (Phase 4/5 별도) | Phase 4/5 로 이동, 본 계획에서는 batched 응답만 |
| R3 | Phase 3 에서 Cytoscape 한계 초과 감지 | 발견 즉시 별도 결정 포인트 — G6 PoC 재검토 혹은 데이터 감축 강화 |
| R4 | Docker 메모리 3GB 미보장 환경 | 분석 시작 시 `process.memoryUsage()` 프리체크, 부족 시 명시적 실패 |
| R5 | P1 버그(db-table warm) 수정이 SQLite 전환 후 재발 | SQLite 마이그레이션 후에도 회귀 테스트 green 유지 조건 |

---

## 9. 각 Phase 의 commit / PR 단위

- Phase 0 은 **하나의 PR 에 6개 커밋** (항목 0-1 ~ 0-6)
- Phase 1~4 는 **체크리스트 항목마다 독립 커밋**
- Phase 종료 조건 통과 전까지 머지하지 않음 (로컬 머지는 가능, origin push 는 조건 통과 후)

---

## 10. 본 계획에서 명시적으로 제외된 항목 (향후 논의)

- G6 v5 PoC (Phase 2.5)
- Ogma 상용 도입
- NDJSON streaming
- 자동 semantic zoom
- F2 Entrypoint-aware Orphan (Orphan 재정의는 시맨틱 변경 — 별도 인터뷰 필요)
- F3 Layer DSL (신규 문법 설계 — 별도 논의)
- F4~F15 모든 신규 기능 (painpoint 문서 별도 로드맵)

이 계획은 Phase-Ultra 완료 후 Phase 7 로드맵(painpoint 분석 기반)을 재개방할 때 다시 평가한다.
