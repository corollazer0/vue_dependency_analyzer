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