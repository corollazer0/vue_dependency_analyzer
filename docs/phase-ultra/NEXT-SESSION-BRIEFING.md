# Next-Session Briefing — Phase 10 부터 실행할 에이전트용 프롬프트

> 작성일: 2026-04-19
> 사용법: 다음 세션 시작 시 아래 코드블록 통째로 붙여넣어 주세요. Phase 7~9 와 동일한 운영 모델로 Phase 10 → 11 → ... 을 순차 실행합니다.
>
> 본 문서는 prompt 자체이며 코드/문서 작업의 SoT 는 `docs/phase-ultra/phase{N}-plan.md` 입니다.

---

```
Phase 10~15 실행 에이전트 브리핑

1. 너의 임무

  /home/ubuntu/workspace/vue_dependency_analyzer 의 Vue+SpringBoot 의존성 분석기(VDA) 에서 Phase 10 → Phase 11 → ... → Phase 15 를 순차 실행한다. 이전 phase(Phase-Ultra 0~9b) 는 main 에 머지되어 있다.

  Phase 단위 (각 머지 전 필수 게이트):

  1. feature/phase10        Polish & Promises (카리오버 10건)
  2. feature/phase11        History (F8 git blame + F12 architecture diff)
  3. feature/phase12        MSA Native (F10 service-to-service graph)
  4. feature/phase13        Schema Drift (F11 MyBatis dynamic SQL + Flyway DDL)
  5a. feature/phase14a      VSCode extension (F13)
  5b. feature/phase14b      C4/Mermaid export (F14) + LLM explain (F15)
  6. feature/phase15        APM Realtime — 조건부 (정당화 통과 후에만)

  각 PR 은 직전 PR 이 main 에 머지된 후에만 시작한다. 병렬 진행 금지.

2. 단일 진실 공급원 (Source of Truth)

  - 인덱스: docs/phase-ultra/post-phase9-roadmap.md
  - Phase 10: docs/phase-ultra/phase10-plan.md
  - Phase 11: docs/phase-ultra/phase11-plan.md
  - Phase 12: docs/phase-ultra/phase12-plan.md
  - Phase 13: docs/phase-ultra/phase13-plan.md
  - Phase 14: docs/phase-ultra/phase14-plan.md
  - Phase 15: docs/phase-ultra/phase15-plan.md
  - 공통 배경: docs/phase-ultra/FINAL-PLAN.md, docs/phase-ultra/developer-painpoint-analysis.md
  - 선행 phase 결과: docs/phase-ultra/phase{0..9b}-benchmark.md

  각 phase 시작 시 해당 plan 문서를 처음부터 끝까지 읽는다. 체크리스트 표·게이트 표·Risk 표가 작업의 계약이다. 본 브리핑과 plan 이 충돌하면 plan 우선.

  Plan 자체를 수정하지 않는다 (오류·누락 발견 시 user 확인 후에만). 발견한 버그·예외 케이스는 별도 issue 로 기록.

3. 체크리스트 항목 단위 작업 사이클

  각 체크리스트 항목 (예: 10-1, 11-3, 12-7) 마다 다음 사이클을 반복한다:

  1. 읽기 단계: plan 의 해당 행이 명시한 파일을 모두 읽고 현재 구현을 파악
  2. 테스트 먼저: 가능한 경우 실패하는 테스트부터 작성 (특히 10-3 signaturesOnly perf, 11-1 GitBlameReader 배치 호출, 12-1 MsaServiceGraphBuilder, 13-9 BreakingChangeDetector B4 통합, 14-7 C4Exporter)
  3. 구현: plan 의 "파일" 컬럼에 명시된 위치만 수정. 명시되지 않은 파일을 건드릴 때는 의존 cascade 가 명백한 경우만, 그리고 commit message 에 사유 기록
  4. 검증: npx turbo run test 전체 green + Phase 5 perf-budget lint(npm test) 통과
  5. 커밋: 항목당 1 커밋. 메시지 형식 예시:
     feat(core): GitBlameReader batch query (Phase 11-1)
     5. feat/fix/refactor/test/docs/build/ci/perf 중 적절한 prefix. Phase·항목 번호를 본문 또는 제목 끝에 표기.
  6. 상태 보고: 항목 완료 시 user 에게 "11-X 완료, 테스트 +N green, 커밋 SHA 짧음" 1-2줄 보고. 막히면 즉시 보고.

4. PR 게이트 처리

  각 PR (총 7개, Phase 14 만 2 PR) 머지 전:

  1. plan 의 종료 조건 (게이트) 표를 한 줄씩 체크
  2. 게이트 항목별 검증 근거(테스트 파일·벤치 수치·수동 검증 메모)를 모은다
  3. docs/phase-ultra/phase{N}-benchmark.md 작성 (이전 phase{1..9b}-benchmark.md 형식 따라):
     - 각 게이트 PASS/FAIL/WAIVED + 근거
     - 회귀 테스트 수치 (test count Δ, perf budget, /api/admin/metrics 변화)
     - Risk 표의 각 R 항목 실현 여부
     - Cross-phase 계약 freeze 여부 (해당 phase 가 도입한 인터페이스 + freeze test 위치)
  4. 모든 게이트 GREEN → user 의 자동 머지 권한이 살아 있다면 (이전 세션에서 위임됨) auto-merge, 없다면 user 머지 승인 요청
  5. 게이트 1개라도 RED → 머지 시도 금지. 막힘 사유 보고 후 user 지시 대기

  자동 머지 권한 확인: 새 세션 시작 시 user 에게 "Phase 10 부터 13 까지 (또는 어디까지) 자동 머지 권한 위임 가능한가요?" 한 번 묻고 시작한다. 이전 세션 (Phase 7-9) 의 위임은 9b 까지였으므로 이번에는 신규 위임 필요.

5. Cross-Phase 계약 (절대 깨뜨리지 말 것)

  Phase 7-9 에서 동결된 인터페이스 + Phase 10-14 에서 새로 동결할 것:

  - SpringDtoNode metadata (7a-12) — Phase 8 SignatureStore 이미 소비, Phase 13 schema drift B4 통합도 의존
  - EntrypointCollector public API (7b-1) — Phase 9-3 Feature Slice 이미 소비
  - WaiverEngine `breaking <code> file=…` 라인 (7b-5 forward-compat) — Phase 8 8-8 이미 소비
  - PR Report `<!-- vda:breaking-risks:start --> … :end -->` 마커 (7b-6) — Phase 8 8-5 이미 채움
  - Pathfinder `dir=reverse` 응답 형식 (10-1, 신규) — Phase 11 git blame integration 이 사용
  - Parser `lineCount`/`packageCount` (10-2, 신규) — Phase 11 hot-spot lint 가 정렬 기준
  - SignatureStore `signaturesOnly` mode (10-3, 신규) — Phase 8 baseline workflow + Phase 13 schema snapshot
  - 노드 metadata `lastTouchedAt`/`lastAuthor`/`commitCount`/`lastCommitSha` (11-2, 신규) — Phase 14 LLM explain `--with-history` 가 의존
  - ArchSnapshotStore `.vda-cache/snapshots.sqlite` 형식 (11-6, 신규) — (단일 phase 내 사용, drift 별도 sqlite)
  - msa-service NodeKind + 3 inter-service EdgeKind (12-1/5, 신규) — Phase 14 C4 export container diagram 이 의존
  - db-table.metadata.columns 형식 (13-6, 신규) — Phase 8 BreakingChangeDetector B4 의 추가 입력
  - C4 export prelude (14-7, 신규) — 외부 PlantUML/Structurizr 컨슈머 contract

  각 계약 도입 PR 의 게이트 단계에서 인터페이스 동결 여부를 명시 점검 + freeze test 1건 추가.

6. 수치·환경 규약

  - 테스트 수: Phase 9b 종료 시점 454 tests baseline. 각 phase 종료 시 신규 테스트 수를 benchmark 에 기록. 기존 테스트 회귀 (green→red·skip) 0
  - Perf budget: Phase 5 의 G1 < 400ms, G2 < 100ms, perf-budget lint 0 violation. 모든 phase 종료 게이트에 이 항목 포함
  - 벤치 측정: test-project 또는 test-project-ecommerce 기준. 별도 fixture 가 필요하면 test-project-ecommerce/.phase{N}-fixtures/ 아래 두기
  - 커밋 스타일: 항목당 1 커밋. --no-verify 절대 금지. hook 실패 시 새 커밋으로 fix. amend 금지
  - 브랜치 push: 각 phase 게이트 통과 후에만 origin push. user 의 머지 승인 후 main 머지 (또는 위임된 자동 머지)
  - PR 본문 템플릿: Phase 7~9 PR 본문 (PR #2 ~ #7) 참조 — "What ships" 표 + "Cross-phase contracts" + "Test parity" + "🤖 Generated with [Claude Code]" 푸터

7. 사용자에게 멈추고 물어볼 상황

  다음 중 하나라도 발생하면 작업 중단·user 보고:

  - plan 의 항목 설명이 모호하거나 현재 코드 상태와 명백히 어긋남
  - 게이트 항목 1개 이상 RED 이고 자체 해결로 명백한 길이 안 보임
  - plan 이 명시하지 않은 파일/모듈을 의도적으로 변경해야 함
  - 회귀 테스트 1건 이상 실패 + 원인이 본 phase 변경과 무관해 보임
  - Cross-Phase 계약(§5)에 영향 줄 수 있는 설계 변경
  - Phase 5 perf budget 위반 (즉시 중단)
  - fixture 가 plan 이 가정한 형태와 다름
  - 분석 시간이 phase 일정 추정의 1.5배 초과
  - **Phase 15 시작 전 정당화 체크리스트 4 조건 검토** — user 에게 go/no-go 의사 명시 요청

8. 절대 하지 말 것 (Anti-Patterns)

  - plan 게이트 미달 상태 머지
  - 한 PR 에 여러 phase 작업 혼재 (Phase 14 만 14a / 14b 분리 허용)
  - 본 phase 범위 밖 리팩토링 (예: 11 진행 중 9b 코드 정리)
  - 미사용 코드를 남기지 말 것 — 항목이 폐기되면 코드도 삭제 (Backwards-compat shim 금지)
  - plan 에 명시되지 않은 README·docstring·주석 추가
  - --no-verify, --force, git reset --hard
  - 테스트 mock 으로 게이트 회피 (특히 10-3 signaturesOnly 35% 게이트, 11-2 wall-time +15% 게이트)
  - "TODO Phase 12 에서 처리" 주석으로 미완 상태 머지
  - plan 외 신규 phase 분할·항목 추가 (오류 발견 시 user 확인 → plan 수정 → 작업)

9. 시작 절차

  1. git status, git log -10 --oneline 으로 현재 상태 확인 (main 이 c306540 → 09d33ad → be3f18b → 579decb → 6d81e4f → 739a5e3 → 51ebb89 → ab8b751 순으로 진행됐어야 함)
  2. user 에게 자동 머지 권한 위임 범위 확인 (Phase 10 ~ ?)
  3. docs/phase-ultra/post-phase9-roadmap.md 와 docs/phase-ultra/phase10-plan.md 전체 읽기
  4. Phase 10 의 첫 항목 (10-1 Pathfinder reverse) 부터 §3 사이클 시작
  5. 매 세션 시작 시 본 브리핑 + 현재 진행 중인 phase plan 을 다시 읽기 (memory drift 방지)

---

한 줄 요약: post-phase9-roadmap.md 가 인덱스, phase{10..15}-plan.md 가 spec, 각 phase 의 §게이트가 머지 조건, §6 cross-phase 계약이 깨면 안 되는 인터페이스. 모호하면 멈추고 묻는다.
```

---

## 인접 참고

- Phase 7~9 진행 시 사용된 원 브리핑 (이번 세션 첫 user 메시지) 형식과 거의 동일. 변경점만 정리:
  - Phase 분할 표 갱신 (10~15 / 14만 a-b 분리 / 15 조건부)
  - SoT 파일 경로 갱신 (`phase{10..15}-plan.md` 신규)
  - Cross-phase 계약 §5 가 두 배로 길어짐 — Phase 7~9 의 contracts (이미 동결) + Phase 10~14 가 신규 동결할 것
  - "테스트 mock 으로 게이트 회피" 항목에 10-3 / 11-2 wall-time 게이트 명시
  - 시작 절차 step 1 의 main 머지 SHA 체인 추가 (드리프트 감지용)
  - 자동 머지 권한 위임은 신규 세션에서 다시 묻기 (Phase 7-9 위임은 9b 까지)
