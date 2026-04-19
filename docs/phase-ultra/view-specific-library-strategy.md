# Graph 뷰 / Tree 뷰 렌더링 패키지 분리 전략

> 작성일: 2026-04-17
> 목적: Graph 뷰와 Tree 뷰에 서로 다른 렌더링 라이브러리를 사용하는 것이 타당한지 다각도 검토

---

## 1. 현재 뷰별 렌더링 기술 현황

| 뷰 | 렌더링 라이브러리 | 렌더링 방식 | 데이터 소스 | 핵심 기능 |
|----|-------------------|-----------|-----------|----------|
| **ForceGraph** | Cytoscape.js + fcose | Canvas | graphStore.filteredNodes/Edges | 네트워크 그래프, 클러스터, 호버, 패스 하이라이트 |
| **Tree** | D3 hierarchy + selection + zoom | SVG | graphStore.filteredNodes/Edges → buildTree() | 계층 트리, 접기/펼치기, 방향 전환 |
| **Matrix** | 순수 HTML `<table>` | DOM | API `/api/graph/matrix` 직접 호출 | 히트맵, 셀 툴팁 |
| **BottomUp** | 순수 Vue 재귀 컴포넌트 | DOM | graphStore.graphData → buildTrace() | DB 테이블 → 프론트 역추적 |

**핵심 발견: 4개 뷰가 이미 각각 다른 렌더링 기술을 사용하고 있다.**

---

## 2. 뷰 간 결합도 분석

### 공유되는 상태 (graphStore)

```
graphStore
├── selectedNodeId    ← Graph, Tree, BottomUp 모두 read/write
├── focusNodeId       ← Tree 더블클릭 → Graph 카메라 이동
├── filteredNodes     ← Graph, Tree 공유
├── filteredEdges     ← Graph, Tree 공유
├── highlightedPath   ← Graph만 사용 (Pathfinder 패널)
├── impactNodeIds     ← Graph만 사용
├── showOverlays      ← Graph만 사용
└── circularNodeIds   ← Graph만 사용
```

### 뷰 간 상호작용 흐름

```
Graph 노드 클릭 → graphStore.selectNode(id)
    ↓
    ├── Tree: selectedNodeId 감지 → 자동 re-root (TreeView:168-171)
    ├── App.vue: 상세 패널 자동 열림 (App.vue:93)
    └── BottomUp: 반응 없음 (독립)

Tree 더블클릭 → graphStore.focusNode(id)
    ↓
    ├── Graph: cy.animate({ center, zoom: 2 }) (ForceGraphView:451)
    ├── Tree: re-root (TreeView:162)
    └── BottomUp: 반응 없음
```

### 결합도 판정

| 뷰 조합 | 결합도 | 공유 인터페이스 |
|---------|--------|---------------|
| Graph ↔ Tree | **중간** | selectedNodeId, focusNodeId, filteredNodes/Edges |
| Graph ↔ Matrix | **없음** | Matrix는 API 직접 호출, graphStore 미사용 |
| Graph ↔ BottomUp | **약함** | focusNode()만 공유 |
| Tree ↔ Matrix | **없음** | 완전 독립 |
| Tree ↔ BottomUp | **없음** | 완전 독립 |

**결론: 뷰 간 결합은 graphStore의 reactive ref를 통해서만 발생하며, 렌더링 라이브러리 레벨에서의 직접 결합은 전혀 없다.**

---

## 3. 패키지 분리의 타당성 — 다각도 평가

### 3-A. 기술적 관점

**찬성:**
- 4개 뷰가 이미 독립 렌더링 → 라이브러리 교체가 해당 파일만 영향
- ForceGraphView.vue (539줄)에만 Cytoscape 존재 — 다른 뷰는 무관
- TreeView.vue (293줄)에만 D3 존재 — 다른 뷰는 무관
- 통신은 graphStore를 통해서만 이루어짐 (Mediator 패턴)

**반대/주의:**
- 노드 색상 매핑 일관성: Graph와 Tree가 동일한 NODE_COLORS/NODE_STYLES 사용 필요
- 두 라이브러리의 좌표계가 다름 → "Graph에서 선택한 노드를 Tree에서 보여주기" 시 변환 불필요 (이미 ID 기반)

### 3-B. 성능 관점

Graph 뷰와 Tree 뷰는 **근본적으로 다른 성능 요구사항**을 가짐:

| 요구사항 | Graph 뷰 | Tree 뷰 |
|---------|---------|---------|
| 동시 표시 노드 수 | 수천~수만 (전체 그래프) | 수백~수천 (한 트리 경로) |
| 레이아웃 알고리즘 | Force-directed O(n log n) | Reingold-Tilford O(n) |
| 렌더링 병목 | 노드/엣지 동시 렌더링 | 깊은 트리의 SVG 노드 수 |
| 인터랙션 패턴 | 자유 탐색 (줌/팬/호버) | 순차 탐색 (확장/축소/re-root) |
| 최적 렌더링 기술 | **WebGL/Canvas** (대량 노드) | **가상 스크롤/Canvas** (깊은 트리) |

**같은 라이브러리로 두 문제를 최적으로 풀 수 없다.** 이것이 패키지 분리의 가장 강력한 근거.

### 3-C. 사용자 경험 관점

**찬성:**
- 사용자는 뷰를 전환(탭 클릭)하므로 동시에 두 뷰를 보지 않음 (App.vue에서 v-show 사용)
- 라이브러리가 달라도 노드 색상/아이콘이 일관되면 사용자는 차이를 인지하지 못함
- 각 뷰에 최적화된 인터랙션 제공 가능 (Graph: 부드러운 줌/팬, Tree: 빠른 확장/축소)

**반대/주의:**
- v-show로 렌더링 → 모든 뷰의 라이브러리가 동시 메모리에 로드됨
- 두 WebGL 라이브러리 동시 사용 시 WebGL context 제한 (브라우저당 8~16개) 주의
- 번들 사이즈 증가: 두 그래프 라이브러리 → chunk 분리 필수

### 3-D. 유지보수 관점

**찬성:**
- 각 뷰 담당자가 독립적으로 라이브러리 업그레이드 가능
- 한 라이브러리에 breaking change가 생겨도 다른 뷰는 무영향
- 테스트도 뷰 단위로 독립 수행 가능

**반대/주의:**
- 팀이 두 라이브러리의 API를 모두 알아야 함
- 공통 유틸 (색상 매핑, 노드 라벨 포맷팅)을 별도 모듈로 추출해야 함

---

## 4. 뷰별 최적 라이브러리 추천

### Graph 뷰 (Force-Directed Network)

현재 Cytoscape.js 유지를 기본으로 하되, G6 v5 PoC 병행 (rendering-library-review.md 참조)

| 후보 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| Cytoscape.js (유지) | compound node, 기능 완벽, 마이그레이션 비용 0 | 5K 노드 한계 | **1순위** (데이터 축소 전략과 결합) |
| G6 v5 | compound + WebGL + Vue 공식 | 대규모 미검증 | **PoC 대상** |
| Sigma.js | WebGL 50K | compound 미지원 | 하향 |

### Tree 뷰 (Hierarchical Dependency Tree)

현재 D3 SVG가 대규모에서 병목. 3가지 전략 비교:

| 전략 | 접근법 | 최대 노드 | 장점 | 단점 |
|------|--------|----------|------|------|
| **A. D3 + Canvas** | d3-hierarchy 레이아웃 + Canvas 2D 렌더링 | ~50K | SVG 한계 돌파, 기존 레이아웃 로직 재사용 | 히트 테스트 직접 구현, 텍스트 렌더링 품질 저하 |
| **B. 가상화 트리** | vue-virtual-scroller + 트리 플래트닝 | **무제한** | DOM 노드 ~30개로 고정, 메모리 최소 | 그래피컬 트리가 아닌 리스트 형태 |
| **C. D3 레이아웃 + 접기 최적화** | 현재 D3 유지 + 초기 접힌 상태 + 뷰포트 컬링 | ~5K (접힌 상태) | 변경 최소 | SVG 한계 여전히 존재 |

**추천: 전략 A + B 하이브리드**

```
"그래피컬 트리" 모드 (D3 + Canvas):
  - 노드-링크 다이어그램으로 의존성 구조를 시각적으로 표현
  - d3-hierarchy로 좌표 계산 → Canvas 2D로 렌더링
  - 뷰포트 컬링으로 화면에 보이는 노드만 그리기
  - 최대 ~50K 노드

"탐색기" 모드 (가상화 리스트):
  - VS Code 파일 탐색기 스타일의 트리 리스트
  - vue-virtual-scroller로 가상화 (DOM 노드 항상 ~30개)
  - 접기/펼치기, 검색, 필터링에 최적
  - 무제한 노드
```

### Matrix 뷰

| 현재 | 추천 |
|------|------|
| HTML `<table>` | **Canvas 2D 히트맵** (모듈 20x20 이상 시 DOM 비효율) |

### BottomUp 뷰

| 현재 | 추천 |
|------|------|
| 재귀 Vue 컴포넌트 | **vue-virtual-scroller + 트리 플래트닝** (깊은 트리 시 스택 오버플로 방지) |

---

## 5. 최종 추천 라이브러리 구성

```
┌─────────────────────────────────────────────────────────┐
│                     graphStore (Pinia)                    │
│  selectedNodeId, focusNodeId, filteredNodes/Edges         │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌──▼───┐ ┌───▼─────┐
    │ Graph  │ │  Tree  │ │Matrix│ │BottomUp │
    │  View  │ │  View  │ │ View │ │  View   │
    ├────────┤ ├────────┤ ├──────┤ ├─────────┤
    │Cytoscape│ │D3-hier │ │Canvas│ │vue-virt │
    │  .js   │ │+Canvas │ │  2D  │ │-scroller│
    │(또는   │ │  2D    │ │히트맵│ │+트리    │
    │ G6 v5) │ │        │ │      │ │플래트닝 │
    └────────┘ └────────┘ └──────┘ └─────────┘
     WebGL/     Canvas      Canvas     DOM
     Canvas                            가상화
```

### 번들 분리 전략 (vite.config.ts)

```typescript
manualChunks: {
  'graph-engine': ['cytoscape', 'cytoscape-fcose'],  // 또는 ['@antv/g6']
  'd3-tree': ['d3-hierarchy', 'd3-selection', 'd3-zoom'],
  'vue-vendor': ['vue', 'pinia'],
  'virtual-scroll': ['vue-virtual-scroller'],
}
```

- 각 뷰의 라이브러리가 별도 chunk로 분리 → 해당 탭 진입 시에만 로드 (lazy import)
- 초기 로드에는 vue-vendor만 필요

### WebGL Context 충돌 방지

- Graph 뷰만 WebGL 사용 (Cytoscape WebGL 또는 G6 WebGL)
- Tree 뷰는 Canvas 2D (WebGL 아님)
- v-show 대신 **v-if + KeepAlive** 전환 검토: 비활성 뷰의 WebGL context 해제

---

## 6. 결론

**Graph 뷰와 Tree 뷰에 다른 렌더링 패키지를 사용하는 것은 타당할 뿐 아니라 권장된다.**

근거:
1. **이미 분리되어 있다** — 현재도 Cytoscape.js와 D3를 별도로 사용 중이며 잘 동작함
2. **요구사항이 근본적으로 다르다** — 네트워크 그래프 vs 계층 트리는 최적 렌더링 전략이 다름
3. **결합점이 명확하다** — graphStore의 reactive ref만 공유하면 되며, 렌더링 레벨 결합은 없음
4. **유지보수가 오히려 쉬워진다** — 각 뷰를 독립적으로 최적화/교체 가능

유일한 주의점:
- 노드 색상/아이콘 매핑을 공통 모듈(`types/graph.ts`)로 유지
- 번들 chunk 분리로 초기 로드 영향 최소화
- WebGL context 수 관리
