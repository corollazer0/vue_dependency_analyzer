# Phase 7 (legacy draft, pre-Phase-Ultra)

> ⚠️ **Superseded by `docs/phase-ultra/phase7-plan.md` (v2).**
> 이 문서는 Phase-Ultra 착수 이전(2026-02~03) 에 만든 초안이다. Phase-Ultra 0-5 진행
> 과정에서 여기 Tier 0-4 항목 상당수가 해결됐으며, 잔여 미해결 항목은 v2 에 7a 트랙으로
> 이관됐다. 신규 F 시리즈 (F2/F3/F5/F7) 는 v2 의 7b 트랙에 정의돼 있다.
>
> 상태 요약:
> - T0-01 warm-cache db-table 유실 → ✅ Phase 0-6 해결
> - T0-02 `/api/graph/node/:id` 404 → ✅ v2 7a-5 (query-param `?id=`)
> - T0-03 CLI getStats node/edge 분리 → ✅ 해결
> - T1-01 @Mapper interface → ✅ 해결
> - T1-02 vue-router `route-renders` → ✅ v2 7a-6 (PR-A `e8f5538`)
> - T1-03 Event virtual edges → ✅ v2 7a-7 (`@TransactionalEventListener` + `@EventListener(X.class)` forms)
> - T1-04 worker_threads 병렬 → ✅ Phase 2-2
> - T1-05 services[] MSA → ✅ Phase 2-6
> - T2-01/02 DTO flow + consistency → ✅ Phase 4 전체
> - T2-03 storeToRefs 구독 필드 → ✅ v2 7a-8 (`subscribedFields` on uses-store edge)
> - T2-04 캐시 성능 테스트 보강 → ✅ v2 7a-10 (CLI E2E exposes & fixes `--no-cache` bug)
> - T3-01 watch resources/ → ✅ 해결
> - T3-02 vda init tsconfig 재귀 → 📦 v2 범위 밖 (정합성 이상 없음)
> - T3-03 분석 취소 → ✅ 해결 (AbortController)
> - T3-04 CLI 전용 테스트 → ✅ v2 7a-10 (spawn-based e2e-cli.test.ts)
> - T3-05 fixture 고도화 → ✅ test-project-ecommerce 로 대체
> - T3-06 A11y → ✅ v2 7a-9 (ARIA tablist/tabpanel + aria-labels; axe-core CI deferred)
> - T4-01 E2E smoke → ✅ e2e-fixture.test.ts 존재
> - T4-02 Server API E2E → ✅ v2 7a-10 (api.test.ts 60-test surface coverage)
> - T4-03 CLI E2E → ✅ v2 7a-10
>
> 아래 본문은 **참고용 원본 보존**이며 실행 기준은 v2 를 따른다.

---

## [ORIGINAL DRAFT — 참고용]

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

## Phase 6 재감사에서 발견된 회귀/잔여 결함 (phase6-post-fix-reaudit.md)

| 재감사 항목 | 심각도 | Phase 7 매핑 |
|------------|--------|-------------|
| P1-01 warm-cache에서 db-table 노드 유실 | **CRITICAL** | → T0-01 (신규, Tier 0) |
| P1-02 /api/graph/node/:id 절대경로 노드 404 | **CRITICAL** | → T0-02 (신규, Tier 0) |
| P2-01 CLI getStats() node/edge 통계 혼합 | HIGH | → T0-03 (신규, Tier 0) |
| P2-02 services[]/include[] 미소비 | HIGH | → T1-05 (기존) |
| P2-03 캐시 테스트 cache hit 0 통과 | HIGH | → T2-04 (기존) |
| P3-01 토큰 미전환 + A11y + recent items | MEDIUM | → T3-06 (기존) + T3-07 (신규) |

---

## Phase 7 작업 항목

### Tier 0: 런타임 무결성 (Phase 6 재감사 긴급 수정)

> Phase 6에서 해결했다고 판단했으나 재감사에서 여전히 결함으로 확인된 항목.
> **Tier 1보다 먼저 수정해야 한다.**

#### T0-01. warm-cache에서 db-table 노드 유실 수정 [재감사 P1-01]

**문제:** MyBatisXmlParser가 db-table 노드를 `filePath: ''`로 생성. CLI/서버 캐시 저장 로직이 `filePath` 기준으로 결과를 분류하므로 `filePath: ''`인 노드는 어떤 파일의 캐시에도 포함되지 않음. warm-cache 실행 시 db-table 노드가 전부 사라짐.

**근거:**
- `packages/core/src/parsers/java/MyBatisXmlParser.ts:63-72` — `filePath: ''`
- `packages/cli/src/config.ts:121-131` — `graph.getNodesByFile(filePath)` 기준
- `packages/server/src/engine.ts:122-132` — `result.nodes.filter(n => n.filePath === filePath)` 기준

**수정 방안:**
1. **MyBatisXmlParser**: db-table 노드의 `filePath`를 해당 XML 파일 경로로 설정 (테이블은 SQL에서 추출되지만 원본은 XML)
2. **또는** 캐시 저장 로직에서 `filePath === ''`인 노드도 해당 파일의 캐시에 포함

**검증:**
```bash
# 1) no-cache 실행
node packages/cli/dist/bin/vda.js analyze test-project --no-cache
# 2) warm-cache 실행
node packages/cli/dist/bin/vda.js analyze test-project
# 양쪽 모두 db-table: 10 확인
```

---

#### T0-02. /api/graph/node/:nodeId 절대경로 노드 404 수정 [재감사 P1-02]

**문제:** 대부분의 노드 ID가 절대경로 포함 (예: `spring-service:/home/.../CacheConfig.java`). Fastify의 path parameter로 전달 시 `/`가 경로 구분자로 해석되어 라우트 매칭 실패 → 404.

**근거:**
- `packages/server/src/routes/graphRoutes.ts:35-52` — `:nodeId` path param
- 테스트가 이를 허용: `packages/server/src/__tests__/api.test.ts:60-77`

**수정 방안:**
- path param → **query param**으로 변경: `GET /api/graph/node?id=xxx`
- 또는 Fastify의 `*` wildcard 파라미터 사용: `GET /api/graph/node/*`
- 또는 nodeId를 base64url 인코딩

**검증:**
```bash
curl "http://localhost:3333/api/graph/node?id=spring-service%3A%2Fhome%2F...%2FCacheConfig.java"
# 200 OK + 노드 상세 반환
```

---

#### T0-03. CLI getStats()에서 node/edge 통계 분리 [재감사 P2-01]

**문제:** `DependencyGraph.getStats()`가 node kind와 edge kind를 **같은 객체**에 합침. CLI가 prefix로 필터링하지만 `api-call`, `spring-injects`, `mybatis-maps` 등 edge kind가 "Node Types"로 잘못 표시.

**근거:**
- `packages/core/src/graph/DependencyGraph.ts:182-191` — 합쳐진 stats
- `packages/cli/src/commands/analyze.ts:38-45` — prefix 기반 필터

**수정 방안:**
- `getStats()` → `{ nodesByKind: {}, edgesByKind: {}, totalNodes, totalEdges }` 분리
- CLI에서 `nodesByKind`만 "Node Types"로, `edgesByKind`는 "Edge Types"로 별도 출력

**검증:**
```bash
node packages/cli/dist/bin/vda.js analyze test-project
# "Node Types"에 edge kind가 섞이지 않음
# "Edge Types" 섹션 별도 표시
```

---

#### T0-04. 서버 테스트의 nodeId 404 허용 수정 [재감사 P1-02 관련]

**문제:** `packages/server/src/__tests__/api.test.ts:60-77`가 유효 노드에서 404가 나와도 테스트를 통과시킴.

**수정:** T0-02 수정 후 테스트를 엄격하게 변경 — 유효 노드 ID는 반드시 200 반환.

---

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

#### T3-05. test-project fixture 고도화 (generate-fixtures.js 전면 개편) [P5-05]

**현재 fixture의 결함:**
- `package.json`, `tsconfig.json`, `build.gradle` 없음 → `vda init` 감지 실패
- `@Mapper interface` 없음 → MyBatis linker 검증 불가
- Vue 컴포넌트에서 `const response` 중복 선언, 미정의 `id` 변수 사용
- `router/index.ts`가 실제 routes 배열이 아님 → route-renders 검증 불가
- `defineEmits` + 부모 `@event` 리스너 패턴 없음 → event virtual edge 검증 불가
- `storeToRefs` 사용 없음
- Spring Event (`publishEvent` / `@EventListener`) 없음
- DTO 클래스에 필드가 `id`, `name` 2개뿐 → DTO 정합성 체크 무의미
- MyBatis XML namespace에 대응하는 @Mapper interface가 없음

**generate-fixtures.js 수정 범위:**

1. **프로젝트 설정 파일 추가**
   - `test-project/frontend/package.json` — `vue`, `pinia`, `vue-router`, `axios` 의존성
   - `test-project/frontend/tsconfig.json` — `compilerOptions.paths: { "@/*": ["src/*"] }`
   - `test-project/backend/build.gradle` — `org.springframework.boot` 플러그인

2. **@Mapper interface 생성** (10개, 각 도메인별)
   ```java
   package com.example.mapper;
   import org.apache.ibatis.annotations.Mapper;
   @Mapper
   public interface UserMapper {
       User findById(Long id);
       List<User> findAll();
       void insert(User user);
       void update(User user);
       void deleteById(Long id);
   }
   ```

3. **Vue Router 실제 routes 배열** (`router/index.ts`)
   ```typescript
   import { createRouter, createWebHistory } from 'vue-router'
   import type { RouteRecordRaw } from 'vue-router'
   import HomeView from '@/views/HomeView.vue'
   import UserListView from '@/views/UserListView.vue'
   // ...
   const routes: RouteRecordRaw[] = [
     { path: '/', component: HomeView },
     { path: '/users', component: UserListView },
     { path: '/users/:id', component: () => import('@/views/UserDetailView.vue') },
     // ...
   ]
   export default createRouter({ history: createWebHistory(), routes })
   ```

4. **defineEmits + 부모 @event 패턴** (최소 5쌍)
   ```vue
   <!-- 자식: ChildForm.vue -->
   <script setup>
   const emit = defineEmits(['submit', 'cancel', 'validate'])
   function onSubmit() { emit('submit', formData) }
   </script>
   
   <!-- 부모: ParentView.vue -->
   <template>
     <child-form @submit="handleSubmit" @cancel="handleCancel" />
   </template>
   ```

5. **storeToRefs 사용** (최소 5개 컴포넌트)
   ```typescript
   import { storeToRefs } from 'pinia'
   const userStore = useUserStore()
   const { userName, isLoggedIn, role } = storeToRefs(userStore)
   ```

6. **Spring Event 패턴** (2개 publisher + 2개 listener)
   ```java
   // Publisher
   @Service
   public class OrderService {
       @Autowired private ApplicationEventPublisher eventPublisher;
       public void createOrder(Order order) {
           eventPublisher.publishEvent(new OrderCreatedEvent(order));
       }
   }
   
   // Listener
   @Service
   public class NotificationService {
       @EventListener
       public void handleOrderCreated(OrderCreatedEvent event) {
           sendNotification(event.getOrder());
       }
   }
   ```

7. **DTO 클래스 현실화** — 필드 5-10개, 프론트엔드 TS interface와 의도적 불일치 1-2건
   ```java
   // Backend DTO
   public class UserResponse {
       private Long id;
       private String name;
       private String email;
       private String phone;       // 프론트엔드에 없음 (의도적 불일치)
       private LocalDateTime createdAt;
   }
   ```
   ```typescript
   // Frontend interface
   interface UserResponse {
     id: number;
     name: string;
     email: string;
     // phone 없음 → DTO 정합성 체크에서 감지
     createdAt: string;
     avatar: string;  // 백엔드에 없음 → 불일치
   }
   ```

8. **Vue 컴포넌트 문법 오류 수정**
   - `const response` 중복 선언 → 각 API 호출에 고유 변수명
   - 미정의 `id` → `props.id` 또는 `route.params.id`로 교체
   - import 경로를 `@/` alias 사용으로 통일

9. **router.push() 호출** (5개 컴포넌트에서)
   ```typescript
   import { useRouter } from 'vue-router'
   const router = useRouter()
   router.push('/users')
   router.push({ name: 'user-detail', params: { id: userId } })
   ```

10. **@RequiredArgsConstructor + @Configuration + @Bean** (기존 service에 Lombok 적용, config에 Bean 추가)

#### T3-06. A11y 기본 구현 [P3-06]

- ARIA 랜드마크: `role="main"`, `role="complementary"`, `aria-label`
- 포커스 관리: Tab 순서 정리
- 키보드 탐색: 그래프 내 노드 이동

---

### Tier 4: E2E 테스트 체계

#### T4-01. E2E Smoke Test Suite

test-project fixture를 `vda analyze`로 실제 실행하여 **모든 Phase 7 기능이 동작하는지** 자동 검증하는 통합 테스트.

**테스트 파일:** `packages/core/src/__tests__/e2e-fixture.test.ts`

```typescript
describe('E2E: test-project fixture', () => {
  // fixture가 generate-fixtures.js로 생성된 상태에서 실행
  let graph: DependencyGraph;

  beforeAll(async () => {
    // test-project를 실제 분석
    const config = loadConfig('test-project');
    const result = await runAnalysis(config);
    graph = result.graph;
  });

  // ── T1-01: @Mapper interface ──
  describe('MyBatis Mapper Interface Linking', () => {
    it('should have @Mapper interface nodes', () => {
      const mappers = graph.getAllNodes().filter(n => 
        n.kind === 'spring-service' && n.metadata.isMapper
      );
      expect(mappers.length).toBeGreaterThanOrEqual(10);
    });

    it('should link Mapper interface → MyBatis XML', () => {
      const mybatisEdges = graph.getAllEdges().filter(e => 
        e.kind === 'spring-injects' && e.metadata.viaMyBatis
      );
      expect(mybatisEdges.length).toBeGreaterThanOrEqual(5);
    });

    it('should trace Controller → Service → Mapper → XML → DB table', () => {
      // 전체 E2E 체인 검증
      const controllers = graph.getAllNodes().filter(n => n.kind === 'spring-controller');
      for (const ctrl of controllers.slice(0, 3)) {
        const services = graph.getOutEdges(ctrl.id)
          .filter(e => e.kind === 'spring-injects')
          .map(e => graph.getNode(e.target));
        expect(services.length).toBeGreaterThan(0);
      }
    });
  });

  // ── T1-02: route-renders ──
  describe('Vue Router Route Rendering', () => {
    it('should have vue-router-route nodes', () => {
      const routes = graph.getAllNodes().filter(n => n.kind === 'vue-router-route');
      expect(routes.length).toBeGreaterThanOrEqual(1);
    });

    it('should create route-renders edges', () => {
      const routeEdges = graph.getAllEdges().filter(e => e.kind === 'route-renders');
      expect(routeEdges.length).toBeGreaterThanOrEqual(3);
    });

    it('should link route to actual vue-component', () => {
      const routeEdges = graph.getAllEdges().filter(e => e.kind === 'route-renders');
      for (const edge of routeEdges) {
        const target = graph.getNode(edge.target);
        expect(target).toBeDefined();
        expect(target!.kind).toBe('vue-component');
      }
    });
  });

  // ── T1-03: Event virtual edges ──
  describe('Frontend Event Virtualization', () => {
    it('should have emits-event edges from child components', () => {
      const emitEdges = graph.getAllEdges().filter(e => e.kind === 'emits-event');
      expect(emitEdges.length).toBeGreaterThanOrEqual(3);
    });

    it('should have listens-event edges from parent components', () => {
      const listenEdges = graph.getAllEdges().filter(e => e.kind === 'listens-event');
      expect(listenEdges.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── T1-05: MSA services[] ──
  describe('MSA Multi-Service', () => {
    it('should have serviceId in node metadata (if services configured)', () => {
      // MSA가 설정된 경우에만
      if (graph.metadata.config.services?.length) {
        const nodesWithService = graph.getAllNodes().filter(n => n.metadata.serviceId);
        expect(nodesWithService.length).toBeGreaterThan(0);
      }
    });
  });

  // ── API 매칭 ──
  describe('API Endpoint Matching', () => {
    it('should match frontend API calls to backend endpoints', () => {
      const linkedCalls = graph.getAllEdges().filter(e => 
        e.kind === 'api-call' && e.target.startsWith('spring-endpoint:')
      );
      expect(linkedCalls.length).toBeGreaterThan(100);
    });
  });

  // ── MyBatis/DB ──
  describe('MyBatis → DB Table Chain', () => {
    it('should have db-table nodes', () => {
      const tables = graph.getAllNodes().filter(n => n.kind === 'db-table');
      expect(tables.length).toBeGreaterThanOrEqual(5);
    });

    it('should have reads-table and writes-table edges', () => {
      const reads = graph.getAllEdges().filter(e => e.kind === 'reads-table');
      const writes = graph.getAllEdges().filter(e => e.kind === 'writes-table');
      expect(reads.length + writes.length).toBeGreaterThanOrEqual(20);
    });
  });

  // ── Spring Events ──
  describe('Spring Event Tracking', () => {
    it('should detect publishEvent calls', () => {
      const emits = graph.getAllEdges().filter(e => e.kind === 'emits-event');
      expect(emits.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect @EventListener methods', () => {
      const listens = graph.getAllEdges().filter(e => e.kind === 'listens-event');
      expect(listens.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── storeToRefs ──
  describe('Pinia storeToRefs Tracking', () => {
    it('should track subscribed fields in uses-store edges', () => {
      const storeEdges = graph.getAllEdges().filter(e => 
        e.kind === 'uses-store' && e.metadata.subscribedFields
      );
      expect(storeEdges.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Provide/Inject ──
  describe('Provide/Inject', () => {
    it('should detect provide and inject pairs', () => {
      const provides = graph.getAllEdges().filter(e => e.kind === 'provides');
      const injects = graph.getAllEdges().filter(e => e.kind === 'injects');
      expect(provides.length).toBeGreaterThanOrEqual(1);
      expect(injects.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Native Bridge ──
  describe('Native Bridge', () => {
    it('should detect native bridge calls', () => {
      const bridges = graph.getAllNodes().filter(n => n.kind === 'native-bridge');
      expect(bridges.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Circular Dependencies ──
  describe('Circular Dependency Detection', () => {
    it('should detect circular references', () => {
      const cycles = findCircularDependencies(graph);
      // fixture에 순환이 있으면 감지
      expect(Array.isArray(cycles)).toBe(true);
    });
  });

  // ── Orphan Detection ──
  describe('Orphan/Unused Detection', () => {
    it('should identify orphan nodes', () => {
      const orphans = findOrphanNodes(graph);
      expect(Array.isArray(orphans)).toBe(true);
    });
  });

  // ── Performance ──
  describe('Performance', () => {
    it('should analyze 500+ files in under 5 seconds', () => {
      expect(graph.metadata.fileCount).toBeGreaterThan(400);
    });
  });
});
```

#### T4-02. Server API E2E Test

test-project fixture를 서버로 실행하여 **모든 API 엔드포인트가 올바른 데이터를 반환하는지** 검증.

**테스트 파일:** `packages/server/src/__tests__/e2e-api.test.ts`

| 테스트 | 검증 내용 |
|--------|----------|
| GET /api/graph | db-table 노드 존재, api-call→endpoint 매칭 > 100건 |
| GET /api/graph?cluster=true | 클러스터에 backend, frontend 외에 mapper/resources 포함 |
| GET /api/graph/paths?from=controller&to=db-table | Controller→Service→Mapper→XML→DB 경로 존재 |
| GET /api/analysis/overlays | circularNodeIds, orphanNodeIds, hubNodeIds 형식 검증 |
| GET /api/analysis/dto-consistency | (T2-02 완성 후) 불일치 필드 1건 이상 감지 |
| GET /api/search?q=UserMapper | @Mapper interface 노드 검색 결과 |
| GET /api/source-snippet | 실제 파일 라인 반환 |
| POST /api/analyze | 재분석 후 그래프 크기 동일 |

#### T4-03. CLI E2E Test

**테스트 파일:** `packages/cli/src/__tests__/e2e-cli.test.ts`

| 테스트 | 검증 내용 |
|--------|----------|
| `vda init test-project` | Vue + Spring Boot 감지, .vdarc.json 생성, aliases 추출 |
| `vda analyze test-project` | 종료 코드 0, mybatis/db 카운트 표시, 순환 경고 |
| `vda analyze test-project --json` | 유효 JSON, nodes/edges/metadata 구조 |
| `vda analyze test-project --no-cache` | 캐시 무시, 전체 파싱 |
| `vda export test-project -f json` | JSON 파일 생성, nodes > 500 |
| `vda export test-project -f dot` | DOT 형식, digraph 키워드 포함 |

---

## 실행 순서 (최종)

```
Week 0:   T0-01~04 (런타임 무결성) ← 제품이 올바르게 동작하는 전제조건
Week 1:   T3-05 (fixture 고도화) ← 모든 E2E 테스트의 전제조건
Week 2:   T1-01 (@Mapper) + T1-02 (route-renders)
Week 3:   T1-03 (event edges) + T2-03 (storeToRefs)
Week 4:   T1-04 (worker_threads) + T1-05 (MSA services[])
Week 5:   T2-01 + T2-02 (DTO flow + consistency)
Week 6:   T2-04 (캐시 검증) + T3-01~04 (polish)
Week 7:   T4-01~03 (E2E tests) + T3-06~07 (A11y + UI polish)
```

핵심:
1. **Tier 0가 먼저** — warm-cache 무결성 + API 가용성이 깨지면 모든 기능이 무의미
2. **fixture가 그 다음** — 모든 E2E 검증의 전제조건
3. **기능 → 테스트** — 구현 후 E2E로 검증

## 성공 기준 (최종)

Phase 7 완료 시:
1. **warm-cache에서도 db-table 노드 10개 유지** (재감사 P1-01 해결)
2. **모든 file-backed 노드 ID로 /api/graph/node 200 반환** (재감사 P1-02 해결)
3. **CLI Node Types에 edge kind 미포함** (재감사 P2-01 해결)
4. `@Mapper interface` → MyBatis XML 자동 연결 E2E 동작
5. Vue Router routes → 컴포넌트 `route-renders` 엣지 생성
6. parent `@event` → child `defineEmits` 가상 엣지 연결
7. worker_threads 기반 병렬 파싱 (3000파일 벤치마크)
8. `services[]` MSA 분석 경로 완성
9. DTO 필드 추출 + 정합성 체크 API
10. 캐시 성능 테스트가 실제 cache hit를 검증하며 db-table도 유지
11. CLI 전용 테스트 커버리지
12. **generate-fixtures.js가 위 모든 패턴을 포함하는 fixture 생성**
13. **E2E Smoke Test가 fixture 기반으로 전체 기능 검증 (200+ assertions)**
14. **Server API E2E Test가 모든 엔드포인트를 fixture 데이터로 검증**
15. **CLI E2E Test가 init/analyze/export 명령을 실제 실행하여 검증**
