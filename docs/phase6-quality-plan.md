# Phase 6: Quality Stabilization — 감사 문서 기반 실행 계획

> 근거 문서: `docs/phase-plan-code-audit.md`, `docs/quality-improvement-agent-guide.md`
> 작성 원칙: 문서보다 코드를 믿는다. "완료"보다 "재현 가능하게 검증됨"을 우선한다.

---

## 작업 단위 정의

감사 문서의 discrepancy를 **작업 단위(Work Item)**로 변환. Guide 문서의 Phase A→B→C→D 순서를 따름.

---

## Phase A: 제품 사용 불가 수준 결함 (Critical)

> 이 단계가 끝나기 전에는 어떤 기능 확장에도 들어가지 않는다.

### WI-01. 루트 monorepo 빌드/테스트 복구 [P1-01]

**재현:**
```bash
npm run build   # FAIL: Missing packageManager field
npm test        # FAIL: Missing packageManager field
```

**수정 내용:**
1. `package.json`에 `"packageManager": "npm@10.x.x"` 추가 (현재 npm 버전 확인)
2. `turbo.json`의 `test` task에 `@vda/core`와 `@vda/server` 명시
3. `lint` script 제거 또는 eslint 없이 동작하는 no-op으로 변경

**검증:**
```bash
npm run build   # 4 packages 전부 빌드
npm test        # core 130 + server 15 = 145 tests PASS
```

**영향 파일:** `package.json`, `turbo.json`

---

### WI-02. `vda init` ESM 크래시 수정 [P1-02]

**재현:**
```bash
node packages/cli/dist/bin/vda.js init packages/web-ui
# ReferenceError: require is not defined
```

**수정 내용:**
- `packages/cli/src/commands/init.ts:221-229`의 `findUp()` 함수에서 `require('path')` → `import path from 'path'` (이미 상단에 import 있으므로 `path` 직접 사용)

**검증:**
```bash
npx -w @vda/cli tsc && node packages/cli/dist/bin/vda.js init packages/web-ui
# .vdarc.json 생성, 크래시 없음
```

**영향 파일:** `packages/cli/src/commands/init.ts`

---

### WI-03. 기본 필터에 MyBatis/DB/Event 종류 추가 [P4-06]

**문제:** 기본 필터가 `mybatis-*`, `db-table`, `emits-event`, `listens-event` 등을 제외하여 분석 결과가 UI에 안 보임.

**수정 내용:**
- `packages/web-ui/src/stores/graphStore.ts`의 `activeNodeKinds`, `activeEdgeKinds` 기본값에 누락된 종류 전부 추가

**검증:** 서버 실행 → 브라우저에서 DB table, MyBatis 노드 기본 표시 확인

**영향 파일:** `packages/web-ui/src/stores/graphStore.ts`

---

### WI-04. CLI 결과에 mybatis/db 카운트 표시 [P2-09]

**문제:** CLI 출력이 `mybatis-*`, `db-table` prefix를 필터링하여 MyBatis/DB 결과를 숨김.

**수정 내용:**
- `packages/cli/src/commands/analyze.ts:38-45`에 `mybatis-`, `db-` prefix 추가

**검증:**
```bash
node packages/cli/dist/bin/vda.js analyze test-project
# mybatis-mapper, mybatis-statement, db-table 카운트 표시
```

**영향 파일:** `packages/cli/src/commands/analyze.ts`

---

## Phase B: 계획 대비 부분 구현 보강 (High)

### WI-05. Server 초기 캐시 채우기 [P2-02]

**문제:** Server의 `runAnalysis()`가 파싱 후 `cache.set()`을 호출하지 않아 재시작 시 캐시가 비어있음.

**수정 내용:**
- `packages/server/src/engine.ts`의 `runAnalysis()` 내에서 파싱 완료 후 각 파일의 결과를 `cache.set()` 호출 → `cache.save()`

**검증:** 서버 시작 → 중단 → 재시작 시 "X cached" 메시지 확인

**영향 파일:** `packages/server/src/engine.ts`

---

### WI-06. Fallback 패턴에 XML 추가 [P2-03]

**문제:** `vueRoot`/`springBootRoot` 미설정 시 fallback 패턴에 `.xml`이 없음.

**수정 내용:**
- `packages/cli/src/config.ts:85-95` fallback 패턴에 `**/*.xml` 추가
- `packages/server/src/engine.ts:157-163` 동일

**검증:**
```bash
node packages/cli/dist/bin/vda.js analyze test-project --no-cache
# .vdarc.json 없이도 MyBatis XML 감지
```

**영향 파일:** `packages/cli/src/config.ts`, `packages/server/src/engine.ts`

---

### WI-07. 클러스터 엣지 종류 보존 [P2-04]

**문제:** 클러스터 모드에서 inter-cluster 엣지를 전부 `'imports'`로 덮어씀.

**수정 내용:**
- `packages/web-ui/src/components/graph/ForceGraphView.vue`의 `buildClusterElements()`에서 `edge.kinds[0]` 또는 가장 빈번한 종류를 사용

**검증:** 클러스터 뷰에서 엣지 종류 색상/스타일 유지 확인

**영향 파일:** `packages/web-ui/src/components/graph/ForceGraphView.vue`

---

### WI-08. 온보딩 문구 수정 (double-click → click) [P3-05, P2-04]

**문제:** 온보딩이 "Double-click clusters"라고 안내하지만 실제는 single click.

**수정 내용:**
- `packages/web-ui/src/components/OnboardingGuide.vue:8` → "Click clusters to expand"

**영향 파일:** `packages/web-ui/src/components/OnboardingGuide.vue`

---

## Phase C: UX/문서 부채 정리 (Medium)

### WI-09. Command Palette stub 제거 [P3-02]

**문제:** "Fit graph to view" no-op, "Reset filters" → `window.location.reload()`

**수정 내용:**
- "Fit graph to view": ForceGraphView의 `fitToView()` expose + CommandPalette에서 호출
- "Reset filters": graphStore에 `resetFilters()` 메서드 추가 (모든 종류 active로 복원)

**영향 파일:** `CommandPalette.vue`, `ForceGraphView.vue`, `graphStore.ts`

---

### WI-10. 패널 너비 영속화 수정 [P3-03]

**문제:** `v-model`이 store의 ref를 직접 바인딩하여 `setSidebarWidth()`/`setDetailWidth()` setter를 우회 → localStorage 저장 안 됨.

**수정 내용:**
- `ResizeHandle.vue`의 emit에서 `uiStore.setSidebarWidth(value)` 호출하도록 App.vue 수정. 또는 store의 ref에 `watch`로 자동 persist 추가.

**영향 파일:** `packages/web-ui/src/stores/ui.ts` 또는 `App.vue`

---

### WI-11. Legend에서 꺼진 종류 복구 가능하게 [P3-04]

**문제:** Legend가 현재 filteredNodes에 없는 종류를 숨겨서, 한번 필터로 끄면 Legend에서 다시 켤 수 없음.

**수정 내용:**
- Legend의 노드 목록을 `graphData.nodes` (전체) 기준으로 변경, 필터 상태만 opacity로 표현

**영향 파일:** `packages/web-ui/src/components/graph/GraphLegend.vue`

---

### WI-12. URL hash에 view 동기화 [P3-07]

**문제:** view 탭 전환 시 hash 미갱신.

**수정 내용:**
- `activeView` watcher 추가 → hash 갱신

**영향 파일:** `packages/web-ui/src/App.vue`

---

### WI-13. MiniMap 연결 또는 제거 [P2-05]

**문제:** MiniMap.vue 파일은 존재하나 App.vue에서 import/렌더링 안 됨.

**수정 내용:** (선택 1) App.vue에 MiniMap 렌더링 추가 (50+ 노드 시). 또는 (선택 2) 파일 삭제 + 문서에서 제거.

**결정:** 선택 2 (제거) — 현재 MiniMap이 그래프와 동기화되지 않아 가치가 낮음. 문서에서 "미니맵" 언급 제거.

**영향 파일:** `MiniMap.vue` 삭제, 관련 문서 수정

---

### WI-14. 분석 취소 버튼 정직하게 표현 [P2-06]

**문제:** 취소 버튼이 서버 분석을 중단하지 않고 오버레이만 숨김.

**수정 내용:** 버튼 라벨을 "Cancel" → "Hide" 또는 "Dismiss"로 변경. 또는 실제 cancel API 추가.

**결정:** 라벨 변경 (최소 수정). 향후 AbortController 기반 cancel 추가 가능.

**영향 파일:** `AnalysisProgress.vue`

---

## Phase D: 문서와 코드 사실관계 일치 (Documentation)

### WI-15. 과장 문서 수정

감사 문서에서 지적된 과장 표현을 현재 코드 수준으로 낮춤:

| 문서 | 현재 표현 | 수정 |
|------|----------|------|
| phase2-summary | "병렬 파싱 엔진" | "청크 기반 동시 파싱" |
| phase2-summary | "MSA 다중 서비스 지원" | "MSA 감지 (분석 경로 연결 예정)" |
| phase4-summary | "프론트→백엔드→DB 완전 추적" | "기본 체인 추적 (조건부)" |
| phase4-summary | "Spring Events 추적" | "Spring Events 감지 (가상 노드 미생성)" |
| phase3-summary | "모든 컴포넌트에서 var(--token) 참조" | "주요 컴포넌트에서 토큰 사용" |
| phase3-summary | "ARIA 랜드마크" | 제거 (미구현) |
| phase5-summary | "캐시 재분석 457ms" | "캐시 효과 조건부" 주석 추가 |
| user-stories | US-075 "Double-click clusters" | "Click clusters" |

**영향 파일:** `phase2-summary.md`, `phase3-summary.md`, `phase4-summary.md`, `phase5-summary.md`, `user-stories.md`

---

## 실행 순서

```
WI-01 (monorepo 복구)        ← 모든 작업의 전제조건
WI-02 (vda init 크래시)      ← 온보딩 경로
  ↓
WI-03 (기본 필터)            ← 즉시 사용자 경험 개선  
WI-04 (CLI 카운트)           ← 즉시 사용자 경험 개선
WI-05 (서버 캐시)            ← 성능 체감
WI-06 (XML fallback)         ← 데이터 완성도
  ↓
WI-07 (클러스터 엣지)        ← 시각화 정확성
WI-08 (온보딩 문구)          ← 문서/UI 일치
WI-09 (Cmd palette stub)     ← UX 완성
WI-10 (패널 persist)         ← UX 완성
WI-11 (Legend 복구)          ← UX 완성
WI-12 (URL hash)             ← UX 완성
  ↓
WI-13 (MiniMap 제거)         ← 정리
WI-14 (취소 라벨)            ← 정리
WI-15 (문서 수정)            ← 마지막
```

## 검증 매트릭스

각 WI 완료 후 아래 최소 검증 실행:

| 작업 | 검증 명령 |
|------|----------|
| WI-01 | `npm run build && npm test` |
| WI-02 | `node packages/cli/dist/bin/vda.js init packages/web-ui` |
| WI-03~04 | `node packages/cli/dist/bin/vda.js analyze test-project` + 브라우저 확인 |
| WI-05~06 | 서버 시작→중단→재시작 시 cache hit 확인 |
| WI-07~14 | `npm -w @vda/web-ui run build` + 브라우저 수동 확인 |
| WI-15 | 문서 diff 리뷰 |

## 성공 기준

Phase 6 완료 시:
1. `npm run build` → 성공
2. `npm test` → 145+ tests 통과
3. `vda init` → ESM 환경에서 크래시 없음
4. `vda analyze` → MyBatis/DB 포함 결과 표시
5. `vda serve` → 브라우저에서 DB table 노드 기본 표시
6. 문서의 모든 과장 표현이 현재 코드 수준으로 조정됨
