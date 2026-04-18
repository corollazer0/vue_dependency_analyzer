# Phase-Ultra 최종 검토 의견서

> 작성일: 2026-04-18
> 대상: `/docs/phase-ultra/` 8개 문서 + 현 코드베이스 (Phase X-2c 기준, 커밋 `2e08ecb`)
> 범위: 대규모(2-3K Vue + 300-500 Spring/MSA × 11 서비스 = 15K-20K 파일) 성능 최적화 계획
> 목적: 구현 착수 전 계획의 정합성·우선순위·리스크를 단일 문서로 정리

---

## 0. 리뷰 프로세스 기록

### 0-1. 프로젝트 이해 플랜 (실제 수행)

| 단계 | 수행 내용 | 산출물 |
|---|---|---|
| 1 | 패키지 구조 · CLAUDE.md · 메모리 파일로 현 상태 확인 | core/cli/server/web-ui 4 workspace 확인 |
| 2 | `packages/*/src` 트리 확인, 주요 서브디렉토리(analyzers, engine, graph, parsers, linkers, git) 파악 | 기능 카탈로그 |
| 3 | `docs/phase*summary*.md`, `phase-x2-*`, `phase-x2c-*`와 대조하여 "출시된 기능 vs 계획된 기능" 구분 | 145 테스트, Phase 5까지 shipped 확인 |
| 4 | `docs/phase-ultra/` 8개 문서 전량 정독 | `/tmp/phase-ultra-summary.md` |
| 5 | 문서가 지목한 핫스팟 5곳을 실제 소스에서 검증 | 아래 0-3 표 |

### 0-2. 문서 검토 플랜 (실제 수행)

1. **3개 전문가 리뷰(algorithm / frontend-lead / performance)** 를 근거 문서로 삼고, 초기 `large-scale-optimization-plan.md` 의 어떤 주장이 수정·폐기되었는지 diff 추적
2. **2개 렌더링 재검토(rendering-library-review, graph-visualization-comprehensive-review)** 는 "Sigma.js vs Cytoscape vs G6 v5 vs Ogma" 매트릭스 해소 맥락으로 읽음
3. **view-specific-library-strategy** 는 아키텍처 가드레일(뷰별 독립 렌더러)로 해석
4. **`large-scale-optimization-plan_final.md`** 을 ground-truth 로 두고, 리뷰에서 **유실되었거나 희석된 권고** 를 별도 수집
5. 현 코드와 대조하여 수치(V8 heap 212MB, fcose 복잡도 등) 중 **검증 가능한 것만** 확정, 나머지는 "벤치마크로 확정" 플래그

### 0-3. 코드 실측 대조 (핫스팟 검증 결과)

| 문서 주장 | 실제 코드 위치 | 확인 |
|---|---|---|
| `engine.ts:160-172` O(n*m) 캐시 저장 루프 | `packages/server/src/engine.ts:160-172` | ✅ **일치**. 파일 20K × result.nodes.filter × result.edges.filter = 실제 O(F·(N+E·k)) |
| `engine.ts` 캐시 루프에서 `readFileSync` 재호출 | `packages/server/src/engine.ts:162` | ✅ **일치**. 이미 worker 가 읽은 파일을 다시 read |
| `query.ts` BFS `queue.shift()` | `packages/core/src/graph/query.ts:41` | ✅ **일치**. `reachableFrom` 구현이 shift() 기반 |
| `query.ts` findPaths `path.includes()` 및 결과 캡 없음 | `packages/core/src/graph/query.ts:118`, 결과 배열 무제한 | ✅ **일치**. 재귀 DFS, 최악의 경우 O(n!) |
| `ForceGraphView.vue:510` document listener 누수 | `packages/web-ui/src/components/graph/ForceGraphView.vue:510-512` (+ `:538` 의 `onUnmounted` 는 `cy.destroy()` 만) | ✅ **일치**. `removeEventListener` 누락 |
| 초기 플랜: "Sigma.js는 k-d tree" | Sigma.js 소스 · Algorithm 리뷰 | ❌ 실제는 **quadtree** (수정 반영됨) |
| 초기 플랜 V8 heap 37MB @ 75K/300K | Performance 리뷰 재계산 | ❌ 실제 **~212MB** (수정 반영됨) |

**결론**: `_final.md` 가 지목한 **Phase 0 긴급 버그 5건은 코드 상에서 그대로 재현되는 실제 버그**. 즉시 착수할 가치 있음.

---

## 1. Executive Summary — 수용·보류·폐기 권고

### A. 즉시 수용 (Phase 0-1, 3주 내)
- `engine.ts:160-172` 재작성 (파일→노드 선인덱싱으로 O(F+N+E)), 같은 루프의 `readFileSync` 중복 제거
- `query.ts` BFS → 인덱스 큐, `findPaths` Set + 결과 캡(예: 100)
- `ForceGraphView.vue` document listener `onUnmounted` 정리
- Fastify `@fastify/compress` **brotli q4** + ETag + route schema 기반 `fast-json-stringify`
- Docker: `--max-old-space-size=2048`, 컨테이너 메모리 3GB+, Alpine → Debian slim

### B. 조건부 수용 (PoC 결과에 따라)
- **G6 v5 WebGL + Combo PoC (2주)**: 50K@60fps / compound expand <100ms / 번들 +<20% 게이트 통과 시에만 Phase 3 전환
- **Progressive Disclosure API** 4계층(overview/service/directory/node): Phase 2 스펙 확정 후 착수
- **better-sqlite3(WAL) 기반 ParseCache**: 현 JSON 캐시가 warm 시 db-table 유실(P1, Phase 6 오딧) 이슈를 해결하는 부수 효과까지 포함해 리스크 대비 이득이 큼

### C. 보류 (근거 부족·ROI 불명)
- **자동 Semantic Zoom (스크롤 트리거)**: flicker·상태 폭발 리스크. Phase 4 로 지연이 적절
- **NDJSON 스트리밍 + brotli 조합**: brotli streaming flush 가 약해 실측 전 도입 금물 (performance review 4.3). 실제 TTFB 이득 측정 후 결정
- **Leiden / 스펙트럴 스파시피케이션**: 현 JS 생태계 성숙도 낮음. Louvain 도입 후 1년 관찰 권장

### D. 폐기 권고
- **Sigma.js v2 전면 이관**: compound node 미지원 + SVG export 손실 + `@sigma/vue` 안정성 이슈로 _final.md 도 이미 폐기. 이 결정은 최종 문서에 **번복 불가 항목으로 명시 필요**
- **MessagePack**: Progressive Disclosure + brotli 이후 이득 <5%. 포맷 중립성만 해침
- **HTTP/2 Server Push**: 브라우저에서 제거됨

---

## 2. 문서별 평가

### 2-1. `large-scale-optimization-plan.md` (초기 플랜)
- **장점**: 5계층 병목 구조화, Progressive Disclosure 개념 정립
- **치명적 약점**: ① Sigma.js의 compound node 미지원을 놓침 (프로덕트 최대 사용성 회귀 원인) ② V8 heap 계산 5.7배 과소 추정 ③ fcose 복잡도 오독
- **상태**: 세 전문가 리뷰가 대부분 반박 → `_final.md` 에 충실히 반영됨

### 2-2. `review-algorithm-expert.md`
- **최강점**: 세 리뷰 중 **실제 코드 경로 지적이 가장 구체적**. query.ts 의 3가지 버그 모두 실코드에서 재현. `CrossBoundaryResolver` 의 `getAllEdges().filter` 9회 반복 패턴 → `getEdgesByKind()` 인덱스 제안은 즉시 도입 가치 있음
- **약점**: 스펙트럴 스파시피케이션·METIS 등 이론 카탈로그는 현재 단계에 과해 Phase 4+로 미룸이 타당
- **수용 권고**: Phase 0·2 의 **데이터 인덱스 추가**(`getEdgesByKind`, `getInDegree`, `getOutDegree`)는 렌더러 교체와 무관하게 **비용 대비 이득이 가장 큰 항목**

### 2-3. `review-frontend-lead.md`
- **최강점**: Sigma.js 마이그레이션 비용을 "ForceGraphView.vue 85% 재작성 = 4-6주" 로 정량화. PoC 선행 권고가 합리적
- **약점**: compound node 대체 UX(확장/축소)에 대한 프로토타입 구체안이 텍스트 수준
- **중요 파생**: **graphStore 4-way split**(data/filter/interaction/overlay) 은 PoC 성공 여부와 무관하게 착수해야 함 (344줄 단일 store → 리팩터링 필요)

### 2-4. `review-performance-expert.md`
- **최강점**: V8 heap 재계산(212MB), brotli 벤치, engine.ts:160-172 핫스팟 특정 — **세 리뷰 중 서버 쪽 즉효성이 가장 크다**
- **약점**: 일부 실측값(fast-json-stringify 80-120ms 등)이 마이크로 벤치 수준이라 실제 라우트에서의 이득은 더 측정 필요
- **누락/유실**: 아래 5-2 절의 `readFileSync` 1회차 유지, 서버사이드 trie 검색, `/api/admin/metrics` 구체 스펙 등은 `_final.md` 반영 과정에서 희석됨 → 재반영 권고

### 2-5. `graph-visualization-comprehensive-review.md` + `rendering-library-review.md`
- **핵심 기여**: 2026년 시점에서 **OSS 단일 해로는 대규모 + compound 동시 만족 불가** 라는 명시적 결론
- **G6 v5 제안의 리스크**: ① 공식 문서 중문 우선 ② 60K+ demo 는 Combo 활성화 시 성능 특성 불확실 ③ Vue wrapper 미성숙 → **PoC 선행은 필수**
- **상용 fallback(Ogma)**: 라이선스 비용·계약 프로세스까지 Phase 2.5 시작 전에 확보해둘 것

### 2-6. `view-specific-library-strategy.md`
- **제언**: 4개 뷰가 이미 독립 렌더러를 쓰는 구조(Cytoscape / D3 / HTML table / 가상 스크롤 후보)이므로 **뷰별 라이브러리 독립** 은 아키텍처 원칙으로 성문화 권장
- **핵심 주의**: WebGL 컨텍스트 제한(브라우저당 8-16개)으로 **Graph 뷰만 WebGL 사용** 원칙을 코드 주석/린트 룰로 강제
- **공통화**: `NODE_COLORS`, `NODE_STYLES`, `EDGE_KIND_LABELS` 은 `@vda/web-ui/types/graph.ts` 에 단일 소스 유지 (렌더러 교체 시 diff 최소화)

---

## 3. 계획의 구조적 이슈 3가지

### 3-1. Phase 0 와 Phase 2.5 가 병렬 가능함에도 직렬 기재됨
Phase 0 (백엔드·쿼리 핫픽스)과 Phase 2.5 (프론트 G6 PoC)는 담당 영역이 분리돼 있다. 최종안에서 "직렬 로드맵" 으로 제시되면 프론트엔드 엔지니어가 2-3주 대기하거나 역으로 백엔드가 대기하게 됨. **트랙 A/B 로 병렬 주행** 하고, Phase 1 Progressive Disclosure API 스펙 확정 지점을 싱크 포인트로 잡는 게 맞다.

### 3-2. Phase 6 오딧에서 확인된 "캐시 warm 시 db-table 유실 버그" 가 Phase-Ultra 로드맵과 충돌
현재 JSON 캐시 → SQLite 전환은 Phase 2로 잡혀 있으나, **현존 P1 버그(warm-cache 시 db-table 노드 0개)** 는 이 리팩터링의 사전 조건이 될 수 있다. 두 가지 선택:
- (권장) Phase 0 범위에 "캐시 warm 시 노드 정합성 회귀 테스트 추가 + 임시 fix"를 포함해 SQLite 도입까지 버그 확산 방지
- SQLite 전환 시 스키마 차원에서 db-table 유실을 구조적으로 차단 (`nodes` 테이블의 PK에 `kind` 포함)

### 3-3. CI 벤치마크 게이트의 실효성 확보 수단 부재
_final.md_ 에 "10% regression fails" 가 있으나, 변동성을 다루는 방법(noise floor, 샘플 수, warmup, 하드웨어 편차)과 실패 시 **차단 vs 경고** 정책이 비어 있다. 초기에는 **경고 + PR 코멘트**로 운영, 3회 이상 회귀가 안정적으로 관측되는 지점부터 차단으로 전환하는 2단계 정책을 권장.

---

## 4. 최종 수정된 로드맵 (권고)

```
[Track A: 백엔드/쿼리]                 [Track B: 프론트/렌더링]
Phase 0  (3-5d)                       Phase 0  (2-3d)
 - engine.ts O(n*m) 핫픽스              - ForceGraphView 리스너 정리
 - query.ts BFS/findPaths 수정          - graphStore 4-way split (리팩터)
 - readFileSync 중복 제거               - refreshGraph() 증분 업데이트(eles.diff)
 - warm-cache 회귀 테스트               - WebGL 테스트 환경(puppeteer) 세팅
 - Docker mem / Debian slim

Phase 1 (1-2w)                        Phase 1 (1-2w)
 - brotli q4 + ETag + fast-json-str.    - CommandPalette·overlay HiddenClass 정리
 - toJSON dirty-flag 캐시               - Tree View D3 join() 도입
 - getAllNodes() iterator 화            - Matrix View Canvas 2D heatmap PoC

Phase 2 (2-3w)   ← Progressive API 스펙에서 싱크
 - SQLite(WAL) 캐시 전환                - Progressive Disclosure 클라이언트
 - worker pool + Transferable           - graphStore 4-way 최종화
 - DependencyGraph 인덱스 추가           - Louvain 기반 중간 줌 계층(준비)
 - MSA serviceId 주입(ParallelParser)

Phase 2.5 (2w)  ← 병렬 PoC, 결과에 따라 Phase 3 분기
 - 부하 생성용 15K-20K 픽스처 확정        - G6 v5 WebGL+Combo PoC
                                        - 성공 게이트 통과 여부 결정

Phase 3 (3-4w)  ← PoC 결과에 따라
 [성공] G6 이관 · 3-단 레이아웃 · 명시적 드릴다운 줌
 [실패] Cytoscape 데이터 감축 전략 + Ogma 상용 계약 트랙 개시

Phase 4 (2-3w, 상시)
 - /api/admin/metrics, CI bench gate
 - NDJSON streaming(gzip 동반 실측 후)
 - 자동 semantic zoom 도입(드릴다운 안정화 이후)
```

---

## 5. _final.md_ 에 반영을 권고하는 추가 항목

### 5-1. 명시적 불변 사항(Do-Not-Touch)
아래는 향후 논의에서 재오픈되지 않도록 _final.md_ 상단에 고정해 두기를 권장:
- Sigma.js v2/v3 단독 이관은 폐기 (compound node 부재)
- HTTP/2 Server Push 불사용
- MessagePack 불도입 (Progressive Disclosure + brotli 조합 이후 ROI 부족)
- 자동 스크롤 기반 semantic zoom 은 Phase 4 이전 금지
- WebGL 은 Graph 뷰 한정

### 5-2. 리뷰에서 유실된 실무 권고 (재수용 요청)
| 항목 | 근거 문서 | 권고 |
|---|---|---|
| `readFileSync` 1회차 결과를 worker → main 으로 전달해 두 번째 read 제거 | performance 8.1-B | Phase 0 에 포함 |
| 서버사이드 trie/inverted index 검색 | performance 8.1-D | Phase 2 와 함께 `fuse.js` 를 보완 |
| `/api/admin/metrics` 에 heap/GC/lastGcDuration/RSS 포함 | performance | Phase 1 말 |
| `readFileSync` 동기 I/O 로 서버 이벤트 루프 블로킹 여부 → async fs 전환 | performance | Phase 2 |
| `ParallelParser` 가 node metadata 에 `serviceId` 를 주입 (partitioning 선행 조건) | algorithm 3.3 | Phase 2 초반 |
| `DependencyGraph.removeByFile()` 1-hop 역의존성 재범위화 | algorithm 7.2 | Phase 2 |
| Vite worker bundling config (FA2 WebWorker 대비) | frontend-lead 6-4 | Phase 2.5 착수 시 |
| `cytoscape-canvas` 오버레이 레이어 분리 (저비용 개선) | frontend-lead 7-1.3 | Phase 1 |
| `eles.diff()` API 명시 (refreshGraph 증분) | frontend-lead 7-1.1 | Phase 0-1 |

### 5-3. 의사결정 게이트 정의 (현재 모호함)
- **Phase 2.5 PoC 성공 게이트 (재확인)**: 50K 노드 @ 60fps, compound expand <100ms, hover/path highlight 재현, 번들 증가 <20%, **실측 환경은 MacBook Air M2 + Chrome 기준**(하드웨어 없이 "60fps"는 무의미)
- **Ogma 도입 결정 게이트**: PoC 실패 + 데이터 감축으로 3K-5K 유지 불가한 프로젝트 비율 > 30% 시 상용 계약 기안
- **Semantic zoom 자동화 게이트**: Phase 3 드릴다운이 1개월간 사용자 이슈 ≤ 2건 기록 시 Phase 4 자동화 착수

---

## 6. 리스크 등록부

| # | 리스크 | 영향 | 대응 |
|---|---|---|---|
| R1 | G6 v5 Combo 활성화 시 대규모에서 성능 특성 미공개 | Phase 2.5 실패 시 3-4주 손실 | PoC 초기 1주에 "Combo 끈 baseline → Combo 켠 상태" 2단 측정 |
| R2 | 자체 Vue 래퍼 품질 (G6/Sigma 둘 다 공식 Vue 래퍼 약함) | 유지보수 비용 지속 증가 | `@sigma/vue` 사용 금지는 명문화, G6 도 자체 composable 작성 원칙 |
| R3 | SQLite 캐시 멀티 프로세스 쓰기 | Watch 모드에서 병행 분석 시 손상 | WAL + 단일 writer (main) · worker 는 read-only 원칙 코드 리뷰로 강제 |
| R4 | Docker 메모리 3GB 환경 미보장 (사내 CI 제한) | OOMKill | 분석 시작 시 `process.memoryUsage()` 프리체크, 부족 시 명시적 실패 |
| R5 | Phase 6 잔존 P1 (db-table 유실) 가 캐시 전환 중 마스킹 | 회귀 장기 잠복 | Phase 0 회귀 테스트가 SQLite 전환 후에도 green 이어야 머지 |
| R6 | brotli streaming flush 약함 | Phase 4 NDJSON 도입 시 TTFB 기대와 실측 괴리 | NDJSON + gzip 조합으로 선도입 후 brotli 교체 벤치 |
| R7 | 상용 라이선스 확보 리드타임 (Ogma) | Plan B 지연 | Phase 2 시작 시 구매 품의 초안 착수 |
| R8 | 접근성(a11y) 회귀: WebGL 스크린리더 비호환 | 정부·공공 사업 진입 장벽 | Tree View 텍스트 대체 유지 + ARIA landmark, WebGL 뷰는 "text alternative" 버튼 노출 |

---

## 7. 종합 의견

`_final.md` 는 세 전문가 리뷰·두 렌더링 재검토를 성실히 머지한 결과물로, **큰 방향(Cytoscape 유지 → G6 PoC → 결과에 따른 분기)** 은 2026년 기술 생태계에서 합리적인 선택이다. 다만 다음 3가지를 보완하지 않으면 착수 단계에서 흔들릴 여지가 있다.

1. **Phase 0 는 단순 버그픽스로 기술돼 있으나, 실제로는 프로덕션 P1(캐시 warm 시 db-table 유실)과 묶어 처리해야 리스크가 줄어든다.**
2. **백엔드/프론트 트랙을 병렬로 명기**하지 않으면 일정·리소스 낭비가 발생한다.
3. **의사결정 게이트(PoC 성공/Ogma 도입/semantic zoom 자동화)를 정량 기준으로 성문화** 해야 추후 재개방 논쟁을 막을 수 있다.

위 3가지를 `_final.md` 에 반영하면, 본 계획을 **그대로 실행 가능한 수준** 으로 승인할 수 있다고 판단한다.

— 본 검토는 현 시점(2026-04-18) 코드와 문서만을 근거로 하며, 실제 15K-20K 규모 실측·G6 PoC 결과에 따라 Phase 3 분기 로드맵은 갱신이 필요하다.
