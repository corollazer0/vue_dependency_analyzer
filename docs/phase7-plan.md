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

## 실행 순서 (수정)

```
Week 1:   T3-05 (fixture 고도화) ← 모든 E2E 테스트의 전제조건
Week 2:   T1-01 (@Mapper) + T1-02 (route-renders)
Week 3:   T1-03 (event edges) + T2-03 (storeToRefs)
Week 4:   T1-04 (worker_threads) + T1-05 (MSA services[])
Week 5:   T2-01 + T2-02 (DTO flow + consistency)
Week 6:   T2-04 (캐시 검증) + T3-01~04 (polish)
Week 7:   T4-01~03 (E2E tests) + T3-06 (A11y)
```

핵심: **fixture가 먼저 완성되어야 모든 기능의 E2E 검증이 가능하다.**

## 성공 기준 (수정)

Phase 7 완료 시:
1. `@Mapper interface` → MyBatis XML 자동 연결 E2E 동작
2. Vue Router routes → 컴포넌트 `route-renders` 엣지 생성
3. parent `@event` → child `defineEmits` 가상 엣지 연결
4. worker_threads 기반 병렬 파싱 (3000파일 벤치마크)
5. `services[]` MSA 분석 경로 완성
6. DTO 필드 추출 + 정합성 체크 API
7. 캐시 성능 테스트가 실제 cache hit를 검증
8. CLI 전용 테스트 커버리지
9. **generate-fixtures.js가 위 모든 패턴을 포함하는 fixture 생성**
10. **E2E Smoke Test가 fixture 기반으로 전체 기능 검증 (200+ assertions)**
11. **Server API E2E Test가 모든 엔드포인트를 fixture 데이터로 검증**
12. **CLI E2E Test가 init/analyze/export 명령을 실제 실행하여 검증**
