# VDA 대규모 프로젝트 최적화 계획 (15K~20K 파일)

> 작성일: 2026-04-17
> 대상: Vue Dependency Analyzer (VDA)
> 목표: 15,000~20,000 파일 규모의 Vue + Spring Boot MSA 프로젝트에서 웹 시각화가 원활하게 동작하도록 전체 파이프라인을 최적화

---

## 1. 현재 아키텍처 요약

```
[파일 시스템] → [ParallelParser] → [DependencyGraph] → [REST API] → [Cytoscape.js]
  15K~20K files    워커 8개           Map<id, Node>      JSON 직렬화     Canvas 렌더링
                   30s 타임아웃        전체 in-memory      전체 전송        fcose O(n²)
```

### 현재 규모 (~130 파일, ~500 노드)에서의 성능
- 첫 분석: ~5초 이내
- 캐시 분석: ~2초 이내
- 클러스터 응답: <10KB

### 예상 규모 (20K 파일)에서의 추정
- 노드 수: 50K~75K
- 엣지 수: 100K~300K
- 캐시 파일: 200~500MB (JSON)
- API 응답: 15~30MB (비압축)

---

## 2. 병목 분석 (5개 레이어)

### Layer 1. 파싱 & 캐시 (Backend I/O)

| 현재 구현 | 문제점 | 복잡도 |
|-----------|--------|--------|
| `parse-cache.json` 단일 파일 | 75K 노드 직렬화 시 200~500MB JSON | O(n) read/write |
| `readFileSync` 동기 I/O | 워커에 전달 전 메인스레드 블로킹 | O(n) sequential |
| 워커 타임아웃 고정 30초 | 배치 크기와 무관하게 동일 | - |

### Layer 2. 그래프 자료구조 (Core Memory)

| 현재 구현 | 문제점 |
|-----------|--------|
| 모든 노드 metadata를 메모리에 보유 | 75K 노드 x 평균 500B metadata = ~37MB |
| `serialize()` 할 때 전체 복사 | O(n+m) 직렬화, GC 압박 |
| 엣지 해석 시 전체 순회 | CrossBoundaryResolver가 9단계 모두 전체 순회 |

### Layer 3. API & 데이터 전송

| 현재 구현 | 문제점 |
|-----------|--------|
| `GET /api/graph` → 전체 노드/엣지 JSON 전송 | 75K 노드 → 15~30MB JSON |
| 클러스터링 threshold 200 | 200 이하면 전체 노드 렌더링 시도 |
| HTTP 캐싱 헤더 없음 | 매 요청마다 재직렬화 |

### Layer 4. 프론트엔드 렌더링 (핵심 병목)

| 단계 | 복잡도 | 75K 노드에서 |
|------|--------|-------------|
| fcose 레이아웃 계산 | O(n² + m) | 수십 초~수 분 |
| Canvas 렌더링 | O(n + m) per frame | 프레임 드롭 |
| 필터 변경 시 재빌드 | `cy.elements().remove() + cy.add()` | 전체 재계산 |
| 호버 시 이웃 탐색 | O(degree) | 허용 범위 |

### Layer 5. 시각화 UX

| 뷰 | 문제점 |
|----|--------|
| Tree View | D3 `svg.selectAll('*').remove()` 전체 재렌더 |
| Matrix View | HTML 테이블 전체 빌드 |
| Force Graph | 필터 변경 시 전체 Cytoscape 재빌드, fcose 재계산 |

---

## 3. 해결 방안 상세

### Layer 1 해결: 파싱 & 캐시

#### 1-A. 캐시를 SQLite로 전환 (better-sqlite3)

```
현재: JSON.parse(500MB) → 전체 메모리 로드 → O(n)
개선: SELECT by filePath → 필요한 것만 로드 → O(1) per file
```

- **라이브러리**: `better-sqlite3` (동기 API, Node.js worker_threads 호환)
- **근거**: SQLite는 단일 파일 DB로 배포가 간편하고, B-tree 인덱스로 파일별 O(log n) 조회 가능
- 캐시 로드 시간: 500MB JSON → 5~10초 vs SQLite → 파일별 <1ms

```sql
CREATE TABLE parse_cache (
  file_path TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL,
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  errors_json TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX idx_content_hash ON parse_cache(content_hash);
```

#### 1-B. 파일 읽기를 스트리밍 배치로 전환

```
현재: for(file of 20K) { readFileSync(file) } → 메인스레드 20K회 블로킹
개선: readFile 비동기 + 배치(256개씩) → 워커에 점진 전달
```

- Node.js `fs.promises.readFile` + `p-limit` (동시성 제한)
- 워커에 파일을 읽힌 즉시 스트리밍 전달 (push 모델)

#### 1-C. 워커 타임아웃 동적 조정

```typescript
const timeoutMs = Math.max(30_000, tasks.length * 20); // 파일당 20ms 기준
```

### Layer 2 해결: 그래프 자료구조

#### 2-A. 노드 메타데이터 분리 저장 (Flyweight 패턴)

```typescript
// 경량 노드 (그래프 순회/직렬화용)
interface LightGraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  filePath: string;
  serviceId?: string;
}

// 메타데이터는 별도 저장소
class NodeMetadataStore {
  private store: Map<string, Record<string, unknown>>;
  get(nodeId: string): Record<string, unknown>;  // 필요 시 lazy 로드
}
```

- 그래프 순회/직렬화 시 metadata를 포함하지 않아 메모리 50% 절감
- 상세 정보는 `/api/graph/node?id=` 호출 시에만 로드

#### 2-B. 인접 리스트에 엣지 종류별 인덱스 추가

```typescript
// 현재
adjacency: Map<nodeId, Set<edgeId>>

// 개선: 엣지 종류별 분리
adjacencyByKind: Map<nodeId, Map<EdgeKind, Set<edgeId>>>
```

- CrossBoundaryResolver에서 특정 종류 엣지만 순회할 때 O(k) → O(1) 필터링
- API call 매칭 시 `api-call` 종류만 순회 가능

#### 2-C. 서비스 단위 파티셔닝

```
전체 그래프를 서비스별 서브그래프로 분할:

ServiceGraph {
  serviceId → SubGraph { nodes, edges, adjacency }
}
CrossServiceEdges { source(serviceA) → target(serviceB) }
```

- 11개 MSA + 1 Frontend = 12개 파티션
- 분석/직렬화를 파티션 단위로 병렬 처리 가능
- 전체 그래프 필요 시에만 merge

### Layer 3 해결: API & 데이터 전송

#### 3-A. 점진적 로딩 API (Progressive Disclosure)

```
Phase 1: GET /api/graph/overview       → 서비스 레벨 클러스터 (12개 노드)
Phase 2: GET /api/graph/service/:id    → 해당 서비스 내부 (~300개 노드)
Phase 3: GET /api/graph/directory/:path → 디렉토리 내부 노드
Phase 4: GET /api/graph/node/:id       → 개별 노드 상세
```

- **Semantic Zoom**: 줌 레벨에 따라 자동으로 다음 단계 로드
- 초기 로드: 12개 클러스터 → <5KB
- 서비스 확장: 300개 → ~60KB
- **총 초기 응답 시간: <100ms**

#### 3-B. 응답 압축 및 바이너리 포맷

| 방식 | 크기 (75K 노드) | 파싱 시간 |
|------|-----------------|-----------|
| JSON | ~20MB | ~200ms |
| JSON + gzip | ~2MB | ~100ms + 50ms decompress |
| MessagePack | ~12MB | ~80ms |
| Protocol Buffers | ~8MB | ~30ms |

- **1단계**: Fastify `@fastify/compress` (gzip) → 즉시 적용 가능, 80~90% 크기 감소
- **2단계**: 필요 시 MessagePack (`@msgpack/msgpack`) 전환 검토

#### 3-C. HTTP 캐싱 + ETag

```typescript
const graphVersion = hash(graph.metadata.analyzedAt);

reply.header('ETag', graphVersion);
reply.header('Cache-Control', 'private, max-age=60');
```

- 파일 변경이 없으면 304 Not Modified 반환
- WebSocket `graph:update` 수신 시 클라이언트가 캐시 무효화

### Layer 4 해결: 프론트엔드 렌더링 (핵심)

#### 4-A. 렌더링 엔진 전환: WebGL 기반

| 라이브러리 | 노드 한계 | 렌더링 | 레이아웃 | 적합성 |
|-----------|-----------|--------|---------|--------|
| Cytoscape.js (현재) | ~5K | Canvas/SVG | fcose O(n²) | X |
| **Sigma.js v2** | **100K+** | **WebGL** | 외부 연동 | **최적** |
| deck.gl | 1M+ | WebGL | 없음 (직접 구현) | 과도 |
| Pixi.js | 100K+ | WebGL | 없음 | 저수준 |
| vis-network | ~10K | Canvas | 자체 물리 | X |

**Sigma.js v2 선택 근거**:
- WebGL 기반: GPU에서 노드/엣지를 인스턴스드 렌더링 → 100K+ 노드 60fps
- **Graphology** 라이브러리와 네이티브 통합 (그래프 자료구조)
- 내장 기능: 노드 검색, 줌, 호버, 클릭 이벤트
- Vue 3 통합: `@sigma/vue` 또는 직접 composable 작성

#### 4-B. 레이아웃 알고리즘 전환

| 알고리즘 | 복잡도 | 75K 노드 | 용도 |
|---------|--------|---------|------|
| fcose (현재) | O(n² x iter) | 수 분 | X |
| **ForceAtlas2** (Web Worker) | O(n log n x iter) | ~5초 | 점진적 렌더링 |
| **Layered/Sugiyama** | O(n x m) | ~2초 | 계층 구조에 적합 |
| **Treemap** | O(n) | <1초 | 개요용 |

- **라이브러리**: `graphology-layout-forceatlas2` (Web Worker 지원)
  - Barnes-Hut 근사: O(n log n) per iteration
  - **점진적 렌더링**: 레이아웃 계산 중에도 중간 결과를 렌더링
  - `settings.barnesHutOptimize = true`로 활성화

- **서버사이드 프리레이아웃**: 노드 좌표를 서버에서 미리 계산해 전달
  ```
  GET /api/graph/service/:id?layout=true
  → { nodes: [{id, x, y, ...}], edges: [...] }
  ```
  클라이언트는 좌표만 받아 즉시 렌더링 → 레이아웃 대기 시간 0

#### 4-C. 뷰포트 컬링 (Viewport Culling)

```
현재: 75K 노드 전부 렌더링
개선: 화면에 보이는 노드만 렌더링
```

Sigma.js는 **내장 뷰포트 컬링**을 제공:
- k-d tree 기반 공간 인덱스로 화면 영역 내 노드만 조회 → O(log n + k)
- 줌 아웃 시 자동으로 작은 노드 숨김
- 엣지도 양 끝점이 뷰포트 밖이면 렌더링 스킵

#### 4-D. Semantic Zoom (의미적 줌 레벨)

```
줌 레벨 0.0~0.2: 서비스 클러스터만 표시 (12개 노드)
줌 레벨 0.2~0.5: 디렉토리 클러스터 (100~200개 노드)
줌 레벨 0.5~1.0: 개별 파일 노드 (해당 영역만)
줌 레벨 1.0~5.0: 노드 상세 + 라벨 + 메타데이터
```

```typescript
sigma.on('zoom', ({ ratio }) => {
  const depth = ratio < 0.2 ? 1 : ratio < 0.5 ? 2 : 3;
  if (depth !== currentDepth) {
    fetchGraphAtDepth(depth);  // Progressive disclosure
  }
});
```

#### 4-E. 증분 그래프 업데이트 (Incremental Update)

```
현재: 필터 변경 → cy.elements().remove() → cy.add(전체) → 레이아웃 재계산
개선: 필터 변경 → diff 계산 → 노드 추가/제거만 → 레이아웃 유지
```

```typescript
function applyFilter(newFilter: Filter) {
  const toAdd = newNodes.filter(n => !graph.hasNode(n.id));
  const toRemove = currentNodes.filter(n => !newNodes.has(n.id));

  graph.import({ nodesToAdd: toAdd });  // O(k) k=변경된 노드 수
  toRemove.forEach(id => graph.dropNode(id));  // O(k)
  // 레이아웃은 변경된 영역만 재계산
}
```

### Layer 5 해결: 시각화 UX 전략

#### 5-A. 뷰 모드별 최적화

| 뷰 | 현재 | 대규모 대응 |
|----|------|-------------|
| Force Graph | Cytoscape fcose | Sigma.js + ForceAtlas2 (WebWorker) |
| Tree View | D3 SVG 전체 재렌더 | 가상 트리 (`vue-virtual-scroller`) |
| Matrix View | HTML 테이블 전체 빌드 | Canvas 기반 히트맵 |
| Bottom-Up | 재귀 Vue 컴포넌트 | 가상 트리 + 지연 로딩 |

#### 5-B. 검색 & 네비게이션

대규모 그래프에서는 "전체를 보는 것"보다 **"필요한 것을 찾아가는 것"** 이 더 중요:

- **퍼지 검색**: `fuse.js`로 클라이언트사이드 인덱스 구축 (노드 라벨+경로)
- **북마크**: 자주 보는 서브그래프를 저장/복원
- **히스토리**: 탐색 경로를 브레드크럼으로 표시

---

## 4. 핵심 기술 스택 변경 요약

| 영역 | 현재 | 변경 후 |
|------|------|---------|
| 그래프 렌더링 | Cytoscape.js (Canvas) | **Sigma.js v2** (WebGL) |
| 그래프 자료구조 (FE) | Cytoscape 내부 | **Graphology** |
| 레이아웃 엔진 | cytoscape-fcose | **graphology-layout-forceatlas2** (WebWorker) |
| 파싱 캐시 | JSON 파일 | **better-sqlite3** |
| API 압축 | 없음 | **@fastify/compress** (gzip/brotli) |
| 대형 트리 | D3 SVG 전체 렌더 | **vue-virtual-scroller** |
| 매트릭스 | HTML 테이블 | **Canvas 2D 히트맵** |

---

## 5. 구현 우선순위 로드맵

### Phase 1: 즉시 효과 (기존 코드 최소 변경)

- 3-B. `@fastify/compress` gzip 압축 활성화
- 3-C. ETag/Cache-Control 헤더 추가
- 2-A. 노드 metadata 분리 (API 응답 경량화)
- **예상 효과**: API 응답 크기 80% 감소, 체감 속도 2~3배 향상

### Phase 2: 점진적 로딩 도입

- 3-A. Progressive Disclosure API 설계 및 구현
- 1-A. ParseCache → SQLite 전환
- 2-C. 서비스 단위 파티셔닝
- **예상 효과**: 초기 로드 <100ms, 메모리 50% 절감

### Phase 3: 렌더링 엔진 교체 (가장 큰 효과)

- 4-A. Cytoscape.js → Sigma.js + Graphology 전환
- 4-B. ForceAtlas2 WebWorker 레이아웃
- 4-C. 뷰포트 컬링 자동 적용
- 4-D. Semantic Zoom 구현
- **예상 효과**: 75K 노드에서 60fps 렌더링

### Phase 4: 고도화

- 4-E. 증분 그래프 업데이트
- 5-A. 가상 트리/Canvas 매트릭스
- 4-B-서버. 서버사이드 프리레이아웃
- 1-B. 비동기 스트리밍 파일 읽기
- **예상 효과**: 전체 워크플로 매끄러운 경험

---

## 부록: 라이브러리 레퍼런스

| 라이브러리 | 용도 | npm |
|-----------|------|-----|
| Sigma.js v2 | WebGL 그래프 렌더링 | `sigma` |
| Graphology | 그래프 자료구조 | `graphology` |
| graphology-layout-forceatlas2 | ForceAtlas2 레이아웃 | `graphology-layout-forceatlas2` |
| better-sqlite3 | SQLite 캐시 | `better-sqlite3` |
| @fastify/compress | HTTP 압축 | `@fastify/compress` |
| vue-virtual-scroller | 가상 스크롤 | `vue-virtual-scroller` |
| fuse.js | 퍼지 검색 | `fuse.js` |
| p-limit | 비동기 동시성 제한 | `p-limit` |
| @msgpack/msgpack | MessagePack 직렬화 | `@msgpack/msgpack` |
