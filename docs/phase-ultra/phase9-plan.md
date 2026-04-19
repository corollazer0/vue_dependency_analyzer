# Phase 9 Plan — Feature Slice (9a) + Anti-Pattern Classifier & APM PoC (9b)

> 작성일: 2026-04-19
> 브랜치: `feature/phase9a` → 머지 후 `feature/phase9b`
> 전제: Phase 7, 8 완료
>
> **Phase 분할 (2026-04-19 권고 반영)**: 단일 phase 에 14 항목은 과다.
> - **9a (3-4w)**: F4 Feature Slice 단독. 온보딩(P4) 트랙.
> - **9b (3-4w)**: F9 Anti-Pattern Classifier + APM reader PoC. 9a 머지 후 착수.
> 9b 의 APM PoC 는 painpoint-analysis §4 의 P3 우선순위. 일정 압박 시 9b 에서 APM PoC 만 Phase 10 으로 이연 가능.

---

## 0. 배경

이 phase 는 **온보딩 pain (P4) 과 런타임 pain (P5)** 을 비로소 건드린다. painpoint-analysis.md §4 의 F4, F9 를 본체로 하고, P5 에 대해서는 Phase 8까지 보수적으로 미뤄둔 **OpenTelemetry reader PoC** 를 추가한다 (Q8).

목표 painpoint 커버리지 변화:
- P4 (온보딩) 20% → 70% (9a 완료 시)
- P5 (장애 추적) **PoC 단계 — 1-fixture 기준 시각화 검증**. 정량 커버리지 평가는 실제 OTel 데이터 운영 적용(Phase 10+) 이후로 미룸. "10%→40%" 같은 수치 목표는 PoC 단계에서 측정 불가하므로 게이트에서 제외.

---

## 1. 범위

### 1-0. Phase 9a vs 9b 매핑

| 트랙 | 항목 | 브랜치 |
|---|---|---|
| **9a** | F4 Feature Slice (1-1 / 2-1 / §3 의 F4 게이트) | `feature/phase9a` |
| **9b** | F9 Anti-Pattern + APM PoC (1-2, 1-3 / 2-2, 2-3 / §3 의 F9·APM 게이트) | `feature/phase9b` |

### 1-1. F4 — Feature Slice (온보딩 뷰) [9a]

Q4 결정: `.vdarc.json` 의 `features[]` 를 사용자가 **직접 기록 + `vda init` 에서 heuristic 초안 생성 + 사용자 수정**.

```json
{
  "features": [
    { "id": "payment", "entry": "src/pages/Checkout.vue", "description": "결제 플로우" },
    { "id": "order",   "entry": "src/pages/OrderList.vue" }
  ]
}
```

각 feature 의 `entry` 에서 도달 가능한 노드를 한 슬라이스로 묶어 독립 서브그래프로 렌더.

### 1-2. F9 — Complexity Anti-Pattern Classifier [9b]

기존 ComplexityScorer 의 fan-in / fan-out 수치에 **패턴 태그** 부여:

| 태그 | 조건 (초안) | 권장 액션 |
|---|---|---|
| `god-object` | fan-out ≥ 10 AND 파일 lines ≥ 400 AND 연결 패키지 ≥ 3 | 하위 도메인으로 분할 |
| `entry-hub` | fan-in ≥ 10 AND fan-out ≤ 2 | 의도된 퍼사드 — 방치 권장 |
| `utility-sink` | fan-in ≥ 8 AND fan-out = 0 | util 모듈화 지속 관찰 |
| `cyclic-cluster` | Tarjan SCC 멤버 AND fan-in/out ≥ 3 | 순환 해결 |

### 1-3. APM reader PoC (Q8) [9b]

OpenTelemetry trace data 를 **읽기 전용** 으로 받아서 `spring-endpoint` 노드에 "최근 N분 평균 p95" 메타데이터 주입. 쓰기/수집은 안 함 (§6 Anti-Suggestion 준수).

- 입력: OTel JSON trace file (batch export) — 실시간 수집 **불포함**
- 매칭: trace span.name / http.target → endpoint path 매칭
- 표시: ForceGraphView 의 endpoint 노드 tooltip 에 p95 / error rate 표시

---

## 2. 체크리스트

### 2-1. F4 Feature Slice

| # | 항목 | 파일 |
|---|---|---|
| 9-1 | `.vdarc.json` 스키마 확장: `features[{id, entry, description?, tags?}]` | `core/src/types.ts` (AnalysisConfig), JSON schema |
| 9-2 | `vda init` 에서 heuristic feature 초안 생성: vue-router 라우트 + spring-controller `@RequestMapping` 접두사 로 그룹핑 → `features[]` 초안 스캐폴드. **MSA 환경 정량 경고 필수**: 분석 대상이 multi-service (.vdarc 의 `services[].length > 1`) 인 경우 init 출력에 `⚠️ MSA 환경 감지: F10 미구현 상태에서 heuristic feature 정확도 < 50% 예상. 수동 검토 강력 권장.` 메시지 출력. 단일 서비스에서도 heuristic 결과 옆에 `// review: heuristic` 주석 자동 삽입 | `packages/cli/src/commands/init.ts` |
| 9-3 | `engine.getFeatureSlice(featureId)` → entry 에서 reachable 한 서브그래프. F2 의 EntrypointCollector 코드 재사용 | `packages/server/src/engine.ts` |
| 9-4 | `GET /api/graph/feature/:id` 엔드포인트 | `packages/server/src/routes/graphRoutes.ts` |
| 9-5 | **Feature View** 뷰 탭 추가. 사이드바에 feature 리스트, 선택 시 해당 슬라이스만 렌더. Phase 7a-11 의 path-highlight 시각화 재사용 | `packages/web-ui/src/components/graph/FeatureView.vue` 신규, `App.vue` |
| 9-6 | Feature 슬라이스 간 교집합 계산 (`feature A ∩ feature B` — "결제와 주문이 공유하는 노드") | `FeatureView.vue` 내부 UI |

### 2-2. F9 Anti-Pattern Classifier

| # | 항목 | 파일 |
|---|---|---|
| 9-7 | `ComplexityAntiPatternClassifier` 신규 — 기존 ComplexityScorer 위에 태그 레이어 | `packages/core/src/analyzers/AntiPatternClassifier.ts` 신규 |
| 9-8 | 각 태그 임계치는 `.vdarc.json` 의 `complexityThresholds` 에서 오버라이드 가능 | `core/src/types.ts` |
| 9-9 | UI: NodeDetail 패널에 "Patterns" 섹션 추가 + 권장 액션 설명 | `packages/web-ui/src/components/graph/NodeDetail.vue` |
| 9-10 | `vda lint --patterns` CLI 모드 — 각 태그별 노드 리스트 + 제안 action | `packages/cli/src/commands/lint.ts` |
| 9-10b | **Anti-pattern fixture 가공**: test-project-ecommerce 에 god-object / entry-hub / utility-sink / cyclic-cluster 각 1건 이상이 자연 발생하지 않을 가능성이 높음. 부족한 패턴은 `test-project-ecommerce/.phase9-fixtures/` 내 별도 모듈로 의도적으로 추가 (예: `BigService.java` 가 fan-out ≥ 10 + 400+ lines, `OrderUtils.ts` 가 fan-in ≥ 8 + fan-out 0). 게이트 3-3 의 "각 1건 이상 분류" 가능 여부를 9-10 진입 전 확인 | `test-project-ecommerce/.phase9-fixtures/anti-patterns/` |

### 2-3. APM reader PoC

| # | 항목 | 파일 |
|---|---|---|
| 9-11 | OTel trace JSON 스키마 (OTLP JSON) 리더 — `readFile → parse → span-to-endpoint 매칭`. **매칭 전략**: Spring 자동계측이 발행하는 span.name 형태가 `GET /api/users/{id}` 같은 path 패턴이므로, spring-endpoint 노드 metadata 의 `pathPattern` 필드(현 raw path 인지 패턴 path 인지 9-11 착수 전 확인 필요)와 직접 매칭. 매칭 실패 span 은 `unmatchedTraceCount` 메트릭으로 집계해 PoC report 에 노출 — fixture 매칭률 ≥ 80% 미만이면 9-11 재설계 | `packages/core/src/telemetry/OtelReader.ts` 신규 |
| 9-12 | `vda analyze --otel-traces <file>` 플래그. 분석 후 spring-endpoint metadata 에 `p95Ms`, `errorRate`, `traceCount` 주입 | `packages/cli/src/commands/analyze.ts` |
| 9-13 | UI: ForceGraphView endpoint tooltip + NodeDetail panel 에 p95/error 표시 | `ForceGraphView.vue`, `NodeDetail.vue` |
| 9-14 | PoC 샘플: OTel trace JSON fixture 1개 (수동으로 tag 조작한 JSON, test-project-ecommerce 의 5개 endpoint 대상) | `test-project-ecommerce/.phase9-fixtures/otel-sample.json` |

---

## 3. 성공 지표 (Q9)

| 기준 | 측정 |
|---|---|
| F4: features[] 3개 선언 시 슬라이스 뷰 렌더 | test-project-ecommerce 에 `payment`, `order`, `user` 3 feature 선언, 각각 10~40 노드 슬라이스 시각화 테스트 |
| F4: 교집합 계산 정상 | 3 feature 간 교집합 2건 이상 존재 + 리스트업 |
| F9: 4 태그 각 1건 이상 분류 | test-project-ecommerce 분석에서 god-object / entry-hub / utility-sink / cyclic-cluster 각 1건 이상 태그됨 |
| APM PoC | OTel fixture 로드 후 5개 endpoint 노드에 p95Ms 메타 주입, UI 툴팁 표시 |
| 회귀 0 | Phase 5 bench + Phase 7/8 gate 모두 유지 |

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | F4 heuristic (vue-router + @RequestMapping 접두사) 가 실제 도메인 경계와 맞지 않음. MSA 환경에서는 정확도가 특히 낮음 | 9-2 의 정량 경고 + `// review: heuristic` 주석 자동 삽입. 본질적 해결은 F10 MSA (Phase 10+) 후 |
| R2 | F9 임계치가 프로젝트별로 다름 | `.vdarc.json` 에서 오버라이드 필수, default 는 "대형 Vue+Spring" 기준 |
| R3 | OTel 스키마 변화 (OTLP v1.0 → v1.x) | OTLP JSON 만 지원, Protobuf 는 Phase 10+ |
| R4 | APM PoC 가 "실시간 수집" 오해를 유발 | CLI 메시지 + 문서에 "trace file 단방향 리더만, 수집은 APM 시스템에 위임" 명시 |
| R5 | OTel span.name 매칭 실패 (path 패턴 mismatch) | 9-11 의 `unmatchedTraceCount` 메트릭으로 정량화. PoC fixture 매칭률 ≥ 80% 게이트. spring-endpoint 노드의 path 메타데이터 형태(raw vs 패턴) 를 9-11 착수 전 confirm |
| R6 | Anti-pattern 4종 모두 test-project-ecommerce 에서 자연 발생하지 않음 | 9-10b 에서 fixture 모듈 의도 추가 |

---

## 5. Phase 9 종료 조건 (게이트)

**Phase 9a 머지 게이트 (F4)**
- Feature Slice 뷰가 test-project-ecommerce 의 3 feature 각각 정상 렌더
- 3 feature 간 교집합 2건 이상 리스트업
- `vda init` heuristic 결과에 MSA 환경이면 정량 경고 출력 (수동 검증)
- Phase 7, 8 회귀 없음

**Phase 9b 머지 게이트 (F9 + APM)**
- 4 anti-pattern 태그 모두 fixture(자연 발생 + 9-10b 의도 추가) 에서 1건 이상 분류
- OTel fixture 로드 후 5개 endpoint metadata 업데이트 + UI 반영
- OTel span 매칭률 ≥ 80% (`unmatchedTraceCount` / total ≤ 20%)
- APM PoC 시 CLI/문서가 "trace file 단방향 리더, 수집은 APM 위임" 명시 (수동 verification)
- Phase 9a 회귀 없음

**공통**
- 기존 테스트 + Phase 9 신규 테스트 green

---

## 6. Phase 10+ 로 미룬 항목

- F8 git blame / PR / commit 통합 (F4 Feature Slice 뒤에 얹기 자연스러움)
- F10 MSA 서비스 그래프 (11 service 프로젝트의 복원 완료 후)
- F11 Schema drift (MyBatis 동적 SQL 파싱 강화 선결)
- F12 Architecture Diff Over Time
- F13 IDE extension / F14 C4 export / F15 LLM-assisted explain
- APM 실시간 수집 (§6 Anti-Suggestion 위배 가능성, 항상 보수적)
