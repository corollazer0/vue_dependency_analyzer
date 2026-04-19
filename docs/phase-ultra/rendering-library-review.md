# VDA 렌더링 라이브러리 재검토 결과

> 작성일: 2026-04-17
> 목적: 15K~20K 파일 규모에서 최적의 그래프 렌더링 라이브러리 선정

---

## 1. 후보 라이브러리 비교표

| 라이브러리 | 렌더링 | 인터랙티브 노드 한계 | Compound Node | Vue 3 | 레이아웃 | 라이선스 |
|-----------|--------|---------------------|---------------|-------|---------|---------|
| Cytoscape.js (현재) | Canvas, WebGL(실험) | 3K~5K (Canvas), ~10K (WebGL) | **최고** | 검증됨 | **최다** | MIT |
| Sigma.js v3 | WebGL | 20K~50K | **미지원** | 수동 | 없음(외부) | MIT |
| **G6 v5 (AntV)** | Canvas/WebGL | 미검증(WebGL), 600(Canvas@30fps) | **지원(Combo)** | **공식지원** | **최다** | MIT |
| cosmos.gl | WebGL (GPU연산) | **100K~1M+** | 미지원 | 수동 | Force only | MIT |
| force-graph | Canvas/Three.js | 10K~20K | 미지원 | 수동 | Force only | MIT |
| vis-network | Canvas | 3K~7K | 미지원 | 커뮤니티 | 제한적 | MIT |
| yFiles | SVG/WebGL2 | 10K+ (LOD) | **업계 최고** | 수동 | **업계 최고** | **$17K/dev** |
| Ogma | WebGL | 100K+(주장) | 지원 | 수동 | 양호 | **상용** |

---

## 2. 핵심 딜레마

**"대규모 렌더링 성능"과 "Compound Node 지원"을 동시에 만족하는 오픈소스 라이브러리가 없다.**

- 50K+ 노드 렌더링 가능 → cosmos.gl, Sigma.js → Compound Node 미지원
- Compound Node 완벽 지원 → Cytoscape.js, G6 v5 → 50K 노드에서 성능 부족

---

## 3. 전략별 평가

### 전략 A: Sigma.js (원래 계획)

| 장점 | 단점 |
|------|------|
| WebGL 네이티브, 50K 노드 검증 | Compound Node 미지원 — 클러스터 확장 UX 전면 재설계 |
| Graphology 생태계 (FA2 WebWorker) | 레이아웃 알고리즘 없음, 전부 외부 의존 |
| 커뮤니티 활발 (12K stars) | 라벨 렌더링 제한적 |

**리스크**: 현재 ForceGraphView.vue:68-74의 compound node 기반 클러스터 확장을 포기하거나 직접 구현해야 함.

### 전략 B: G6 v5 (새 후보)

| 장점 | 단점 |
|------|------|
| Compound Node(Combo) 네이티브 지원 | WebGL 렌더러 대규모 성능 미검증 |
| **Vue 3 공식 통합** (g6-extension-vue) | Canvas@30fps에서 600 노드 한계 (학술 벤치마크) |
| 10+ 레이아웃 내장 (combo-combined 포함) | 문서가 중국어 우선, 영문 번역 지연 |
| Rust/WASM/WebGPU 가속 레이아웃 | 330+ 오픈 이슈, v5가 아직 성숙 단계 |

**핵심 질문**: G6 v5 WebGL 렌더러가 50K 노드에서 실제로 어떤 성능을 보이는가? → PoC 필수

### 전략 C: 하이브리드 (cosmos.gl + Cytoscape.js)

| 장점 | 단점 |
|------|------|
| cosmos.gl로 100K+ 노드 오버뷰 | 두 라이브러리 유지보수 부담 |
| Cytoscape.js로 서브그래프 상세뷰 | 뷰 전환 시 UX 불연속 |
| 각 라이브러리의 강점만 활용 | 상태 동기화 복잡도 |

### 전략 D: Cytoscape.js 유지 + 공격적 데이터 축소

| 장점 | 단점 |
|------|------|
| 마이그레이션 비용 0 | 라이브러리 자체의 한계는 존재 |
| 기존 compound node, 스타일, 이벤트 전부 보존 | 화면에 보이는 노드를 항상 3K~5K 이하로 제한 |
| WebGL 실험 렌더러 활용 가능 (~10K) | WebGL 렌더러가 아직 불안정 |

---

## 4. 마이그레이션 비용 분석

Cytoscape.js는 **ForceGraphView.vue 단일 파일(539줄)에만 존재**. 다른 뷰와 스토어는 Cytoscape에 의존하지 않음.

| 항목 | 난이도 (1-10) | 비고 |
|------|--------------|------|
| 기본 렌더링 전환 | 6 | 컨테이너 바인딩, 노드/엣지 매핑 |
| 스타일시트 (165줄, 20+ 규칙) | 8 | Cytoscape 전용 DSL, 동적 함수 포함 |
| Compound Node 클러스터 | **9** | 대체 라이브러리에 없으면 직접 구현 |
| fcose 레이아웃 | 8 | 설정 번역 필요 |
| SVG/PNG 내보내기 | 7 | 대체 라이브러리에 따라 다름 |
| 이벤트 핸들링 | 5 | 개념은 동일, API만 다름 |
| **전체 재작성 비율** | **~85%** | ForceGraphView.vue 한 파일 내에서 |

---

## 5. 종합 추천

```
                     성능 필요
                        ↑
                        |
        cosmos.gl ──────┼───── Sigma.js
        (100K+, 기능 빈약)  |   (50K, compound 없음)
                        |
    ────────────────────┼──────────────────── compound node 필요
                        |
        G6 v5 ──────────┼───── Cytoscape.js
        (미검증, 기능 풍부)   |   (5K 한계, 기능 완벽)
                        |
                        ↓
                    기능 풍부
```

### 1순위: 전략 D (Cytoscape 유지) + 전략 B (G6 v5) PoC 병행

근거:
1. Phase 1~2의 서버사이드 최적화(압축, Progressive API, 데이터 축소)만으로도 화면 렌더링 노드를 3K~5K로 유지 가능 — Cytoscape.js 충분
2. G6 v5의 WebGL + Combo 조합이 이론상 최적이지만 대규모 실측 데이터 없음 — 10K 노드 PoC로 검증 필요
3. PoC 결과가 좋으면 G6 v5로 전환, 아니면 Cytoscape 유지 + 공격적 클러스터링
4. Sigma.js는 compound node 미지원으로 UX 손실 큼 — 원래 계획에서 하향 조정

**라이브러리 전환보다 "화면에 보여주는 데이터를 줄이는 것"이 우선.**
