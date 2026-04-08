# Phase 7: Feature Completion — 문서 약속의 코드 이행

> 작전명: **Operation Deliver**
> 원칙: 문서를 낮추지 않는다. 코드를 문서 수준까지 올린다.

---

## Phase 6에서 해결 완료 (참고용)

| 감사 항목 | 상태 | 해결 커밋 |
|-----------|------|----------|
| P1-01 root monorepo build/test | ✅ 해결 | WI-01 (packageManager, lint 제거) |
| P1-02 vda init ESM crash | ✅ 해결 | WI-02 (require→pathParse) |
| P2-09 CLI mybatis/db 카운트 미표시 | ✅ 해결 | WI-04 |
| P4-06 기본 필터에 MyBatis/DB/Event 누락 | ✅ 해결 | WI-03 |
| P2-02 서버 캐시 채우기 | ✅ 해결 | WI-05 |
| P2-03 fallback XML 누락 | ✅ 해결 | WI-06 |
| P2-04 클러스터 엣지 kind 보존 | ✅ 해결 | WI-07 |
| P3-05 온보딩 문구 불일치 | ✅ 해결 | WI-08 |
| P3-02 Command Palette stub | ✅ 해결 | WI-09 |
| P3-03 패널 너비 영속화 | ✅ 해결 | WI-10 |
| P3-04 Legend 꺼진 종류 복구 | ✅ 해결 | WI-11 |
| P3-07 URL hash view 동기화 | ✅ 해결 | WI-12 |
| P2-05 MiniMap 미연결 | ✅ 해결 | WI-13 (삭제) |
| P2-06 취소 버튼 라벨 | ✅ 해결 | WI-14 (Dismiss) |

---

## Phase 7 작업 항목

### Tier 1: 핵심 기능 완성 (Must)

#### T1-01. Java interface 파싱 + @Mapper 연결 [P4-01]

**문제:** JavaFileParser가 `class`만 파싱하고 `interface`를 무시. @Mapper가 붙은 interface가 파싱되지 않아 MyBatis XML namespace와 자동 연결 불가.

**수정 범위:**
- `packages/core/src/parsers/java/JavaFileParser.ts`
  - `extractClassInfo()`에 `interface` 키워드 매칭 추가
  - `interface XxxMapper`가 `@Mapper` 어노테이션 시 `spring-service` 노드 (isMapper=true, fqn 포함) 생성
- `test-project/backend/` — 10개 @Mapper interface 파일 생성
- 테스트: real Java interface → XML namespace end-to-end 통합 테스트

**검증:**
```bash
npx -w @vda/core vitest run
# MyBatis linker가 @Mapper interface node와 XML mapper를 자동 연결
```

---

#### T1-02. Vue Router route-renders 엣지 생성 [P4-02]

**문제:** TsFileParser가 router 파일을 `vue-router-route` 노드로 분류만 하고, routes 배열에서 `{ path, component }` 매핑을 추출하지 않음. `route-renders` 엣지가 전혀 생성되지 않아 미사용 컴포넌트 감지가 불완전.

**수정 범위:**
- `packages/core/src/parsers/typescript/TsFileParser.ts`
  - `vue-router-route` 감지 시 routes 배열 AST 워킹
  - `{ path: '/users', component: UserList }` 패턴에서 component 이름 추출
  - `route-renders` 엣지 생성 (route → component)
  - `router.push('/path')` / `router.replace` 호출 감지
- 테스트 fixture: 실제 routes 배열이 있는 router.ts 파일

**검증:** 
```bash
# route-renders 엣지가 생성되어 미사용 컴포넌트 감지 기준이 완성
```

---

#### T1-03. Frontend event virtual edge 완성 [P4-03]

**문제:** Vue 쪽은 `defineEmits` 메타데이터만 수집. 부모 컴포넌트의 `@eventName` 리스너와 자식의 `defineEmits(['eventName'])`을 연결하는 가상 엣지 없음. Backend Spring Event도 대상 event 노드를 생성하지 않음.

**수정 범위:**
- `packages/core/src/linkers/CrossBoundaryResolver.ts`
  - `resolveEmitListeners()` 메서드 추가
  - 부모의 `uses-component` 엣지로 부모-자식 관계 파악
  - 부모 template의 `@eventName` → 자식의 `defineEmits` 매칭
  - `emits-event` / `listens-event` 엣지 생성
- `packages/core/src/parsers/vue/TemplateAnalyzer.ts`
  - `@eventName="handler"` 감지 → 메타데이터에 eventName 저장
- `packages/core/src/parsers/java/JavaFileParser.ts`
  - Spring Event: `event:XxxEvent` 가상 노드 생성 추가

**검증:** 부모-자식 emit/listen 연결이 그래프에 표시

---

#### T1-04. worker_threads 기반 진짜 병렬 파싱 [P2-01]

**문제:** ParallelParser가 Promise.all 청크 방식으로 메인 스레드에서 실행. 3000+ 파일에서 CPU 바운드 파싱이 메인 스레드를 차단.

**수정 범위:**
- `packages/core/src/engine/ParallelParser.ts`
  - Worker 파일 분리: `parseWorker.ts` (파서 import + 파싱 실행)
  - 메인 스레드: worker pool 생성 (CPU cores - 1개)
  - MessagePort로 파싱 결과 전송
  - Worker에서 ts.createSourceFile 독립 실행
  - 기존 cache check는 메인 스레드에서, 파싱만 worker로

**검증:**
```bash
# 3000파일 fixture에서 worker 기반 vs 현재 방식 벤치마크
time node packages/cli/dist/bin/vda.js analyze large-project --no-cache
```

---

#### T1-05. services[] MSA 분석 경로 연결 [P1-03]

**문제:** `vda init`에서 MSA를 감지하여 `services[]`를 기록하지만, `vda analyze`와 `vda serve`에서 이를 소비하지 않음.

**수정 범위:**
- `packages/cli/src/config.ts` `runAnalysis()`
  - `config.services`가 있으면 각 서비스별로 파일 발견 패턴 생성
  - 각 노드에 `metadata.serviceId` 부여
- `packages/server/src/engine.ts` `discoverFiles()` + `buildConfig()`
  - 동일하게 services 기반 멀티 루트 스캔
- Web UI: 서비스별 필터/그룹 옵션 (Legend에서 serviceId별 토글)

**검증:**
```bash
# MSA 프로젝트에서 vda init → vda analyze → 서비스별 노드 라벨 확인
```

---

### Tier 2: 분석 깊이 강화 (Should)

#### T2-01. DTO 클래스 필드 추출 + DTO flow 엣지 [P4-04]

**수정 범위:**
- `packages/core/src/parsers/java/JavaFileParser.ts`
  - DTO 클래스 감지 (이름이 DTO/Request/Response/VO로 끝나는 클래스)
  - 필드 목록 추출: `private Type fieldName;`
  - Controller/Service 메서드의 리턴타입/파라미터에서 DTO 참조 추출
- `packages/core/src/linkers/DtoFlowLinker.ts` (새 파일)
  - Controller→Service→Repository 체인에서 같은 DTO 참조 노드 간 `dto-flows` 엣지

---

#### T2-02. DTO 정합성 체크 API [P4-04]

**수정 범위:**
- `packages/core/src/analyzers/DtoConsistencyChecker.ts` (새 파일)
  - Backend DTO 필드 ↔ Frontend TS interface 필드 비교
  - 누락/불일치 필드 리포트
- `packages/server/src/routes/analysisRoutes.ts`
  - `GET /api/analysis/dto-consistency` 엔드포인트

---

#### T2-03. storeToRefs 구독 필드 추적 [Gap #16]

**수정 범위:**
- `packages/core/src/parsers/vue/ScriptAnalyzer.ts`
  - `storeToRefs(store)` 호출 감지 → destructured 필드명 추출
  - `uses-store` 엣지 메타데이터에 `subscribedFields` 추가

---

#### T2-04. 캐시 성능 테스트 실제 검증 [P5-02]

**수정 범위:**
- `packages/core/src/__tests__/performance.test.ts`
  - 첫 실행 후 cache를 실제로 채움 (cache.set 호출)
  - 두 번째 실행에서 cache hit > 0 검증
  - 캐시 효과: 두 번째 실행 시간 < 첫 실행 시간의 50%

---

### Tier 3: 인프라/품질 (Polish)

#### T3-01. watch 경로에 resources/ 추가 [Gap #11]

- `packages/server/src/engine.ts` watch 경로에 springBootRoot의 sibling `resources/` 추가

#### T3-02. vda init에서 tsconfig extends 재귀 해석 [P2-07]

- `packages/cli/src/commands/init.ts`의 `readTsconfigAliases()`를 ImportResolver의 `loadTsconfigPaths()` 로직과 통일

#### T3-03. 분석 취소 기능 구현 [P2-06]

- AbortController 기반 취소 메커니즘
- `POST /api/analyze/cancel` 엔드포인트
- ParallelParser에 abort signal 전달

#### T3-04. CLI 전용 테스트 [P5-04]

- `packages/cli/src/__tests__/` — vda init, analyze, export 명령 실행 테스트

#### T3-05. test-project fixture 현실성 보강 [P5-05]

- package.json, tsconfig.json, build.gradle 추가
- @Mapper interface 파일 추가
- 문법 오류 수정 (undefined id, duplicate const)

#### T3-06. A11y 기본 구현 [P3-06]

- ARIA 랜드마크: `role="main"`, `role="complementary"`, `aria-label`
- 포커스 관리: Tab 순서 정리
- 키보드 탐색: 그래프 내 노드 이동

---

## 실행 순서

```
Week 1-2: T1-01 (@Mapper interface) + T1-02 (route-renders) + T2-04 (캐시 검증)
Week 3:   T1-03 (event virtual edges) + T2-03 (storeToRefs)
Week 4:   T1-04 (worker_threads) + T1-05 (MSA services[])
Week 5:   T2-01 + T2-02 (DTO flow + consistency)
Week 6:   T3-01~06 (polish + tests)
```

## 성공 기준

Phase 7 완료 시:
1. `@Mapper interface` → MyBatis XML 자동 연결 E2E 동작
2. Vue Router routes → 컴포넌트 `route-renders` 엣지 생성
3. parent `@event` → child `defineEmits` 가상 엣지 연결
4. worker_threads 기반 병렬 파싱 (3000파일 벤치마크)
5. `services[]` MSA 분석 경로 완성
6. DTO 필드 추출 + 정합성 체크 API
7. 캐시 성능 테스트가 실제 cache hit를 검증
8. CLI 전용 테스트 커버리지
