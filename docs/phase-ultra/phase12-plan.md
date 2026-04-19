# Phase 12 Plan — MSA Native (F10 service-to-service graph)

> 작성일: 2026-04-19
> 브랜치: `feature/phase12` (Phase 11 머지 후)
> 추정: 4-5w
> 범위: painpoint-analysis §4 의 F10 — MSA 환경에서 service-to-service 통신 / 공유 인프라 시각화

---

## 0. 배경

사용자 실 환경 = Vue 3 frontend + 11 service Spring Boot MSA. 현재 분석은 service-internal 그래프는 잘 만들지만 service-to-service 가 squash 되어 보이지 않는다 (MSA `services[]` 설정으로 serviceId 만 태깅, 시각화는 같은 평면).

목표:
- top-level "service node" 1차 시민화
- service A → HTTP call → service B → service B endpoint 의 chain 을 명시적으로 추적
- 공유 DB / 공유 mybatis / 공유 DTO 패키지 강조 (anti-pattern: service 간 DB 공유는 보통 코드 스멜)

---

## 1. 범위

### 1-1. 신규 NodeKind / EdgeKind

| 종류 | 의미 |
|---|---|
| NodeKind `msa-service` | services[] 의 한 항목당 1 노드 (frontend 도 1 service 로 취급) |
| EdgeKind `service-calls` | service A 가 service B 의 endpoint 를 HTTP 호출 |
| EdgeKind `service-shares-db` | service A 의 mybatis-statement 가 service B 가 owning 하는 db-table 을 read/write |
| EdgeKind `service-shares-dto` | service A 와 B 가 같은 DTO fqn 을 import |

### 1-2. UI 뷰

- 새 탭 "Services" — top-level msa-service 노드만 보이는 그래프 (cytoscape 컴파운드 노드로 service-internal 노드 묶기 옵션)
- 클릭 시 expand → 해당 service 의 component / controller / service / mapper 다 표시
- service-shares-db / dto 엣지에 경고 색상 (anti-pattern hint)

### 1-3. 명시적 제외

- gRPC / Kafka / SQS 등 비-HTTP 통신 — Phase 13+ (별도 파서 필요)
- service ownership / on-call 매핑 — Phase 14 LLM 또는 외부 시스템 통합

---

## 2. 체크리스트

| # | 항목 | 파일 |
|---|---|---|
| 12-1 | `MsaServiceGraphBuilder` 신규 — 분석 끝난 그래프에 msa-service 노드 + 3 EdgeKind 추가 (post-processing). serviceId 가 없는 노드는 unassigned service 로 묶기 | `core/src/analyzers/MsaServiceGraphBuilder.ts` |
| 12-2 | `service-calls` 추출: 각 api-call-site (vue 또는 service) 의 serviceId vs 매칭된 spring-endpoint 의 serviceId 가 다르면 service-calls 엣지 emit | 위 파일 |
| 12-3 | `service-shares-db` 추출: mybatis-statement 의 serviceId vs reads/writes-table 의 db-table 첫 owner serviceId 가 다르면 emit. table owner = 처음으로 그 table 에 write 하는 service 로 정의 | 위 파일 |
| 12-4 | `service-shares-dto` 추출: spring-dto 의 serviceId vs 그 DTO 를 참조하는 spring-endpoint 의 serviceId 가 다르면 emit | 위 파일 |
| 12-5 | NodeKind / EdgeKind union 확장 + NODE_STYLES / EDGE_STYLES / filterStore presets / Legend cascade. msa-service = round-rectangle 큰 사이즈, 색상 service 별 hash | `core/src/graph/types.ts`, `web-ui/src/types/graph.ts`, `web-ui/src/stores/graph/filterStore.ts` |
| 12-6 | Server `GET /api/graph/services` — top-level service 그래프만 (msa-service 노드 + 3 inter-service EdgeKind) | `server/src/routes/graphRoutes.ts` |
| 12-7 | UI 뷰 "Services" 탭 — cytoscape, msa-service 노드 클릭 시 internal expansion | `web-ui/src/components/graph/ServicesView.vue` 신규, `App.vue` |
| 12-8 | Pathfinder 가 service-calls / service-shares-db / service-shares-dto 도 forward DFS 에서 자연스럽게 따라가도록 — edge kind weight 추가 (Phase 7a-4 의 weight map 확장) | `web-ui/src/components/graph/PathfinderPanel.vue` |
| 12-9 | RuleEngine 룰 추가 후보: `no-cross-service-db` (`service-shares-db` 0 게이트) — `.vdarc.json` 의 `rules[]` 에 새 type | `core/src/analyzers/RuleEngine.ts`, types.ts |
| 12-10 | E2E: test-project-ecommerce (3 service) 에서 service-calls ≥ 1, service-shares-dto ≥ 1 검출 | `core/src/__tests__/e2e-fixture.test.ts` 또는 신규 `msa-graph.test.ts` |

---

## 3. 성공 지표 (게이트)

- test-project-ecommerce 분석 → msa-service 노드 = `services[].length` (3)
- service-calls 엣지 ≥ 1 (frontend → user-service 등)
- service-shares-dto 또는 service-shares-db 의도된 anti-pattern 발견 (현 fixture 에 1건)
- "Services" 뷰가 expand/collapse 토글 정상
- Pathfinder 가 cross-service path 1건 이상 발견 (vue → service-calls → endpoint → ...)
- 신규 NodeKind / EdgeKind 가 모든 viewer (BottomUp, Tree, Matrix) 에 회귀 없이 표시
- 회귀 0

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | table owner 정의가 모호 (3 service 가 모두 같은 DB instance 쓰는 monolith-DB) | "처음으로 write 하는 service" 휴리스틱 + UI 에 "ownership: heuristic" 마커 표시 |
| R2 | 컴파운드 노드 cytoscape 성능 (5K 노드 squash 시) | Phase 5 bench 가드 그대로 — G1 < 400ms, G2 < 100ms 게이트 유지 |
| R3 | service-shares-dto 가 false positive (공유 dto 패키지가 의도된 contract 일 수도) | 룰엔진 옵트인 (`no-cross-service-dto`) 으로 사용자 선택. default 는 표시만 |

---

## 5. 의존

- Phase 10 (필수) — Pathfinder reverse 모드가 cross-service path 의 양방향 탐색에 필요
- Phase 11 (선택, 강력 권장) — service ownership 표시에 lastAuthor metadata 활용
- Phase 2-6 services[] tagging — 이미 main 머지 (PR #1)

---

## 6. Cross-phase 계약 freeze

| 계약 | 도입 | 소비 |
|---|---|---|
| msa-service NodeKind + 3 inter-service EdgeKind | 12-1/5 | Phase 14 C4 export (container/component diagram), Phase 13 schema drift (cross-service DDL impact) |

---

## 7. Phase 12 종료 조건

- 10 체크리스트 ✅
- bench G1/G2 회귀 0
- E2E 게이트 (3 msa-service + ≥1 service-calls) green
- C4 export (Phase 14) 가 msa-service 노드를 component diagram 컨테이너로 변환 가능한지 PoC 1회 (export 자체는 14 에서)
