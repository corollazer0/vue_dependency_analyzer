# VDA 대규모 프로젝트 최적화 최종 계획서

> 작성일: 2026-04-18
> 버전: FINAL (7개 문서 종합 반영)
> 대상: 15,000~20,000 파일 규모 Vue + Spring Boot MSA 프로젝트
> 반영 문서:
>   - large-scale-optimization-plan.md (초기 계획)
>   - review-frontend-lead.md (프론트엔드 리드 리뷰)
>   - review-algorithm-expert.md (알고리즘 전문가 리뷰)
>   - review-performance-expert.md (성능 전문가 리뷰)
>   - rendering-library-review.md (렌더링 라이브러리 재검토)
>   - view-specific-library-strategy.md (뷰별 패키지 분리 전략)
>   - graph-visualization-comprehensive-review.md (외부 에이전트 종합 리뷰)

---

## 1. 목표 스펙

| 항목 | 수치 |
|------|------|
| 분석 대상 파일 수 | 15,000~20,000 (.vue 6K + .js 6K + .java/.kt 3.3K + .xml 등) |
| MSA 서비스 수 | 11개 (서비스당 ~300 파일) + 1 Frontend |
| 예상 노드 수 | 50,000~75,000 |
| 예상 엣지 수 | 100,000~300,000 |
| 실제 V8 힙 사용량 | **~212MB** (초기 계획 37MB에서 상향 수정) |
| 브라우저 렌더링 목표 | 60fps (뷰포트 내 노드 기준) |
| API 초기 응답 목표 | <100ms (Progressive Disclosure) |

---

## 2. 현재 코드의 긴급 수정 사항 (Phase 0)

3명의 전문가가 공통으로 지적한 **기존 코드 버그/비효율**. 대규모 전환보다 먼저 수정해야 하며, 코드 변경량 대비 효과가 가장 크다.

### 2-1. engine.ts 캐시 저장 O(n x m) → O(n+m) [성능 전문가]

**현재**: `result.nodes.filter(n => n.filePath === filePath)`를 20K 파일마다 반복 → 20K x 75K = **15억 번 비교**

```typescript
// 수정: 사전 그룹화로 O(n+m)
const nodesByFile = new Map<string, GraphNode[]>();
for (const node of result.nodes) {
  const arr = nodesByFile.get(node.filePath) ?? [];
  arr.push(node);
  nodesByFile.set(node.filePath, arr);
}
```

**효과**: 수십 초 → 수백 밀리초

### 2-2. query.ts BFS의 Array.shift() → 인덱스 기반 큐 [알고리즘 전문가]

**현재**: `queue.shift()`가 O(n) → BFS 전체 O(n²)

```typescript
// 수정: 인덱스 기반
let front = 0;
while (front < queue.length) {
  const { id, depth } = queue[front++];
  // ...
}
```

**효과**: 75K 노드 BFS가 O(n²) → O(n+m)

### 2-3. query.ts findPaths() 경로 폭발 + Set 미사용 [알고리즘 전문가]

- `path.includes()` → `Set` 교체 (O(path.length) → O(1))
- 결과 경로 수에 상한 추가 (예: 100개)

### 2-4. ComplexityScorer 배열 할당 [알고리즘 전문가]

- `getInEdges().length` → `getInDegree()` 메서드 추가 (배열 생성 없이 차수만 반환)

### 2-5. ForceGraphView.vue 이벤트 리스너 누수 [프론트엔드 리드]

- `onMounted`(510행)의 `document.addEventListener`에 대응하는 `onUnmounted` cleanup 추가

### 2-6. refreshGraph() 증분 업데이트 [프론트엔드 리드]

**현재**: `cy.elements().remove() + cy.add(전체)` → 클러스터 확장/축소마다 전체 재빌드

**수정**: diff 기반 증분 업데이트 또는 Cytoscape `eles.diff()` 활용

---

## 3. 렌더링 라이브러리 전략 (최종 결정)

### 3-1. 핵심 딜레마와 해결

**"대규모 렌더링 성능"과 "Compound Node 지원"을 동시에 만족하는 OSS 단일 솔루션은 없다.**

```
                     성능 (노드 수)
                        ↑
        cosmos.gl ──────┼───── Sigma.js v3
        (1M+, 기능 빈약)    |   (50K, compound 없음)
                        |
    ────────────────────┼──────────────── Compound Node 필요
                        |
        G6 v5 ──────────┼───── Cytoscape.js
        (60K+ WebGL,    |   (5K 한계, 기능 완벽)
         Combo 지원)    |
                        ↓
                    기능 풍부
```

### 3-2. 확정 전략: Cytoscape 유지 + G6 v5 PoC + Ogma Plan B

| 단계 | 라이브러리 | 결정 근거 |
|------|-----------|----------|
| **현재~Phase 2** | Cytoscape.js 유지 | 마이그레이션 비용 0, compound node 완벽, Progressive Disclosure로 뷰포트 내 노드 3K~5K 유지 |
| **Phase 2.5 (PoC)** | G6 v5 WebGL + Combo | 2026년 최유력 OSS 후보. Compound + WebGL + MIT + Vue 공식 지원. Rust/WASM 레이아웃 |
| **Phase 3 (PoC 성공 시)** | G6 v5 전면 전환 | ForceGraphView.vue 재작성 (~85%, 단일 파일 범위) |
| **Phase 3 (PoC 실패 시)** | Cytoscape 유지 + 공격적 컬링 또는 Ogma 상용 검토 | Ogma: WebGL + Grouping + Vue 3 공식 wrapper |

**Sigma.js는 하향 조정**:
- compound node 미지원 → 클러스터 확장 UX가 현저히 달라짐
- SVG 내보내기 불가
- 프론트엔드 리드, 외부 리뷰어 모두 리스크 지적

### 3-3. 뷰별 독립 패키지 전략 (확정)

4개 뷰가 이미 각각 다른 렌더링 기술을 사용하며, 결합은 graphStore의 reactive ref를 통해서만 발생. **독립 패키지 사용이 타당할 뿐 아니라 권장.**

```
┌────────────────────────────────────────────────────────┐
│                   graphStore (Pinia)                     │
│  selectedNodeId, focusNodeId, filteredNodes/Edges        │
└───────┬──────────┬──────────┬──────────┬───────────────┘
        │          │          │          │
   ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌───▼─────┐
   │ Graph  │ │  Tree  │ │Matrix│ │BottomUp │
   │  View  │ │  View  │ │ View │ │  View   │
   ├────────┤ ├────────┤ ├──────┤ ├─────────┤
   │Cytoscape│ │D3-hier │ │Canvas│ │vue-virt │
   │→ G6 v5 │ │+Canvas │ │  2D  │ │-scroller│
   └────────┘ └────────┘ └──────┘ └─────────┘
    WebGL/     Canvas      Canvas     DOM
    Canvas                            가상화
```

| 뷰 | 현재 | Phase 3 이후 | 근거 |
|----|------|-------------|------|
| **Graph** | Cytoscape.js | G6 v5 (or Cytoscape 유지) | 네트워크 그래프에 최적화된 렌더러 필요 |
| **Tree** | D3 SVG (전체 재렌더) | D3 레이아웃 + Canvas 2D + 뷰포트 컬링 | SVG 5K 한계 돌파, 50K 노드 대응 |
| **Matrix** | HTML `<table>` | Canvas 2D 히트맵 | 수백 모듈 시 DOM 과부하 방지 |
| **BottomUp** | 재귀 Vue 컴포넌트 | vue-virtual-scroller + 트리 플래트닝 | 깊은 트리 스택 오버플로 방지 |

---

## 4. 레이아웃 알고리즘 전략 (수정)

### 4-1. 복잡도 정정

| 알고리즘 | 초기 계획 | 정정된 복잡도 | 75K 노드 추정 시간 |
|---------|----------|-------------|-------------------|
| fcose (quality) | O(n²) | O(n² x iter) — 정확 | 수 분 (사용 불가) |
| fcose (draft) | 미고려 | O(n+m) spectral + 짧은 반복 | 수십 초 (차선) |
| ForceAtlas2 (BH) | O(n log n) | O(n log n + m) per iter — 정확 | 1~3초 (WebWorker) |
| Sugiyama | O(n x m) | **O(L x n x m)** — 과소평가됨 | 10초+ (비현실적) |
| Treemap | O(n) | O(n log n) | <1초 |

### 4-2. 3단계 레이아웃 전략 [알고리즘 전문가 제안]

```
Phase 1: Spectral layout 초기 배치 (O(n+m), ~100ms)
    → Graph Laplacian의 Fiedler vector로 수학적 최적 2D 배치
Phase 2: ForceAtlas2 (θ=1.0) fast refinement (200 iter, ~500ms)
    → Barnes-Hut 근사, 빠른 수렴
Phase 3: ForceAtlas2 (θ=0.5) fine refinement (점진적, 사용자 중단 가능)
    → 고품질 최종 레이아웃
```

**추가 제안**: ELK.js (Sugiyama/layered)를 대안 레이아웃으로 제공. VDA의 의존성 그래프는 본질적으로 DAG이므로 계층 레이아웃이 더 적합한 경우가 많다.

### 4-3. 누락된 핵심 알고리즘 (추가)

#### Louvain 커뮤니티 디텍션

Semantic Zoom 중간 레벨을 디렉토리 구조 대신 **의존성 기반 클러스터**로 생성:

```
줌 레벨 0.0~0.2: MSA 서비스 클러스터 (12개)
줌 레벨 0.2~0.5: Louvain 커뮤니티 (50~100개) — 의존성 기반 ← 신규
줌 레벨 0.5~1.0: 개별 파일 노드
```

라이브러리: `graphology-communities-louvain` (Graphology 생태계)

#### 그래프 코어세닝 (Multi-level Layout)

```
G₀ (75K) → coarsen → G₁ (15K) → G₂ (3K) → G₃ (600)
    ← uncoarsen + refine ← ... ← layout G₃ (~100ms)
총 레이아웃 시간: O(n log n), 단일 레벨 FA2보다 극적 향상
```

#### Spectral Sparsification

줌 아웃 시 엣지 수를 O(n log n)으로 축소하여 시각적 혼잡 감소. Spielman-Srivastava 알고리즘: O(m log n).

### 4-4. 점진적 레이아웃 안정성 [알고리즘 전문가]

부분 그래프 변경 시 전체 재계산 없이 안정적으로 동작하려면:

1. **Pinning**: 기존 노드에 약한 spring force 추가 `f_pin = α·||x - x_old||², α ≪ 1`
2. **변경 비율 임계값**: `k/n > 0.1`이면 전체 재계산으로 폴백
3. **에너지 모니터링**: `|ΔE/E| > 0.2`이면 전체 재계산 트리거

---

## 5. 백엔드 최적화 (수정)

### 5-1. V8 메모리 (수정된 추정) [성능 전문가]

```
노드 객체: 75,000 x 584B = 43.8MB
엣지 객체: 300,000 x 438B = 131.4MB
Map/Set 인덱스:              52.4MB
문자열 중복 제거:            -15.0MB
────────────────────────────────────
합계: ~212MB (계획 37MB의 5.7배)
```

**대응**: `--max-old-space-size=2048`, Docker 메모리 3GB 제한 설정

### 5-2. 캐시 SQLite 전환 (보완) [성능 전문가]

| 연산 | JSON 파일 | SQLite (WAL) |
|------|-----------|-------------|
| 전체 로드 (cold) | 5~10초 | 해당 없음 (lazy) |
| 개별 파일 조회 | O(1) Map (로드 후) | ~0.3ms |
| 전체 저장 | 3~8초 | ~2초 (벌크 INSERT) |
| 메모리 사용량 | ~500MB (전체 in-memory) | ~50MB (page cache) |

**주의사항**:
- WAL 모드 필수 (`PRAGMA journal_mode = WAL`)
- 워커에서는 읽기 전용으로 열기
- Alpine + ARM64에서 빌드 이슈 가능 → Debian slim 권장
- 벌크 조회 시 `SQLITE_MAX_VARIABLE_NUMBER` (기본 999) 제한 주의

### 5-3. 워커 풀 도입 [성능 전문가]

| 항목 | 현재 | 개선 |
|------|------|------|
| 워커 생성 | 매 분석마다 8개 생성/파괴 | 풀 재사용 |
| 생성 비용 | 500~800ms | 0ms (2회차 이후) |
| config 전송 | 모든 task에 중복 포함 | 초기화 시 1회 |
| content 전송 | structured clone | Transferable Objects (zero-copy) |

### 5-4. 그래프 자료구조 개선

#### 노드 메타데이터 분리 (Flyweight) + 구조화 [성능 전문가]

```typescript
// metadata를 구조화된 타입으로 (V8 HiddenClass 공유)
interface NodeMetadata {
  serviceId?: string;
  httpMethod?: string;
  urlPattern?: string;
  extra?: Record<string, unknown>;
}
```

#### 엣지 종류별 인덱스 [알고리즘 전문가]

```typescript
// 노드-레벨 + 글로벌 레벨 이중 인덱스
adjacencyByKind: Map<nodeId, Map<EdgeKind, Set<edgeId>>>
edgesByKind: Map<EdgeKind, Set<edgeId>>  // 글로벌 인덱스
```

+ `DependencyGraph`에 추가 메서드:
- `getEdgesByKind(kind)`: 전체 그래프에서 해당 종류만
- `getOutEdgesByKind(nodeId, kind)`: 특정 노드의 특정 종류
- `getInDegree(nodeId)` / `getOutDegree(nodeId)`: 배열 할당 없이 차수 반환

CrossBoundaryResolver의 `getAllEdges().filter()` 패턴을 위 메서드로 교체 → 6단계 x O(m) → 6 x O(k)

#### 서비스 단위 파티셔닝

- MSA 경계를 1차 파티션 (12개)
- 서비스 내부 300+ 노드 시 Louvain 커뮤니티 디텍션으로 2차 파티셔닝
- METIS는 불필요 (MSA 경계가 자연스러운 파티션)

### 5-5. API 최적화

#### 압축: brotli 우선 [성능 전문가]

```typescript
await fastify.register(compress, {
  brotliOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } },
  encodings: ['br', 'gzip'],  // brotli quality 4가 gzip level 6보다 빠르고 작음
  threshold: 1024,
});
```

#### Progressive Disclosure API (확정)

```
GET /api/graph/overview       → 서비스 클러스터 12개 (<5KB)
GET /api/graph/service/:id    → 서비스 내부 ~300 노드 (~60KB)
GET /api/graph/directory/:path → 디렉토리 내부 노드
GET /api/graph/node/:id       → 개별 노드 상세 (metadata 포함)
```

#### 직렬화 최적화

- `toJSON()` 결과를 dirty flag 기반 캐시
- Fastify route schema 정의 → `fast-json-stringify` 자동 적용 (50~60% 단축)
- ETag + `Cache-Control: private, max-age=30, stale-while-revalidate=60`
- NDJSON 스트리밍 응답 검토 (Phase 4, TTFB 400ms → 10ms)

**HTTP/2 Server Push는 사용하지 않음**: Chrome에서 2022년 제거됨

### 5-6. Docker 최적화 [성능 전문가]

| 항목 | 현재 | 개선 |
|------|------|------|
| 베이스 이미지 | Alpine (musl, 15% 성능 손실) | **Debian slim** (glibc) |
| 메모리 설정 | 없음 | `--max-old-space-size=2048`, Docker 3GB 제한 |
| 레이어 캐시 | packages/ 전체 복사 후 npm ci | package.json만 먼저 복사 (빌드 60초→15초) |
| 헬스체크 | wget | Node.js fetch 사용 |

---

## 6. 프론트엔드 최적화 (수정)

### 6-1. Semantic Zoom: 명시적 drill-down 방식 [프론트엔드 리드]

**자동 줌 레벨 전환은 Phase 4로 미룸.** 줌 이벤트 기반 자동 전환의 UX 리스크:
- 임계값 근처에서 깜빡임
- depth 전환 중 선택 노드 유실
- 네비게이션 히스토리와 depth 상태 결합 시 상태 폭발

**Phase 3에서는 클러스터 더블클릭으로 depth 전환** (현재 UX와 자연스럽게 연결)

### 6-2. Pinia Store 분리 [프론트엔드 리드]

현재 `graphStore.ts` 344행 → 4개 스토어로 분리:
- `graphDataStore` — 원시 그래프 데이터, API 통신
- `graphFilterStore` — 필터 상태, 프리셋
- `graphInteractionStore` — 선택, 하이라이트, 네비게이션
- `graphOverlayStore` — circular, orphan, hub, impact

### 6-3. Tree View 최적화 순서 [프론트엔드 리드]

1. **즉시**: `svg.selectAll('*').remove()` → D3 `join()` 패턴으로 enter/update/exit (2~3일)
2. **Phase 3**: D3 레이아웃 + Canvas 2D 렌더링 + 뷰포트 컬링
3. **Phase 4**: 서버사이드 지연 로딩 (root + depth 2만 초기 로드)

### 6-4. 번들 분리

```typescript
// vite.config.ts
manualChunks: {
  'graph-engine': ['cytoscape', 'cytoscape-fcose'],  // 또는 ['@antv/g6']
  'd3-tree': ['d3-hierarchy', 'd3-selection', 'd3-zoom'],
  'vue-vendor': ['vue', 'pinia'],
  'virtual-scroll': ['vue-virtual-scroller'],
}
```

v-show 대신 **v-if + KeepAlive** 검토: 비활성 뷰의 WebGL context 해제

### 6-5. 공간 인덱스: Quadtree [알고리즘 전문가]

Sigma.js/G6의 실제 내부 구현은 quadtree (k-d tree가 아님). Barnes-Hut과 구조 공유 가능.

---

## 7. 비기능 요구사항 (추가)

### 7-1. 접근성 (a11y) [프론트엔드 리드]

WebGL/Canvas 렌더링은 스크린 리더 접근 불가. **Tree View를 텍스트 기반 대안 뷰로 항상 제공.**

### 7-2. 테스트 전략 [프론트엔드 리드]

- WebGL 컨텍스트가 필요한 G6/Sigma.js는 jsdom 미동작 → `vitest + puppeteer` 설정 필요
- 인터랙션 회귀 테스트 방법 사전 정의
- 대규모 그래프(75K 노드) mock 생성 유틸리티

### 7-3. 성능 회귀 방지 [성능 전문가]

- CI 벤치마크 게이트 (10% 이상 저하 시 실패)
- 런타임 `/api/admin/metrics` 엔드포인트
- 코드 리뷰 체크리스트: `getAllNodes()` 루프 내 호출, 대규모 배열 spread, hot path의 readFileSync 금지

### 7-4. 성능 목표 (정량)

| 항목 | 목표 |
|------|------|
| 초기 분석 (20K, cold cache) | <60초 |
| 초기 분석 (20K, warm cache) | <10초 |
| `/api/graph` 응답 (전체) | <500ms |
| `/api/graph/overview` 응답 | <50ms |
| 브라우저 초기 렌더링 | <2초 |
| 필터 변경 후 렌더링 | <200ms |
| 서버 메모리 피크 | <1.5GB |
| 브라우저 메모리 피크 | <500MB |

---

## 8. 실행 로드맵 (최종)

### Phase 0: 긴급 수정 (1~3일)

코드 변경 최소, ROI 최대. 전문가 3인 공통 지적 사항.

| # | 항목 | 예상 효과 | 변경량 |
|---|------|-----------|--------|
| 0-1 | engine.ts 캐시 저장 O(n x m) → O(n+m) | 분석 수십 초 단축 | ~20행 |
| 0-2 | query.ts BFS Array.shift() → 인덱스 기반 | BFS O(n²) → O(n+m) | ~3행 |
| 0-3 | query.ts findPaths() Set 교체 + 결과 상한 | 경로 폭발 방지 | ~10행 |
| 0-4 | ComplexityScorer getInDegree() 추가 | GC 압박 해소 | ~15행 |
| 0-5 | ForceGraphView 이벤트 리스너 cleanup | 메모리 누수 수정 | ~5행 |
| 0-6 | Docker CMD --max-old-space-size=2048 | OOM 방지 | ~1행 |

### Phase 1: 즉시 효과 (1~2주)

| # | 항목 | 예상 효과 |
|---|------|-----------|
| 1-1 | @fastify/compress brotli 활성화 | 응답 크기 90% 감소 |
| 1-2 | ETag + Cache-Control 헤더 | 반복 요청 304 Not Modified |
| 1-3 | toJSON() 결과 캐시 (dirty flag) | 재직렬화 비용 제거 |
| 1-4 | Fastify route schema → fast-json-stringify | 직렬화 50% 단축 |
| 1-5 | getAllNodes() → Iterator/캐시 배열 | 불필요한 배열 할당 제거 |
| 1-6 | refreshGraph() 증분 업데이트 (Cytoscape) | 클러스터 확장 시 성능 향상 |
| 1-7 | 노드 metadata 구조화 (HiddenClass 공유) | V8 프로퍼티 접근 10x 향상 |

### Phase 2: 데이터 계층 (2~3주)

| # | 항목 | 예상 효과 |
|---|------|-----------|
| 2-1 | Progressive Disclosure API | 초기 응답 <5KB, <50ms |
| 2-2 | ParseCache → SQLite (WAL) | 메모리 300MB 절감 |
| 2-3 | 워커 풀 + Transferable Objects | 분석 시 800ms + 직렬화 절감 |
| 2-4 | graphStore 4분할 리팩터링 | 전환 시 영향 범위 축소 |
| 2-5 | DependencyGraph 인덱스 추가 | CrossBoundaryResolver 6x O(m) → 6x O(k) |
| 2-6 | 서비스 단위 파티셔닝 | 분석/직렬화 병렬 처리 |

### Phase 2.5: G6 v5 PoC (2주)

| # | 항목 | 상세 |
|---|------|------|
| 2.5-1 | G6 v5 WebGL + Combo PoC | 10K → 50K 노드로 점진적 확대 |
| 2.5-2 | Vue 3 composable 설계 | useSigmaRenderer 패턴 대신 useG6Renderer |
| 2.5-3 | Compound 확장/축소 UX 검증 | 현재 Cytoscape UX 90% 이상 재현 가능한지 |
| 2.5-4 | Semantic Zoom (명시적 drill-down) | 더블클릭 → 서비스 내부 전환 |

**성공 기준 (정량)**:
- 50K 노드에서 60fps
- Compound 확장 지연 <100ms
- 호버/패스 하이라이트 기능 보존
- 번들 사이즈 증가 <20%

**실패 시 롤백**: Cytoscape.js 유지 + 공격적 컬링, 또는 Ogma 상용 도입 검토

### Phase 3: 렌더링 엔진 (3~4주, PoC 결과에 따라)

| # | 항목 | PoC 성공 시 | PoC 실패 시 |
|---|------|-----------|-----------|
| 3-1 | Graph 뷰 렌더러 | G6 v5 전면 전환 | Cytoscape WebGL 실험 렌더러 + 뷰포트 컬링 |
| 3-2 | 레이아웃 | 3단계 전략 (Spectral → FA2 fast → FA2 fine) | fcose draft 모드 + 레이아웃 캐싱 |
| 3-3 | Louvain 커뮤니티 디텍션 | Semantic Zoom 중간 레벨 | 디렉토리 기반 클러스터링 유지 |
| 3-4 | 명시적 drill-down Semantic Zoom | 구현 | 구현 (라이브러리 독립) |
| 3-5 | Tree View Canvas 전환 | D3 레이아웃 + Canvas 2D | D3 join() 최적화로 충분할 수 있음 |

### Phase 4: 고도화 (2~3주)

| # | 항목 |
|---|------|
| 4-1 | 자동 Semantic Zoom (줌 이벤트 기반, 충분한 UX 테스트 후) |
| 4-2 | Canvas 매트릭스 히트맵 |
| 4-3 | BottomUp 가상 스크롤 |
| 4-4 | 서버사이드 프리레이아웃 (좌표를 API에 포함) |
| 4-5 | 그래프 코어세닝 멀티레벨 레이아웃 |
| 4-6 | 엣지 번들링 / Spectral Sparsification |
| 4-7 | NDJSON 스트리밍 응답 |
| 4-8 | 성능 모니터링 대시보드 |

---

## 9. 기술 스택 변경 요약

| 영역 | 현재 | Phase 1~2 | Phase 3 (PoC 성공 시) |
|------|------|-----------|---------------------|
| Graph 렌더링 | Cytoscape.js Canvas | Cytoscape.js (증분 업데이트) | **G6 v5 WebGL** |
| Graph 자료구조 (FE) | Cytoscape 내부 | Cytoscape 내부 | **G6 내부** |
| 레이아웃 | cytoscape-fcose | fcose + 레이아웃 캐싱 | **Spectral + ForceAtlas2** |
| Tree 렌더링 | D3 SVG | D3 join() 최적화 | **D3 + Canvas 2D** |
| Matrix 렌더링 | HTML table | HTML table | **Canvas 2D 히트맵** |
| 파싱 캐시 | JSON 파일 | **better-sqlite3** | better-sqlite3 |
| API 압축 | 없음 | **@fastify/compress brotli** | brotli |
| API 직렬화 | JSON.stringify | **fast-json-stringify** | fast-json-stringify |
| Docker 이미지 | Alpine | **Debian slim** | Debian slim |
| 커뮤니티 디텍션 | 없음 | 없음 | **graphology-communities-louvain** |

---

## 부록 A: 라이브러리 레퍼런스

| 라이브러리 | 용도 | npm | Phase |
|-----------|------|-----|-------|
| @fastify/compress | HTTP brotli/gzip 압축 | `@fastify/compress` | 1 |
| better-sqlite3 | SQLite 캐시 | `better-sqlite3` | 2 |
| @antv/g6 | WebGL 그래프 렌더링 + Combo | `@antv/g6` | 2.5/3 |
| graphology-communities-louvain | 커뮤니티 디텍션 | `graphology-communities-louvain` | 3 |
| vue-virtual-scroller | 가상 스크롤 | `vue-virtual-scroller` | 3/4 |
| fast-json-stringify | 스키마 기반 직렬화 | `fast-json-stringify` | 1 |
| fuse.js | 클라이언트 퍼지 검색 | `fuse.js` | 4 |

## 부록 B: PoC 실패 시 대안 경로

```
G6 v5 PoC 실패
    ├── Option A: Cytoscape 유지 + 공격적 컬링
    │   - Progressive Disclosure로 뷰포트 내 3K~5K 노드 유지
    │   - Cytoscape WebGL 실험 렌더러 활용 (~10K)
    │   - 서버사이드 프리레이아웃으로 fcose 비용 제거
    │   - 비용: 0, 리스크: 낮음
    │
    └── Option B: Ogma 상용 도입
        - WebGL + GPU layout + Grouping 네이티브
        - Vue 3 공식 wrapper (@linkurious/ogma-vue)
        - 100K+ 노드 검증됨
        - 비용: 상용 라이선스, 리스크: 낮음
```
