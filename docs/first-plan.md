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