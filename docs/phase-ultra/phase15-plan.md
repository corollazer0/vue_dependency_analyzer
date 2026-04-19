# Phase 15 Plan — APM Realtime (조건부)

> 작성일: 2026-04-19
> 브랜치: `feature/phase15` (Phase 9b OtelReader 기반)
> 추정: 4-6w (사업 정당화 후에만 진행)
> 범위: Phase 9b OTel reader PoC 의 다음 단계 — realtime 수집 / pull / streaming
>
> ⚠️ **Anti-suggestion 가드**: painpoint-analysis §6 / phase9-plan §1-3 R4 에서 "수집은 APM 시스템에 위임" 으로 못 박았다. 본 phase 는 그 원칙을 깨는 트랙이므로 **사업 정당화 (P5 운영 사고 빈도 데이터 등) 가 명시적으로 통과한 후에만 진행**한다. 미진행 시 본 plan 은 사실상 보류.

---

## 0. 정당화 체크리스트 (gate-zero)

다음 4 조건을 모두 만족할 때만 본 phase 진행:

1. P5 (운영 사고) 가 사용자 핵심 painpoint 로 재확인 (Phase 9b 후 6개월 운영 데이터 기준)
2. APM 시스템 (Datadog / NewRelic / Jaeger) 로의 export 만으로는 "graph context 와의 결합" 이 부족하다는 구체 케이스 ≥ 3
3. 보안 / 컴플라이언스 검토 통과 (trace 데이터 = 잠재적 PII)
4. realtime 수집 vs Phase 9b reader (배치) 의 비용 분석 — realtime 의 추가 가치가 운영 비용 (서버 / 스토리지 / 모니터링) 의 3배 이상

위 중 하나라도 실패 시 → 본 phase 보류, Phase 14 → 종료로 직행.

---

## 1. 범위 (조건부 진행 시)

### 1-1. 수집 모드 후보 (택일)

| 모드 | 장점 | 단점 |
|---|---|---|
| A. **Pull** — vda 가 OTLP HTTP `/v1/traces` 엔드포인트 노출, APM agent 가 push | 표준 OTLP 호환 | vda 가 receiver 로 동작 → 가용성 책임 |
| B. **Tail-based polling** — Jaeger / Tempo API 폴링 | infra 변경 최소 | 폴링 latency, API quota 의존 |
| C. **File watcher** — APM 의 batch export 디렉토리 watch | 가장 단순, Phase 9b 의 자연스러운 확장 | "realtime" 정의 모호 (분 단위) |

PoC 권장: **C (file watcher)** — 9b reader 위에 chokidar 만 얹으면 됨. A (pull receiver) 는 운영 비용 큼.

### 1-2. UI 갱신

- ForceGraphView 의 endpoint 노드 색 / 테두리 가 p95 임계 초과 시 빨간색 (실시간 갱신)
- websocket push (Phase 1 의 ws 채널 재사용)

### 1-3. 명시적 제외

- Distributed tracing UI (span tree 시각화) — APM 시스템이 잘함
- Metrics (CPU, memory) — APM 잘함
- Anomaly detection — Phase 16+

---

## 2. 체크리스트 (조건부)

| # | 항목 | 파일 |
|---|---|---|
| 15-1 | 정당화 체크리스트 (위 §0) 4 조건 검토 + user 확인 → go/no-go 결정 | `docs/phase-ultra/phase15-go-no-go.md` (신규) |
| 15-2 | (go 시) `OtelFileWatcher` — 디렉토리 watch + 파일별 incremental read | `core/src/telemetry/OtelFileWatcher.ts` |
| 15-3 | server 측 trace cache + WS push (5s 윈도우 rollup) | `server/src/telemetry/realtimeBridge.ts` |
| 15-4 | UI: endpoint 노드 색 임계 초과 시 빨강 + 실시간 갱신 | `web-ui/src/components/graph/ForceGraphView.vue` |
| 15-5 | 보안: trace 본문 의 sensitive header (Authorization, Cookie) 자동 redact | `core/src/telemetry/OtelFileWatcher.ts` |
| 15-6 | 운영 가이드 — receiver 가용성 / 디스크 / 메모리 SLO 문서화 | `docs/operations/phase15-runbook.md` |

---

## 3. 성공 지표 (조건부 진행 시)

- Phase 9b reader 의 모든 테스트 회귀 0
- File watcher 가 fixture 파일 추가 시 ≤ 5s 내 UI 반영
- p95 임계 초과 시 endpoint 노드 색 변경 (수동 1회)
- redact 룰이 sample trace 의 Authorization header 0건 노출

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | "realtime" 정의가 모호 → 사용자 기대 mismatch | "near-realtime, 5s 윈도우" 명시 + UI 에 마지막 갱신 시각 표시 |
| R2 | trace 데이터의 PII 노출 | 15-5 redact 우선, 옵트인 화이트리스트 (header allow-list) |
| R3 | 파일 watcher 가 OS / 컨테이너 환경에서 inotify limit 초과 | 폴링 fallback (1초 간격) |

---

## 5. 의존

- Phase 9b OtelReader (필수)
- Phase 1 WS 채널 (재사용)

---

## 6. Phase 15 종료 조건 (조건부)

- 정당화 체크리스트 (§0) 4 조건 모두 통과 + user go 결정
- 6 체크리스트 ✅
- 보안 검토 통과 + redact 테스트 green
- 회귀 0
