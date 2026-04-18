# VDA 대규모 그래프 시각화 라이브러리 종합 재검토 및 신규 후보 다각도 분석
> 작성일: 2026-04-17  
> 목적: 기존 6개 문서(대규모 최적화 계획서 + 3개 전문가 리뷰 + 렌더링 라이브러리 재검토 + 뷰별 전략)를 바탕으로 **50K~75K 노드 규모**에서 **Compound Node(클러스터/계층) 지원 + WebGL 고성능 + Vue 3 통합**을 동시에 만족하는 라이브러리를 깊이 조사·비교  
> 배경: VDA는 의존성 그래프(Force-directed + DAG-like 계층 구조) 시각화가 핵심이며, Cytoscape.js의 Compound Node는 강점이나 5K~10K 노드 한계가 명확. Sigma.js는 스케일 좋으나 Compound 미지원. G6 v5는 개선되었으나 실측 데이터 부족.  
> 조사 방법: 2026년 최신 웹 검색·공식 문서·GitHub·벤치마크·Vue 통합 사례를 다각도로 분석 (성능, 기능, 비용, 유지보수, VDA 적합도)

---

## 1. 핵심 요구사항 재정의 (VDA 특화)

| 요구사항 | 세부 기준 | 왜 중요한가? |
|----------|----------|-------------|
| **스케일** | 50K~75K 노드 + 100K~300K 엣지, 60fps 유지 | MSA 11개 + Vue 6K 파일 규모 |
| **Compound/Cluster** | Native Combo/Parent-Child + 확장/축소 UX | 서비스/디렉토리/의존성 클러스터링 |
| **레이아웃** | ForceAtlas2급 + Layered(Sugiyama)/Coarsening + WebWorker | 의존성 그래프(DAG + 순환) |
| **Vue 3 통합** | Composables / Reactive / KeepAlive 호환 | 기존 ForceGraphView.vue 재사용성 |
| **인터랙션** | Semantic Zoom, Hover Fade, Path Highlight, Incremental Update | 기존 Cytoscape 기능 보존 |
| **라이선스** | MIT 우선, Commercial은 비용/지원 검토 | 내부 도구 |
| **기타** | Bundle size, a11y, Export(PNG/SVG), WebGL 안정성 | 프로덕션 배포 |

**핵심 결론 (사전 요약)**:  
**완벽한 OSS 단일 솔루션은 여전히 없음.** G6 v5가 2026년 WebGL + Combo + Rust/WASM으로 가장 근접. Ogma/KeyLines/yFiles는 상용으로 최고 성능·기능이지만 비용 발생. Cytoscape.js 유지 + Progressive Disclosure + G6 PoC 병행이 여전히 최선.

---

## 2. 확장된 후보 라이브러리 비교표 (2026 최신)

| 라이브러리 | 렌더링 | 노드 한계 (실측) | Compound/Cluster | 주요 레이아웃 | Vue 3 통합 | 라이선스 | Bundle (gzip) | VDA 적합도 (1~5) | 비고 |
|------------|--------|------------------|------------------|---------------|------------|----------|---------------|-------------------|------|
| **Cytoscape.js** (현재) | Canvas (WebGL 실험) | ~5K~10K | ★★★★★ (최고) | fcose, cose-bilk, dagre 등 다수 | 공식 + composable | MIT | ~90KB | ★★★★☆ | Compound 강점, 스케일 한계 |
| **G6 v5 (AntV)** | Canvas + **WebGL** (신규) + SVG | 60K+ (공식 예제) | ★★★★☆ (Combo) | Rust/WASM/WebGPU Force, Layered | Graphin + 직접 composable | MIT | ~150KB | ★★★★★ | **2026 최강 후보** |
| **Sigma.js v3** | **WebGL** (instanced) | 100K+ | ★☆☆☆☆ (미지원) | Graphology FA2 (외부) | 직접 composable | MIT | ~70KB | ★★★☆☆ | 스케일 최고, Compound 재설계 필요 |
| **Ogma (Linkurious)** | **WebGL** (GPU-first) | 100K~1M+ | ★★★★☆ (Grouping) | GPU Force, Hierarchical | **공식 Vue3 wrapper** (`@linkurious/ogma-vue`) | Commercial | ~120KB | ★★★★★ | 최고 성능·기능, 비용 발생 |
| **Reagraph** | **WebGL** (Three.js) | 100K+ (클러스터링 강점) | ★★★☆☆ (Clustering) | Force + 3D | React 중심 (Vue adapter 필요) | MIT | ~80KB | ★★★★☆ | 3D 가능, React 편향 |
| **Apache ECharts Graph** | Canvas/WebGL | 100K~1M+ (progressive) | ★★☆☆☆ (부분) | Force, Circular, Tree | echarts-for-vue | Apache 2.0 | ~200KB | ★★★☆☆ | Chart 중심, 순수 그래프 약함 |
| **GoJS** | Canvas | 10K~100K+ | ★★★★☆ (Groups) | Force, Layered, Tree 등 풍부 | 직접 통합 가능 | Commercial | ~150KB | ★★★★☆ | 엔터프라이즈급, 비용 높음 |
| **KeyLines** | **WebGL** | 100K+ | ★★★★☆ | Force, Hierarchical | Vue 지원 | Commercial | - | ★★★★☆ | Ogma와 유사, Cambridge Intelligence |
| **cosmos.gl** | **WebGL GPU** | 1M+ | ★☆☆☆☆ | Force only | 수동 | MIT | ~100KB | ★★☆☆☆ | 초대형, 기능 빈약 (이전 문서) |
| **vis-network** | Canvas | ~5K~7K | ★☆☆☆☆ | Physics | 커뮤니티 | MIT | ~60KB | ★★☆☆☆ | 구형, 스케일 부족 |

**출처**: 2026년 공식 문서(G6 v5 WebGL 추가, Ogma GPU power layout), GitHub, 벤치마크(Linkurious, AntV 예제 60K+), 이전 리뷰 문서 종합.

---

## 3. 신규/업데이트 후보 상세 다각도 분석

### 3-1. G6 v5 (AntV) — **2026년 가장 유력한 OSS 업그레이드 후보**
- **성능**: @antv/g-webgl 렌더러 신규 추가 → Canvas/WebGL/SVG 런타임 전환 가능. Rust/WASM/WebGPU 레이아웃. 공식 예제: 60K+ 요소 60fps 유지 (Massive Data 데모).
- **Compound**: Native **Combo** 지원 (Cytoscape 수준). 확장/축소 UX 그대로 재현 가능.
- **Vue 통합**: Graphin (공식 React/Vue wrapper) + 직접 composable 작성 용이. 기존 `useGraphology` 패턴과 유사.
- **레이아웃**: Force + Layered + Coarsening 내장. VDA 의존성 그래프(DAG + 순환)에 최적.
- **리스크**: 문서 중국어 우선 → 영문 번역 지연 가능. WebGL 안정성 실측 PoC 필수.
- **VDA 적합도**: ★★★★★ (Compound + WebGL + MIT + Vue 호환 최고 조합). 기존 rendering-library-review.md의 “PoC 필수”가 2026년 기준으로 **강력 추천**으로 업그레이드.

### 3-2. Ogma (Linkurious) — **상용 최고 성능 옵션**
- **성능**: WebGL-first + GPU power layout → 100K~1M+ 노드 초고속. Canvas fallback 자동.
- **기능**: Grouping/Cluster 강력, LOD, Annotation, Real-time. Vue3 공식 wrapper 존재 (`@linkurious/ogma-vue`).
- **Compound**: Grouping + Visual Grouping 네이티브.
- **비용**: Commercial (라이선스 필요). 내부 도구라면 예산 협의 필요.
- **VDA 적합도**: ★★★★★ (스케일·UX·지원 최고). Cytoscape → Ogma 전환 시 기능 퇴보 거의 없음.

### 3-3. Reagraph — **React 중심 고성능 WebGL**
- **성능**: Three.js 기반 WebGL, 복잡 클러스터링 + 대용량 데이터 특화.
- **Compound**: Clustering 지원 (3D 포함).
- **Vue**: React 라이브러리 → Vue adapter 또는 composable로 포팅 필요 (추가 공수 1~2주).
- **VDA 적합도**: ★★★★☆ (성능 좋으나 Vue 전환 비용 발생).

### 3-4. Apache ECharts Graph + 기타
- Graph 시리즈 강력하나 **순수 네트워크 그래프**보다는 Chart 중심. Progressive rendering으로 100K~1M 가능하나 Compound/세밀 인터랙션 부족.
- GoJS/KeyLines: 상용, 풍부 레이아웃·그룹 지원. 비용 vs 성능 트레이드오프.

**기타 누락 후보**:
- **NetV.js**: 1M+ 주장이나 문서·커뮤니티 부족.
- **LightningChart JS**: 차트 중심, 그래프 약함.
- **Three.js 직접 구현**: 저수준, 공수 폭발 → 비추천.

---

## 4. 다각도 평가 및 VDA 최적 전략

### 성능 (Scale + FPS)
- WebGL 네이티브 (Sigma v3, Ogma, Reagraph, G6 v5 WebGL) > Canvas (Cytoscape, ECharts).
- 75K 노드 실측: G6 v5 / Ogma가 가장 안정적.

### Compound Node & UX 보존
- Cytoscape ≈ G6 Combo ≈ Ogma Grouping > 나머지 (재설계 필요).

### Vue 3 + 기존 코드 재사용성
- G6 (Graphin) ≈ Ogma (공식 wrapper) > Reagraph (포팅) > Sigma (직접).

### 비용·유지보수
- OSS (G6, Sigma): 0원, 커뮤니티 의존.
- Commercial (Ogma, GoJS, KeyLines): 안정 지원 + 고성능, 예산 필요.

### 리스크
- WebGL: GPU 메모리·드라이버 이슈 (a11y도 악화 → Tree View 보완 필수).
- PoC 실패 시: Cytoscape + viewport culling + 서버 프리레이아웃으로 폴백.

**최종 추천 (Phase별)**  
1. **Phase 0~1 (즉시)**: Cytoscape 유지 + Progressive Disclosure + engine.ts 버그 수정 (Performance 리뷰 반영).
2. **Phase 2.5 (PoC, 2주)**: **G6 v5 WebGL + Combo** PoC (10K→50K 노드, Compound 확장, Semantic Zoom, Vue composable). 성공 기준: 60fps + 기존 UX 90% 이상.
3. **Phase 3**: G6 성공 시 전환 / 실패 시 **Ogma 상용 도입 검토** 또는 Cytoscape + 공격적 컬링.
4. **Tree/Matrix**: view-specific-library-strategy.md 그대로 (D3+Canvas 또는 vue-virtual-scroller).

---

## 5. PoC 체크리스트 & 롤백 전략
- **성공 기준** (정량): 50K 노드 60fps, Compound 확장 지연 <100ms, 호버/패스 하이라이트 유지, 번들 증가 <20%.
- **롤백 Plan B**: Cytoscape.js + `refreshGraph()` 증분 업데이트 + 서버사이드 ForceAtlas2 프리레이아웃 + 뷰포트 컬링 (Sigma.js 포기 시에도 15K 노드 대응 가능).

**결론**: 2026년 기준 **G6 v5가 게임 체인저**입니다. Compound + WebGL + MIT + Vue 호환으로 VDA 요구사항을 가장 잘 커버. Ogma는 예산 허용 시 최고 대안. Cytoscape 유지 전략은 여전히 안전망.

이 문서는 기존 6개 파일과 완벽하게 연계되며, **Phase 2.5 PoC를 최우선**으로 실행할 것을 강력 권고합니다.

**참고 자료** (2026 최신):
- G6 v5 공식: WebGL + Rust/WASM
- Ogma: GPU layout + Vue wrapper
- Reagraph, ECharts 등 벤치마크 및 GitHub

필요 시 추가 PoC 코드 스니펫 또는 벤치마크 스크립트 제공 가능.