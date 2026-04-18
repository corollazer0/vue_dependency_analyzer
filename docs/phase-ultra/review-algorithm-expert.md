# VDA 대규모 최적화 계획 - 알고리즘 전문가 리뷰

> 리뷰어: Algorithm & Graph Theory Expert
> 리뷰 대상: `docs/large-scale-optimization-plan.md`
> 작성일: 2026-04-17

---

## 1. 복잡도 분석 검증

### 1.1 fcose: "O(n²)" 주장 - 부분적으로 정확

계획서에서 fcose의 복잡도를 `O(n² x iter)`로 기술하고 있다. 이는 **naive force-directed 알고리즘**의 복잡도이며, fcose(fast Compound Spring Embedder)의 실제 구현과는 차이가 있다.

fcose는 내부적으로 두 가지 모드를 제공한다:

- **quality 모드**: Fruchterman-Reingold 기반으로 모든 노드 쌍의 반발력을 계산하므로 실제로 `O(n² x iter)`. 계획서의 주장이 정확하다.
- **default/draft 모드**: spectral layout 초기화 + 짧은 반복으로, spectral 단계가 `O(n + m)` (Laplacian eigenvector 계산에 Lanczos iteration 사용), 이후 refinement가 제한된 반복 수로 동작한다. 따라서 이 모드에서는 `O(n² x iter)`보다 상당히 빠르다.

**결론**: 계획서가 worst-case를 기술한 것은 맞지만, fcose의 spectral 초기화 모드를 고려하지 않은 것은 **분석 누락**이다. 75K 노드에서 fcose quality 모드가 수 분 걸린다는 추정은 타당하나, draft 모드라면 수십 초 수준일 수 있다.

### 1.2 ForceAtlas2 Barnes-Hut: "O(n log n)" - 정확

Barnes-Hut 근사를 적용한 ForceAtlas2의 per-iteration 복잡도는 **정확히 O(n log n)**이다.

- 반발력 계산: quad-tree (2D) 또는 oct-tree (3D) 구축 `O(n log n)`, 각 노드의 반발력 근사 `O(n log n)` (theta 매개변수에 의해 제어)
- 인력 계산: 엣지 순회 `O(m)`
- **총 per-iteration**: `O(n log n + m)`

75K 노드, 300K 엣지 기준:
- `n log n ≈ 75,000 x 16.2 ≈ 1.2M` 연산
- `m = 300K` 연산
- 총 per-iteration: ~1.5M 연산

수렴까지 일반적으로 100~500 iteration이 필요하므로, **Web Worker에서 ~5초**라는 추정은 **낙관적이지만 달성 가능한 범위**이다. 단, 이는 단일 스레드 JavaScript 실행 기준이며, `graphology-layout-forceatlas2`의 WebWorker 구현이 SharedArrayBuffer를 사용하는지에 따라 달라진다.

### 1.3 Sugiyama/Layered: "O(n x m)" - 부정확

계획서가 Layered/Sugiyama 레이아웃을 `O(n x m)`으로 기술한 것은 **과소평가**이다.

Sugiyama 알고리즘은 4단계로 구성된다:

1. **Cycle removal**: `O(n + m)` (Greedy-FAS 등)
2. **Layer assignment**: `O(n + m)` (longest path 또는 network simplex)
3. **Crossing minimization**: 이것이 핵심 병목. NP-hard 문제이며, 바리센터 휴리스틱은 `O(L x n x m)` (L = sweep 횟수). 최악의 경우 `O(n²)`에 근접한다.
4. **Coordinate assignment**: `O(n + m)` (Brandes-Kopf 등)

따라서 실제 복잡도는 **`O(L x n x m)`** 이며, dense graph에서는 `O(n x m)` 이상이 될 수 있다. 75K 노드에서 "~2초"라는 추정은 **비현실적**이다. 실제로는 10초 이상 소요될 가능성이 높으며, crossing minimization 단계에서 메모리 사용량도 상당하다.

### 1.4 Treemap: "O(n)" - 정확

Squarified treemap은 정렬 `O(n log n)` + 배치 `O(n)`이므로 **O(n log n)**이 더 정확하지만, 75K 노드에서 <1초라는 추정은 타당하다.

---

## 2. ForceAtlas2 vs 대안 알고리즘

### 2.1 Barnes-Hut 최적화의 실제 효과

Barnes-Hut의 핵심 매개변수는 **theta (θ)** 값이다:

| θ 값 | 정밀도 | 속도 | 비고 |
|-------|--------|------|------|
| 0.0 | exact | O(n²) | naive와 동일 |
| 0.5 | 높음 | O(n log n) | 기본 권장값 |
| 1.2 | 낮음 | ~O(n) | 수렴 불안정 가능 |
| 2.0+ | 매우 낮음 | ~O(n) | 시각적 품질 저하 심각 |

**권장**: θ = 0.5 ~ 1.0 범위에서 시작하되, 75K 노드에서는 **θ = 1.0**으로 초기 배치를 빠르게 수행한 후 **θ = 0.5**로 refinement하는 **2-phase 전략**이 효과적이다.

### 2.2 75K 노드 수렴 시간 추정

보다 정밀한 추정:

```
n = 75,000, m = 300,000
Per-iteration (θ=0.5): ~1.5M 연산 ≈ 1.5ms (modern V8 기준)
수렴까지: 200~500 iterations
총 시간: 300ms ~ 750ms (순수 계산)
+ Web Worker 메시지 전달 오버헤드: ~50ms/sync
+ 좌표 배열 직렬화: 75K x 2 x 8bytes = 1.2MB per sync
```

**계획서의 "~5초" 추정은 안전 마진을 포함한 것으로 합리적이다.** 실제로는 Web Worker에서 1~3초 내에 시각적으로 안정된 레이아웃을 얻을 수 있다. 다만, **점진적 렌더링**(매 10~50 iteration마다 좌표 동기화)을 사용하면 첫 프레임이 100ms 이내에 표시될 수 있어 체감 성능이 크게 향상된다.

### 2.3 대안 알고리즘 비교

계획서가 고려하지 않은 중요한 대안들:

#### (a) OpenOrd

- **복잡도**: `O(n log n x iter)` (ForceAtlas2와 동일 클래스)
- **특징**: 대규모 그래프에 특화된 multi-scale 접근. 클러스터 분리가 ForceAtlas2보다 뛰어남
- **제한**: JavaScript 구현이 없어 WASM 포팅 필요

#### (b) UMAP for Graphs

- **복잡도**: `O(n x k x iter)` (k = 이웃 수, 보통 15~50)
- **특징**: 고차원 그래프 임베딩 → 2D 투영. 위상적 구조 보존이 뛰어남
- **제한**: 의존성 그래프에서는 "가까운 이웃" 개념이 방향성(import 방향)과 충돌할 수 있음
- **적합도**: **낮음** - UMAP은 비방향 유사도 기반이므로 의존성 방향 정보 손실

#### (c) Spectral Layout

- **복잡도**: `O(n + m)` (Lanczos iteration으로 상위 k 고유벡터 계산)
- **특징**: Graph Laplacian의 Fiedler vector를 이용한 레이아웃. 수학적으로 최적의 2D 배치
- **적합도**: **높음** - 초기 배치로 매우 적합. ForceAtlas2의 초기값으로 사용하면 수렴 시간 50% 이상 단축 가능
- **구현**: `graphology-layout-noverlap` + 커스텀 spectral 초기화

#### (d) Stress Majorization (SMACOF)

- **복잡도**: `O(n² x iter)` (전체 쌍 거리 필요)
- **적합도**: 75K 노드에서는 비현실적. pivot MDS로 `O(k x n)` 근사 가능 (k ≈ 50~200)

**권장 조합**:
```
Phase 1: Spectral layout으로 초기 배치 (O(n + m), ~100ms)
Phase 2: ForceAtlas2 (θ=1.0)로 fast refinement (200 iter, ~500ms)
Phase 3: ForceAtlas2 (θ=0.5)로 fine refinement (점진적, 사용자가 중단 가능)
```

이 3-phase 전략은 계획서의 단순 ForceAtlas2 접근보다 **초기 품질이 높고 수렴이 빠르다**.

---

## 3. 그래프 파티셔닝 전략

### 3.1 서비스 단위 파티셔닝의 이론적 근거

계획서의 "11개 MSA + 1 Frontend = 12개 파티션" 접근은 **도메인 기반 파티셔닝**이다. 이는 다음 조건에서 유효하다:

- MSA 경계가 실제 모듈 경계와 일치할 때 (높은 modularity)
- 서비스 간 엣지(cross-service edges)가 서비스 내부 엣지보다 현저히 적을 때

이를 그래프 이론적으로 검증하면:

$$Q = \frac{1}{2m} \sum_{ij} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$

여기서 Q는 modularity, A는 인접 행렬, k는 차수, c는 커뮤니티 할당이다. MSA 경계로 파티셔닝한 Q 값이 0.3 이상이면 합리적인 파티셔닝이다.

**현재 코드 분석**: `CrossBoundaryResolver`의 9단계 해결 과정을 보면, 서비스 간 연결은 주로 `api-call`, `spring-injects`, `dto-flows` 종류의 엣지이다. 이는 전체 엣지의 일부분이므로, 서비스 단위 파티셔닝의 modularity는 높을 것으로 예상된다.

### 3.2 METIS vs Spectral Bisection 적용 가능성

#### METIS

- **장점**: 최적에 가까운 balanced graph partitioning, 엣지 컷 최소화
- **복잡도**: `O(n + m)` (coarsening + initial partition + uncoarsening)
- **제한**: C 라이브러리로 Node.js에서 직접 사용 불가. WASM 포팅 필요
- **적합도**: **불필요** - MSA 경계가 이미 자연스러운 파티션 경계를 제공하므로, 알고리즘적 파티셔닝의 이점이 크지 않음

#### Spectral Bisection

- **장점**: Fiedler vector를 이용한 수학적으로 근사 최적의 이분할
- **복잡도**: `O(n + m)` per bisection
- **적합도**: 서비스 내부에서 추가 세분화가 필요할 때 유용. 예를 들어, 단일 서비스 내 300개 노드를 50개씩 6개 하위 클러스터로 분할할 때

**권장**: MSA 경계를 1차 파티션으로 사용하되, 서비스 내부가 300개 노드를 초과하면 **Louvain 커뮤니티 디텍션**으로 2차 파티셔닝을 수행하라. METIS는 과도하다.

### 3.3 현재 구현의 파티셔닝 관련 문제

현재 `DependencyGraph.ts`를 분석하면:

```typescript
// 현재: 단일 flat 구조
private nodes = new Map<string, GraphNode>();
private adjacency = new Map<string, Set<string>>();
```

서비스 단위 파티셔닝을 위해서는 **계층적 그래프 구조**가 필요하다. 그러나 현재 `GraphNode.metadata`에 서비스 정보가 포함되어 있지 않다. `AnalysisConfig.services`가 있지만, 파싱된 노드에 `serviceId`가 할당되지 않는다.

**선행 과제**: `ParallelParser`에서 파싱 시 `serviceId`를 노드 metadata에 주입하는 로직이 필요하다.

---

## 4. 공간 인덱스 선택: 뷰포트 컬링 최적

### 4.1 이론적 비교

| 구조 | 구축 | 점 질의 | 범위 질의 | 삽입 | 삭제 | 차원 |
|------|------|---------|-----------|------|------|------|
| **k-d tree** | O(n log n) | O(log n) | O(√n + k) | O(log n) amort. | 비효율적 | 저차원(≤20) |
| **R-tree** | O(n log n) | O(log n) | O(log n + k) | O(log n) | O(log n) | 임의 차원, 직사각형 객체 |
| **Quadtree** | O(n log n) | O(log n) | O(log n + k) | O(log n) | O(log n) | 2D only |

여기서 k = 질의 결과 노드 수.

### 4.2 뷰포트 컬링 시나리오 분석

뷰포트 컬링의 핵심 연산은 **직사각형 범위 질의 (axis-aligned rectangle query)**이다:

- **k-d tree**: 범위 질의 이론 복잡도 `O(√n + k)`. 2D에서 이는 최적에 근접하지만, 결정적으로 **동적 업데이트(노드 위치 변경)에 약하다**. ForceAtlas2가 점진적으로 좌표를 업데이트할 때마다 트리를 재구축해야 한다 → `O(n log n)` per frame.

- **R-tree**: 범위 질의 `O(log n + k)`. 동적 삽입/삭제/이동이 `O(log n)`이다. **노드 이동 시 delete + insert로 O(log n)에 처리 가능**하다.

- **Quadtree**: 범위 질의 평균 `O(log n + k)`. 구현이 가장 단순하다. 노드 이동 시 재삽입 `O(log n)`. **Barnes-Hut과 동일 구조를 공유할 수 있다**는 것이 핵심 장점이다.

### 4.3 권장

**Quadtree를 권장한다.** 이유:

1. **Barnes-Hut과 구조 공유**: ForceAtlas2의 Barnes-Hut 최적화가 이미 quadtree를 구축한다. 이를 뷰포트 컬링에 재사용하면 추가 메모리/시간 비용 없이 범위 질의가 가능하다.
2. **구현 단순성**: 2D 전용이므로 k-d tree보다 구현/디버깅이 쉽다.
3. **동적 업데이트**: 점진적 레이아웃에서 노드 위치가 매 프레임 변하므로, 전체 재구축이 필요한 k-d tree보다 quadtree의 점진적 업데이트가 유리하다.

단, Sigma.js가 내장 k-d tree를 사용한다는 계획서의 기술은 **확인이 필요하다**. Sigma.js v2의 실제 구현은 내부적으로 **quadtree**를 사용한다 (소스 코드의 `@sigma/quadtree` 패키지). 계획서의 "k-d tree 기반 공간 인덱스" 기술은 **오류**이다.

---

## 5. 엣지 종류별 인덱스(2-B) 분석

### 5.1 제안된 구조

```typescript
adjacencyByKind: Map<nodeId, Map<EdgeKind, Set<edgeId>>>
```

### 5.2 공간 복잡도 분석

현재 구조:
```
adjacency: Map<nodeId, Set<edgeId>>
메모리: O(n + m) — 각 엣지가 정확히 한 번 Set에 저장
```

제안 구조:
```
adjacencyByKind: Map<nodeId, Map<EdgeKind, Set<edgeId>>>
메모리: O(n x K + m) — K = EdgeKind 종류 수 (현재 18종), 빈 Map 포함
```

실제 추가 메모리:
- 각 노드당 Map 객체: 75K x ~100B = ~7.5MB
- 각 EdgeKind당 Set 객체: 이론적 최대 75K x 18 x ~60B = ~81MB

그러나 실제로는 대부분의 노드가 1~3종류의 엣지만 가지므로:
- **실측 추정**: 75K x 2.5(avg kinds) x ~60B = ~11MB 추가
- **총 오버헤드**: ~15~20MB

### 5.3 시간 복잡도 분석

| 연산 | 현재 | 제안 | 개선 |
|------|------|------|------|
| 특정 종류 엣지 조회 | O(degree) 전체 순회 후 필터 | O(1) Map lookup + O(k) | degree가 클 때 유의미 |
| 엣지 추가 | O(1) | O(1) + O(1) Map lookup | 거의 동일 |
| 엣지 삭제 | O(1) | O(1) + O(1) Map lookup | 거의 동일 |

### 5.4 현재 코드에서의 실제 효과

`CrossBoundaryResolver.ts`를 분석하면, 종류별 필터링이 빈번하게 발생한다:

```typescript
// resolveImports: imports 종류만 필터
graph.getAllEdges().filter(e => e.kind === 'imports' && ...)
// resolveComponentReferences: uses-component 종류만
graph.getAllEdges().filter(e => e.kind === 'uses-component' && ...)
```

**문제**: 현재 코드는 `getAllEdges()` (전체 엣지 순회 O(m))를 반복 호출한다. `adjacencyByKind`를 도입해도, 현재의 `getAllEdges().filter()` 패턴을 바꾸지 않으면 효과가 없다.

**권장**: `adjacencyByKind` 도입과 함께, `DependencyGraph`에 다음 메서드를 추가해야 한다:

```typescript
getEdgesByKind(kind: EdgeKind): GraphEdge[]  // 전체 그래프에서 해당 종류만
getOutEdgesByKind(nodeId: string, kind: EdgeKind): GraphEdge[]  // 특정 노드의 특정 종류
```

그리고 `CrossBoundaryResolver`의 `getAllEdges().filter()` 패턴을 이 메서드로 교체해야 한다. 그래야 O(m) → O(k) 개선이 실현된다. 현재 9단계 해결 중 최소 6단계가 `getAllEdges().filter()`를 사용하므로, 최악의 경우 **6 x O(m) → 6 x O(k)**로 개선된다.

### 5.5 대안: 글로벌 종류별 인덱스

노드-레벨 인덱스 대신 **글로벌 인덱스**도 고려할 만하다:

```typescript
edgesByKind: Map<EdgeKind, Set<edgeId>>  // 전역 인덱스
```

이는 `CrossBoundaryResolver`의 현재 패턴(`getAllEdges().filter(kind === X)`)에 더 직접적으로 대응하며, 공간 오버헤드도 `O(K + m)`으로 더 작다. **두 인덱스를 모두 유지**하는 것이 최적이다.

---

## 6. 점진적 레이아웃의 수학적 근거

### 6.1 문제 정의

부분 그래프 변경 (노드 k개 추가/제거) 시 전체 레이아웃을 재계산하지 않고, 변경된 영역만 재계산하는 것이 시각적 안정성을 보장하는가?

### 6.2 수학적 분석

Force-directed 레이아웃의 에너지 함수:

$$E(\mathbf{X}) = \sum_{(i,j) \in E} f_{attract}(d_{ij}) + \sum_{i \neq j} f_{repel}(d_{ij})$$

여기서 **X**는 노드 좌표 행렬, d_ij는 노드 i, j 간 유클리드 거리이다.

노드 k개가 추가될 때, 에너지 함수의 변화:

$$\Delta E = \sum_{\text{new edges}} f_{attract} + \sum_{\text{new pairs}} f_{repel}$$

**핵심 질문**: 기존 노드의 좌표를 고정하고 새 노드만 최적화하면, 전체 에너지가 local minimum에 수렴하는가?

**답: 아니다. 일반적으로 보장되지 않는다.**

그러나 다음 조건에서는 **실용적으로 안정적**이다:

1. **변경 비율이 작을 때**: `k/n < 0.05` (5% 미만) — 새 노드의 반발력이 기존 레이아웃을 크게 교란하지 않음
2. **지역성이 있을 때**: 새 노드가 기존 특정 노드의 이웃일 때 — 해당 영역만 에너지가 변화
3. **pinning 전략**: 기존 노드에 약한 spring force를 추가하여 현재 위치 근처에 유지

$$f_{pin}(i) = \alpha \cdot ||\mathbf{x}_i - \mathbf{x}_i^{old}||^2, \quad \alpha \ll 1$$

### 6.3 계획서의 접근 평가

계획서의 증분 업데이트:

```typescript
graph.import({ nodesToAdd: toAdd });  // O(k)
toRemove.forEach(id => graph.dropNode(id));  // O(k)
// 레이아웃은 변경된 영역만 재계산
```

이 접근은 "변경된 영역만 재계산"이라고만 기술하고, **구체적인 수학적 보장을 제시하지 않는다.**

**권장 전략**:

1. **Pinning + local relaxation**: 변경 노드의 2-hop 이웃만 레이아웃 재계산 (α = 0.1 pinning)
2. **변경 비율 임계값**: `k/n > 0.1`이면 전체 재계산으로 폴백
3. **에너지 모니터링**: 점진적 업데이트 후 에너지 변화량 `|ΔE/E| > 0.2`이면 전체 재계산 트리거

---

## 7. 캐시 무효화 전략

### 7.1 증분 업데이트 시 영향 범위 계산

현재 `ImpactAnalyzer.ts`의 `reachableFrom` 함수가 BFS로 영향 범위를 계산한다:

```typescript
// query.ts - reachableFrom
const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
while (queue.length > 0) {
  const { id, depth } = queue.shift()!;  // ← O(n) shift 연산!
  ...
}
```

**심각한 성능 문제**: `Array.shift()`는 `O(n)` 연산이다. BFS에서 n회 호출하면 **총 O(n²)**이 된다. 75K 노드 그래프에서 이는 심각한 병목이다.

**수정 필요**:

```typescript
// 링 버퍼 또는 인덱스 기반 큐 사용
let front = 0;
while (front < queue.length) {
  const { id, depth } = queue[front++];
  ...
}
```

이 한 줄 수정으로 BFS가 `O(n + m)` → 실제로 `O(n + m)`이 된다 (현재는 `O(n² + m)`).

### 7.2 캐시 무효화 정확성

파일 변경 시 캐시 무효화 범위:

1. **직접 영향**: 변경된 파일에서 파싱된 노드/엣지 → 재파싱 필요
2. **간접 영향**: 해당 노드를 참조하는 엣지 → 재해석 필요
3. **전이적 영향**: CrossBoundaryResolver의 해석 결과가 변경될 수 있음

현재 코드에는 **캐시 무효화 로직이 없다**. `DependencyGraph.removeByFile()`로 파일 단위 제거가 가능하지만, 해당 파일을 참조하던 다른 파일의 엣지(unresolved 상태로 복귀)를 처리하는 로직이 부재하다.

**권장**: 파일 변경 시 다음 순서로 캐시 무효화를 수행해야 한다:

```
1. 변경 파일의 기존 노드 ID 집합 S 수집
2. S를 참조하는 엣지 집합 E_affected 수집: O(|S| x avg_degree)
3. E_affected의 source 노드가 속한 파일 집합 F_affected 수집
4. S의 노드 제거 + 변경 파일 재파싱
5. F_affected 파일들의 엣지만 CrossBoundaryResolver로 재해석
```

이 범위가 정확한 이유: 의존성 그래프에서 파일 A가 변경되면, A를 import하는 파일 B의 엣지 target만 변경될 수 있다. B의 노드 자체나 B가 import하는 다른 파일 C와의 관계는 변하지 않는다. 따라서 **1-hop reverse dependency만 재해석하면 충분**하다.

---

## 8. 놓친 알고리즘적 최적화

### 8.1 커뮤니티 디텍션: Louvain / Leiden

계획서가 **가장 크게 놓친 부분**이다. 대규모 그래프 시각화에서 커뮤니티 디텍션은 핵심적인 역할을 한다.

#### Louvain 알고리즘

- **복잡도**: `O(n log n)` (실증적, 이론적으로는 `O(n x m)` worst case)
- **용도**: 자동 클러스터링 → Semantic Zoom의 중간 레벨 생성
- **라이브러리**: `graphology-communities-louvain` (이미 Graphology 생태계에 존재)

현재 계획서의 Semantic Zoom은 MSA 서비스 경계와 디렉토리 경로에 의존한다:

```
줌 레벨 0.0~0.2: 서비스 클러스터 (12개)
줌 레벨 0.2~0.5: 디렉토리 클러스터
```

이 접근의 문제는 **디렉토리 구조가 반드시 의존성 구조를 반영하지 않는다**는 것이다. 같은 디렉토리의 파일이 서로 의존하지 않을 수 있고, 다른 디렉토리의 파일이 밀접하게 연결될 수 있다.

**권장**: Louvain 커뮤니티 디텍션 결과를 중간 줌 레벨의 클러스터링으로 사용하라. 이는 **의존성 구조에 기반한 자연스러운 클러스터**를 제공한다.

```
줌 레벨 0.0~0.2: 서비스 클러스터 (12개) — MSA 경계
줌 레벨 0.2~0.5: Louvain 커뮤니티 (50~100개) — 의존성 기반
줌 레벨 0.5~1.0: 개별 파일 노드
```

#### Leiden 알고리즘

Louvain의 개선판으로, **연결이 끊긴 커뮤니티를 생성하지 않는다**는 이론적 보장이 있다. 복잡도는 동일하지만 JS 구현이 아직 성숙하지 않다. Louvain으로 시작하고 필요 시 Leiden으로 전환하라.

### 8.2 그래프 코어세닝 (Graph Coarsening)

**멀티레벨 레이아웃의 핵심 기법**으로, 계획서에서 완전히 누락되었다.

원리:
```
Original graph G₀ (75K nodes)
  → Coarsen → G₁ (15K super-nodes)
  → Coarsen → G₂ (3K super-nodes)
  → Coarsen → G₃ (600 super-nodes)
  → Layout G₃ (빠름, ~100ms)
  → Uncoarsen + refine → Layout G₂ (~200ms)
  → Uncoarsen + refine → Layout G₁ (~500ms)
  → Uncoarsen + refine → Layout G₀ (~1s)
```

코어세닝 전략:
- **Heavy-edge matching**: 가중치가 높은 엣지의 양 끝점을 합침. O(m)
- **Algebraic multigrid**: Laplacian 기반 수학적 코어세닝. 더 높은 품질

**총 레이아웃 시간**: 각 레벨에서의 시간 합 ≈ `O(n log n)` (기하급수적 축소)

이 접근은 ForceAtlas2 단독보다 **레이아웃 품질과 속도 모두에서 우수**하다. 특히 75K 노드 규모에서 차이가 극적이다.

**구현 경로**: `graphology-operators`에 contraction 연산이 있으나, 완전한 멀티레벨 레이아웃 파이프라인은 직접 구현해야 한다.

### 8.3 Graph Sparsification

75K 노드, 300K 엣지에서 모든 엣지를 렌더링하면 시각적 혼잡이 심각하다. 두 가지 sparsification 기법을 고려해야 한다:

#### (a) Edge Bundling

- 유사한 방향의 엣지를 묶어 시각적 복잡도를 감소
- **FDEB (Force-Directed Edge Bundling)**: O(m x iter) — 엣지 수에 비례
- Sigma.js에서는 `@sigma/edge-curve`로 곡선 엣지를 사용하여 유사한 효과 가능

#### (b) Spectral Sparsification

- 그래프의 spectral 성질을 보존하면서 엣지 수를 O(n log n)으로 축소
- 레이아웃과 커뮤니티 구조가 거의 동일하게 유지됨
- Spielman-Srivastava 알고리즘: `O(m log n)` 시간

**권장**: 줌 아웃 시 (전체 그래프 표시) spectral sparsification으로 엣지 수를 10% 수준으로 줄이고, 줌 인 시 해당 영역의 모든 엣지를 표시하라.

### 8.4 기타 누락된 최적화

#### (a) `findPaths`의 지수적 복잡도

현재 `query.ts`의 `findPaths`는 DFS로 모든 경로를 열거한다:

```typescript
function dfs(current: string, path: string[], depth: number): void {
  if (depth > maxDepth) return;
  if (current === to) { paths.push([...path]); return; }
  for (const edge of graph.getOutEdges(current)) {
    if (!path.includes(edge.target)) { ... }  // O(path.length) 선형 탐색!
  }
}
```

두 가지 문제:
1. **경로 수가 지수적으로 증가 가능**: worst case `O(n!)` 경로. `maxDepth = 10`으로 제한해도, dense graph에서 수천만 경로가 가능.
2. **`path.includes()`는 O(path length)**: Set으로 교체해야 한다.

**권장**: 결과 경로 수에 상한 (예: 100개)을 두고, `path.includes()`를 `Set`으로 교체하라.

#### (b) `impactOf` 함수의 불필요한 전체 순회

```typescript
// query.ts line 79
for (const edge of graph.getAllEdges()) {  // O(m) 전체 순회
  if (reachable.has(edge.source) || reachable.has(edge.target) || ...)
```

reachable 노드 집합이 이미 있으므로, 각 reachable 노드의 인접 엣지만 순회하면 `O(reachable_size x avg_degree)`로 충분하다. 전체 엣지 순회 `O(m)`은 불필요하다.

#### (c) `calculateComplexity`의 반복적 배열 할당

```typescript
// ComplexityScorer.ts
for (const node of graph.getAllNodes()) {
  const fanIn = graph.getInEdges(node.id).length;   // 매번 배열 생성
  const fanOut = graph.getOutEdges(node.id).length;  // 매번 배열 생성
}
```

`getInEdges`와 `getOutEdges`는 매번 새로운 배열을 생성한다. 75K 노드에서 150K 배열 생성 → GC 압박. `getInDegree(nodeId): number` 메서드를 추가하여 배열 할당 없이 차수만 반환하는 것이 좋다.

---

## 총평

계획서는 대규모 그래프 시각화의 주요 병목을 정확히 식별하고, Sigma.js + ForceAtlas2로의 전환이라는 올바른 방향을 제시하고 있다. 그러나 다음 영역에서 보강이 필요하다:

| 영역 | 심각도 | 요약 |
|------|--------|------|
| 멀티레벨 레이아웃 (coarsening) 부재 | **높음** | 75K 노드에서 단일 레벨 ForceAtlas2보다 극적인 성능 향상 가능 |
| 커뮤니티 디텍션 부재 | **높음** | Semantic Zoom의 중간 레벨이 디렉토리 구조 의존 → 의존성 기반 클러스터링 필요 |
| BFS의 O(n²) 버그 | **높음** | `Array.shift()` → 인덱스 기반으로 즉시 수정 필요 |
| Sugiyama 복잡도 과소평가 | **중간** | 75K 노드에서 2초는 비현실적, 10초 이상 예상 |
| Sigma.js 공간 인덱스 오기재 | **낮음** | k-d tree가 아닌 quadtree가 실제 구현 |
| findPaths 지수적 폭발 위험 | **중간** | 결과 상한 + Set 사용 필요 |
| 점진적 레이아웃 수학적 근거 부재 | **중간** | pinning + 임계값 기반 폴백 전략 명시 필요 |

**우선 적용 권장 사항** (계획서 Phase 순서에 관계없이):

1. BFS `Array.shift()` → 인덱스 기반 큐로 즉시 수정
2. `findPaths`에 결과 상한 추가 + `path.includes()` → `Set` 교체
3. `graphology-communities-louvain`을 Semantic Zoom 중간 레벨에 통합
4. 멀티레벨 레이아웃 파이프라인 설계 (coarsening → layout → uncoarsening)
5. `DependencyGraph`에 `getEdgesByKind()`, `getInDegree()`, `getOutDegree()` 메서드 추가
