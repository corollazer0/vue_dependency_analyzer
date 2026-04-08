Vue Dependency Analyzer (VDA) - Implementation Plan                                                                                           
                                                        
 Context

 Vue.js + Spring Boot 프로젝트의 프로그램 간 의존성을 세계 최고 수준으로 분석/시각화하는 도구를 처음부터 구축한다. Vue 내부 의존성(컴포넌트,
 Pinia, composable, router), Vue→Spring Boot API 호출, Vue→Native JavaScriptInterface 호출까지 모두 추적하여 Obsidian식 그래프 뷰와 구조적
 트리 뷰로 시각화한다.

 Architecture Overview

 Monorepo (npm workspaces + turbo) with 4 packages:

 vue_dependency_analyzer/
 ├── packages/
 │   ├── core/        # 분석 엔진 (파서, 링커, 그래프 모델)
 │   ├── cli/         # CLI 진입점 (commander)
 │   ├── server/      # HTTP API + WebSocket (fastify)
 │   └── web-ui/      # 시각화 프론트엔드 (Vue 3 + Vite)

 Phase 1: Foundation (Core + CLI)

 1.1 프로젝트 스캐폴딩

 - Root package.json (npm workspaces), turbo.json, tsconfig.base.json
 - 4개 패키지 초기 설정 (package.json, tsconfig.json)
 - ESLint, Vitest 설정

 1.2 그래프 데이터 모델 (packages/core/src/graph/)

 - types.ts: NodeKind, EdgeKind, GraphNode, GraphEdge, DependencyGraph 인터페이스
   - NodeKind: vue-component, vue-composable, pinia-store, vue-directive, vue-router-route, ts-module, api-call-site, spring-controller,
 spring-endpoint, spring-service, native-bridge, native-method
   - EdgeKind: imports, uses-component, uses-store, uses-composable, uses-directive, provides, injects, api-call, api-serves, native-call,
 route-renders, spring-injects
 - DependencyGraph.ts: 노드/엣지 CRUD, adjacency/reverse-adjacency 인덱스
 - query.ts: 필터링, 탐색, impact analysis 유틸
 - serializer.ts: JSON 직렬화/역직렬화

 1.3 Vue 파서 (packages/core/src/parsers/vue/)

 - 라이브러리: @vue/compiler-sfc + TypeScript Compiler API
 - VueSfcParser.ts: SFC → template/script 분리
 - ScriptAnalyzer.ts: TS AST 워킹으로 다음을 감지:
   - import 문 → imports 엣지
   - useXxxStore() → uses-store 엣지
   - useXxx() composable → uses-composable 엣지
   - axios.get/post/fetch() → api-call 엣지 + URL 추출
   - window.XXX.method() → native-call 엣지
   - provide()/inject() → provides/injects 엣지
   - defineProps/defineEmits → 메타데이터
 - TemplateAnalyzer.ts: 템플릿 AST 워킹:
   - 커스텀 컴포넌트 태그 → uses-component 엣지
   - v-xxx 디렉티브 → uses-directive 엣지
   - @event 리스너 → listens-event 엣지

 1.4 TypeScript/Composable/Store 파서 (packages/core/src/parsers/typescript/)

 - TsFileParser.ts: 일반 .ts 파일 파싱
 - ImportResolver.ts: alias 해석 (@ → src/), 상대경로 해석

 1.5 Java/Kotlin 파서 (packages/core/src/parsers/java/)

 - 라이브러리: java-ast (ANTLR4, JVM 불필요)
 - JavaFileParser.ts: Java AST → 클래스/메서드 추출
 - AnnotationExtractor.ts: @RestController, @GetMapping 등
 - ControllerAnalyzer.ts: class-level basePath + method-level path 결합
 - EndpointMapper.ts: 완전한 endpoint 노드 생성
 - Kotlin: regex 기반 annotation 추출 (java-ast 대안)

 1.6 링커 (packages/core/src/linkers/)

 - ApiCallLinker.ts: 프론트엔드 API 호출 URL ↔ Spring endpoint 매칭
   - path parameter 정규화 (:id ↔ {id})
   - baseURL + path 결합 처리
 - NativeBridgeLinker.ts: JSInterface 호출 매칭
 - CrossBoundaryResolver.ts: 링킹 오케스트레이션

 1.7 분석기 (packages/core/src/analyzers/)

 - CircularDependencyAnalyzer.ts: Tarjan's SCC
 - OrphanDetector.ts: 미사용 컴포넌트/엔드포인트
 - ComplexityScorer.ts: fan-in/fan-out 메트릭
 - ImpactAnalyzer.ts: "X를 변경하면 뭐가 깨지나?"

 1.8 CLI (packages/cli/)

 - commander 기반
 - 명령어: vda analyze, vda serve, vda export --format json|dot
 - 설정 파일: .vdarc.json

 Phase 2: Server + Web UI

 2.1 서버 (packages/server/)

 - Fastify HTTP API:
   - GET /api/graph (필터링 지원)
   - GET /api/graph/node/:id (개별 노드 + 인/아웃 엣지)
   - GET /api/graph/node/:id/impact (영향 분석)
   - GET /api/search?q= (노드 검색)
   - POST /api/analyze (분석 트리거)
   - GET /api/stats (통계)
 - WebSocket: 실시간 그래프 업데이트
 - chokidar: 파일 감시 → 증분 재분석 → WS push

 2.2 Web UI (packages/web-ui/)

 - Vue 3 + Vite + Pinia + TailwindCSS
 - Force-directed Graph (Cytoscape.js):
   - NodeKind별 색상/아이콘 구분
   - EdgeKind별 스타일 (실선/점선/색상)
   - 디렉토리별 compound node 그루핑
   - 클릭 시 상세 패널
   - 필터링 (nodeKind, edgeKind, 검색)
   - 줌/패닝/선택
 - Tree/Hierarchy View (d3-hierarchy):
   - 선택 노드 기준 의존성 트리
   - 접기/펼치기
   - dependents vs dependencies 방향 전환
 - 공통 UI: 사이드바 (파일 탐색기, 검색, 필터), 노드 상세 패널

 Key Library Choices

 ┌───────────────┬─────────────────────────┬───────────────────────────────────────────────┐
 │     용도      │       라이브러리        │                     이유                      │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ Vue SFC 파싱  │ @vue/compiler-sfc       │ 공식 Vue 3 파서                               │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ TS/JS AST     │ typescript compiler API │ 완전한 TS 지원                                │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ Java 파싱     │ java-ast (ANTLR4)       │ Node.js 내 JVM 없이 실행                      │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ 그래프 시각화 │ cytoscape.js            │ compound node, 다중 레이아웃, 5000+ 노드 성능 │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ 트리 시각화   │ d3-hierarchy            │ 계층 구조 전용, 경량                          │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ HTTP 서버     │ fastify                 │ 빠르고 TS 지원 우수                           │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ 파일 감시     │ chokidar                │ 표준 Node.js 파일 감시                        │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ CLI           │ commander               │ 경량, 타입 지원                               │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ UI 프레임워크 │ Vue 3 + Vite            │ 독푸딩 + 빠른 개발                            │
 ├───────────────┼─────────────────────────┼───────────────────────────────────────────────┤
 │ 스타일링      │ tailwindcss             │ 유틸리티 우선                                 │
 └───────────────┴─────────────────────────┴───────────────────────────────────────────────┘

 Implementation Order

 1. 스캐폴딩 → 모노레포 구조, 빌드 설정
 2. 그래프 모델 → types.ts, DependencyGraph.ts (모든 것의 기반)
 3. Vue 파서 → 가장 복잡하고 핵심적인 파서
 4. TS 파서 + Import Resolver → composable, store 파일 처리
 5. Java 파서 → Spring Boot endpoint 추출
 6. 링커 → 프론트↔백엔드 연결
 7. 분석기 → 순환 의존성, 고아 노드, impact
 8. CLI → 분석 실행 진입점
 9. Server → API + WebSocket + 파일 감시
 10. Web UI → 그래프 뷰 → 트리 뷰 → 필터/검색/상세

 Verification

 1. 테스트 픽스처: 샘플 Vue 3 + Spring Boot 프로젝트 작성
 2. 단위 테스트: 각 파서가 올바른 노드/엣지 생성 확인 (vitest)
 3. 통합 테스트: 전체 분석 파이프라인 → JSON 출력 검증
 4. E2E: vda serve 실행 → 브라우저에서 그래프 확인
 5. 성능: 1000+ 파일 프로젝트에서 분석 시간 측정


  VDA Phase 2: Performance & UX Improvements                                                                                                    
                                                                                                                                               
 Context                                                                                                                                       
                                                                                                                                               
 현재 VDA는 소규모 프로젝트에서 동작하지만, 실제 사용 환경(Vue 2-3000파일, MSA별 Spring Boot 300-500파일)에서는 분석 10-30분 소요, UI 프리징,
 피드백 없음 등 심각한 문제가 있다. 이 계획은 성능과 UX를 동시에 개선한다.

 발견된 8가지 문제점

 ┌─────┬─────────────────────────┬──────────┬──────────────────────────┬─────────────────────────┐
 │  #  │          문제           │  심각도  │           현재           │          목표           │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 1   │ 순차 파싱 (단일 스레드) │ CRITICAL │ 3000파일 → 10-30분       │ → 1-3분 (병렬)          │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 2   │ 분석 진행률 없음        │ CRITICAL │ "Loading..." 무한        │ → 파일수/시간/예상 표시 │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 3   │ 캐싱 없음               │ HIGH     │ 매번 전체 재분석         │ → 변경분만 재분석       │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 4   │ 전체 그래프 한번에 전송 │ HIGH     │ 5-15MB JSON              │ → 뷰포트 기반 로딩      │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 5   │ 3000노드 동시 렌더링    │ CRITICAL │ UI 30-60초 프리징        │ → 클러스터링 + 가상화   │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 6   │ Vue deep watcher 과부하 │ HIGH     │ 필터 토글 시 전체 재계산 │ → 최적화된 반응성       │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 7   │ 온보딩/빈 상태 UX 없음  │ MEDIUM   │ 무정보 로딩 화면         │ → 가이드 + 프로그레스   │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ 8   │ tsconfig.json 미지원    │ MEDIUM   │ alias 수동 설정 필요     │ → 자동 감지             │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ +   │ MSA 다중 서비스 미지원  │ HIGH     │ 단일 spring-root만       │ → 복수 서비스 지원      │
 ├─────┼─────────────────────────┼──────────┼──────────────────────────┼─────────────────────────┤
 │ +   │ 초기 설정 수동          │ MEDIUM   │ .vdarc.json 수동 생성    │ → vda init 자동 감지    │
 └─────┴─────────────────────────┴──────────┴──────────────────────────┴─────────────────────────┘

 Implementation Steps

 Step 1: 병렬 파싱 + 캐싱 엔진 (문제 #1, #3)

 packages/core/src/engine/ParallelParser.ts (새 파일):
 - worker_threads 기반 병렬 파싱 (CPU 코어수 자동 감지)
 - 파일별 content SHA-256 해시 → 파스 결과 캐싱
 - 캐시 히트 시 파싱 스킵, 변경분만 재파싱
 - 진행률 콜백 지원: onProgress(processed, total, currentFile)

 packages/core/src/engine/ParseCache.ts (새 파일):
 - Map<filePath, { contentHash, parseResult, timestamp }>
 - .vda-cache/ 디렉토리에 JSON 직렬화 (재시작 시에도 캐시 유지)
 - invalidate(filePath) / invalidateAll() 메서드

 변경 파일:
 - packages/cli/src/config.ts — runAnalysis()를 ParallelParser 사용으로 교체
 - packages/server/src/engine.ts — 동일 적용, 증분 재분석 로직 개선

 Step 2: 분석 진행률 피드백 (문제 #2, #7)

 packages/server/src/engine.ts 변경:
 - runAnalysis()에서 100파일마다 WebSocket 진행률 브로드캐스트
 - { type: 'analysis:progress', payload: { processed, total, currentFile, elapsed } }

 packages/web-ui/src/components/AnalysisProgress.vue (새 파일):
 - 프로그레스 바 (파일 수 기반)
 - 현재 파싱 중인 파일명 표시
 - 경과 시간 + 예상 남은 시간
 - 취소 버튼

 packages/web-ui/src/App.vue 변경:
 - 분석 중일 때 AnalysisProgress 컴포넌트 표시
 - 첫 실행 시 온보딩 메시지 ("프로젝트 분석 중...")

 Step 3: 그래프 클러스터링 + 가상화 (문제 #5, #4)

 packages/web-ui/src/composables/useGraphClustering.ts (새 파일):
 - 디렉토리 기반 자동 클러스터링 (예: components/user/ → 하나의 그룹 노드)
 - 클러스터 접기/펼치기 인터랙션
 - 초기 로딩 시 depth 1까지만 펼침 → 사용자가 필요한 부분만 확장
 - 노드 수 임계값 (예: 200개 이상이면 자동 클러스터링)

 packages/web-ui/src/components/graph/ForceGraphView.vue 변경:
 - Cytoscape compound nodes 활용한 클러스터 렌더링
 - 뷰포트 기반 렌더링: 화면 밖 노드는 숨김
 - 줌 레벨에 따른 LOD (Level of Detail): 멀리서는 클러스터만, 가까이서 개별 노드
 - cytoscape-cxtmenu 확장으로 컨텍스트 메뉴 (펼치기/접기/집중보기)

 packages/server/src/routes/graphRoutes.ts 변경:
 - /api/graph 에 cluster=true&depth=1 파라미터 지원
 - 클러스터 모드에서는 집계된 노드/엣지만 전송 (300-500개)
 - /api/graph/cluster/:clusterId/expand — 특정 클러스터 펼치기

 Step 4: 반응성 최적화 (문제 #6)

 packages/web-ui/src/stores/graphStore.ts 변경:
 - filteredNodes를 shallowRef로 변경 (deep watch 제거)
 - 필터 토글 시 diff 계산 → 변경된 노드만 Cytoscape에 add/remove
 - debounce 적용: 빠른 연속 필터 토글 시 마지막만 반영

 packages/web-ui/src/components/graph/ForceGraphView.vue 변경:
 - watch({ deep: true }) → shallow watch + diff 기반 업데이트
 - 레이아웃 재계산을 incremental로 변경 (전체 relayout 대신 새 노드만 위치 계산)

 Step 5: tsconfig.json 자동 감지 + MSA 지원 (문제 #8, +)

 packages/core/src/parsers/typescript/ImportResolver.ts 변경:
 - 프로젝트 루트에서 tsconfig.json 자동 탐색 및 compilerOptions.paths 읽기
 - baseUrl + paths 조합으로 alias 자동 해석
 - 중첩 tsconfig (extends) 지원

 packages/core/src/graph/types.ts 변경:
 - AnalysisConfig.springBootRoots: string[] (복수형) 추가 — MSA 다중 서비스
 - 각 서비스별 serviceId 라벨링 (노드 메타데이터에 포함)

 packages/cli/src/commands/init.ts (새 파일):
 - vda init 명령어: 프로젝트 디렉토리 스캔 → .vdarc.json 자동 생성
 - Vue 프로젝트 자동 감지 (package.json에서 vue 의존성 확인)
 - Spring Boot 프로젝트 자동 감지 (build.gradle, pom.xml 확인)
 - tsconfig.json에서 alias 자동 추출
 - MSA 디렉토리 구조 자동 감지

 Step 6: 고급 UX 기능

 packages/web-ui/src/components/graph/MiniMap.vue (새 파일):
 - 전체 그래프의 축소 미니맵 (우하단)
 - 현재 뷰포트 위치 표시 + 클릭으로 이동

 packages/web-ui/src/components/StatusBar.vue (새 파일):
 - 하단 상태바: 노드수, 엣지수, 마지막 분석 시각, 감시 상태

 packages/web-ui/src/components/graph/ForceGraphView.vue 추가:
 - 키보드 단축키: / 검색, Esc 선택해제, F 전체보기
 - 노드 우클릭 컨텍스트 메뉴: "이 노드 중심으로 보기", "이 파일 열기", "의존성 트리"
 - 선택 노드의 1차/2차 이웃 하이라이트 토글 (현재 1차만)

 packages/web-ui/src/App.vue 추가:
 - 빈 상태 (서버 연결 전): 연결 상태 + 재시도 버튼
 - URL 해시 기반 상태 유지: #node=vue:/src/App.vue&view=graph → 공유 가능

 성능 목표

 ┌────────────────────────┬─────────────┬───────────────────┐
 │       측정 항목        │ 현재 (추정) │       목표        │
 ├────────────────────────┼─────────────┼───────────────────┤
 │ 3000 파일 초기 분석    │ 10-30분     │ 1-3분             │
 ├────────────────────────┼─────────────┼───────────────────┤
 │ 캐시 히트 재분석       │ 10-30분     │ 5-10초            │
 ├────────────────────────┼─────────────┼───────────────────┤
 │ 단일 파일 변경 (watch) │ 2-5초       │ <500ms            │
 ├────────────────────────┼─────────────┼───────────────────┤
 │ 초기 그래프 렌더링     │ 30-60초     │ <3초              │
 ├────────────────────────┼─────────────┼───────────────────┤
 │ 필터 토글 응답         │ 5-10초      │ <200ms            │
 ├────────────────────────┼─────────────┼───────────────────┤
 │ API 그래프 응답 크기   │ 5-15MB      │ <500KB (클러스터) │
 └────────────────────────┴─────────────┴───────────────────┘

 Implementation Order

 1. Step 1: 병렬 파싱 + 캐싱 (성능 핵심)
 2. Step 2: 진행률 피드백 (즉각적 UX 개선)
 3. Step 3: 클러스터링 + 가상화 (UI 성능 핵심)
 4. Step 4: 반응성 최적화
 5. Step 5: tsconfig 자동감지 + MSA 지원 + vda init
 6. Step 6: 고급 UX (미니맵, 상태바, 단축키)

 Verification

 1. 성능 벤치마크: 3000개 fixture 파일 생성 → 분석 시간 측정
 2. UI 프로파일링: Chrome DevTools Performance 탭으로 렌더링 시간 측정
 3. 메모리: 3000 노드 그래프에서 메모리 사용량 < 500MB
 4. WebSocket: 진행률 메시지가 100ms 간격으로 UI에 도달하는지 확인
 5. 캐시: 두 번째 분석 실행 시 10배 이상 빠른지 확인


 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Phase 3: UX/Design Excellence — Apple+Google Grade Polish

 Context

 20년차 Apple/Google 시니어 프론트엔드 리드 + UX Researcher 그룹 관점에서 전체 Web UI를 감사했다. 기능은
 충분하나 디자인 시스템 부재, 마이크로 인터랙션 결여, 접근성 미흡, 정보 계층 혼란이 핵심 문제. 이 계획은
 "도구"를 "제품"으로 전환하는 작업이다.

 핵심 문제 8가지

 ┌─────┬────────────────────────────┬──────────┬───────────────────────────┐
 │  #  │            문제            │  심각도  │         현재 상태         │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 1   │ 디자인 토큰 부재           │ HIGH     │ 하드코딩 색상/크기 산재   │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 2   │ 노드 호버/선택 피드백 없음 │ CRITICAL │ 클릭해야만 반응           │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 3   │ 그래프 범례(Legend) 없음   │ HIGH     │ 색상/선종류 의미를 모름   │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 4   │ 빈 상태/온보딩 없음        │ HIGH     │ 빈 화면, 안내 없음        │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 5   │ 트랜지션/애니메이션 없음   │ MEDIUM   │ 노드 등장/퇴장이 즉시     │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 6   │ 노드 크기가 모두 동일      │ MEDIUM   │ 중요도 구분 불가          │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 7   │ 사이드바 리사이즈 불가     │ MEDIUM   │ 고정 w-72, 작은 화면 문제 │
 ├─────┼────────────────────────────┼──────────┼───────────────────────────┤
 │ 8   │ Command Palette 없음       │ HIGH     │ 파워유저 탐색 경로 없음   │
 └─────┴────────────────────────────┴──────────┴───────────────────────────┘

 Implementation Steps

 Step 1: Design Token System + Theme

 새 파일: src/styles/tokens.css
 :root {
   --surface-primary: #0f1219;
   --surface-secondary: #1a1f2e;
   --surface-elevated: #242938;
   --border-subtle: #2a3040;
   --border-default: #3a4050;
   --text-primary: #f0f0f0;
   --text-secondary: #a0a8b8;
   --text-tertiary: #6b7280;
   --accent-primary: #42b883;    /* Vue green */
   --accent-blue: #3b82f6;
   --accent-warning: #f59e0b;
   --accent-danger: #ef4444;
   --radius-sm: 4px;
   --radius-md: 8px;
   --radius-lg: 12px;
   --transition-fast: 150ms ease;
   --transition-default: 250ms ease;
 }

 변경:
 - App.vue — 모든 하드코딩 색상을 CSS 변수로 교체
 - types/graph.ts — NODE_COLORS/EDGE_STYLES를 CSS 변수 기반으로 변환
 - .bg-gray-850 제거 → var(--surface-secondary) 사용

 Step 2: 노드 호버 피드백 + 크기 차별화

 ForceGraphView.vue 변경:
 - 노드 호버 시: 1.3x 확대 + 밝기 120% + 연결 엣지 하이라이트 (200ms ease)
 - 노드 크기를 degree(연결 수) 기반으로 차별화:
 'width': (ele) => Math.max(20, 16 + Math.sqrt(ele.degree()) * 4),
 - 선택 노드: 글로우 효과 (box-shadow 대신 Cytoscape overlay-opacity)
 - 호버 시 툴팁: 노드명 + 종류 + 연결 수

 Step 3: 그래프 범례 (Legend) + 엣지 설명

 새 파일: src/components/graph/GraphLegend.vue
 - 접기/펼치기 가능한 좌상단 범례 패널
 - 노드 종류별: 색상 원 + 라벨 + 현재 개수
 - 엣지 종류별: 선 스타일 샘플 (실선/점선) + 색상 + 라벨
 - 클릭 시 해당 종류만 필터링 (FilterPanel과 연동)
 - 기본 접힌 상태, 마우스 호버로 펼침

 Step 4: 빈 상태 + 온보딩 가이드

 새 파일: src/components/OnboardingGuide.vue
 - 첫 로딩 완료 후 3초간 표시되는 가이드 오버레이:
   - "그래프 위에서 노드를 클릭하면 상세 정보를 봅니다"
   - "더블클릭으로 클러스터를 펼칩니다"
   - "/ 키로 검색합니다"
   - "필터 패널에서 보고 싶은 종류만 선택합니다"
 - localStorage에 "dismissed" 저장 → 한 번만 표시
 - "다시 보지 않기" 체크박스

 App.vue 변경:
 - 서버 미연결 시: 연결 실패 화면 + 자동 재시도 카운트다운
 - 그래프 없을 때: "아직 분석 결과가 없습니다. 터미널에서 vda analyze를 실행하세요"

 Step 5: 트랜지션 + 마이크로 인터랙션

 ForceGraphView.vue 변경:
 - 노드 등장: opacity 0→1 (200ms ease-out) + scale 0.8→1.0
 - 노드 퇴장(필터): opacity 1→0 (150ms) 후 remove
 - 필터 토글 시: cy.batch() 내에서 fade-in/out 적용
 - 줌 임계값(LOD) 전환: linear interpolation으로 부드럽게

 TreeView.vue 변경:
 - D3 enter/exit 트랜지션 적용 (현재 전체 re-render → incremental update)
 - 노드 클릭 시 brief 0.7 opacity flash → 1.0 복귀

 App.vue / 전체:
 - 사이드바 탭 전환: slide-fade transition
 - 상세 패널 열기/닫기: slide-in-right animation (300ms)
 - 분석 완료 시: success toast notification (3초 자동 소멸)

 Step 6: Command Palette (Cmd+K)

 새 파일: src/components/CommandPalette.vue
 - Ctrl/Cmd + K 로 열리는 모달 검색
 - 검색 범위:
   - 노드 이름 검색 (기존 /api/search 활용)
   - 명령어: "Re-analyze", "Fit to view", "Toggle clustering", "Export as JSON"
   - 필터 프리셋: "Show only Vue components", "Show API connections only"
 - 퍼지 매칭 (입력 오타 허용)
 - 상하 화살표 키보드 네비게이션
 - Enter 키로 실행
 - 최근 사용 항목 상단 표시 (localStorage)

 Step 7: 사이드바 리사이즈 + 반응형

 App.vue 변경:
 - 좌측 사이드바: 드래그 가능한 리사이저 핸들 추가 (min: 200px, max: 400px)
 - 우측 디테일 패널: 동일한 리사이저
 - 브레이크포인트:
   - < 768px: 사이드바 오버레이 (햄버거 토글), 디테일 패널 하단 시트
   - 768-1024px: 좁은 사이드바 (아이콘만), 디테일 패널 축소
   ▎ 1024px: 전체 레이아웃

 Step 8: 접근성 (A11y)

 전체 파일 변경:
 - ARIA 랜드마크: role="main", role="complementary", role="navigation"
 - 포커스 링: 모든 인터랙티브 요소에 focus-visible:ring-2 focus-visible:ring-blue-400
 - 키보드 탐색: Tab으로 사이드바→툴바→그래프→디테일 순서
 - 색맹 대응: 노드에 색상 외에 아이콘/모양 차별화 추가
   - vue-component: 원
   - pinia-store: 다이아몬드
   - spring-endpoint: 사각형
   - composable: 삼각형
 - 스크린 리더: aria-label로 그래프 상태 설명

 Implementation Order

 1. Step 1 (Design Tokens) — 모든 후속 작업의 기반
 2. Step 2 (노드 호버/크기) — 가장 큰 인터랙션 개선
 3. Step 3 (범례) — 즉각적 이해도 향상
 4. Step 5 (트랜지션) — 전체적 품질감 상승
 5. Step 4 (온보딩) — 첫 사용자 경험
 6. Step 6 (Command Palette) — 파워유저 생산성
 7. Step 7 (리사이즈/반응형) — 다양한 화면 지원
 8. Step 8 (접근성) — 품질 마무리

 Verification

 1. 브라우저에서 test-project 서버 실행 → 모든 인터랙션 직접 테스트
 2. Lighthouse Accessibility 점수 90+ 목표
 3. Chrome DevTools Performance: 호버/클릭 시 16ms 프레임 이내
 4. 768px 뷰포트에서 레이아웃 깨지지 않는지 확인
 5. 키보드만으로 전체 앱 탐색 가능한지 확인