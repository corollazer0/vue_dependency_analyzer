# Phase 11 Plan — History (F8 git blame + F12 architecture diff over time)

> 작성일: 2026-04-19
> 브랜치: `feature/phase11` (Phase 10 머지 후)
> 추정: 4-5w
> 범위: painpoint-analysis §4 의 F8 (git blame / PR / commit) + F12 (architecture diff over time)

---

## 0. 배경

Phase 11 은 시간축을 그래프에 도입한다.
- F8 = "현재 상태에 누가 마지막에 손댔는가" — 일상 디버깅 / 코드 리뷰 워크플로
- F12 = "한 달 전과 지금이 어떻게 다른가" — 아키텍처 거버넌스

두 트랙은 서로 다르지만 git 데이터를 공통으로 소비한다. 같은 phase 에 묶는 이유.

---

## 1. 범위

### 1-1. F8 — Git blame metadata

각 노드 metadata 에 다음 필드 주입:
- `lastTouchedAt: string` (ISO 8601, last commit author-date)
- `lastAuthor: string` (commit author name)
- `commitCount: number` (since file creation)
- `lastCommitSha: string`

### 1-2. F12 — Architecture diff over time

- `vda snapshot --label <name>` — 현재 그래프의 핵심 메타 (node count by kind, edge count by kind, 샘플 hub 노드 ID) sqlite 저장
- `vda diff <fromLabel>..<toLabel>` — 두 스냅샷 비교 → 기간 동안 신규 추가된 컨트롤러 / 서비스 / DTO / 사라진 파일 / fan-out 증가 hot spot
- UI 뷰 "Time Travel" — slider 로 두 시점 선택 → 변화 시각화

### 1-3. 명시적 제외

- git blame 의 코드 라인 단위 attribution — 너무 무거움, 노드 단위 last-touched 로 충분
- PR 단위 통계 — Phase 14 LLM explain 에서 보강

---

## 2. 체크리스트

### 2-1. F8 git blame

| # | 항목 | 파일 |
|---|---|---|
| 11-1 | `GitBlameReader` 신규 — `git log -1 --format=%H|%an|%aI -- <file>` 배치 호출. fail-soft (.git 없으면 skip) | `core/src/git/GitBlameReader.ts` |
| 11-2 | `runAnalysis` 옵션 `withGitBlame: true` 시 GitBlameReader 호출 → 노드 metadata 4 필드 채움. 분석 시간 영향 측정 (테스트 기준 +15% 이내) | `core/src/engine/runAnalysis.ts` |
| 11-3 | NodeDetail UI: "Last touched" 섹션 (날짜 + author + commit SHA) | `web-ui/src/components/graph/NodeDetail.vue` |
| 11-4 | ForceGraphView 노드 색조 모드 추가: "Heat by recency" (최근 7d / 30d / 90d / older) | `web-ui/src/components/graph/ForceGraphView.vue` |
| 11-5 | `vda lint --hot-spots` — last-touched 가 90d 이상이면서 fan-in 높은 (= 위험한 stale hub) 노드 리스트 | `cli/src/commands/lint.ts` |

### 2-2. F12 architecture diff over time

| # | 항목 | 파일 |
|---|---|---|
| 11-6 | `ArchSnapshotStore` 신규 — sqlite (`.vda-cache/snapshots.sqlite`), `snapshots(label, taken_at, by_kind_json, summary_json)` | `core/src/engine/ArchSnapshotStore.ts` |
| 11-7 | `vda snapshot --label <name>` CLI — 분석 후 snapshot 저장 | `cli/src/commands/snapshot.ts` |
| 11-8 | `vda diff <from>..<to>` CLI — 두 스냅샷 비교 → 신규/삭제/증가/감소 리스트 | `cli/src/commands/diff.ts` |
| 11-9 | 서버 `GET /api/analysis/snapshots` + `GET /api/analysis/diff?from&to` | `server/src/routes/analysisRoutes.ts` |
| 11-10 | UI 뷰 "Time Travel" 탭 — 스냅샷 리스트 + slider 로 두 시점 선택 → 노드 카운트 by-kind chart + diff 리스트 | `web-ui/src/components/graph/TimeTravelView.vue` 신규, `App.vue` |
| 11-11 | nightly 워크플로 `.github/workflows/vda-snapshot-nightly.yml` — main 에 매일 snapshot 추가 (artifact upload) | `.github/workflows/vda-snapshot-nightly.yml` |

---

## 3. 성공 지표 (게이트)

- F8: test-project 에 git blame 적용 후 ≥ 90% 노드에 `lastTouchedAt` 채워짐
- F8: hot-spot lint 가 자연스럽게 1건 이상 검출 (test-project 에 stale 파일 존재)
- F12: 2개 스냅샷 (taken now + taken now-modified) 비교 → diff 출력에 추가 / 삭제 / fan-in 변화 모두 리스트업
- F12: TimeTravelView 가 nightly artifact 1주일치 (7개) 로 chart 렌더
- 분석 wall-time 영향 ≤ 15% (with-blame 모드)
- 회귀 0

---

## 4. 리스크

| # | 리스크 | 대응 |
|---|---|---|
| R1 | git log 수만 회 호출 시 느림 | 배치 호출 (`git log --all --name-only --pretty=fuller`) 1회 + 파일별 last-record 메모리 인덱스. 11-1 PoC 단계에서 검증 |
| R2 | shallow clone (CI) 에서 history 부족 | shallow 감지 후 `lastTouchedAt = null` + UI graceful fallback |
| R3 | 스냅샷 sqlite 파일 size 폭발 | 본문 (node id 전체) 저장 금지 — by-kind count + 샘플 ID 만 |
| R4 | TimeTravel UI 가 시계열 chart 라이브러리 의존 폭증 | 기존 `d3` 청크에 흡수 (Phase 3-7 manualChunks). 신규 dep 금지 |

---

## 5. 의존

- Phase 10 (필수) — `lineCount`/`packageCount` parser meta 가 hot-spot lint 의 정렬 기준에 사용
- Phase 8 SignatureStore — 11-6 ArchSnapshotStore 가 동일 sqlite 패턴 재사용 (better-sqlite3 + WAL)
- Phase 9b classifyAntiPatterns — F12 diff 가 anti-pattern 증감도 같이 보여주면 가치 ↑

---

## 6. Cross-phase 계약 freeze (briefing §5)

| 계약 | 도입 | 소비 |
|---|---|---|
| 노드 metadata `{lastTouchedAt, lastAuthor, commitCount, lastCommitSha}` | 11-2 | Phase 14 LLM explain (context for code-review prompt), Phase 12 MSA service ownership view |
| ArchSnapshotStore 파일 형식 (`.vda-cache/snapshots.sqlite`) + `snapshots` 테이블 스키마 | 11-6 | Phase 13 schema drift (DDL diff 별도 sqlite 사용 — 충돌 없음) |

---

## 7. Phase 11 종료 조건

- F8 + F12 모든 체크리스트 ✅ + 각 phase plan/benchmark 파일에 cross-link
- nightly 스냅샷 워크플로 main 에서 1회 이상 성공
- 분석 wall-time 회귀 ≤ 15% (with-blame 모드 비교)
- 회귀 0 + 신규 테스트 ≥ 15 추가
