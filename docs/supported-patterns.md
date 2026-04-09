# VDA 자동 감지 지원 패턴 완전 가이드

> 이 문서는 VDA가 Vue 3 + Spring Boot 프로젝트에서 **자동으로 감지할 수 있는 패턴**과 **감지하지 못하는 패턴**을 빠짐없이 나열합니다.

---

## 1. Vue 3 프론트엔드

### 1.1 컴포넌트 감지

| 패턴 | 지원 | 설명 |
|------|------|------|
| `<script setup lang="ts">` | ✅ | Composition API setup 스크립트 |
| `<script lang="ts">` (Options API 아닌 setup) | ✅ | 일반 script 블록 |
| `<script>` (JavaScript) | ✅ | JS도 파싱 가능 |
| `<script setup>` (JS, lang 미지정) | ✅ | 기본 JS로 처리 |
| `.vue` 파일 자동 감지 | ✅ | 확장자 기반 |
| `.tsx`/`.jsx` 컴포넌트 | ⚠️ | TS/JS로 파싱되지만 Vue SFC 전용 기능(template) 미분석 |
| Options API (`data`, `methods`, `computed`) | ❌ | Composition API 전용. Options API의 의존성은 감지 불가 |
| `defineComponent()` 내부 | ⚠️ | import/API 호출은 감지하나, Options API 구조는 미분석 |

### 1.2 Import 감지

| 패턴 | 지원 | 설명 |
|------|------|------|
| `import Foo from './Foo.vue'` | ✅ | 상대 경로 import |
| `import { ref } from 'vue'` | ✅ | named import (node_modules는 의존성 추적 대상에서 제외) |
| `import Foo from '@/components/Foo.vue'` | ✅ | tsconfig.json의 paths alias 자동 감지 |
| `export { default } from './Foo'` | ✅ | re-export 추적 |
| `import type { Foo } from './types'` | ✅ | type import도 edge 생성 |
| `const Foo = () => import('./Foo.vue')` | ⚠️ | 라우터 lazy import만 감지 (`component: () => import(...)` 패턴) |
| `require('./Foo')` | ❌ | CommonJS require는 미지원 |
| `import('./Foo')` (조건부 dynamic) | ❌ | if문 내부의 동적 import는 미감지 |
| 변수를 통한 동적 경로 `import(path)` | ❌ | 런타임 변수 경로는 정적 분석 불가 |

### 1.3 Alias 해석

| 패턴 | 지원 | 설명 |
|------|------|------|
| `@/` → `src/` (tsconfig.json paths) | ✅ | 자동 감지 |
| `@components/` 등 커스텀 alias | ✅ | tsconfig.json paths에 정의된 모든 alias |
| `tsconfig.json` extends 체인 | ✅ | 재귀적으로 부모 config 추적 |
| `.vdarc.json` 수동 alias | ✅ | tsconfig보다 우선순위 높음 |
| Vite의 `resolve.alias` (vite.config.ts) | ❌ | Vite 설정 파일은 파싱하지 않음. tsconfig 또는 .vdarc.json으로 대체 |
| Webpack alias (webpack.config.js) | ❌ | 동일. .vdarc.json으로 수동 설정 필요 |
| `index.ts` 자동 해석 | ✅ | `import from './utils'` → `utils/index.ts` |
| 확장자 자동 시도 | ✅ | `.ts`, `.tsx`, `.js`, `.jsx`, `.vue` 순서 |

### 1.4 Pinia Store

| 패턴 | 지원 | 설명 |
|------|------|------|
| `useXxxStore()` 호출 | ✅ | 함수명 패턴으로 감지 (`use` + 대문자 + `Store`) |
| `defineStore('id', () => {...})` | ✅ | Setup Store 방식 감지 |
| `defineStore('id', { state, actions })` | ✅ | Options Store도 `defineStore` 키워드로 감지 |
| `storeToRefs(store)` | ✅ | 구독 필드명 추출 (destructured names) |
| `store.$subscribe()` | ❌ | $subscribe 콜백 내부 추적 불가 |
| `store.$patch()` | ❌ | $patch 호출은 감지하지 않음 |
| Vuex (`this.$store`, `mapState`) | ❌ | Vuex 전용 패턴 미지원. Pinia만 지원 |

### 1.5 Composable

| 패턴 | 지원 | 설명 |
|------|------|------|
| `useXxx()` 호출 | ✅ | `use` + 대문자로 시작하는 함수 호출 (`useXxxStore` 제외) |
| 파일명 `useXxx.ts` | ✅ | 자동으로 `vue-composable` 종류로 분류 |
| composable 내부의 API 호출 | ✅ | composable 파일 내의 axios/fetch도 감지 |
| composable 간 의존성 | ✅ | composable이 다른 composable을 import/호출 |

### 1.6 API 호출

| 패턴 | 지원 | 설명 |
|------|------|------|
| `axios.get('/api/users')` | ✅ | HTTP method + URL 추출 |
| `axios.post('/api/users', data)` | ✅ | POST/PUT/DELETE/PATCH 모두 |
| `fetch('/api/users')` | ✅ | method=GET으로 감지 |
| `this.$http.get(...)` | ✅ | `$http` 패턴 |
| `api.get(...)`, `http.get(...)`, `request.get(...)` | ✅ | 일반 HTTP 클라이언트 패턴 |
| `` axios.get(`/api/users/${id}`) `` | ✅ | 템플릿 리터럴 → `:param` 플레이스홀더로 변환 |
| `axios.get('/api/users/' + id)` | ❌ | 문자열 연결은 미지원. 첫 번째 인자가 문자열/템플릿 리터럴이어야 함 |
| `axios(config)` (객체 방식) | ❌ | `axios({ url: '...', method: '...' })` 형태는 미지원 |
| `const url = '/api/users'; axios.get(url)` | ❌ | 변수를 통한 간접 URL은 미지원 |
| 환경변수 `process.env.VUE_APP_API + '/users'` | ❌ | 런타임 환경변수 기반 URL은 미지원 |
| `baseURL` 설정 후 상대 경로 | ⚠️ | `.vdarc.json`의 `apiBaseUrl`로 prefix 설정 시 매칭 가능 |

### 1.7 Vue Router

| 패턴 | 지원 | 설명 |
|------|------|------|
| `createRouter({ routes: [...] })` | ✅ | 라우터 파일 자동 감지 |
| `component: HomeView` (정적 import) | ✅ | `route-renders` 엣지 생성 |
| `component: () => import('@/views/X.vue')` | ✅ | lazy import도 `route-renders` 엣지 |
| `router.push('/path')` | ✅ | 네비게이션 호출 감지 → 메타데이터 |
| `router.push({ name: 'route' })` | ✅ | named route도 감지 |
| `router.replace(...)` | ✅ | replace도 동일 |
| `this.$router.push(...)` | ✅ | Options API 스타일도 감지 |
| 중첩 routes (children) | ❌ | 최상위 routes 배열만 파싱. children 재귀 미지원 |
| `router.beforeEach()` guard | ❌ | guard 내부 로직은 분석 대상 아님 |
| `<router-link :to="...">` | ❌ | 템플릿 내 router-link는 builtin으로 무시 |

### 1.8 Template 분석

| 패턴 | 지원 | 설명 |
|------|------|------|
| `<ChildComponent />` (PascalCase) | ✅ | `uses-component` 엣지 |
| `<child-component />` (kebab-case) | ✅ | PascalCase로 자동 변환 후 매칭 |
| `@event="handler"` | ✅ | `listens-event` 엣지 생성 |
| `v-on:event="handler"` | ✅ | `@event`와 동일 |
| `v-custom-directive` | ✅ | `uses-directive` 엣지 (builtin 12종 제외) |
| `defineEmits(['submit', 'cancel'])` | ✅ | 메타데이터에 emits 배열 저장 |
| `defineProps({ title: String })` | ✅ | 메타데이터에 props 배열 저장 |
| `defineProps<{ title: string }>()` (타입 기반) | ❌ | 제네릭 타입 props는 추출 불가 |
| `provide('key', value)` | ✅ | `provides` 엣지 |
| `inject('key')` | ✅ | `injects` 엣지 |
| 동적 컴포넌트 `<component :is="comp">` | ❌ | 런타임 동적 컴포넌트 미지원 |
| `v-for`, `v-if` 내부 컴포넌트 | ✅ | 조건/반복 내부도 탐색 |
| slot 내부 컴포넌트 | ✅ | slot 내부도 탐색 |

### 1.9 Native WebView Bridge

| 패턴 | 지원 | 설명 |
|------|------|------|
| `window.NativeApp.method()` | ✅ | bridge 이름 + method 이름 추출 |
| `window.AndroidBridge.method()` | ✅ | 플랫폼 자동 추론 (android) |
| `window.iOSBridge.method()` | ✅ | 플랫폼 자동 추론 (ios) |
| `(window as any).Bridge.method()` | ✅ | TypeScript 캐스팅도 감지 |
| `.vdarc.json`의 `nativeBridges` 목록 | ✅ | 알려진 bridge 이름 지정 시 더 정확한 감지 |
| `WebView.evaluateJavascript(...)` | ❌ | Android Native 쪽 코드는 미분석 (Vue 코드만) |
| `WKScriptMessageHandler` | ❌ | iOS Native 쪽 코드는 미분석 |

---

## 2. Spring Boot 백엔드

### 2.1 Controller / Endpoint

| 패턴 | 지원 | 설명 |
|------|------|------|
| `@RestController` | ✅ | `spring-controller` 노드 생성 |
| `@Controller` | ✅ | 동일 |
| `@RequestMapping("/api/users")` (클래스) | ✅ | base path 설정 |
| `@GetMapping("/{id}")` | ✅ | `spring-endpoint` 노드 (GET /api/users/{id}) |
| `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping` | ✅ | 모든 HTTP method |
| `@RequestMapping(value="...", method=RequestMethod.GET)` | ✅ | 복합 매핑 |
| 빈 경로 `@GetMapping("")` | ✅ | base path만 사용 |
| `@RequestMapping` 없이 메서드에만 매핑 | ✅ | base path = "" |
| 경로 정규화 (중복 `/`, 후행 `/`) | ✅ | 자동 처리 |
| `@PathVariable`, `@RequestBody`, `@RequestParam` | ⚠️ | 존재는 감지하나 파라미터 타입 추출은 부분적 |
| SpEL 표현식 경로 `@GetMapping("${api.path}")` | ❌ | 런타임 경로는 정적 분석 불가 |
| Kotlin Controller | ✅ | 동일한 어노테이션 패턴 (regex 기반) |

### 2.2 의존성 주입 (DI)

| 패턴 | 지원 | 설명 |
|------|------|------|
| `@Autowired private XxxService xxx;` | ✅ | 필드 주입 |
| 생성자 주입 `public Xxx(YyyService yyy)` | ✅ | Service/Repository/Mapper 타입 감지 |
| `@RequiredArgsConstructor` (Lombok) | ✅ | `private final` 필드를 주입으로 처리 |
| `@Service` | ✅ | `spring-service` 노드 |
| `@Repository` | ✅ | `spring-service` 노드 (isRepository=true) |
| `@Component` | ❌ | @Component 단독은 미감지. @Service/@Repository 필요 |
| `@Mapper` (MyBatis) | ✅ | `spring-service` 노드 (isMapper=true) + XML namespace 매칭 |
| `@Configuration` + `@Bean` | ✅ | Config 클래스의 @Bean 메서드에서 리턴 타입 추출 |
| `@Inject` (Jakarta/JSR-330) | ❌ | Spring `@Autowired`만 지원 |
| `@Qualifier` 구분 | ❌ | 같은 타입의 다중 빈 구분 불가 |
| Interface ↔ Implementation 매칭 | ⚠️ | 타입 이름 기반 매칭. 같은 이름의 interface와 class를 연결 |

### 2.3 MyBatis

| 패턴 | 지원 | 설명 |
|------|------|------|
| `<mapper namespace="com.xxx.XxxMapper">` | ✅ | `mybatis-mapper` 노드 생성 |
| `<select id="findAll">` | ✅ | `mybatis-statement` 노드 (statementType=select) |
| `<insert>`, `<update>`, `<delete>` | ✅ | 모든 SQL 문 종류 |
| SQL에서 `FROM table`, `JOIN table` | ✅ | `db-table` 노드 + `reads-table` 엣지 |
| SQL에서 `INSERT INTO table` | ✅ | `writes-table` 엣지 |
| SQL에서 `UPDATE table` | ✅ | `writes-table` 엣지 |
| `@Mapper` interface ↔ XML namespace 매칭 | ✅ | FQN, className, label 순서로 매칭 |
| Repository ↔ Mapper 도메인 매칭 | ✅ | `UserRepository` → `UserMapper` 자동 연결 |
| MyBatis 어노테이션 (`@Select`, `@Insert`) | ❌ | XML 방식만 지원. 어노테이션 SQL은 미지원 |
| 동적 SQL (`<if>`, `<foreach>`, `<choose>`) | ⚠️ | 태그 내부 SQL은 파싱하나 조건 분기는 무시 (모든 테이블을 감지) |
| `<include refid="...">` | ❌ | SQL fragment include는 미지원 |
| `<resultMap>` 분석 | ❌ | resultMap의 타입/필드 매핑은 미분석 |
| CDATA 섹션 내 SQL | ✅ | `<![CDATA[...]]>` 자동 제거 후 파싱 |
| SQL 주석 | ✅ | `--`와 `/* */` 주석 자동 제거 |
| JPA (Hibernate) | ❌ | MyBatis XML 전용. JPA `@Entity`/`@Query` 미지원 |

### 2.4 Spring Events

| 패턴 | 지원 | 설명 |
|------|------|------|
| `applicationEventPublisher.publishEvent(new XxxEvent(...))` | ✅ | `emits-event` 엣지 + `spring-event` 가상 노드 |
| `@EventListener` 메서드 | ✅ | `listens-event` 엣지 (파라미터 타입으로 이벤트 매칭) |
| `@TransactionalEventListener` | ❌ | @EventListener만 감지 |
| `ApplicationListener<XxxEvent>` interface 구현 | ❌ | 어노테이션 방식만 감지 |
| Spring Cloud Stream / Kafka Listener | ❌ | 메시징 시스템 미지원 |

### 2.5 DTO

| 패턴 | 지원 | 설명 |
|------|------|------|
| 클래스명이 DTO/Dto/Request/Response/VO/Summary/Detail로 끝남 | ✅ | 자동 DTO 감지 |
| `private Type fieldName;` 필드 추출 | ✅ | 필드명 + 타입 메타데이터 |
| DTO ↔ TypeScript Interface 정합성 체크 | ✅ | `/api/analysis/dto-consistency` API |
| Lombok `@Data`, `@Getter` | ❌ | Lombok이 필드를 숨기지는 않으므로 필드 추출은 정상 |
| Java Record | ❌ | `record User(String name)` 형식 미지원 |
| Kotlin Data Class | ❌ | Kotlin DTO 필드 추출 미지원 |
| 제네릭 DTO `Page<UserResponse>` | ⚠️ | 외부 타입(`Page`)은 무시, 내부 타입(`UserResponse`) 추출 |

---

## 3. 크로스보더 매칭

### 3.1 API URL ↔ Endpoint 매칭

| 패턴 | 지원 | 설명 |
|------|------|------|
| 정확한 URL 일치 `/api/users` ↔ `/api/users` | ✅ | |
| Path parameter `:id` ↔ `{id}` | ✅ | 자동 정규화 |
| 템플릿 리터럴 `${id}` ↔ `{id}` | ✅ | `${...}` → `{param}` 변환 |
| HTTP method 매칭 (GET ↔ @GetMapping) | ✅ | method 불일치 시 매칭 안 됨 |
| `apiBaseUrl` prefix 제거 | ✅ | `.vdarc.json`에 설정 시 양쪽 모두에서 제거 |
| Query parameter 무시 | ✅ | `?page=1` 등은 경로 매칭에 영향 없음 |
| 다른 base URL (`http://other-service/api/...`) | ❌ | 외부 서비스 URL은 매칭 불가. 같은 apiBaseUrl 기준 |
| GraphQL endpoint | ❌ | REST만 지원 |
| gRPC | ❌ | REST만 지원 |

### 3.2 Vue Event ↔ 부모 리스너 매칭

| 패턴 | 지원 | 설명 |
|------|------|------|
| `defineEmits(['submit'])` ↔ 부모 `@submit="handler"` | ✅ | 가상 `vue-event` 노드로 연결 |
| kebab-case `@item-selected` ↔ camelCase `itemSelected` | ✅ | 자동 변환 |
| `emit('event', payload)` | ⚠️ | emit 호출 자체는 감지하나 payload 타입은 미추적 |
| Event Bus (`mitt`, `tiny-emitter`) | ❌ | 서드파티 이벤트 버스 미지원 |

---

## 4. 프로젝트 구조 감지

### 4.1 `vda init` 자동 감지

| 감지 대상 | 지원 | 설명 |
|-----------|------|------|
| `package.json`에서 Vue 의존성 | ✅ | `vue`, `nuxt` 키워드 |
| `build.gradle`에서 Spring Boot | ✅ | `spring-boot` 키워드 |
| `pom.xml`에서 Spring Boot | ✅ | `spring-boot` 키워드 |
| MSA 다중 서비스 감지 | ✅ | 하위 디렉토리별 build 파일 탐색 (depth 3) |
| tsconfig.json paths → alias 변환 | ✅ | extends 체인 재귀 해석 |
| Native bridge 자동 스캔 | ✅ | `window.XXX.method()` 패턴 (browser globals 필터링) |
| Monorepo (Turborepo, Nx, Lerna) | ⚠️ | 개별 패키지를 service로 감지 가능하나 monorepo 전용 최적화 없음 |
| Gradle multi-project | ⚠️ | 하위 프로젝트의 build.gradle은 탐색하나 settings.gradle은 미분석 |

### 4.2 파일 탐색

| 패턴 | 지원 | 설명 |
|------|------|------|
| `.vue`, `.ts`, `.js`, `.tsx`, `.jsx` | ✅ | 프론트엔드 파일 |
| `.java` | ✅ | Java 소스 |
| `.kt` | ✅ | Kotlin 소스 (Controller만 심층 분석) |
| `.xml` (MyBatis mapper) | ✅ | `<mapper namespace=...>` 포함 XML만 |
| `.d.ts` 파일 제외 | ✅ | 타입 선언 파일 자동 제외 |
| `node_modules/`, `dist/`, `.git/` 제외 | ✅ | 기본 제외 패턴 |
| `.vdarc.json`의 `exclude` 패턴 | ⚠️ | glob 패턴 지원하나 일부 복잡한 패턴은 미동작 |
| symlink 따라가기 | ❌ | 심볼릭 링크는 미지원 |

---

## 5. 분석 기능

| 기능 | 지원 | 설명 |
|------|------|------|
| 순환 의존성 감지 (Tarjan SCC) | ✅ | 2+ 노드 순환 그룹 |
| 고아 노드 감지 | ✅ | in/out edge 모두 0인 노드 |
| 미사용 컴포넌트 감지 | ✅ | `uses-component` + `route-renders` 기준 |
| 미사용 엔드포인트 감지 | ✅ | `api-call` edge 없는 endpoint |
| 복잡도 점수 (fan-in × fan-out) | ✅ | 허브 노드 식별 |
| 영향도 분석 (impact analysis) | ✅ | 역추적 (transitive dependents) |
| 경로 탐색 (A→B pathfinding) | ✅ | DFS 모든 경로 |
| DTO 정합성 체크 | ✅ | Backend DTO ↔ Frontend TS Interface 필드 비교 |
| 코드 복제 탐지 | ❌ | 미지원 |
| 보안 취약점 탐지 | ❌ | 미지원 (SBOM은 별도 도구 필요) |
