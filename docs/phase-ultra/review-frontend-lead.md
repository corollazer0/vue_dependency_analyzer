# Frontend Lead Engineer 리뷰: VDA 대규모 최적화 계획

> 리뷰어: Senior Frontend Lead Engineer
> 리뷰 대상: `docs/large-scale-optimization-plan.md`
> 리뷰 일자: 2026-04-17

---

## 1. Sigma.js 전환의 현실성 평가

### 1-1. 마이그레이션 난이도: 높음 (예상 공수 4~6주)

최적화 계획서가 Sigma.js v2를 "최적"으로 선택한 근거(WebGL 기반, 100K+ 노드, Graphology 네이티브 통합)는 타당하다. 그러나 현재 코드베이스에서 Cytoscape에 깊이 의존하는 부분이 상당히 많아 단순 교체가 아닌 사실상 **재작성**에 가깝다는 점을 인지해야 한다.

**Cytoscape 고유 기능 의존도 분석:**

| 기능 | 현재 구현 위치 | Sigma.js 대응 | 난이도 |
|------|---------------|--------------|--------|
| Compound nodes (parent-child) | `ForceGraphView.vue` 69~77행 (`parent: cluster.id`) | Sigma.js에 **compound node 미지원**. 커스텀 렌더러로 그려야 함 | 매우 높음 |
| Selector 기반 스타일링 | `buildStylesheet()` 114~279행, 40개+ CSS-like 셀렉터 | Graphology attribute 기반 + `NodeProgram` 커스텀 셰이더 | 높음 |
| `cy.batch()` 일괄 업데이트 | `highlightNode()` 354행, `clearHighlights()` 369행, `applyOverlays()` 417행 | Graphology `graph.updateEachNodeAttributes()` | 중간 |
| `ele.degree()` 동적 스타일 | `buildStylesheet()` 144행 `Math.sqrt(ele.degree() + 1) * 5` | `graph.degree(node)` 사전 계산 필요 | 낮음 |
| `closedNeighborhood()` | `ForceGraphView.vue` 302행 호버 하이라이트 | `graphology-utils`의 `neighbors()` + 직접 구현 | 중간 |
| SVG/PNG 내보내기 | `exportGraph()` 519~536행, `cytoscape-svg` 플러그인 | Sigma.js에는 `@sigma/export-image`가 있으나 SVG 내보내기 미지원 | 중간 |
| fcose 레이아웃 + animate | `initCytoscape()` 291행, `refreshGraph()` 399행 | ForceAtlas2는 점진적 렌더링만 지원, `animate: true` 같은 전환 애니메이션 직접 구현 필요 | 중간 |

### 1-2. 핵심 리스크: Compound Nodes

현재 클러스터 확장 시 Cytoscape의 compound node 기능을 사용하여 부모-자식 관계를 표현한다 (`ForceGraphView.vue` 69~77행에서 `parent: cluster.id`를 설정). Sigma.js는 이 기능을 네이티브로 제공하지 않는다.

대안:
- **Convex hull 오버레이**: `@sigma/node-border` + 커스텀 레이어로 클러스터 경계를 그리는 방식. 시각적으로는 유사하나 Cytoscape처럼 자식 노드가 부모 내부에 자동 배치되지 않으므로 레이아웃 제약조건을 직접 구현해야 한다.
- **서브그래프 toggle**: 클러스터를 단일 메타노드로 표시하고, 확장 시 해당 메타노드를 제거 후 자식 노드를 삽입. 현재 구현(`buildClusterElements()`)의 사고방식과 비슷하지만 시각적 컨테이너가 없어진다.

**결론**: compound node 없이도 동작 가능하지만, UX가 현저히 달라진다. 이 트레이드오프를 사전에 디자인 레벨에서 합의해야 한다.

### 1-3. 스타일 시스템 차이

현재 `buildStylesheet()`는 약 280행에 걸쳐 40개 이상의 CSS-like 셀렉터를 정의한다. Sigma.js는 CSS 셀렉터 방식이 아닌 **프로그래매틱 리듀서(reducer)** 패턴을 사용한다:

```typescript
// Sigma.js 방식
sigma.setSetting('nodeReducer', (node, data) => {
  const res = { ...data };
  if (hoveredNode === node) { res.size = data.size * 1.35; res.color = '#42b883'; }
  if (fadedNodes.has(node)) { res.color = '#222'; }
  return res;
});
```

이 방식은 성능적으로 우수하지만, 현재의 선언적 스타일시트 대비 코드가 분산되고 우선순위 관리가 어렵다. 특히 `path-highlight`, `impact-changed`, `circular`, `hub-node` 등 다수의 오버레이 클래스가 동시에 적용될 수 있는 현재 구조(460~498행)에서는 **상태 우선순위 로직**을 명시적으로 구현해야 한다.

---

## 2. Vue 3 통합 전략

### 2-1. `@sigma/vue`는 사용하지 않는 것을 권장

계획서에서 언급한 `@sigma/vue`는 2026년 4월 현재 커뮤니티 프로젝트로 유지보수가 불안정하고, VDA의 고도화된 인터랙션(클러스터 확장, 오버레이 토글, 패스 하이라이팅)을 감당하기 어렵다. **직접 composable을 작성하는 것이 올바른 방향**이다.

### 2-2. 제안하는 Composable 설계

```
composables/
  useSigmaRenderer.ts    // Sigma 인스턴스 생명주기 + 뷰포트 이벤트
  useGraphology.ts        // Graphology 그래프 인스턴스 + CRUD
  useGraphLayout.ts       // ForceAtlas2 WebWorker 관리
  useGraphInteraction.ts  // 호버, 클릭, 선택, 패스 하이라이트
  useGraphClustering.ts   // 기존 클러스터 로직 리팩터링
  useSemanticZoom.ts      // 줌 레벨별 데이터 로딩
```

### 2-3. Reactive System 통합의 핵심 주의사항

현재 `graphStore.ts`에서 `shallowRef`를 적절히 사용하고 있다 (1행 `shallowRef<GraphData | null>`). Graphology 인스턴스도 반드시 `shallowRef`로 감싸야 한다. Graphology의 노드/엣지 데이터는 Vue의 reactivity 추적 대상이 아니어야 성능이 보장된다.

```typescript
// 올바른 패턴
const graph = shallowRef(new Graph());

// 절대 하면 안 되는 패턴 - Graphology 내부 객체를 reactive로 감싸면 
// 수만 개 노드에 대해 Proxy가 생성되어 메모리 폭발
const graph = ref(new Graph()); // XXX 금지
```

그래프 변경 시 Vue에 알리는 방법:

```typescript
graph.value.addNode(id, attributes);
triggerRef(graph); // 수동으로 변경 알림
```

현재 `graphStore.ts` 96행에서도 `triggerRef(graphData)`를 사용하는 패턴이 있으므로 이 접근법은 기존 코드와 일관된다.

### 2-4. Pinia Store 분리 제안

현재 `graphStore.ts`가 344행으로 비대하다. 다음과 같이 분리하는 것을 권장한다:

- `graphDataStore` - 원시 그래프 데이터, API 통신
- `graphFilterStore` - 필터 상태, 프리셋 (현재 181~267행)
- `graphInteractionStore` - 선택, 하이라이트, 네비게이션 (현재 129~179행)
- `graphOverlayStore` - 오버레이 상태 (circular, orphan, hub, impact)

이 분리는 Sigma.js 전환과 독립적으로 선행할 수 있고, 전환 시 영향 범위를 줄여준다.

---

## 3. 기존 기능 보존 방안

### 3-1. LOD (Level of Detail)

**현재 구현** (`updateLOD()`, `ForceGraphView.vue` 376~393행):
- 줌 < 0.25: 라벨 숨김, 엣지 opacity 15%
- 줌 0.25~0.6: 라벨 12자 truncate, 점진적 text-opacity
- 줌 > 0.6: 풀 라벨

**Sigma.js 전환 방안**: Sigma.js의 `labelRenderedSizeThreshold` 설정으로 기본 LOD가 자동 적용된다. 추가로 `nodeReducer`에서 줌 레벨에 따라 `label`, `size`를 동적으로 반환하면 현재와 동일한 동작을 구현할 수 있다. 이 부분은 오히려 현재보다 **간결해질 수 있다**.

### 3-2. 클러스터 확장/축소

**현재 구현** (`buildClusterElements()`, 43~110행 + `useGraphClustering.ts`):
- 축소 상태: 단일 노드 + `childCount` 표시
- 확장 상태: compound parent + 자식 노드 배치

**Sigma.js 전환 방안**: 위 1-2절에서 언급한 대로 compound node가 없으므로 UX 변경이 불가피하다. 현실적 대안은:
1. 클러스터 확장 시 기존 클러스터 노드를 제거하고 자식 노드를 삽입
2. 자식 노드에 부모 영역을 시각적으로 표시하는 `@sigma/node-border` 또는 커스텀 canvas layer 사용
3. 축소 시 역과정 수행

**추가 공수**: 약 1~2주. `useGraphClustering.ts`의 API 로직은 재사용 가능하나 뷰 레이어는 재작성 필요.

### 3-3. 호버 하이라이트 (Neighborhood Fade)

**현재 구현** (`ForceGraphView.vue` 298~319행):
```javascript
const neighborhood = node.closedNeighborhood();
cy.elements().not(neighborhood).not(compoundParents).addClass('faded');
```

**Sigma.js 전환 방안**: Sigma.js의 `nodeReducer`/`edgeReducer`에서 `hoveredNode`의 이웃이 아닌 노드를 fade 처리. Graphology의 `graph.neighbors(node)`로 이웃 조회. 이 패턴은 Sigma.js 공식 예제에 있어 구현이 비교적 수월하다.

**주의점**: 현재 302행에서 compound parent(`isExpanded` 노드)는 fade에서 제외하는 로직이 있다. Sigma.js에서는 이 로직을 reducer 내부에서 처리해야 하며, 클러스터 구현 방식에 따라 달라진다.

### 3-4. 패스 하이라이팅

**현재 구현** (`ForceGraphView.vue` 472~498행):
- `highlightedPath` watch로 path 노드/엣지에 `.path-highlight` 클래스 추가
- 비-path 요소 fade 처리

**Sigma.js 전환 방안**: `nodeReducer`/`edgeReducer`에서 path Set 확인 후 색상/크기 변경. 개념적으로 동일하며 난이도 낮음.

### 3-5. SVG 내보내기 기능 상실

`cytoscape-svg` 플러그인(`ForceGraphView.vue` 4행, 527~535행)으로 제공하는 SVG 내보내기는 Sigma.js로 전환 시 **불가능**해진다. Sigma.js는 WebGL 캔버스를 사용하므로 PNG 내보내기만 가능하다 (`@sigma/export-image`). SVG 내보내기가 필수 요구사항이라면 이는 명확한 기능 퇴보이므로 사전에 이해관계자 합의가 필요하다.

---

## 4. Tree/Matrix 뷰 개선안 평가

### 4-1. Tree View: `vue-virtual-scroller` 제안 평가

**적절성: 중간**

현재 Tree View(`TreeView.vue`)는 D3 `tree()` 레이아웃 + SVG 렌더링을 사용한다 (93~96행). `vue-virtual-scroller`는 **리스트형 가상 스크롤**에 적합하고 트리 구조에는 직접 적용할 수 없다.

**더 적절한 대안들:**

1. **`vue-virtual-scroller` + 평탄화(flatten)**: 트리를 평탄한 리스트로 변환하여 가상 스크롤 적용. 이 경우 D3 기반 시각적 트리(곡선 링크, 수평 레이아웃)는 포기하고 **들여쓰기 기반 트리 뷰**로 전환해야 한다. 파일 탐색기 스타일. 기능적으로 충분하나 현재 시각적 경험과 크게 달라진다.

2. **Canvas 기반 커스텀 트리 렌더러**: 현재 SVG의 `selectAll('*').remove()` 전체 재렌더 문제(82행)를 해결하면서도 시각적 트리를 유지하려면 Canvas + 뷰포트 컬링이 최선이다. 그러나 구현 공수가 크다 (2~3주).

3. **현재 구현 최적화 (추천)**: `svg.selectAll('*').remove()` 대신 D3의 `join()` 패턴으로 enter/update/exit 처리. 현재도 118행에서 `join()`을 사용하고 있으나 82행에서 모든 요소를 먼저 제거하고 있어 `join()`의 이점을 살리지 못하고 있다. 이 수정만으로 수천 노드까지는 충분히 대응 가능하며 공수도 2~3일이면 된다.

**권장 순서**: (3) 기존 코드 최적화 -> (1) 대규모 시 들여쓰기 트리 전환

### 4-2. Matrix View: Canvas 히트맵 제안 평가

**적절성: 높음**

현재 Matrix View(`MatrixView.vue`)는 HTML `<table>`로 전체 매트릭스를 렌더링한다 (81~113행). 20K 파일 프로젝트에서 모듈 수가 수백 개가 되면 `<td>` 요소가 수만 개 생성되어 DOM이 과부하된다.

Canvas 히트맵 전환은 올바른 방향이다. 구체적 구현 시 권장사항:

- **라이브러리 선택**: 직접 Canvas 2D API를 사용하는 것을 권장. `chart.js`나 `echarts` 같은 차트 라이브러리의 히트맵은 이 용도에 과도하다.
- **인터랙션**: 현재 `showTooltip()` (52~63행)의 마우스 호버 상호작용을 Canvas에서 재현하려면 히트테스트 로직 필요. 매트릭스는 격자 구조이므로 `Math.floor(mouseX / cellSize)`로 O(1) 히트테스트가 가능하여 어렵지 않다.
- **정렬/필터링**: Canvas에서 행/열 라벨 렌더링과 정렬 인터랙션을 직접 구현해야 한다. 여기에 공수가 숨어 있다.

**추가 제안**: 매트릭스 데이터가 서버에서 오는 구조(depth별 API 호출, 15~26행)이므로 클라이언트에서 전체 매트릭스를 구성하지 않고 **보이는 영역의 셀 데이터만 서버에서 스트리밍**하는 방식도 고려할 만하다. 다만 이는 Phase 4 이후의 고도화 사항이다.

---

## 5. Semantic Zoom UX 영향 분석

### 5-1. 로딩 지연 문제

계획서의 Semantic Zoom 구현 (4-D절):
```typescript
sigma.on('zoom', ({ ratio }) => {
  const depth = ratio < 0.2 ? 1 : ratio < 0.5 ? 2 : 3;
  if (depth !== currentDepth) {
    fetchGraphAtDepth(depth);  // 네트워크 요청 발생!
  }
});
```

**문제점**: 줌 이벤트는 휠 스크롤 시 초당 30~60회 발생한다. depth 전환 임계값 근처에서 사용자가 줌인/줌아웃을 반복하면 API 요청이 연발된다. 또한 `fetchGraphAtDepth()`가 네트워크 요청이므로 50~300ms의 지연이 발생하여 줌 중 그래프가 갑자기 변경되는 "깜빡임" 현상이 생긴다.

**권장 완화 방안:**

1. **Debounce + 방향 감지**: 줌 방향이 안정된 후 300ms 후에만 depth 전환 요청. 줌이 계속 진행 중이면 요청 보류.

2. **Prefetch**: 현재 depth N이면 N-1과 N+1을 백그라운드에서 미리 로드하여 캐시. 전환 시 캐시된 데이터를 즉시 렌더링.

3. **Crossfade 애니메이션**: depth 전환 시 이전 데이터를 즉시 제거하지 않고 새 데이터가 로드될 때까지 이전 상태를 유지하다가 페이드 전환.

4. **최소 체류 시간**: depth가 변경된 후 최소 1초간은 다시 변경하지 않는 가드.

### 5-2. 상태 관리 복잡도

Semantic Zoom은 **여러 depth의 그래프 데이터가 동시에 존재**하는 상태를 만든다:
- depth 1 (서비스 클러스터) + depth 2 (특정 서비스 내부) 가 공존할 때의 엣지 연결
- depth 전환 중 선택된 노드가 새 depth에 존재하지 않을 때의 처리
- 필터 변경 시 모든 캐시된 depth 데이터의 무효화
- 뒤로 가기/앞으로 가기 네비게이션과 depth 상태의 동기화

이 복잡도는 계획서에서 과소평가되어 있다. `graphStore.ts`의 네비게이션 히스토리(140~179행)와 Semantic Zoom의 depth 상태가 결합되면 상태 폭발이 발생할 수 있다.

**권장**: Semantic Zoom을 "자동 줌 레벨 전환"이 아닌 **"사용자 명시적 drill-down/up"** 으로 구현하는 것이 UX와 구현 복잡도 모두에서 유리하다. 즉, 줌 이벤트가 아닌 클러스터 더블클릭으로 depth를 전환하는 방식. 이는 현재의 클러스터 확장 UX(322~328행 tap 이벤트)와 자연스럽게 연결된다.

---

## 6. 놓친 점과 리스크

### 6-1. 접근성(a11y) 미고려

Cytoscape.js의 Canvas 렌더링도 접근성이 나빴지만 Sigma.js의 WebGL은 더 나쁘다. 스크린 리더 지원, 키보드 네비게이션 등이 완전히 불가능하다. 정부/공공기관 프로젝트에서 사용 가능성이 있다면 심각한 문제가 된다.

**완화**: 그래프 옆에 접근 가능한 텍스트 기반 대안 뷰(현재의 Tree View 또는 리스트 뷰)를 항상 제공.

### 6-2. 모바일/터치 디바이스 대응

Sigma.js의 터치 지원은 Cytoscape.js보다 제한적이다. 현재 `wheelSensitivity: 0.3` (292행) 같은 세밀한 입력 조정이 Sigma.js에서는 다른 API로 처리해야 한다. 모바일 사용 시나리오가 있다면 이를 검증해야 한다.

### 6-3. 타입 안전성 퇴보 위험

현재 코드는 `@types/cytoscape` (package.json 22행)로 타입이 잘 정의되어 있다. Sigma.js + Graphology의 TypeScript 지원은 양호하지만, `NodeProgram` 커스텀 셰이더 작성 시 GLSL 코드가 문자열로 들어가므로 타입 안전성이 깨진다. 커스텀 노드 렌더러가 필요한 경우(compound node 대체 등) 이 부분의 테스트 커버리지가 중요하다.

### 6-4. 번들 사이즈 영향

현재 의존성:
- `cytoscape` + `cytoscape-fcose` + `cytoscape-svg`: ~350KB (gzip ~90KB)

전환 후 예상:
- `sigma` + `graphology` + `graphology-layout-forceatlas2`: ~250KB (gzip ~70KB)

번들 사이즈는 오히려 개선되지만, ForceAtlas2 WebWorker는 별도 번들로 분리해야 한다. Vite의 worker 번들링 설정이 필요하다.

### 6-5. 테스트 전략 부재

계획서에 테스트 전략이 전혀 언급되지 않았다. 현재 프로젝트에 64개 테스트가 있는데, 렌더링 엔진 교체 시:
- WebGL 컨텍스트가 필요한 Sigma.js는 jsdom에서 동작하지 않는다
- headless 렌더링을 위해 `@sigma/test` 또는 `vitest` + `puppeteer` 설정이 필요
- 기존 인터랙션 로직의 회귀 테스트 방법을 미리 정의해야 한다

### 6-6. 현재 코드의 메모리 누수 패턴

`ForceGraphView.vue`의 `onMounted`(500~512행)에서 `document.addEventListener`로 전역 이벤트를 등록하지만 `onUnmounted`(538행)에서 제거하지 않는다. Sigma.js 전환 시 이런 패턴을 정리해야 한다.

### 6-7. `refreshGraph()`의 전체 재빌드 문제가 과소 보고됨

계획서에서 `cy.elements().remove() + cy.add()`를 문제로 지적했는데(Layer 4), 현재 `refreshGraph()` (396~401행)가 정확히 이 패턴이다:
```javascript
cy.batch(() => { cy!.elements().remove(); cy!.add(elements); });
```
그런데 이 함수는 필터 변경뿐 아니라 **클러스터 확장/축소** 시에도 호출된다 (327~335행). 클러스터 하나를 확장할 때마다 전체 그래프가 재빌드되고 fcose 레이아웃이 재실행되는 것은 현재 규모에서도 비효율적이다. Sigma.js 전환 전에 이 패턴을 증분 업데이트로 수정하는 것이 Phase 1에서 가능하며, Cytoscape에서도 효과가 있다.

---

## 7. 대안 제안

### 7-1. Cytoscape.js 최적화 선행 (Sigma 전환 전)

Sigma.js 전환은 큰 공수와 리스크를 동반한다. 그 전에 **현재 Cytoscape.js 기반에서 가능한 최적화를 먼저 수행**하면 10K~15K 노드까지는 대응 가능하고, 이 과정에서 아키텍처가 정리되어 Sigma 전환도 수월해진다.

**즉시 적용 가능한 Cytoscape 최적화:**

1. **`refreshGraph()` 증분 업데이트**: 전체 remove + add 대신 diff 기반. Cytoscape의 `eles.diff()`를 활용하거나 직접 Set 비교.

2. **레이아웃 캐싱**: 동일한 필터 조합에 대해 노드 좌표를 캐시하여 레이아웃 재계산 회피. `positions: { ... }` 형태로 preset 레이아웃 사용.

3. **`cytoscape-canvas`로 Canvas 레이어 분리**: 오버레이(circular, orphan, hub)를 별도 canvas 레이어에 그려서 메인 그래프 렌더링 부하 감소.

4. **Web Worker 기반 fcose**: `cytoscape-fcose`는 메인스레드에서 실행되므로 UI가 블로킹된다. 레이아웃 계산을 Worker로 분리하고 결과 좌표만 메인스레드에 전달.

### 7-2. 하이브리드 접근: 줌 레벨별 렌더러 전환

모든 줌 레벨에서 Sigma.js를 사용할 필요는 없다:

- **줌 아웃 (개요)**: Sigma.js WebGL로 전체 노드를 점(dot)으로 렌더링. 라벨/엣지 상세 불필요. 이 레벨에서 WebGL의 이점이 극대화된다.
- **줌 인 (상세)**: Cytoscape.js Canvas로 compound node, 상세 스타일, 인터랙션 제공. 뷰포트 내 노드 수가 제한적이므로 Cytoscape로 충분하다.

이 접근은 구현이 복잡하지만, 기존 Cytoscape 코드를 보존하면서 대규모 데이터셋 대응이 가능하다.

### 7-3. ForceAtlas2 대신 ELK.js 고려

계획서에서 ForceAtlas2를 주 레이아웃으로 제안했는데, VDA의 의존성 그래프는 본질적으로 **방향성 계층 그래프(DAG)**이다. ForceAtlas2는 무방향 클러스터링에 강하지만 계층 구조 표현에는 약하다.

**ELK.js** (Eclipse Layout Kernel)는 Sugiyama/layered 레이아웃을 Web Worker에서 실행할 수 있고 방향성 그래프에 최적화되어 있다. Sigma.js와도 좌표 기반으로 통합 가능하다. 사용자가 레이아웃을 선택할 수 있게 ForceAtlas2와 ELK.js를 모두 제공하는 것을 권장한다.

### 7-4. Tree View에 대한 실용적 대안

20K 파일 규모에서 Tree View의 가장 큰 문제는 렌더링이 아니라 **트리 자체의 크기**이다. depth 10으로 설정하면 (`TreeView.vue` 200행, max depth 20) 노드 수가 수천에서 수만까지 폭발한다.

가상 스크롤보다 **서버사이드 페이지네이션 + 지연 로딩**이 더 효과적이다:
- 초기 로드: root + depth 2까지만
- 노드 확장 시: 해당 노드의 자식만 API로 로드
- 현재 `useGraphClustering.ts`의 `expandCluster()` 패턴을 Tree View에도 적용

---

## 8. 우선순위 의견

### 계획서의 Phase 순서에 대한 평가

| Phase | 계획서 | 평가 | 수정 제안 |
|-------|--------|------|----------|
| 1 | gzip, ETag, metadata 분리 | 동의. 즉시 효과, 리스크 낮음 | 그대로 진행 |
| 2 | Progressive API, SQLite, 파티셔닝 | 부분 동의 | SQLite는 백엔드 담당, 프론트엔드는 Progressive API 소비 준비만 |
| 3 | Sigma.js 전환 | **시기상조 위험** | Phase 2.5 삽입 권장 (아래 참조) |
| 4 | 증분 업데이트, 가상 트리, Canvas 매트릭스 | 순서 조정 필요 | 증분 업데이트는 Phase 2.5에서 선행 |

### 수정 제안 로드맵

**Phase 1 (1~2주): 즉시 효과** - 계획서와 동일
- gzip 압축, ETag, metadata 경량화
- `ForceGraphView.vue`의 이벤트 리스너 누수 수정
- `refreshGraph()` 증분 업데이트 (Cytoscape 기반)

**Phase 2 (2~3주): API + 데이터 계층**
- Progressive Disclosure API 설계/구현
- `graphStore.ts` 분리 (data/filter/interaction/overlay)
- 레이아웃 좌표 캐싱

**Phase 2.5 (1~2주): Sigma.js 전환 준비 (신규)**
- Graphology 기반 `useGraphology.ts` composable 작성 (렌더러 독립적)
- 현재 Cytoscape 스타일/이벤트를 추상 인터페이스로 분리
- Sigma.js PoC: 10K 노드로 핵심 인터랙션(호버, 클릭, 패스 하이라이트) 검증
- compound node 대안 UX 프로토타입 및 이해관계자 리뷰

**Phase 3 (3~4주): Sigma.js 전환**
- Phase 2.5의 PoC를 기반으로 본격 전환
- ForceAtlas2 + ELK.js 듀얼 레이아웃
- Semantic Zoom (명시적 drill-down 방식)
- WebGL 테스트 환경 구축

**Phase 4 (2~3주): 고도화**
- Canvas 매트릭스
- Tree View 지연 로딩
- 서버사이드 프리레이아웃
- 성능 모니터링 대시보드 (FPS, 메모리, 로딩 시간)

### 핵심 수정 의견

1. **Phase 2.5(PoC)를 반드시 삽입하라.** Sigma.js가 VDA의 요구사항(compound node, 다중 오버레이, SVG 내보내기 등)을 실제로 만족할 수 있는지 본격 전환 전에 검증해야 한다. PoC 결과에 따라 Cytoscape 최적화 경로로 선회할 수 있는 의사결정 포인트를 확보하는 것이 중요하다.

2. **`refreshGraph()` 증분 업데이트를 Phase 1으로 앞당겨라.** 이것은 현재 Cytoscape 기반에서도 가장 큰 성능 향상을 가져오고 (397~399행의 전체 remove + add 제거), Sigma.js 전환 시에도 동일한 패턴이 필요하므로 투자 가치가 높다.

3. **Semantic Zoom의 "자동 줌 전환"은 Phase 4로 미뤄라.** 줌 이벤트 기반 자동 전환은 UX 리스크가 크다. Phase 3에서는 명시적 drill-down만 구현하고, 자동 전환은 충분한 사용자 테스트 후 고도화 단계에서 도입하라.

---

## 요약

최적화 계획서는 병목 분석이 정확하고 전체적인 방향성이 올바르다. 다만 Sigma.js 전환의 난이도를 과소평가하고 있으며, 특히 compound node 부재와 스타일 시스템 차이로 인한 기능 퇴보 리스크가 충분히 논의되지 않았다. PoC 단계를 삽입하여 리스크를 조기에 검증하고, 현재 Cytoscape 기반에서도 가능한 최적화(`refreshGraph()` 증분 업데이트, 레이아웃 캐싱)를 선행하는 것을 강력히 권장한다.

가장 중요한 것은 **15K~20K 파일에서도 실제 렌더링되는 노드 수는 뷰포트와 줌 레벨에 의해 제한**된다는 점이다. Progressive Disclosure API와 클러스터링이 제대로 작동하면, 화면에 동시에 표시되는 노드 수는 수백~수천 개로 제한되며, 이 범위에서는 Cytoscape.js도 충분히 성능을 발휘한다. 따라서 Sigma.js 전환은 "필수"가 아니라 "더 나은 여유"를 확보하기 위한 선택이며, 이 관점에서 우선순위를 조정해야 한다.
