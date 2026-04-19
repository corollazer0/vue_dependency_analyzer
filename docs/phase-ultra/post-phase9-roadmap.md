# Post-Phase-9 Roadmap (Phase 10 → 15)

> 작성일: 2026-04-19
> 전제: Phase-Ultra 0~9b 머지 완료 (PR #1~7 in main)
> 목적: phase9-plan §6 백로그 + 7a/7b/8/9a/9b benchmark 의 deferred 항목을 phase 단위로 묶어 후속 작업의 단일 진실 공급원(SoT)을 만든다.

## 핵심 원칙

각 phase 는 단일 phase plan 문서를 가지며 (`docs/phase-ultra/phase{N}-plan.md`) 작업의 계약이다. 머지 전 게이트 검증 → `phase{N}-benchmark.md` 작성 → user 의 머지 승인 (또는 위임된 자동 머지). Phase 7~9 와 동일한 사이클.

**Cross-phase 계약 (briefing §5 패턴)**: 후속 phase 가 의존하는 인터페이스는 도입 phase 가 export 면을 동결한다. 본 로드맵은 그 의존선을 미리 표로 고정해 둔다 — 도입 phase 머지 시 인터페이스 freeze test 를 같이 추가한다.

---

## Phase 매핑 (한눈에)

| Phase | 트랙 | 추정 | 핵심 산출 | 의존 |
|---|---|---|---|---|
| **10** | Polish & Promises | 2-3w | 7~9 의 deferred 10건 일괄 정리 (Pathfinder reverse, parser meta, signature perf, file picker, gitlab-mr, axe-core, etc.) | Phase 9b |
| **11** | History (F8 + F12) | 4-5w | git blame 메타 + architecture diff over time | Phase 10 |
| **12** | MSA Native (F10) | 4-5w | top-level service-to-service 그래프 + 서비스 경계 Pathfinder | Phase 10 |
| **13** | Schema Drift (F11) | 3-4w | MyBatis 동적 SQL 강화 + DDL diff 감지 | Phase 8 SignatureStore |
| **14** | Developer Surface (F13/F14/F15) | 4-5w | VSCode extension + C4/Mermaid export + LLM explain (Anthropic SDK) | Phase 11 (history) optional |
| **15** | APM Realtime (조건부) | 미정 | OTel realtime collector — **사업 정당화 후에만 진행** | Phase 9b OtelReader |

총 **6 phases / 약 17~22w** 범위. Phase 15 는 §6 anti-suggestion 위배 가능성으로 사실상 옵션.

---

## Cross-phase 계약 미리보기

| 산출물 | 도입 | 소비 | 계약 내용 |
|---|---|---|---|
| Pathfinder `dir=reverse` query | 10-1 | (UI 상위), Phase 11 git blame integration | `/api/graph/paths?from&to&dir=reverse` 응답 형식 = 기존 `/paths` 와 동일 (paths[][]). 클라이언트는 dir 만 추가 |
| Parser `lineCount`/`packageCount` | 10-2 | 9b AntiPatternClassifier 자연 발생 + Phase 11 hotspot ranking | 모든 `ts-module` / `vue-component` / `spring-service` 노드 metadata 에 두 필드 항상 존재 (없으면 0) |
| SignatureStore `signaturesOnly` mode | 10-3 | Phase 8 baseline workflow (재가동), Phase 13 schema drift snapshot | parse pipeline 에 `--signatures-only` 옵션이 linker/analyzer 단계를 skip. 35% wall-time 목표 |
| Git blame metadata interface | 11-1 | Phase 12 MSA service ownership view, Phase 14 LLM context | 노드 metadata 에 `lastTouchedAt: string`, `lastAuthor: string`, `commitCount: number` |
| Architecture snapshot store | 11-N | Phase 13 schema drift integration | sqlite table `arch_snapshots(label, node_count, edge_count, by_kind_json, created_at)` |
| MSA service-edge kinds | 12-1 | Phase 14 C4 export (component diagram) | 새 EdgeKind `service-calls` (HTTP) / `service-shares-db` (DB common) |
| C4 export shape | 14-N | (외부 PlantUML/Mermaid 컨슈머) | `vda export --c4 [container|component] --out file.puml` 표준 스키마 |

---

## Per-phase plan 파일

- `docs/phase-ultra/phase10-plan.md` — Polish & Promises
- `docs/phase-ultra/phase11-plan.md` — History (F8 + F12)
- `docs/phase-ultra/phase12-plan.md` — MSA Native (F10)
- `docs/phase-ultra/phase13-plan.md` — Schema Drift (F11)
- `docs/phase-ultra/phase14-plan.md` — Developer Surface (F13/F14/F15)
- `docs/phase-ultra/phase15-plan.md` — APM Realtime (조건부)

각 phase plan 의 형식은 기존 Phase 7~9 plan 과 동일 (배경 → 범위 → 체크리스트 → 게이트 → 리스크 → 의존 → 커밋단위).

## 다음 세션 시작 전 점검

각 phase 시작 시:
1. `docs/phase-ultra/phase{N}-plan.md` 정독
2. cross-phase 계약 (위 표 + 각 plan 의 §의존) 확인
3. main 최신 동기화 + 새 브랜치 `feature/phaseN` (또는 sub-track 별 분기)
4. `docs/phase-ultra/phase{N-1}-benchmark.md` 의 deferred 행이 본 phase 에서 처리되는지 cross-check

---

## 우선순위 / 사업 가치 가이드

| 우선 | 트랙 | 사업 가치 |
|---|---|---|
| ★★★ | Phase 10 (Polish) | 전 phase 의 약속 정리 — 신뢰 + 채택 |
| ★★★ | Phase 11 F8 git blame | "누가 마지막에 만진 코드?" — 일상 디버깅 |
| ★★ | Phase 12 F10 MSA | 사용자 실제 워크로드(11 service)에 결정적 |
| ★★ | Phase 13 F11 Schema drift | 운영 사고 예방 |
| ★★ | Phase 14 F13/14/15 | 외부 채택 확장 (IDE, 다이어그램, LLM) |
| ★ | Phase 15 APM realtime | anti-suggestion 위배 위험 — 사업 정당화 필수 |

★★★ 우선순위 두 개 (Phase 10, Phase 11 F8) 만 끝나도 Phase-Ultra 의 약속이 100% 이행됨.
