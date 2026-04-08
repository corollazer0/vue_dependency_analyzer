# VDA User Stories — 최종 검수 문서

> 대상: Vue 3 + Spring Boot 프로젝트의 프론트엔드/백엔드 의존성을 분석하는 개발자
> 목적: 모든 기능/비기능 요구사항을 사용자 여정으로 정의하여 품질 검증의 근거로 사용

---

## 핵심 여정 (Critical Path)

### US-001: 프로젝트 초기 설정
**사용자로서** 내 Vue+Spring Boot 프로젝트 구조를 자동 감지하여 설정 파일을 생성하고 싶다.

| 단계 | 행위 | 기대 결과 |
|------|------|-----------|
| 1 | `vda init ./my-project` 실행 | 프로젝트 디렉토리 스캔 시작 |
| 2 | — | package.json에서 vue/nuxt 의존성 감지 → Vue root 자동 설정 |
| 3 | — | build.gradle/pom.xml에서 spring-boot 감지 → Spring Boot root 설정 |
| 4 | — | 하위 디렉토리에 여러 Spring 서비스가 있으면 MSA로 감지 (depth 3까지) |
| 5 | — | tsconfig.json의 compilerOptions.paths에서 alias 자동 추출 (@/ → src/) |
| 6 | — | extends 체인이 있으면 재귀적으로 부모 tsconfig도 읽음 |
| 7 | — | Vue 소스에서 window.XXX.method() 패턴 스캔 → nativeBridges 자동 감지 |
| 8 | — | `.vdarc.json` 파일 생성 (기존 파일 있으면 경고 후 덮어쓰기) |
| 9 | — | 다음 단계 안내 메시지 출력: `vda analyze`, `vda serve` |

**수락 조건:**
- [ ] Vue 프로젝트 감지: package.json의 vue 의존성 확인
- [ ] Spring Boot 감지: build.gradle/pom.xml에서 spring-boot 문자열 확인
- [ ] MSA 복수 서비스: 하위 디렉토리별 독립 build 파일 감지
- [ ] tsconfig paths → aliases 변환 정확성
- [ ] native bridge 감지: browser globals (document, console 등) 필터링

---

### US-002: CLI 프로젝트 분석
**사용자로서** CLI에서 프로젝트를 분석하여 의존성 요약을 보고 싶다.

| 단계 | 행위 | 기대 결과 |
|------|------|-----------|
| 1 | `vda analyze ./my-project` 실행 | 파일 발견 시작 |
| 2 | — | Vue root에서 `**/*.vue`, `**/*.ts`, `**/*.js` 스캔 |
| 3 | — | Spring root에서 `**/*.java`, `**/*.kt`, `**/*.xml` 스캔 |
| 4 | — | .d.ts 파일 제외, node_modules/dist/.git 제외 |
| 5 | — | 진행률 표시: `[45%] 225/500 files (180 cached) \| 1.2s elapsed \| ~1s remaining` |
| 6 | — | 각 파일을 병렬로 파싱 (CPU 코어 수 - 1개 워커) |
| 7 | — | 분석 완료 후 결과 출력: 노드 수, 엣지 수, 소요 시간, 캐시 히트 수 |
| 8 | — | 노드 종류별 카운트 표시 (vue-component, spring-endpoint 등) |
| 9 | — | 순환 의존성이 있으면 경고 (최대 5개 표시) |
| 10 | — | 고아 노드가 있으면 목록 (최대 10개 표시) |

**수락 조건:**
- [ ] 500파일 프로젝트: 5초 이내 분석 완료
- [ ] 캐시 재분석: 기존 대비 50%+ 빠름
- [ ] `--json` 플래그: 전체 그래프 JSON 출력
- [ ] `--no-cache` 플래그: 캐시 무시하고 전체 재파싱
- [ ] `.vdarc.json` 설정 자동 로딩

---

### US-003: 시각화 서버 시작
**사용자로서** 웹 브라우저에서 의존성 그래프를 시각화하고 싶다.

| 단계 | 행위 | 기대 결과 |
|------|------|-----------|
| 1 | `vda serve ./my-project --watch` 실행 | 서버 시작 메시지 |
| 2 | — | 분석 실행 + Fastify 서버 3333 포트 바인딩 |
| 3 | — | web-ui 정적 파일 서빙 (dist/ 디렉토리) |
| 4 | 브라우저에서 `http://localhost:3333` 접속 | 그래프 시각화 로딩 |
| 5 | — | WebSocket 연결 수립 (연결 상태 표시) |
| 6 | 파일 수정 시 (`--watch` 모드) | 변경 파일만 재파싱 → WebSocket으로 UI 자동 갱신 |

**수락 조건:**
- [ ] 서버 시작 후 브라우저 접속 가능
- [ ] `-p, --port` 옵션으로 포트 변경 가능
- [ ] watch 모드에서 파일 변경 시 증분 분석 (전체 재분석 아님)
- [ ] WebSocket 연결 끊김 시 3초 후 자동 재연결

---

### US-004: 그래프 뷰에서 의존성 탐색
**사용자로서** Force-directed 그래프에서 노드를 탐색하여 의존 관계를 파악하고 싶다.

| 단계 | 행위 | 기대 결과 |
|------|------|-----------|
| 1 | 그래프 로딩 완료 | 노드들이 fcose 레이아웃으로 배치됨 |
| 2 | — | 노드 크기가 연결 수(degree)에 비례하여 차별화 |
| 3 | — | 노드 색상이 종류별로 구분 (Vue=초록, Spring=연두, Store=노랑 등) |
| 4 | — | 노드 모양이 종류별로 구분 (원, 다이아몬드, 삼각형, 사각형, 별 등) |
| 5 | 노드에 마우스 호버 | 노드 1.35배 확대 + 초록 글로우 |
| 6 | — | 연결된 이웃 노드/엣지만 밝게, 나머지 12% 투명 |
| 7 | — | 확장된 클러스터의 parent 노드는 fade되지 않음 |
| 8 | — | 툴팁: 노드 이름 + 종류 + 연결 수 표시 |
| 9 | 마우스 아웃 | 호버 효과 즉시 해제, 모든 노드 원래 상태 |
| 10 | 노드 클릭 | 노드 선택 + persistent 하이라이트 유지 |
| 11 | — | 우측 디테일 패널 자동 열림 + 노드 정보 표시 |
| 12 | — | URL 해시에 선택 노드 ID 저장 (#node=xxx&view=graph) |
| 13 | 빈 영역(배경) 클릭 | 선택 해제 + 모든 하이라이트/페이드 제거 |
| 14 | 마우스 휠 줌 | 부드러운 줌 인/아웃 (0.05x ~ 5x) |
| 15 | 줌 < 0.25x | 노드 라벨 숨김, 엣지 15% 투명 |
| 16 | 줌 0.25x ~ 0.6x | 라벨 12자로 축약, 엣지 40% 투명 |
| 17 | 줌 > 0.6x | 풀 라벨, 엣지 70% 투명 |
| 18 | 마우스 드래그 (배경) | 그래프 패닝 |
| 19 | "Fit" 버튼 클릭 | 전체 그래프가 뷰포트에 맞게 줌 (400ms 애니메이션) |

**수락 조건:**
- [ ] 노드 호버 시 200ms 이내 반응
- [ ] 선택 노드의 이웃만 밝게, 나머지 fade
- [ ] 줌 레벨에 따른 LOD 전환이 자연스러움
- [ ] URL 해시로 특정 노드 상태 공유 가능

---

### US-005: 대규모 그래프 클러스터링
**사용자로서** 200개 이상 노드가 있을 때 디렉토리 기반 클러스터로 그룹화하여 보고 싶다.

| 단계 | 행위 | 기대 결과 |
|------|------|-----------|
| 1 | 200+ 노드 그래프 로딩 | 자동으로 클러스터 모드 활성화 |
| 2 | — | `GET /api/graph?cluster=true&depth=3` 호출 |
| 3 | — | 디렉토리별 그룹 노드 표시 (예: `frontend/src/components (200)`) |
| 4 | — | 5개 미만 노드 그룹은 개별 노드로 표시 |
| 5 | — | 그룹 간 엣지가 집계되어 굵기로 표현 |
| 6 | — | "Clustered view · Click cluster to expand" 안내 표시 |
| 7 | 클러스터 노드 클릭 | `GET /api/graph/cluster/:id` 호출 → 하위 노드 펼침 |
| 8 | — | 펼친 클러스터는 compound node로 표시 (점선 테두리) |
| 9 | — | 펼친 내부 노드 간 엣지만 표시 (양쪽 모두 존재하는 엣지만) |
| 10 | 펼친 클러스터 클릭 | 다시 접힘 (collapse) |
| 11 | "Expand All" 버튼 | 클러스터 모드 해제 → 전체 노드 표시 |
| 12 | "Cluster" 버튼 | 클러스터 모드 재활성화 |
| 13 | 필터로 노드 200개 이하로 감소 | 자동으로 클러스터 모드 해제 |

**수락 조건:**
- [ ] 클러스터 API 응답: 10KB 이내
- [ ] 클러스터 확장 시 내부 노드 올바르게 표시
- [ ] 확장/축소 반복 시 에러 없음
- [ ] 확장된 클러스터 내부 노드 선택 + 하이라이트 정상 동작

---

### US-006: 트리 뷰에서 계층 탐색
**사용자로서** 선택한 노드의 의존성을 트리 형태로 보고 싶다.

| 단계 | 행위 | 기대 결과 |
|------|------|-----------|
| 1 | Graph에서 노드 선택 → Tree 탭 클릭 | 선택 노드 기준 트리 렌더링 |
| 2 | — | 루트 노드: 초록 라벨 + 흰 테두리 + 큰 크기 |
| 3 | — | 자식 노드: 종류별 색상, 크기 차별화 |
| 4 | — | 곡선 베지어 링크로 부모-자식 연결 |
| 5 | — | 뷰포트에 맞게 자동 센터링 + 스케일링 |
| 6 | "Dependencies →" 클릭 | 이 노드가 의존하는 것들 표시 (아웃바운드) |
| 7 | "← Dependents" 클릭 | 이 노드를 의존하는 것들 표시 (인바운드) |
| 8 | Depth 슬라이더 조절 (1~10) | 트리 깊이 동적 변경 |
| 9 | — | 노드 개수 실시간 표시 |
| 10 | 트리 노드 클릭 | 해당 노드로 선택 전환 → 트리 재렌더링 |
| 11 | 줌/패닝 | D3 줌으로 자유롭게 탐색 |

**수락 조건:**
- [ ] 노드 미선택 시: "Select a node in the Graph view" 안내 표시
- [ ] 트리 자동 센터링: 노드 범위 기반 (좌상단 치우침 없음)
- [ ] 부모 노드 라벨은 왼쪽, 리프 노드 라벨은 오른쪽
- [ ] 방향 전환 + depth 변경 시 즉시 재렌더링

---

## Vue 분석 여정

### US-010: Vue 컴포넌트 의존성 감지
**사용자로서** .vue 파일의 모든 의존 관계를 자동으로 감지하고 싶다.

| 감지 항목 | 소스 위치 | 결과 |
|-----------|----------|------|
| import 문 | `<script setup>` | `imports` 엣지 (다른 파일로) |
| useXxxStore() 호출 | `<script setup>` | `uses-store` 엣지 (Pinia 스토어로) |
| useXxx() 호출 (Store 제외) | `<script setup>` | `uses-composable` 엣지 |
| axios.get/post/put/delete() | `<script setup>` | `api-call-site` 노드 + `api-call` 엣지 |
| fetch() 호출 | `<script setup>` | `api-call-site` 노드 (method=GET) |
| this.$http.xxx() | `<script setup>` | `api-call-site` 노드 |
| window.XXX.method() | `<script setup>` | `native-call` 엣지 (native bridge) |
| provide(key, value) | `<script setup>` | `provides` 엣지 |
| inject(key) | `<script setup>` | `injects` 엣지 |
| defineProps({...}) | `<script setup>` | props 목록 메타데이터 |
| defineEmits([...]) | `<script setup>` | emits 목록 메타데이터 |
| `<ChildComponent />` | `<template>` | `uses-component` 엣지 |
| `<kebab-case-tag />` | `<template>` | PascalCase 변환 후 `uses-component` 엣지 |
| v-custom-directive | `<template>` | `uses-directive` 엣지 |
| HTML 기본 태그 (div, span 등) | `<template>` | 무시 (58개 builtin 등록) |
| Vue 내장 컴포넌트 (slot, teleport 등) | `<template>` | 무시 |
| v-if, v-for, v-model 등 내장 디렉티브 | `<template>` | 무시 (12개 builtin 등록) |

**수락 조건:**
- [ ] `<script setup>` 및 일반 `<script>` 모두 파싱
- [ ] TypeScript 및 JavaScript 모두 지원
- [ ] 템플릿 리터럴 URL에서 파라미터 추출 (`:param` 플레이스홀더)
- [ ] 중복 컴포넌트/디렉티브 감지 방지 (Set 기반)

---

### US-011: TypeScript 모듈 분석
**사용자로서** .ts/.js 파일의 종류를 자동 판별하고 의존성을 추출하고 싶다.

| 파일 패턴 | 자동 감지 결과 |
|-----------|---------------|
| 파일명 `use[A-Z]*.ts` | `vue-composable` 종류 |
| 내용에 `defineStore` 포함 | `pinia-store` 종류 |
| 파일명 `*Store.ts` | `pinia-store` 종류 |
| 파일명에 'router' + `createRouter` 포함 | `vue-router-route` 종류 |
| 그 외 | `ts-module` 종류 |

추가:
- export된 함수명 목록 추출 (exportedFunctions 메타데이터)
- barrel 모듈 감지 (import/export만 있는 index.ts)
- re-export 추적 (`export { x } from './module'`)
- API 호출 감지 (ScriptAnalyzer와 동일 패턴)

---

### US-012: Import 경로 해석
**사용자로서** alias(@/), 상대경로, index 파일을 올바르게 해석하여 실제 파일과 연결하고 싶다.

| 입력 | 해석 순서 |
|------|----------|
| `@/components/Foo` | 1. config aliases에서 `@` → `src` 변환 |
| `./Foo` | 1. 상대경로 해석 |
| `../utils/helper` | 1. 상대경로 해석 |
| 파일 없으면 | 2. `.ts` → `.tsx` → `.js` → `.jsx` → `.vue` 확장자 시도 |
| 디렉토리이면 | 3. `index.ts` → `index.tsx` → `index.js` → `index.jsx` → `index.vue` 시도 |
| node_modules 패키지 | 무시 (null 반환) |

tsconfig.json 자동 감지:
- 프로젝트 루트부터 상위 디렉토리로 탐색
- JSON 주석 제거 후 파싱
- `extends` 체인 재귀 해석
- `baseUrl` + `paths` 조합으로 alias 변환
- 명시적 `.vdarc.json` alias가 tsconfig보다 우선

---

## Spring Boot 분석 여정

### US-020: Spring Controller/Endpoint 감지
**사용자로서** Spring Boot의 REST 엔드포인트를 자동으로 추출하고 싶다.

| 어노테이션 | 감지 결과 |
|-----------|-----------|
| @RestController, @Controller | `spring-controller` 노드 |
| @RequestMapping("/api/users") (클래스) | base path 설정 |
| @GetMapping("/{id}") | `spring-endpoint` 노드 (GET /api/users/{id}) |
| @PostMapping("") | `spring-endpoint` 노드 (POST /api/users) |
| @PutMapping, @DeleteMapping, @PatchMapping | 동일 패턴 |
| @RequestMapping(value="...", method=RequestMethod.XXX) | 복합 매핑 |
| 빈 경로 @GetMapping("") | base path만 사용 |

경로 정규화: 선행 `/` 보장, 중복 `/` 제거, 후행 `/` 제거

---

### US-021: Spring DI(의존성 주입) 추적
**사용자로서** Spring의 의존성 주입 관계를 추적하고 싶다.

| 패턴 | 감지 결과 |
|------|-----------|
| @Autowired private XxxService xxx | `spring-injects` 엣지 |
| @RequiredArgsConstructor + private final XxxService | `spring-injects` 엣지 (Lombok) |
| 생성자 파라미터 (XxxService/XxxRepository) | `spring-injects` 엣지 |
| @Service | `spring-service` 노드 |
| @Repository | `spring-service` 노드 (isRepository=true) |
| @Mapper | `spring-service` 노드 (isMapper=true, FQN 포함) |
| @Configuration | `spring-service` 노드 (isConfiguration=true) |
| @Bean 메서드 | `spring-injects` 엣지 (viaBean=true, returnType 추적) |

Lombok 지원: String, Integer, Long, Boolean, List, Map, Set은 injection에서 제외

---

### US-022: Spring Event 추적
**사용자로서** Spring의 이벤트 기반 비동기 통신을 추적하고 싶다.

| 패턴 | 감지 결과 |
|------|-----------|
| applicationEventPublisher.publishEvent(new XxxEvent(...)) | `emits-event` 엣지 → event:XxxEvent |
| @EventListener 메서드 (파라미터 타입) | `listens-event` 엣지 ← event:XxxEvent |

이벤트 클래스명으로 publisher ↔ listener 연결

---

### US-023: Kotlin Controller 지원
**사용자로서** Kotlin으로 작성된 Spring Controller도 분석하고 싶다.

- @RestController/@Controller 감지
- @RequestMapping base path 추출
- @GetMapping/@PostMapping 등 endpoint 추출
- 경로 정규화 동일

제한: @Service/@Repository 감지 미지원 (Controller만)

---

## MyBatis/DB 여정

### US-030: MyBatis XML → DB 테이블 매핑
**사용자로서** MyBatis XML에서 SQL 문과 참조 테이블을 추출하고 싶다.

| 단계 | 감지 결과 |
|------|-----------|
| `<mapper namespace="com.example.UserMapper">` | `mybatis-mapper` 노드 |
| `<select id="findAll">` | `mybatis-statement` 노드 (statementType=select) |
| `<insert id="insert">` | `mybatis-statement` 노드 (statementType=insert) |
| `<update>`, `<delete>` | 동일 패턴 |
| mapper → statement | `mybatis-maps` 엣지 |
| SELECT ... FROM users | `db-table:users` 노드 + `reads-table` 엣지 |
| INSERT INTO users | `db-table:users` 노드 + `writes-table` 엣지 |
| UPDATE users | `writes-table` 엣지 |
| DELETE FROM users | `writes-table` 엣지 |
| JOIN user_roles | `reads-table` 엣지 |

SQL 파싱: CDATA 제거, 주석 제거, 문자열 리터럴 제거, ${} 파라미터 치환, SQL 키워드 필터

---

### US-031: MyBatis Mapper ↔ Java Interface 링킹
**사용자로서** MyBatis XML의 namespace가 Java @Mapper 인터페이스와 자동 연결되길 원한다.

| 매칭 우선순위 | 방법 |
|-------------|------|
| 1순위 | FQN (패키지명.클래스명) 완전 일치 |
| 2순위 | className만 일치 |
| 3순위 | label (표시명) 일치 |

추가: 동일 테이블명을 참조하는 여러 XML의 db-table 노드를 자동 병합 (중복 제거)

---

## 크로스보더 여정

### US-040: Vue API 호출 ↔ Spring Endpoint 자동 매칭
**사용자로서** 프론트엔드의 API 호출이 백엔드의 어떤 엔드포인트에 매핑되는지 보고 싶다.

| Vue 코드 | Spring 코드 | 매칭 결과 |
|----------|------------|-----------|
| `axios.get('/api/users')` | `@GetMapping("") on /api/users` | ✅ 매칭 |
| `axios.post('/api/users')` | `@PostMapping("")` | ✅ 매칭 (HTTP method 구분) |
| `axios.get('/api/users/:id')` | `@GetMapping("/{id}")` | ✅ 매칭 (`:id` → `{id}` 정규화) |
| `axios.get(\`/api/users/${id}\`)` | `@GetMapping("/{id}")` | ✅ 매칭 (템플릿 리터럴 → `{param}`) |
| 다른 HTTP method | — | ❌ 매칭 안 됨 |
| 다른 경로 | — | ❌ 매칭 안 됨 |

apiBaseUrl 설정 시: 양쪽 모두에서 prefix 제거 후 비교

---

### US-041: Native Bridge 감지
**사용자로서** Vue에서 Native(Android/iOS) 인터페이스 호출을 추적하고 싶다.

| 패턴 | 결과 |
|------|------|
| `window.AndroidBridge.showToast()` | `native-bridge:AndroidBridge` 노드 + `native-method:AndroidBridge.showToast` 노드 |
| config.nativeBridges에 등록된 이름 | 해당 패턴 감지 |
| window.XXX.method() (일반) | 모든 window 프로퍼티 접근 감지 |
| 플랫폼 추론 | 이름에 'android' → android, 'ios'/'webkit' → ios |

---

## 분석 기능 여정

### US-050: 순환 의존성 감지
**사용자로서** 프로젝트의 순환 참조를 자동으로 찾고 싶다.

- Tarjan's SCC 알고리즘으로 감지
- 2개 이상 노드로 이루어진 순환 그룹만 보고
- CLI: 순환 그룹 목록 (A → B → C → A)
- API: `GET /api/analysis/overlays` → circularNodeIds[], circularGroups[][]
- UI: (오버레이 데이터 제공, 시각화는 향후)

---

### US-051: 고아 노드 / 미사용 코드 감지
**사용자로서** 아무도 참조하지 않는 코드를 찾고 싶다.

| 감지 종류 | 조건 |
|-----------|------|
| 완전 고아 | in-edge 0 AND out-edge 0 |
| 미사용 컴포넌트 | vue-component이면서 incoming uses-component/route-renders 없음 |
| 미사용 엔드포인트 | spring-endpoint이면서 incoming api-call 없음 |

---

### US-052: 복잡도 / 허브 노드 감지
**사용자로서** 과도하게 결합된 병목 노드를 식별하고 싶다.

- 복잡도 점수: fan-in × fan-out
- 허브 판별: fan-in ≥ 5 OR fan-out ≥ 5
- API: `GET /api/stats` → topComplexity (상위 20개)
- API: `GET /api/analysis/overlays` → hubNodeIds[]

---

### US-053: 영향도 분석 (Impact Analysis)
**사용자로서** 특정 파일을 변경했을 때 영향 받는 범위를 알고 싶다.

- `GET /api/graph/node/:id/impact?depth=N`
- 직접 의존자 (1-depth) + 전이 의존자 (N-depth) 반환
- depth 제한 가능 (기본: 무제한)

---

### US-054: 경로 탐색 (Pathfinding)
**사용자로서** 두 노드 사이의 의존 경로를 모두 찾고 싶다.

- `GET /api/graph/paths?from=X&to=Y&maxDepth=10`
- DFS로 모든 경로 탐색
- 단일 경로 내 순환 방지
- 최대 깊이 제한 (기본 10)
- 반환: paths 배열 + count

---

## 서버 API 여정

### US-060: REST API 전체 목록

| Method | Path | 설명 | 파라미터 |
|--------|------|------|---------|
| GET | /api/graph | 전체 그래프 | nodeKinds, edgeKinds, cluster, depth |
| GET | /api/graph/cluster/:id | 클러스터 확장 | clusterId |
| GET | /api/graph/node/:id | 노드 상세 | nodeId |
| GET | /api/graph/node/:id/impact | 영향도 분석 | nodeId, depth |
| GET | /api/graph/paths | 경로 탐색 | from (필수), to (필수), maxDepth |
| GET | /api/search | 노드 검색 | q (label, filePath 검색, 최대 50건) |
| GET | /api/stats | 통계 | — |
| GET | /api/analysis/overlays | 시각화 오버레이 | — |
| GET | /api/source-snippet | 소스 코드 조각 | file (필수), line (필수), context |
| GET | /api/analysis/parse-errors | 파싱 오류 목록 | — |
| POST | /api/analyze | 재분석 트리거 | — |

에러 응답:
- 400: 필수 파라미터 누락 (paths, source-snippet)
- 404: 노드/파일 미발견

---

### US-061: WebSocket 실시간 업데이트

| 메시지 타입 | 방향 | 내용 |
|------------|------|------|
| analysis:started | Server→Client | { totalFiles } |
| analysis:progress | Server→Client | { processed, total, currentFile, cachedCount, elapsedMs } |
| analysis:complete | Server→Client | { totalFiles, totalNodes, totalEdges, durationMs, cachedCount } |
| graph:update | Server→Client | { changedFile, removedFile, action } |

진행률 메시지: 100ms 스로틀 (초당 최대 10회)

---

## UI 인터랙션 여정

### US-070: 노드 상세 패널
**사용자로서** 선택한 노드의 상세 정보와 연결된 의존성을 보고 싶다.

| 섹션 | 내용 |
|------|------|
| 헤더 | 종류 색상 원 + 이름 + 닫기(X) 버튼 |
| 기본 정보 | 종류 라벨 + 파일 경로 |
| 메타데이터 | 키-값 목록 (배열은 콤마 구분) |
| Dependencies | 아웃바운드 엣지 목록 (→ 표시), 클릭으로 이동 |
| Dependents | 인바운드 엣지 목록 (← 표시), 클릭으로 이동 |
| 빈 상태 | "Click a node to see details" |

---

### US-071: 검색
**사용자로서** 노드 이름이나 파일 경로로 빠르게 검색하고 싶다.

| 방법 | 동작 |
|------|------|
| SearchPanel 입력 | 300ms 디바운스 → `/api/search` 호출 |
| 결과 항목 클릭 | 해당 노드 선택 + 그래프 포커스 |
| 결과 표시 | 색상 원 + 이름 + 종류 |

---

### US-072: 필터링
**사용자로서** 특정 종류의 노드/엣지만 보고 싶다.

| 기능 | 동작 |
|------|------|
| 노드 종류 체크박스 | 체크 해제 시 해당 종류 노드 숨김 |
| 엣지 종류 체크박스 | 체크 해제 시 해당 종류 엣지 숨김 |
| 필터 적용 | 150ms 디바운스 후 그래프 갱신 |
| 양쪽 endpoint가 필터된 엣지 | 함께 제거 |
| 200개 이하로 감소 시 | 자동 클러스터 해제 |

---

### US-073: 그래프 범례 (Legend)
**사용자로서** 노드/엣지 색상의 의미를 빠르게 확인하고 싶다.

| 기능 | 동작 |
|------|------|
| 기본 상태 | 우상단에 "Legend" 버튼만 표시 |
| 마우스 호버 또는 클릭 | 범례 패널 펼침 |
| 노드 범례 | 색상 원 + 종류 라벨 + 현재 개수 |
| 엣지 범례 | SVG 선 스타일 (실선/점선 + 색상) + 종류명 |
| 항목 클릭 | 해당 종류 필터 토글 (FilterPanel과 연동) |
| 비활성 종류 | 40% 투명도 |

---

### US-074: Command Palette (Cmd+K)
**사용자로서** 키보드로 빠르게 노드를 검색하고 명령을 실행하고 싶다.

| 단축키 | 동작 |
|--------|------|
| Cmd+K / Ctrl+K | 팔레트 열기/닫기 |
| / (input 밖에서) | 팔레트 열기 |
| Escape | 팔레트 닫기 |
| ↑↓ | 결과 항목 탐색 |
| Enter | 선택 항목 실행 |

| 검색 범위 | 내용 |
|-----------|------|
| 명령어 | Re-analyze, Fit to view, Export JSON, Reset filters |
| 노드 검색 | `/api/search` API 호출 (150ms 디바운스) |
| 퍼지 매칭 | 부분 문자열 + 단어 시작 매칭 |
| 최근 항목 | localStorage에 최대 4개 저장, 결과 상단 표시 |

---

### US-075: 온보딩 가이드
**사용자로서** 처음 사용할 때 주요 인터랙션을 안내받고 싶다.

| 안내 항목 | 내용 |
|-----------|------|
| 노드 클릭 | "Click any node to see its dependencies and details" |
| 클러스터 확장 | "Expand grouped nodes by double-clicking them" |
| 검색 | "Press / or Cmd+K to search for any file or component" |
| 필터 | "Use the Filter panel or Legend to show specific dependency types" |

- 첫 실행 시 오버레이로 표시
- "다시 보지 않기" 체크박스 + "Got it" 버튼
- 배경 클릭 또는 ESC로 닫기
- localStorage(`vda-onboarding-dismissed`)에 영속화

---

### US-076: 사이드바 / 디테일 패널 리사이즈
**사용자로서** 사이드바와 디테일 패널 크기를 조절하고 싶다.

| 패널 | 기본 | 최소 | 최대 | 영속화 |
|------|------|------|------|--------|
| 좌측 사이드바 | 288px | 200px | 400px | localStorage |
| 우측 디테일 | 320px | 280px | 500px | localStorage |

- 사이드바 닫기: 헤더 X 버튼 → 사이드바 숨김 + 툴바에 햄버거 아이콘 표시
- 디테일 닫기: 패널 헤더 X 버튼
- 디테일 자동 열림: 노드 선택 시
- 드래그 리사이즈: 핸들 호버 시 파란색 하이라이트

---

## 앱 상태 여정

### US-080: 연결 상태 관리

| 상태 | UI 표현 |
|------|---------|
| connected | 초록색 dot |
| connecting | 노란색 pulsing dot |
| disconnected (그래프 없음) | 전체 화면 연결 안내 + 자동 재연결 메시지 |
| disconnected (그래프 있음) | dot만 빨간색 (기존 그래프 유지) |

---

### US-081: 분석 진행 중

| 표시 항목 | 내용 |
|-----------|------|
| 프로그레스 바 | 녹색, 퍼센트 기반 |
| 파일 수 | "342 / 500 files (67%)" |
| 캐시 히트 | "(180 cached)" 파란색 |
| 현재 파일 | 경로의 마지막 3 세그먼트 |
| 경과 시간 | "1.2s" |
| 예상 시간 | "~2s remaining" (평균 파일당 시간 기반) |
| 취소 버튼 | 분석 중단 |

---

### US-082: 빈 상태 / 데이터 없음

| 상태 | UI |
|------|-----|
| 서버 연결됨 + 그래프 비어있음 | 📊 아이콘 + "No analysis data yet" + "Analyze Now" 버튼 |
| 서버 미연결 | 🔌 아이콘 + "Server not connected" + vda serve 명령 안내 |

---

## 비기능 여정

### US-090: 캐시 시스템
**사용자로서** 반복 분석 시 변경된 파일만 재파싱하여 시간을 절약하고 싶다.

- SHA-256 해시 (16자)로 파일 내용 비교
- `.vda-cache/parse-cache.json`에 디스크 영속화
- 설정(configHash) 변경 시 전체 캐시 무효화
- 캐시 버전 불일치 시 전체 무효화
- 캐시 파일 손상 시 자동 복구 (빈 캐시로 시작)
- `--no-cache` CLI 플래그로 캐시 비활성화

---

### US-091: 성능 요구사항

| 항목 | 목표 | 측정 방법 |
|------|------|----------|
| 500파일 초기 분석 | < 5초 | `vda analyze --no-cache` |
| 500파일 캐시 분석 | < 2초 | `vda analyze` (두 번째 실행) |
| 클러스터 API 응답 | < 10KB | `GET /api/graph?cluster=true` |
| 노드 호버 반응 | < 200ms | 브라우저 DevTools |
| 필터 토글 반응 | < 200ms | debounce 150ms + 렌더링 |

---

### US-092: 그래프 내보내기
**사용자로서** 분석 결과를 파일로 내보내고 싶다.

| 형식 | 명령 | 용도 |
|------|------|------|
| JSON | `vda export -f json -o graph.json` | 프로그래밍적 활용 |
| GraphViz DOT | `vda export -f dot -o graph.dot` | Graphviz 렌더링 |
| JSON (UI) | Command Palette → "Export as JSON" | 브라우저에서 다운로드 |

---

### US-093: 소스 코드 스니펫
**사용자로서** 의존성이 발생한 실제 코드 라인을 확인하고 싶다.

- `GET /api/source-snippet?file=X&line=N&context=5`
- 해당 라인 ±5줄 반환
- 각 라인: 번호 + 텍스트 + 하이라이트 여부
- 파일 없으면 404

---

### US-094: 파싱 오류 리포트
**사용자로서** 분석 중 파싱에 실패한 파일을 확인하고 싶다.

- `GET /api/analysis/parse-errors`
- 각 오류: filePath, message, line?, severity (error/warning)

---

### US-095: 디자인 토큰 시스템
**사용자로서** 일관된 다크 테마 UI를 사용하고 싶다.

| 토큰 종류 | 예시 |
|-----------|------|
| Surface | primary (#0f1219), secondary (#1a1f2e), elevated (#242938) |
| Text | primary (#f0f0f0), secondary (#a0a8b8), tertiary (#6b7280) |
| Accent | vue (#42b883), blue (#3b82f6), warning (#f59e0b), danger (#ef4444) |
| Border | subtle (#2a3040), default (#3a4050), focus (#3b82f6) |
| Motion | fast (150ms), default (250ms), slow (400ms) |
| Radii | sm (4px), md (8px), lg (12px) |

- CSS custom properties 기반
- 모든 컴포넌트에서 `var(--token)` 사용
- 전역 `focus-visible` 링 (접근성)

---

### US-096: 색맹 접근성
**사용자로서** 색상만으로 노드 종류를 구분할 수 없을 때 모양으로 구분하고 싶다.

| 노드 종류 | 색상 | 모양 |
|-----------|------|------|
| Vue Component | 초록 | 원 (ellipse) |
| Composable | 보라 | 삼각형 (triangle) |
| Pinia Store | 노랑 | 다이아몬드 (diamond) |
| Vue Directive | 진보라 | 육각형 (hexagon) |
| Router Route | 파랑 | 둥근사각형 (round-rectangle) |
| TS Module | TS파랑 | 사각형 (rectangle) |
| API Call | 빨강 | 오각형 (pentagon) |
| Controller | 연두 | 둥근사각형 |
| Endpoint | 초록 | 사각형 |
| Service | 녹색 | 육각형 |
| Native Bridge | 주황 | 별 (star) |
| MyBatis Mapper | 핑크 | 둥근사각형 |
| SQL Statement | 연핑크 | 사각형 |
| DB Table | 시안 | 다이아몬드 |

---

### US-097: 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| Cmd+K / Ctrl+K | Command Palette 열기/닫기 |
| / | Command Palette 열기 (input 밖에서) |
| Escape | 순서: Command Palette 닫기 → 노드 선택 해제 |
| ↑↓ (팔레트) | 결과 탐색 |
| Enter (팔레트) | 선택 실행 |

---

### US-098: 상태바

| 위치 | 내용 |
|------|------|
| 좌측 | 분석된 파일 수 |
| 우측 | 마지막 분석 시각 (로컬 시간) |

---

### US-099: URL 해시 상태
**사용자로서** 현재 선택 상태를 URL로 공유하고 싶다.

- 형식: `#node=<encodedNodeId>&view=graph|tree`
- 노드 선택 시 자동 업데이트
- 페이지 로드 시 해시에서 상태 복원
- 뷰 전환 시 해시 업데이트
