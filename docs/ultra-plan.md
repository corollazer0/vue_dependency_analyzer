# Vue Dependency Analyzer (VDA) - Implementation Plan                                                                                          
                                                                                                                                               
## Context                                                                                                                                     
                                                                                                                                               
Vue.js + Spring Boot 프로젝트의 의존성을 분석/시각화하는 도구를 처음부터 구축한다. 현재 repo는 `docs/first-plan.md`만 존재하는 빈 상태. 이     
계획은 first-plan.md의 Phase 1 (Foundation: Core + CLI)과 Phase 2 (Server + Web UI) 전체를 구현한다.                                           
                                                                                                                                               
## Architecture                                                                                                                                
                                                                                                                                               
```                                                                                                                                            
vue_dependency_analyzer/                                                                                                                       
├── package.json              # npm workspaces root                                                                                            
├── turbo.json                                                                                                                                 
├── tsconfig.base.json                                                                                                                         
├── packages/                                                                                                                                  
│   ├── core/                 # 분석 엔진                                                                                                      
│   │   ├── src/graph/        # 그래프 데이터 모델                                                                                             
│   │   ├── src/parsers/      # Vue, TS, Java 파서                                                                                             
│   │   ├── src/linkers/      # API/Native 링커                                                                                                
│   │   └── src/analyzers/    # 순환참조, 고아, impact                                                                                         
│   ├── cli/                  # commander CLI                                                                                                  
│   ├── server/               # Fastify API + WebSocket                                                                                        
│   └── web-ui/               # Vue 3 + Cytoscape.js                                                                                           
```                                                                                                                                            
                                                                                                                                               
## Implementation Steps                                                                                                                        
                                                                                                                                               
### Step 1: Monorepo Scaffolding                                                                                                               
                                                                                                                                               
**Files to create:**                                                                                                                           
- `package.json` — npm workspaces (`packages/*`), devDependencies (typescript, vitest, eslint, turbo)                                          
- `turbo.json` — build/test/lint pipeline                                                                                                      
- `tsconfig.base.json` — shared TS config (strict, ES2022, Node16 module resolution)                                                           
- `packages/core/package.json`, `packages/core/tsconfig.json`                                                                                  
- `packages/cli/package.json`, `packages/cli/tsconfig.json`                                                                                    
- `packages/server/package.json`, `packages/server/tsconfig.json`                                                                              
- `packages/web-ui/` — `npm create vite@latest` (Vue 3 + TS template)                                                                          
- `.eslintrc.cjs` — root ESLint config                                                                                                         
- `vitest.workspace.ts` — workspace-level vitest config                                                                                        
                                                                                                                                               
**Key dependencies per package:**                                                                                                              
- `core`: `@vue/compiler-sfc`, `typescript`, `java-ast`                                                                                        
- `cli`: `commander`, `chalk`, `ora` + core (workspace dependency)                                                                             
- `server`: `fastify`, `@fastify/websocket`, `@fastify/cors`, `chokidar` + core                                                                
- `web-ui`: `vue@3`, `pinia`, `cytoscape`, `d3-hierarchy`, `tailwindcss`                                                                       
                                                                                                                                               
### Step 2: Graph Data Model (`packages/core/src/graph/`)                                                                                      
                                                                                                                                               
**`types.ts`:**                                                                                                                                
- `NodeKind` enum: `vue-component`, `vue-composable`, `pinia-store`, `vue-directive`, `vue-router-route`, `ts-module`, `api-call-site`,        
`spring-controller`, `spring-endpoint`, `spring-service`, `native-bridge`, `native-method`                                                     
- `EdgeKind` enum: `imports`, `uses-component`, `uses-store`, `uses-composable`, `uses-directive`, `provides`, `injects`, `api-call`,          
`api-serves`, `native-call`, `route-renders`, `spring-injects`                                                                                 
- `GraphNode` interface: `id`, `kind`, `label`, `filePath`, `line`, `metadata` (Record<string, unknown>)                                       
- `GraphEdge` interface: `id`, `source`, `target`, `kind`, `metadata`                                                                          
- `DependencyGraph` interface                                                                                                                  
                                                                                                                                               
**`DependencyGraph.ts`:**                                                                                                                      
- Class implementing add/remove/get for nodes and edges                                                                                        
- Adjacency index (`Map<nodeId, Set<edgeId>>`) + reverse adjacency                                                                             
- `getOutEdges(nodeId)`, `getInEdges(nodeId)`, `getNeighbors(nodeId, direction)`                                                               
- `merge(other: DependencyGraph)` for incremental updates                                                                                      
                                                                                                                                               
**`query.ts`:**                                                                                                                                
- `filterByKind(graph, nodeKinds[], edgeKinds[])` → subgraph                                                                                   
- `reachableFrom(graph, nodeId, direction, maxDepth?)` → BFS/DFS traversal                                                                     
- `impactOf(graph, nodeId)` → reverse reachability (dependents)                                                                                
- `findPaths(graph, from, to)` → all paths                                                                                                     
                                                                                                                                               
**`serializer.ts`:**                                                                                                                           
- `toJSON(graph)` / `fromJSON(json)` — 직렬화/역직렬화                                                                                         
                                                                                                                                               
**Tests:** `packages/core/src/graph/__tests__/` — 노드/엣지 CRUD, 쿼리, 직렬화 테스트                                                          
                                                                                                                                               
### Step 3: Vue Parser (`packages/core/src/parsers/vue/`)                                                                                      
                                                                                                                                               
**`VueSfcParser.ts`:**                                                                                                                         
- `@vue/compiler-sfc`의 `parse()` 사용 → descriptor에서 template/script/style 분리                                                             
- `<script setup>` 및 일반 `<script>` 모두 처리                                                                                                
                                                                                                                                               
**`ScriptAnalyzer.ts`:**                                                                                                                       
- TypeScript Compiler API (`ts.createSourceFile`) 사용                                                                                         
- AST walk로 감지:                                                                                                                             
  - `import` 문 → `imports` edge                                                                                                               
  - `useXxxStore()` 호출 패턴 → `uses-store` edge                                                                                              
  - `useXxx()` composable 패턴 → `uses-composable` edge                                                                                        
  - `axios.get/post/put/delete()`, `fetch()`, `$http` 패턴 → `api-call` edge + URL 추출                                                        
  - `window.XXX.method()`, `(window as any).XXX` → `native-call` edge                                                                          
  - `provide()` / `inject()` → `provides` / `injects` edge                                                                                     
  - `defineProps()` / `defineEmits()` → node metadata                                                                                          
                                                                                                                                               
**`TemplateAnalyzer.ts`:**                                                                                                                     
- `@vue/compiler-sfc`의 `compileTemplate` 또는 `compiler-dom`의 `parse` 사용                                                                   
- Template AST walk:                                                                                                                           
  - PascalCase/kebab-case 커스텀 태그 → `uses-component` edge                                                                                  
  - `v-xxx` 커스텀 디렉티브 → `uses-directive` edge                                                                                            
  - `@event` / `v-on:event` → metadata (emits 추적용)                                                                                          
                                                                                                                                               
**Tests:** 샘플 `.vue` 파일 fixture 작성 → 파서 결과 검증                                                                                      
                                                                                                                                               
### Step 4: TypeScript Parser + Import Resolver (`packages/core/src/parsers/typescript/`)                                                      
                                                                                                                                               
**`TsFileParser.ts`:**                                                                                                                         
- `.ts`/`.js` 파일 파싱 (composable, store, 일반 모듈)                                                                                         
- export 분석, re-export 추적                                                                                                                  
                                                                                                                                               
**`ImportResolver.ts`:**                                                                                                                       
- `tsconfig.json`의 `paths` 읽기 (`@/` → `src/`)                                                                                               
- 상대경로 해석, `index.ts` 자동 해석                                                                                                          
- `.vue` 확장자 해석                                                                                                                           
                                                                                                                                               
**Tests:** alias 해석, 상대경로 해석 검증                                                                                                      
                                                                                                                                               
### Step 5: Java/Kotlin Parser (`packages/core/src/parsers/java/`)                                                                             
                                                                                                                                               
**`JavaFileParser.ts`:**                                                                                                                       
- `java-ast` 라이브러리로 Java 파일 → AST                                                                                                      
- class-level 정보 추출 (클래스명, 패키지)                                                                                                     
                                                                                                                                               
**`AnnotationExtractor.ts`:**                                                                                                                  
- `@RestController`, `@Controller`, `@Service`, `@Repository` → node kind 판별                                                                 
- `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping` → HTTP method + path                                       
                                                                                                                                               
**`ControllerAnalyzer.ts`:**                                                                                                                   
- class-level `@RequestMapping("/api/xxx")` + method-level path 결합                                                                           
- path parameter 정규화                                                                                                                        
                                                                                                                                               
**`EndpointMapper.ts`:**                                                                                                                       
- 완전한 `spring-endpoint` 노드 생성 (method, path, controller ref)                                                                            
                                                                                                                                               
**Kotlin:** regex 기반 annotation 추출 — `@GetMapping\("(.*)"\)` 패턴 매칭                                                                     
                                                                                                                                               
**Tests:** 샘플 Java controller fixture → endpoint 추출 검증                                                                                   
                                                                                                                                               
### Step 6: Linkers (`packages/core/src/linkers/`)                                                                                             
                                                                                                                                               
**`ApiCallLinker.ts`:**                                                                                                                        
- Vue 쪽 `api-call` 노드의 URL과 Spring 쪽 `spring-endpoint` 노드의 path 매칭                                                                  
- path parameter 정규화: `:id` ↔ `{id}`, `${variable}` 처리                                                                                    
- baseURL prefix 처리 (`/api` prefix 등)                                                                                                       
- HTTP method 매칭 (GET ↔ @GetMapping)                                                                                                         
                                                                                                                                               
**`NativeBridgeLinker.ts`:**                                                                                                                   
- `window.XXX.method()` 호출과 native bridge 인터페이스 매칭                                                                                   
                                                                                                                                               
**`CrossBoundaryResolver.ts`:**                                                                                                                
- 모든 linker를 오케스트레이션                                                                                                                 
- `link(graph)` → graph에 cross-boundary edge 추가                                                                                             
                                                                                                                                               
**Tests:** API URL ↔ endpoint path 매칭 시나리오                                                                                               
                                                                                                                                               
### Step 7: Analyzers (`packages/core/src/analyzers/`)                                                                                         
                                                                                                                                               
**`CircularDependencyAnalyzer.ts`:** Tarjan's SCC → 순환 그룹 반환                                                                             
**`OrphanDetector.ts`:** in-degree 0인 노드 (router에서도 참조 안 되는 컴포넌트 등)                                                            
**`ComplexityScorer.ts`:** fan-in/fan-out 계산, 복잡도 점수                                                                                    
**`ImpactAnalyzer.ts`:** 특정 노드 변경 시 영향 받는 노드 목록 (reverse BFS)                                                                   
                                                                                                                                               
**Tests:** 각 분석기 단위 테스트                                                                                                               
                                                                                                                                               
### Step 8: CLI (`packages/cli/`)                                                                                                              
                                                                                                                                               
**`src/index.ts`:** commander 기반 진입점                                                                                                      
- `vda analyze <dir>` — 분석 실행 → JSON 결과 출력                                                                                             
- `vda serve <dir>` — server 패키지 호출                                                                                                       
- `vda export --format json|dot <dir>` — 그래프 내보내기                                                                                       
- `--config .vdarc.json` — 설정 파일 지원                                                                                                      
                                                                                                                                               
**`.vdarc.json` schema:** include/exclude 경로, alias 설정, baseURL 등                                                                         
                                                                                                                                               
### Step 9: Server (`packages/server/`)                                                                                                        
                                                                                                                                               
**Fastify routes:**                                                                                                                            
- `GET /api/graph` — 전체 그래프 (필터 쿼리 파라미터)                                                                                          
- `GET /api/graph/node/:id` — 노드 상세 + in/out edges                                                                                         
- `GET /api/graph/node/:id/impact` — impact analysis                                                                                           
- `GET /api/search?q=` — 노드 검색 (label, filePath 기반)                                                                                      
- `POST /api/analyze` — 재분석 트리거                                                                                                          
- `GET /api/stats` — 노드/엣지 카운트, kind별 분포                                                                                             
                                                                                                                                               
**WebSocket:** 파일 변경 시 증분 재분석 결과 push                                                                                              
**chokidar:** `.vue`, `.ts`, `.java`, `.kt` 파일 감시                                                                                          
                                                                                                                                               
### Step 10: Web UI (`packages/web-ui/`)                                                                                                       
                                                                                                                                               
**Graph View (Cytoscape.js):**                                                                                                                 
- Force-directed layout (fcose 또는 cola)                                                                                                      
- NodeKind별 색상/아이콘 매핑                                                                                                                  
- EdgeKind별 스타일 (실선/점선/색상)                                                                                                           
- 디렉토리 기반 compound node 그루핑                                                                                                           
- 클릭 → 상세 패널                                                                                                                             
- 필터 패널 (NodeKind/EdgeKind 체크박스, 검색)                                                                                                 
                                                                                                                                               
**Tree View (d3-hierarchy):**                                                                                                                  
- 선택 노드 기준 dependency/dependent 트리                                                                                                     
- 접기/펼치기 인터랙션                                                                                                                         
- 방향 전환 토글                                                                                                                               
                                                                                                                                               
**Layout:**                                                                                                                                    
- 좌측 사이드바: 파일 탐색기, 검색, 필터                                                                                                       
- 중앙: 그래프/트리 뷰 (탭 전환)                                                                                                               
- 우측: 노드 상세 패널 (슬라이드 아웃)                                                                                                         
                                                                                                                                               
**Pinia stores:** `graphStore`, `uiStore`, `filterStore`                                                                                       
                                                                                                                                               
## Data Flow                                                                                                                                   
                                                                                                                                               
```mermaid                                                                                                                                     
graph LR                                                                                                                                       
    A[CLI: vda analyze] --> B[Core: Parsers]                                                                                                   
    B --> C[Vue Parser]                                                                                                                        
    B --> D[TS Parser]                                                                                                                         
    B --> E[Java Parser]                                                                                                                       
    C --> F[DependencyGraph]                                                                                                                   
    D --> F                                                                                                                                    
    E --> F                                                                                                                                    
    F --> G[Linkers]                                                                                                                           
    G --> H[Linked Graph]                                                                                                                      
    H --> I[Analyzers]                                                                                                                         
    I --> J[Enriched Graph]                                                                                                                    
    J --> K[CLI: JSON/DOT export]                                                                                                              
    J --> L[Server: Fastify API]                                                                                                               
    L --> M[Web UI: Cytoscape/d3]                                                                                                              
    N[chokidar: file watch] --> B                                                                                                              
    N -.-> |WebSocket| M                                                                                                                       
```                                                                                                                                            
                                                                                                                                               
## Verification                                                                                                                                
                                                                                                                                               
1. **Test fixtures:** `packages/core/src/__fixtures__/` 에 샘플 Vue 3 + Spring Boot 파일 작성                                                  
   - `SampleComponent.vue` (store, composable, API 호출, 컴포넌트 사용 포함)                                                                   
   - `useAuth.ts` (composable), `useUserStore.ts` (Pinia store)                                                                                
   - `UserController.java` (REST endpoints)                                                                                                    
2. **Unit tests:** `vitest` — 각 파서/링커/분석기 테스트 (`npm run test -w @vda/core`)                                                         
3. **Integration test:** 전체 파이프라인 (파일 → 파싱 → 링킹 → 분석 → JSON 출력) 검증                                                          
4. **E2E:** `vda serve fixtures/` → 브라우저에서 그래프 렌더링 확인                                                                            
5. **Build:** `turbo build` — 전체 빌드 성공 확인 


❯ Ultraplan approved in browser. Here is the plan:                                                                                             
                                                                                                                                               
<ultraplan>                                                                                                                                    
# VDA Phase 2: Performance & UX Improvements                                                                                                   
                                                                                                                                               
## Context                                                                                                                                     
                                                                                                                                               
VDA is a Vue.js + Spring Boot dependency analyzer planned as a monorepo with 4 packages (`core`, `cli`, `server`, `web-ui`). The Phase 1 plan  
(`docs/first-plan.md`) defines the architecture, but **no code exists yet** — the repo only contains the plan document.                        
                                                                                                                                               
This Phase 2 plan addresses performance and UX problems that will appear when VDA handles real-world projects (3000-file Vue apps, MSA Spring  
Boot services). It should be implemented **after Phase 1 is complete** and the baseline analyzer is working.                                   
                                                                                                                                               
The core issues: sequential single-threaded parsing doesn't scale, the UI freezes rendering thousands of nodes, there's no progress feedback,  
and every analysis starts from scratch with no caching.                                                                                        
                                                                                                                                               
## Dependency                                                                                                                                  
                                                                                                                                               
```                                                                                                                                            
Phase 1 (foundation) ──must exist──▶ Phase 2 (this plan)                                                                                       
```                                                                                                                                            
                                                                                                                                               
All file paths below reference the Phase 1 package structure:                                                                                  
```                                                                                                                                            
packages/                                                                                                                                      
├── core/src/        # parsers, graph model, linkers, analyzers                                                                                
├── cli/src/         # commander-based CLI                                                                                                     
├── server/src/      # fastify HTTP + WebSocket                                                                                                
└── web-ui/src/      # Vue 3 + Cytoscape.js frontend                                                                                           
```                                                                                                                                            
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Implementation Steps                                                                                                                        
                                                                                                                                               
### Step 1: Parallel Parsing Engine (Problem #1)                                                                                               
                                                                                                                                               
**Goal**: 3000 files in 1-3 min instead of 10-30 min.                                                                                          
                                                                                                                                               
**New file: `packages/core/src/engine/ParallelParser.ts`**                                                                                     
- Use `worker_threads` with a pool sized to `os.cpus().length - 1`                                                                             
- Each worker receives a file path + parser config, returns `GraphNode[]` + `GraphEdge[]`                                                      
- Main thread collects results and merges into `DependencyGraph`                                                                               
- Progress callback: `onProgress(processed: number, total: number, currentFile: string)`                                                       
- Worker pool implementation: fixed-size queue, workers pull next file on completion                                                           
                                                                                                                                               
**Changes to existing files:**                                                                                                                 
- `packages/core/src/parsers/vue/VueSfcParser.ts` — extract parsing logic into a standalone function callable from worker context (no shared   
state)                                                                                                                                         
- `packages/core/src/parsers/typescript/TsFileParser.ts` — same isolation                                                                      
- `packages/core/src/parsers/java/JavaFileParser.ts` — same isolation                                                                          
- `packages/cli/src/commands/analyze.ts` (or wherever `vda analyze` runs) — replace sequential file loop with `ParallelParser.parseAll(files,  
config)`                                                                                                                                       
- `packages/server/src/engine.ts` — same replacement for server-side analysis                                                                  
                                                                                                                                               
**Key constraint**: TypeScript Compiler API's `Program` is not transferable across workers. Each worker must create its own                    
`ts.createSourceFile()` for                                                                                                                    
… +192 lines …                                                                                                                                 
      :s5, after s4, 2                                                                                                                         
                                                                                                                                               
    section Features                                                                                                                           
    Step 6 - tsconfig            :s6, after s5, 1                                                                                              
    Step 7 - MSA + init          :s7, after s6, 2                                                                                              
    Step 8 - Advanced UX         :s8, after s7, 2                                                                                              
```                                                                                                                                            
                                                                                                                                               
Steps 1-2 are foundational (all downstream work benefits). Step 3 gives immediate user feedback. Steps 4-5 solve the UI performance cliff.     
Steps 6-8 add features that make the tool usable in real environments.                                                                         
                                                                                                                                               
## Performance Targets                                                                                                                         
                                                                                                                                               
| Metric | Before | After |                                                                                                                    
|--------|--------|-------|                                                                                                                    
| 3000-file initial analysis | 10-30 min | 1-3 min |                                                                                           
| Cached re-analysis | 10-30 min | 5-10 sec |                                                                                                  
| Single file change (watch) | 2-5 sec | <500ms |                                                                                              
| Initial graph render (3000 nodes) | 30-60 sec freeze | <3 sec |                                                                              
| Filter toggle | 5-10 sec | <200ms |                                                                                                          
| Graph API response | 5-15 MB | <500 KB (clustered) |                                                                                         
                                                                                                                                               
## Verification                                                                                                                                
                                                                                                                                               
1. **Parallel parsing benchmark**: Generate 3000 fixture `.vue`/`.ts`/`.java` files with realistic import structures. Run `vda analyze` with   
`console.time()` wrapping. Compare single-threaded baseline vs worker pool.                                                                    
                                                                                                                                               
2. **Cache correctness**: Run analysis twice without changes → assert identical `DependencyGraph`. Modify one file → assert only that file     
re-parsed (check worker dispatch log). Change `.vdarc.json` → assert full re-parse.                                                            
                                                                                                                                               
3. **Progress feedback**: Run analysis on 3000 files → verify WebSocket messages arrive at UI with `processed` incrementing from 0 to 3000.    
Verify ETA decreases monotonically after warmup.                                                                                               
                                                                                                                                               
4. **Clustering render**: Load 3000-node graph → verify initial Cytoscape render completes in <3 sec (measure with `performance.now()`).       
Expand a cluster → verify children appear. Collapse → verify children removed.                                                                 
                                                                                                                                               
5. **Reactivity**: Toggle a NodeKind filter on a 3000-node graph → measure time from click to Cytoscape update via `performance.now()`.        
Target: <200ms.                                                                                                                                
                                                                                                                                               
6. **Memory**: Open Chrome DevTools → Memory tab → take heap snapshot with 3000-node clustered graph. Target: <500MB.                          
                                                                                                                                               
7. **tsconfig integration**: Create a project with `tsconfig.json` containing `paths: { "@/*": ["src/*"] }`. Run `vda analyze` without         
explicit alias config in `.vdarc.json`. Verify `@/components/Foo.vue` resolves correctly.                                                      
                                                                                                                                               
8. **MSA**: Create a project with 2 Spring Boot services in subdirectories. Run `vda init` → verify `.vdarc.json` lists both services. Run     
`vda analyze` → verify nodes from both services appear with correct `serviceId`.                                                               
</ultraplan>                                                                                                                                   
                                                                                                                                               
The user approved this plan in the remote session. Give them a brief summary, then start implementing. 


<ultraplan>                                                                                                                                    
# VDA Phase 2: Performance & UX Improvements                                                                                                   
                                                                                                                                               
## Context                                                                                                                                     
                                                                                                                                               
VDA(Vue Dependency Analyzer)는 현재 Phase 1 설계만 존재하고 코드는 없다 (`docs/first-plan.md` 참조). 이 Phase 2 계획은 Phase 1 구현 완료 후    
적용할 성능/UX 개선 사항을 정의한다.                                                                                                           
                                                                                                                                               
Phase 1이 순차 파싱, 전체 그래프 일괄 전송, deep watcher 등 단순 구현으로 완성된다고 가정할 때, 실제 운영 환경(Vue 3000파일, MSA Spring Boot   
300-500파일)에서 **분석 10-30분, UI 프리징, 피드백 없음** 등의 문제가 예상된다. 이 계획은 이를 해결한다.                                       
                                                                                                                                               
**전제 조건**: Phase 1의 다음 파일/모듈이 존재해야 함:                                                                                         
- `packages/core/src/parsers/` — Vue, TypeScript, Java 파서                                                                                    
- `packages/core/src/graph/` — DependencyGraph, types                                                                                          
- `packages/cli/src/` — CLI 진입점, config                                                                                                     
- `packages/server/src/` — Fastify API, WebSocket, engine                                                                                      
- `packages/web-ui/src/` — Vue 3 앱, Cytoscape ForceGraphView, graphStore                                                                      
                                                                                                                                               
## Architecture: Before → After                                                                                                                
                                                                                                                                               
```                                                                                                                                            
Phase 1 (현재 설계)                    Phase 2 (개선 후)                                                                                       
─────────────────────                  ─────────────────────                                                                                   
                                                                                                                                               
CLI/Server                             CLI/Server                                                                                              
    │                                      │                                                                                                   
    ▼                                      ▼                                                                                                   
┌──────────────┐                     ┌──────────────────┐                                                                                      
│ Sequential   │                     │ ParallelParser   │                                                                                      
│ file-by-file │ ──10-30분──►        │ (worker_threads) │ ──1-3분──►                                                                           
│ parse loop   │                     │ + ParseCache     │                                                                                      
└──────────────┘                     └────────┬─────────┘                                                                                      
    │                                         │ onProgress                                                                                     
    ▼                                         ▼                                                                                                
┌──────────────┐                     ┌──────────────────┐                                                                                      
│ Full graph   │                     │ WebSocket        │                                                                                      
│ JSON dump    │ ──5-15MB──►         │ progress events  │                                                                                      
│ (one shot)   │                     │ + clustered API  │ ──<500KB──►                                                                          
└──────────────┘                     └────────┬─────────┘                                                                                      
    │                                         │                                                                                                
    ▼                                         ▼                                                                                                
┌──────────────┐                     ┌──────────────────┐                                                                                      
│ Cytoscape    │                     │ Cytoscape        │                                                                                      
│ render all   │ ──30-60초 freeze──► │ + clustering     │ ──<3초──►                                                                            
│ 3000 nodes   │                     │ + viewport cull  │                                                                                      
│ deep watch   │                     │ + shallow refs   │                                                                                      
└──────────────┘                     └──────────────────┘                                                                                      
```                                                                                                                                            
                                                                                                                                               
## Dependency Graph Between Steps                                                                                                              
                                                                                                                                               
```mermaid                                                                                                                                     
graph TD                                                                                                                                       
    S1[Step 1: 병렬 파싱 + 캐싱] --> S2[Step 2: 진행률 피드백]                                                                                 
    S1 --> S3[Step 3: 클러스터링 + 가상화]                                                                                                     
    S2 --> S6[Step 6: 고급 UX]                                                                                                                 
    S3 --> S4[Step 4: 반응성 최적화]                                                                                                           
    S3 --> S6                                                                                                                                  
    S5[Step 5: tsconfig + MSA + init] -.-> S1                                                                                                  
                                                                                                                                               
    style S1 fill:#f66,stroke:#333,color:#fff                                                                                                  
    style S3 fill:#f66,stroke:#333,color:#fff                                                                                                  
    style S2 fill:#fa0,stroke:#333,color:#fff                                                                                                  
    style S5 fill:#69f,stroke:#333                                                                                                             
```                                                                                                                                            
                                                                                                                                               
**빨강** = CRITICAL, **주황** = HIGH, **파랑** = 독립적 (어느 시점에든 가능)                                                                   
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Step 1: 병렬 파싱 + 캐싱 엔진 (CRITICAL)                                                                                                    
                                                                                                                                               
**목표**: 3000파일 분석을 10-30분 → 1-3분으로 단축. 재분석 시 변경분만 처리.                                                                   
                                                                                                                                               
### 새 파일                                                                                                                                    
                                                                                                                                               
**`packages/core/src/engine/ParallelParser.ts`**                                                                                               
```typescript                                                                                                                                  
// 핵심 인터페이스                                                                                                                             
interface ParallelParseOptions {                                                                                                               
  files: string[];                                                                                                                             
  workerCount?: number;  // default: os.cpus().length - 1, min 1                                                                               
  cache?: ParseCache;                                                                                                                          
  onProgress?: (event: ProgressEvent) => void;                                                                                                 
}                                                                                                                                              
                                                                                                                                               
interface ProgressEvent {                                                                                                                      
  processed: number;                                                                                                                           
  total: number;                                                                                                                               
  currentFile: string;                                                                                                                         
  elapsedMs: number;                                                                                                                           
  cacheHits: number;                                                                                                                           
}                                                                                                                                              
```                                                                                                                                            
- `worker_threads`로 파일 목록을 청크로 분배                                                                                                   
- 각 worker는 기존 파서(`VueSfcParser`, `TsFileParser`, `JavaFileParser`)를 import해서 실행                                                    
- worker ↔ main은 `MessagePort`로 파싱 결과 전송 (구조화된 클론 가능한 plain object)                                                           
- 진행률: worker가 파일 완료마다 main에 메시지 → main이 `onProgress` 호출                                                                      
                                                                                                                                               
**`packages/core/src/engine/ParseCache.ts`**                                                                                                   
```typescript                                                                                                                                  
interface CacheEntry {                                                                                                                         
  contentHash: string;     // SHA-256 of file content                                                                                          
  parseResult: ParsedFile; // 파서 출력 (nodes, edges, metadata)                                                                               
  timestamp: number;                                                                                                                           
}                                                                                                                                              
```                                                                                                                                            
- 메모리 Map + `.vda-cache/parse-cache.json`에 직렬화                                                                                          
- `get(filePath, currentContentHash)` — 해시 일치 시 캐시 반환, 불일치 시 null                                                                 
- `set(filePath, contentHash, result)` — 캐시 저장                                                                                             
- `invalidate(filePath)` / `clear()`                                                                                                           
- 캐시 파일은 `.gitignore`에 추가                                                                                                              
                                                                                                                                               
### 변경 파일                                                                                                                                  
                                                                                                                                               
**`packages/cli/src/config.ts`** — `runAnalysis()` 함수:                                                                                       
- 기존 순차 루프를 `ParallelParser.parse(files, { cache, onProgress })` 호출로 교체                                                            
- CLI에서는 `onProgress`로 터미널 프로그레스 바 출력 (`cli-progress` 또는 간단한 `\r` 업데이트)                                                
                                                                                                                                               
**`packages/server/src/engine.ts`** — 서버 측 분석:                                                                                            
- 동일하게 `ParallelParser` 사용                                                                                                               
- `onProgress`를 WebSocket 브로드캐스트에 연결 (Step 2에서 구현)                                                                               
- chokidar watch에서 변경 파일만 `cache.invalidate()` 후 해당 파일만 재파싱                                                                    
                                                                                                                                               
### 검증                                                                                                                                       
- 3000개 더미 `.vue` 파일 생성 스크립트 작성 → 분석 시간 측정                                                                                  
- 캐시 유무에 따른 분석 시간 비교 (목표: 캐시 히트 시 10x+ 빠름)                                                                               
- `workerCount=1` vs `os.cpus().length` 비교                                                                                                   
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Step 2: 분석 진행률 피드백 (HIGH)                                                                                                           
                                                                                                                                               
**목표**: 무한 로딩 제거. 실시간 진행률 + 예상 시간 + 취소 기능.                                                                               
                                                                                                                                               
### 변경 파일                                                                                                                                  
                                                                                                                                               
**`packages/server/src/engine.ts`**:                                                                                                           
- `runAnalysis()`의 `onProgress` 콜백에서 WebSocket 브로드캐스트:                                                                              
  ```json                                                                                                                                      
  { "type": "analysis:progress", "payload": { "processed": 150, "total": 3000, "currentFile": "src/views/Home.vue", "elapsedMs": 12000,        
"estimatedRemainingMs": 228000 } }                                                                                                             
  ```                                                                                                                                          
- `analysis:start`, `analysis:complete`, `analysis:error` 이벤트 추가                                                                          
- 취소 메커니즘: `POST /api/analyze/cancel` → AbortController로 worker 종료                                                                    
                                                                                                                                               
### 새 파일                                                                                                                                    
                                                                                                                                               
**`packages/web-ui/src/components/AnalysisProgress.vue`**:                                                                                     
- 프로그레스 바 (processed/total 기반 퍼센트)                                                                                                  
- 현재 파싱 중인 파일명                                                                                                                        
- 경과 시간 + 예상 남은 시간 (linear extrapolation)                                                                                            
- 취소 버튼 (→ `POST /api/analyze/cancel`)                                                                                                     
- 완료 시 자동 dismiss + 그래프 로딩                                                                                                           
                                                                                                                                               
### 변경 파일                                                                                                                                  
                                                                                                                                               
**`packages/web-ui/src/App.vue`**:                                                                                                             
- WebSocket `analysis:progress` 리스너 추가                                                                                                    
- 분석 진행 중이면 `<AnalysisProgress>` 오버레이 표시                                                                                          
- 첫 연결 시 서버에 분석 상태 조회 (`GET /api/status`)                                                                                         
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Step 3: 그래프 클러스터링 + 뷰포트 최적화 (CRITICAL)                                                                                        
                                                                                                                                               
**목표**: 3000노드 동시 렌더링 프리징 제거. 초기 로딩 <3초.                                                                                    
                                                                                                                                               
### 서버 측                                                                                                                                    
                                                                                                                                               
**`packages/server/src/routes/graphRoutes.ts`** 변경:                                                                                          
- `GET /api/graph` 에 쿼리 파라미터 추가:                                                                                                      
  - `cluster=true` — 디렉토리 기반 클러스터링 적용                                                                                             
  - `depth=N` — 클러스터 펼침 깊이 (기본 1)                                                                                                    
  - `threshold=N` — N개 이상 노드가 있는 디렉토리만 클러스터링 (기본 200)                                                                      
- `GET /api/graph/cluster/:path/expand` — 특정 디렉토리 클러스터 펼치기                                                                        
- 클러스터 모드 응답: 집계 노드(디렉토리 → count 포함) + 인터클러스터 엣지만 전송                                                              
                                                                                                                                               
**클러스터링 로직** (`packages/core/src/graph/`에 추가):                                                                                       
- `ClusterBuilder.ts`: 파일 경로의 디렉토리 구조를 이용해 compound node 트리 생성                                                              
- 임계값 이하의 디렉토리는 클러스터링하지 않고 개별 노드 유지                                                                                  
                                                                                                                                               
### 클라이언트 측                                                                                                                              
                                                                                                                                               
**`packages/web-ui/src/composables/useGraphClustering.ts`** (새 파일):                                                                         
- 서버에서 받은 클러스터 데이터 → Cytoscape compound node 구조로 변환                                                                          
- 클러스터 더블클릭 → 서버에 expand 요청 → 자식 노드 추가                                                                                      
- 접기: 자식 노드 제거 → 클러스터 노드로 복원                                                                                                  
                                                                                                                                               
**`packages/web-ui/src/components/graph/ForceGraphView.vue`** 변경:                                                                            
- 초기 로딩: `cluster=true&depth=1`로 요청 (300-500개 노드)                                                                                    
- Cytoscape compound nodes로 클러스터 렌더링                                                                                                   
- 뷰포트 컬링: `cy.on('viewport')` 이벤트에서 화면 밖 노드 `display: none`                                                                     
- 줌 레벨 LOD: 줌아웃 시 라벨 숨김, 엣지 단순화                                                                                                
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Step 4: 반응성 최적화 (HIGH)                                                                                                                
                                                                                                                                               
**목표**: 필터 토글 5-10초 → <200ms                                                                                                            
                                                                                                                                               
### 변경 파일                                                                                                                                  
                                                                                                                                               
**`packages/web-ui/src/stores/graphStore.ts`**:                                                                                                
- `ref()` → `shallowRef()`로 그래프 데이터 변경 (deep reactivity 제거)                                                                         
- 필터 변경 시 전체 배열 교체 대신 diff 계산:                                                                                                  
  ```typescript                                                                                                                                
  const added = newNodes.filter(n => !currentSet.has(n.id));                                                                                   
  const removed = currentNodes.filter(n => !newSet.has(n.id));                                                                                 
  ```                                                                                                                                          
- 빠른 연속 필터 토글 시 `debounce(applyFilter, 150)` 적용                                                                                     
- `triggerRef()` 로 명시적 업데이트 트리거                                                                                                     
                                                                                                                                               
**`packages/web-ui/src/components/graph/ForceGraphView.vue`**:                                                                                 
- `watch(data, { deep: true })` → `watch(data)`로 변경 (shallow)                                                                               
- diff 기반 Cytoscape 업데이트: `cy.add(added)`, `cy.remove(removed)`                                                                          
- 레이아웃: 전체 relayout 대신 새 노드만 위치 계산 (`layout.run()` 대신 incremental positioning)                                               
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Step 5: tsconfig 자동 감지 + MSA 지원 + `vda init` (독립)                                                                                   
                                                                                                                                               
**이 Step은 다른 Step과 독립적이므로 아무 시점에나 구현 가능.**                                                                                
                                                                                                                                               
### tsconfig 지원                                                                                                                              
                                                                                                                                               
**`packages/core/src/parsers/typescript/ImportResolver.ts`** 변경:                                                                             
- 프로젝트 루트에서 `tsconfig.json` 탐색 → `compilerOptions.paths` 읽기                                                                        
- `baseUrl` + `paths` 조합으로 alias 자동 해석 (예: `@/*` → `src/*`)                                                                           
- `extends` 체이닝 지원 (재귀 읽기)                                                                                                            
- 기존 수동 alias 설정과 병합 (수동 설정이 우선)                                                                                               
                                                                                                                                               
### MSA 다중 서비스                                                                                                                            
                                                                                                                                               
**`packages/core/src/graph/types.ts`** 변경:                                                                                                   
- `AnalysisConfig`에 `springBootRoots: string[]` 추가 (기존 단일 `springBootRoot` 대체)                                                        
- `GraphNode`에 `serviceId?: string` 메타데이터 추가                                                                                           
- 각 Spring Boot 서비스를 `serviceId`로 구분 → UI에서 서비스별 필터링 가능                                                                     
                                                                                                                                               
**`packages/core/src/parsers/java/` 관련 파서**:                                                                                               
- 루트별로 순회하면서 `serviceId` 라벨 부착                                                                                                    
                                                                                                                                               
### `vda init` 명령어                                                                                                                          
                                                                                                                                               
**`packages/cli/src/commands/init.ts`** (새 파일):                                                                                             
- 대화형 초기 설정 명령어                                                                                                                      
- 자동 감지:                                                                                                                                   
  - `package.json`에서 `vue` 의존성 → Vue 루트 감지                                                                                            
  - `build.gradle` / `pom.xml` → Spring Boot 루트 감지 (복수 가능)                                                                             
  - `tsconfig.json` → alias 자동 추출                                                                                                          
- `.vdarc.json` 자동 생성 (사용자 확인 후)                                                                                                     
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## Step 6: 고급 UX (LOW priority)                                                                                                              
                                                                                                                                               
**Step 2, 3 완료 후 구현. 비핵심이므로 시간이 허락하면.**                                                                                      
                                                                                                                                               
### 새 파일                                                                                                                                    
                                                                                                                                               
**`packages/web-ui/src/components/graph/MiniMap.vue`**:                                                                                        
- 우하단 미니맵 (Cytoscape `cy.png()` 기반 썸네일)                                                                                             
- 현재 뷰포트 사각형 표시 + 드래그로 이동                                                                                                      
                                                                                                                                               
**`packages/web-ui/src/components/StatusBar.vue`**:                                                                                            
- 하단 상태바: 노드수, 엣지수, 마지막 분석 시각, 감시 상태 (watching/stopped)                                                                  
                                                                                                                                               
### 변경 파일                                                                                                                                  
                                                                                                                                               
**`packages/web-ui/src/components/graph/ForceGraphView.vue`**:                                                                                 
- 키보드 단축키: `/` 검색 포커스, `Esc` 선택 해제, `F` 전체 보기 (fit)                                                                         
- 우클릭 컨텍스트 메뉴 (`cytoscape-cxtmenu`): "중심으로 보기", "의존성 트리", "영향 분석"                                                      
- 선택 노드의 2차 이웃 하이라이트 토글                                                                                                         
                                                                                                                                               
**`packages/web-ui/src/App.vue`**:                                                                                                             
- 빈 상태: 서버 미연결 시 연결 상태 + 재시도 UI                                                                                                
- URL 해시 기반 상태 유지: `#node=vue:/src/App.vue&view=graph` → 공유 가능 링크                                                                
                                                                                                                                               
---                                                                                                                                            
                                                                                                                                               
## 성능 목표                                                                                                                                   
                                                                                                                                               
| 측정 항목 | Phase 1 예상 | Phase 2 목표 | 관련 Step |                                                                                        
|-----------|-------------|-------------|-----------|                                                                                          
| 3000파일 초기 분석 | 10-30분 | 1-3분 | Step 1 |                                                                                              
| 캐시 히트 재분석 | 10-30분 | 5-10초 | Step 1 |                                                                                               
| 단일 파일 변경 (watch) | 2-5초 | <500ms | Step 1 |                                                                                           
| 초기 그래프 렌더링 | 30-60초 | <3초 | Step 3 |                                                                                               
| 필터 토글 응답 | 5-10초 | <200ms | Step 4 |                                                                                                  
| API 그래프 응답 크기 | 5-15MB | <500KB | Step 3 |                                                                                            
                                                                                                                                               
## 구현 순서                                                                                                                                   
                                                                                                                                               
1. **Step 1** (병렬 파싱 + 캐싱) — 성능의 핵심, 다른 모든 것의 기반                                                                            
2. **Step 2** (진행률 피드백) — Step 1의 onProgress 인프라 위에 구축                                                                           
3. **Step 3** (클러스터링 + 가상화) — UI 성능의 핵심                                                                                           
4. **Step 4** (반응성 최적화) — Step 3의 변경된 그래프 구조 위에 구축                                                                          
5. **Step 5** (tsconfig + MSA + init) — 독립적, 아무 때나 가능                                                                                 
6. **Step 6** (고급 UX) — 낮은 우선순위, 시간 허용 시                                                                                          
                                                                                                                                               
## Verification                                                                                                                                
                                                                                                                                               
1. **벤치마크 스크립트**: `scripts/generate-fixtures.ts` — 3000개 더미 `.vue`/`.ts`/`.java` 파일 생성                                          
2. **분석 성능**: fixture에 대해 분석 시간 측정 (순차 vs 병렬, 캐시 유무)                                                                      
3. **UI 프로파일링**: Chrome DevTools Performance — 3000노드 렌더링 시간 <3초 확인                                                             
4. **메모리**: 3000노드 그래프에서 힙 사용량 <500MB                                                                                            
5. **WebSocket**: 진행률 메시지가 UI에 100ms 이내 도달 확인                                                                                    
6. **클러스터**: depth=1 요청 시 응답 크기 <500KB, 노드 수 <500 확인                                                                           
7. **필터**: 노드 종류 필터 토글 시 UI 응답 <200ms (Performance API 측정)                                                                      
8. **캐시**: 두 번째 분석 실행이 첫 번째 대비 10x+ 빠른지 확인                                                                                 
</ultraplan>                                                                                                                                   
                                                                                                                                               
The user approved this plan in the remote session. Give them a brief summary, then start implementing.                                         

● Ultraplan 승인되었지만, Phase 2는 이미 구현 완료된 상태입니다. 현재 해결해야 할 것은 사용자가 발견한 클러스터링 버그입니다.

  버그: 필터에서 하나를 체크 해제하면 그래프가 backend/frontend 2개 클러스터로 묶이고 다시 펼쳐지지 않음.                                      
   
  원인 3가지:                                                                                                                                  
  1. auto-clustering이 graphData.nodes.length(전체 830)로 판단 → 필터된 수가 아닌 전체 수 기준이라 항상 클러스터 모드 진입                   
  2. cluster depth=1이 너무 얕아서 backend/frontend 2개만 표시                                                                                 
  3. 필터 변경 시 클러스터 데이터가 서버 측 전체 기준이라 프론트 필터를 반영하지 않음
                                                                                                                                               
  바로 수정하겠습니다.                                                                                                                         
                                                                                                                                               
  Read 1 file (ctrl+o to expand)                                                                                                               
                                                                                                                                               
● 이제 3가지 버그를 한번에 수정합니다:                                                                                                         
                                                                                                                                             
  Fix 1: 클러스터링 기준을 filteredNodes.length로 변경                                                                                         
  Fix 2: 기본 depth를 3으로 올려서 의미 있는 클러스터 생성                                                                                     
  Fix 3: 필터 변경 시 클러스터 모드를 자동 해제하고 직접 렌더링                                        








  ----

  <ultraplan>                                                                                                 
# Phase 3: UX/Design Excellence — Apple+Google Grade Polish                                                 
                                                                                                            
## Context                                                                                                  
                                                                                                            
Phase 1 (Core + CLI)과 Phase 2 (Server + Web UI)가 완료된 후 적용할 UX 폴리시 계획이다.                     
현재 아키텍처: Vue 3 + Vite + Pinia + TailwindCSS, Cytoscape.js (그래프), d3-hierarchy (트리).              
기능은 충분하나 **디자인 토큰 부재, 마이크로 인터랙션 결여, 접근성 미흡, 정보 계층 혼란**이 핵심 문제.      
이 계획은 "도구"를 "제품"으로 전환하는 작업이다.                                                            
                                                                                                            
## 핵심 문제 8가지                                                                                          
                                                                                                            
| # | 문제 | 심각도 | 현재 상태 |                                                                           
|---|------|--------|-----------|                                                                           
| 1 | 디자인 토큰 부재 | HIGH | 하드코딩 색상/크기 산재 |                                                   
| 2 | 노드 호버/선택 피드백 없음 | CRITICAL | 클릭해야만 반응 |                                             
| 3 | 그래프 범례(Legend) 없음 | HIGH | 색상/선종류 의미를 모름 |                                           
| 4 | 빈 상태/온보딩 없음 | HIGH | 빈 화면, 안내 없음 |                                                     
| 5 | 트랜지션/애니메이션 없음 | MEDIUM | 노드 등장/퇴장이 즉시 |                                           
| 6 | 노드 크기가 모두 동일 | MEDIUM | 중요도 구분 불가 |                                                   
| 7 | 사이드바 리사이즈 불가 | MEDIUM | 고정 w-72, 작은 화면 문제 |                                         
| 8 | Command Palette 없음 | HIGH | 파워유저 탐색 경로 없음 |                                               
                                                                                                            
## Dependency Flow                                                                                          
                                                                                                            
```mermaid                                                                                                  
graph TD                                                                                                    
    S1[Step 1: Design Tokens + Tailwind Theme]                                                              
    S2[Step 2: Node Hover/Size — Cytoscape Stylesheet]                                                      
    S3[Step 3: Graph Legend Component]                                                                      
    S4[Step 4: Empty States + Onboarding]                                                                   
    S5[Step 5: Transitions + Micro-interactions]                                                            
    S6[Step 6: Command Palette — Cmd+K]                                                                     
    S7[Step 7: Sidebar Resize + Responsive]                                                                 
    S8[Step 8: Accessibility — A11y]                                                                        
                                                                                                            
    S1 --> S2                                                                                               
    S1 --> S3                                                                                               
    S1 --> S4                                                                                               
    S1 --> S7                                                                                               
    S2 --> S5                                                                                               
    S3 --> S5                                                                                               
    S2 --> S6                                                                                               
    S5 --> S8                                                                                               
    S7 --> S8                                                                                               
```                                                                                                         
                                                                                                            
## File Map (All paths relative to `packages/web-ui/`)                                                      
                                                                                                            
```                                                                                                         
packages/web-ui/                                                                                            
├── tailwind.config.ts          ← Step 1: extend theme with design tokens                                   
├── src/                                                                                                    
│   ├── assets/main.css         ← Step 1: CSS custom properties layer                                       
│   ├── App.vue                 ← Steps 1,4,5,7: token migration, empty states, transitions, resize         
│   ├── components/                                                                                         
│   │   ├── graph/                                                                                          
│   │   │   ├── ForceGraphView.vue  ← Steps 2,5: hover/size/animations                                      
│   │   │   ├── GraphLegend.vue     ← Step 3: NEW — legend panel                                            
│   │   │   └── TreeView.vue        ← Step 5: D3 transitions                                                
│   │   ├── CommandPalette.vue      ← Step 6: NEW — Cmd+K modal                                             
│   │   ├── OnboardingGuide.vue     ← Step 4: NEW — first-run guide                                         
│   │   └── ui/                                                                                             
│   │       └── ResizeHandle.vue    ← Step 7: NEW — reusable drag handle                                    
│   ├── composables/                                                                                        
│   │   └── useKeyboard.ts          ← Step 6: NEW — global keyboard shortcuts                               
│   └── stores/                                                                                             
│       └── ui.ts                   ← Steps 4,6,7: UI state (onboarding, palette, panel widths)             
```                                                                                                         
                                                                                                            
---                                                                                                         
                                                                                                            
## Step 1: Design Token System + Tailwind Theme Integration                                                 
                                                                                                            
TailwindCSS가 이미 프로젝트 스타일링 도구이므로, CSS custom properties를 정의하고 Tailwind `extend`로 연결  
… +316 lines …                                                                                              
px | 오버레이 (햄버거 토글) | 하단 시트 (drag-up) |                                                         
| 768–1024px | 축소 (아이콘 + 라벨), 리사이즈 가능 | 축소 너비 |                                            
| > 1024px | 전체 (리사이즈 가능) | 전체 (리사이즈 가능) |                                                  
                                                                                                            
`uiStore`에 패널 너비를 `localStorage`로 persist하여 새로고침 후에도 유지.                                  
                                                                                                            
---                                                                                                         
                                                                                                            
## Step 8: 접근성 (A11y)                                                                                    
                                                                                                            
**전체 파일 수정 — ARIA + 키보드 + 색맹 대응:**                                                             
                                                                                                            
- **ARIA 랜드마크:**                                                                                        
  - `<aside role="complementary" aria-label="파일 탐색기">`                                                 
  - `<main role="main" aria-label="의존성 그래프">`                                                         
  - `<nav role="navigation" aria-label="뷰 전환 탭">`                                                       
                                                                                                            
- **포커스 관리:**                                                                                          
  - 모든 인터랙티브 요소: `focus-visible:ring-2 focus-visible:ring-accent-primary/50                        
focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary`                                      
  - Tab 순서: 사이드바 → 뷰 전환 탭 → 그래프 영역 → 디테일 패널                                             
  - Command Palette 열릴 때: focus trap (Tab이 모달 내에서만 순환)                                          
                                                                                                            
- **Cytoscape 키보드 탐색:**                                                                                
  - 그래프에 포커스 시 화살표 키로 이웃 노드 이동                                                           
  - Enter → 노드 선택 (상세 패널 열기)                                                                      
  - `cy.on('select')` 이벤트에서 `aria-live="polite"` 영역에 선택 노드 정보 알림                            
                                                                                                            
- **색맹 대응 — 노드 모양 차별화:**                                                                         
                                                                                                            
| NodeKind | 색상 | Cytoscape shape |                                                                       
|----------|------|-----------------|                                                                       
| vue-component | accent-primary (green) | `ellipse` |                                                      
| pinia-store | accent-blue | `diamond` |                                                                   
| spring-endpoint | accent-warning | `rectangle` |                                                          
| composable | #a78bfa (purple) | `triangle` |                                                              
| api-call-site | accent-danger (red) | `pentagon` |                                                        
| 기타 | text-tertiary | `hexagon` |                                                                        
                                                                                                            
`types/graph.ts`의 NODE_STYLES 맵에 shape 필드 추가 → Cytoscape stylesheet의 `'shape'` 속성으로 적용.       
                                                                                                            
---                                                                                                         
                                                                                                            
## Implementation Order                                                                                     
                                                                                                            
```                                                                                                         
Step 1 (Tokens)     ████████░░  — 모든 후속 작업의 기반                                                     
  ├─→ Step 2 (Hover/Size)  ████████████░░  — 가장 큰 인터랙션 개선                                          
  ├─→ Step 3 (Legend)       ██████░░  — 즉각적 이해도 향상                                                  
  └─→ Step 4 (Onboarding)  ██████░░  — 첫 사용자 경험                                                       
Step 5 (Transitions) ██████████░░  — Step 2,3 완료 후 전체 품질감                                           
Step 6 (Cmd+K)       ████████░░  — 파워유저 생산성                                                          
Step 7 (Resize)      ████████░░  — 다양한 화면 지원                                                         
Step 8 (A11y)        ██████████░░  — 최종 품질 마무리                                                       
```                                                                                                         
                                                                                                            
Steps 2, 3, 4는 Step 1 완료 후 **병렬 진행 가능**.                                                          
                                                                                                            
## Verification                                                                                             
                                                                                                            
1. `npm run dev` 로 web-ui 개발 서버 실행, test-project 서버와 연결                                         
2. **인터랙션 테스트:** 노드 hover → 1.3x 확대 + 이웃 하이라이트 확인, mouseout → 복귀 확인                 
3. **범례 테스트:** 범례 항목 클릭 → 해당 종류 필터 토글, 카운트 갱신 확인                                  
4. **빈 상태:** 서버 끄고 접속 → ConnectionError 표시, 서버 켜고 빈 그래프 → EmptyState 표시                
5. **Cmd+K:** `Cmd+K` 입력 → 팔레트 열림, 노드 검색 → 결과 클릭 → 해당 노드 포커스                          
6. **리사이즈:** 사이드바 핸들 드래그 → 너비 변경, 새로고침 후 유지 확인                                    
7. **반응형:** Chrome DevTools에서 768px, 1024px 뷰포트 전환 → 레이아웃 적응 확인                           
8. **접근성:** Tab 키로 전체 앱 탐색 가능, 스크린 리더에서 노드 선택 알림 확인                              
9. **성능:** Chrome DevTools Performance 탭에서 hover/click 시 16ms 프레임 이내                             
10. **Lighthouse:** Accessibility 점수 90+ 목표                                                             
</ultraplan>                                                                                                
                                                                                                            
The user approved this plan in the remote session. Give them a brief summary, then start implementing.  


<ultraplan>                                                                                                                       
# Phase 4: Full-Stack Deep Analysis                                                                                               
                                                                                                                                  
## Context                                                                                                                        
                                                                                                                                  
VDA (Vue Dependency Analyzer) has Phase 1-3 implemented: Vue/TS/Java parsers, cross-boundary linkers, analyzers                   
(circular/orphan/impact/complexity), Fastify server with WebSocket, and a Cytoscape.js-based web UI with clustering, filtering,   
and node detail panels.                                                                                                           
                                                                                                                                  
**What's missing** — the gap between the current codebase and full E2E dependency tracking:                                       
- No MyBatis/DB layer (SQL→table nodes)                                                                                           
- Spring parser only handles `@Autowired` and basic constructor injection — no Lombok `@RequiredArgsConstructor`,                 
`@Configuration`/`@Bean`, or Spring Events                                                                                        
- No DTO field-level analysis or frontend↔backend field consistency checking                                                      
- No Vue emit↔parent `@event` virtual edges                                                                                       
- `findPaths()` exists in `query.ts` but has no API route                                                                         
- Circular/orphan/hub data returned by `/api/stats` but no dedicated overlay API for the graph                                    
- No pathfinder UI, breadcrumb navigation, edge bundling, or source snippet viewer                                                
- No parse error panel                                                                                                            
                                                                                                                                  
## Architecture Diagram                                                                                                           
                                                                                                                                  
```mermaid                                                                                                                        
graph TD                                                                                                                          
    subgraph "Step 1-2: Backend Parsing"                                                                                          
        A1[MyBatisXmlParser] -->|mybatis-maps| A2[MyBatisLinker]                                                                  
        A3[JavaFileParser enhancements] -->|@Bean, Lombok, Events| A2                                                             
        A2 -->|reads-table, writes-table| A4[db-table nodes]                                                                      
    end                                                                                                                           
                                                                                                                                  
    subgraph "Step 3: Analysis API"                                                                                               
        B1[/api/graph/paths] -->|uses existing findPaths| B2[query.ts]                                                            
        B3[/api/analysis/overlays] -->|circular+orphan+hub IDs| B4[graphStore overlays]                                           
    end                                                                                                                           
                                                                                                                                  
    subgraph "Step 4-5: DTO + Events"                                                                                             
        C1[DTO field extraction] --> C2[DtoFlowLinker]                                                                            
        C2 --> C3[DtoConsistencyChecker]                                                                                          
        C4[Vue emit resolver] --> C5[Spring Event edges]                                                                          
    end                                                                                                                           
                                                                                                                                  
    subgraph "Step 6-7: Frontend"                                                                                                 
        D1[PathfinderPanel] --> D2[ForceGraphView overlays]                                                                       
        D3[BreadcrumbNav] --> D4[SourceSnippet]                                                                                   
        D5[ParseErrorPanel]                                                                                                       
    end                                                                                                                           
                                                                                                                                  
    A4 --> B3                                                                                                                     
    C3 -->|/api/analysis/dto-consistency| D2                                                                                      
    B4 --> D2                                                                                                                     
```                                                                                                                               
                                                                                                                                  
## Implementation Steps                                                                                                           
                                                                                                                                  
### Step 1: MyBatis XML Parser + DB Table Layer                                                                                   
                                                                                                                                  
Adds `mybatis-mapper`, `mybatis-statement`, `db-table` nodes and `mybatis-maps`, `reads-table`, `writes-table` edges.             
                                                                                                                                  
**New files:**                                                                                                                    
                                                                                                                                  
1. **`packages/core/src/parsers/java/MyBatisXmlParser.ts`** — implements `FileParser`                                             
   - `supports()`: `.xml` files only                                                                                              
   - `parse()`: check for `<mapper namespace=` to confirm it's a MyBatis mapper                                                   
   - Use regex (not a new dependency) to extract `<select id="..."`, `<insert id="..."`, e                                        
… +193 lines …                                                                                                                    
|---|---|                                                                                                                         
| `findPaths()` in `core/src/graph/query.ts:92-117` | Step 3 API — just wrap in route |                                           
| `findCircularDependencies()` in `core/src/analyzers/CircularDependencyAnalyzer.ts` | Step 3 overlays |                          
| `findOrphanNodes()` in `core/src/analyzers/OrphanDetector.ts` | Step 3 overlays |                                               
| `findHubs()` in `core/src/analyzers/ComplexityScorer.ts:32` | Step 3 overlays |                                                 
| `FileParser` interface in `core/src/graph/types.ts:96-99` | Step 1 MyBatisXmlParser implements this |                           
| `CrossBoundaryResolver.resolve()` pattern | Steps 1, 5, 6 linkers follow same orchestration |                                   
| `CommandPalette.vue` command registration | Steps 4, 8 add new commands |                                                       
| `NODE_STYLES` / `EDGE_STYLES` in `web-ui/src/types/graph.ts` | Steps 1, 2 extend these maps |                                   
                                                                                                                                  
## Verification Plan                                                                                                              
                                                                                                                                  
1. **Step 1**: Create `UserMapper.xml` fixture → run `MyBatisXmlParser.parse()` → assert `mybatis-mapper`, `mybatis-statement`,   
`db-table` nodes exist and `reads-table`/`writes-table` edges connect correctly. Run `vitest run` in core package.                
                                                                                                                                  
2. **Step 2**: Create `AppConfig.java` fixture with `@Configuration`/`@Bean` → assert `spring-service` node with                  
`isConfiguration: true` and bean-producing edges. Test `@RequiredArgsConstructor` with final fields.                              
                                                                                                                                  
3. **Step 3**: After full analysis, call `GET /api/graph/paths?from=<controller>&to=<store>` → verify non-empty path array. Call  
`GET /api/analysis/overlays` → verify `circularNodeIds` contains known cycles from test-project.                                  
                                                                                                                                  
4. **Step 4**: In browser, open Pathfinder, select two nodes, verify path highlights appear as golden lines on graph.             
                                                                                                                                  
5. **Step 5**: Intentionally create a DTO mismatch in test-project (backend field not in frontend interface) → call `GET          
/api/analysis/dto-consistency` → verify mismatch reported.                                                                        
                                                                                                                                  
6. **Step 6**: In test-project, verify Vue component with `defineEmits(['submit'])` and parent with `@submit="handler"` produces  
connected `emits-event`/`listens-event` edges.                                                                                    
                                                                                                                                  
7. **Step 7**: Toggle edge bundling in cluster view → verify visual bundling. Hover a node → verify neighbors push outward.       
                                                                                                                                  
8. **Step 8**: Click an edge → verify source snippet popup shows correct code. Open parse errors panel → verify any parse         
failures are listed.                                                                                                              
                                                                                                                                  
**Build verification**: `cd packages/core && npm run build && npm run test` after each step. Full integration: `npm run build` at 
 root, then `vda serve test-project --watch` and check UI.                                                                        
</ultraplan>                                                                                                                      
                                                                                                                                  
The user approved this plan in the remote session. Give them a brief summary, then start implementing.