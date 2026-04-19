# 코드 읽기 순서

## 1단계. 시스템 전체를 먼저 본다

### 목적

전체 파이프라인을 먼저 잡아야 세부 파일이 흩어져 보이지 않는다.

### 읽을 파일

1. [package.json](/home/ubuntu/workspace/vue_dependency_analyzer/package.json)
2. [packages/core/src/index.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/index.ts)
3. [packages/cli/src/index.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/index.ts)
4. [packages/server/src/index.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/index.ts)
5. [packages/web-ui/src/App.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/App.vue)

### 확인 질문

- 각 패키지는 무엇을 제공하는가
- 사용자 진입점은 어디인가
- 엔진과 UI는 어떻게 분리되는가

## 2단계. 그래프 계약을 본다

### 읽을 파일

1. [packages/core/src/graph/types.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/graph/types.ts)
2. [packages/core/src/graph/DependencyGraph.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/graph/DependencyGraph.ts)
3. [packages/core/src/graph/query.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/graph/query.ts)
4. [packages/core/src/graph/serializer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/graph/serializer.ts)

### 확인 질문

- 어떤 노드와 엣지가 존재하는가
- 탐색 방향은 어떻게 정의되는가
- 영향도는 어떻게 계산 가능한 구조인가

## 3단계. 파싱 엔진을 본다

### 읽을 파일

1. [packages/core/src/engine/ParallelParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/engine/ParallelParser.ts)
2. [packages/core/src/engine/ParseCache.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/engine/ParseCache.ts)
3. [packages/server/src/engine.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/engine.ts)
4. [packages/core/src/engine/parseWorker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/engine/parseWorker.ts)

### 확인 질문

- 파일은 어떻게 발견되는가
- 어떤 시점에 cache를 확인하는가
- parse 결과는 언제 graph에 합쳐지는가

## 4단계. 프론트엔드 파서를 본다

### 읽을 파일

1. [packages/core/src/parsers/vue/VueSfcParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/VueSfcParser.ts)
2. [packages/core/src/parsers/vue/ScriptAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/ScriptAnalyzer.ts)
3. [packages/core/src/parsers/vue/TemplateAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/vue/TemplateAnalyzer.ts)
4. [packages/core/src/parsers/typescript/TsFileParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/typescript/TsFileParser.ts)
5. [packages/core/src/parsers/typescript/ImportResolver.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/typescript/ImportResolver.ts)

### 확인 질문

- `.vue` 파일에서는 무엇을 노드로 만들고 무엇을 엣지로 만드는가
- `.ts` 파일에서는 어떤 규칙으로 module kind를 나누는가
- import target은 왜 처음에는 unresolved일 수 있는가

## 5단계. 백엔드 파서를 본다

### 읽을 파일

1. [packages/core/src/parsers/java/JavaFileParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/java/JavaFileParser.ts)
2. [packages/core/src/parsers/java/KotlinFileParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/java/KotlinFileParser.ts)
3. [packages/core/src/parsers/java/MyBatisXmlParser.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/parsers/java/MyBatisXmlParser.ts)

### 확인 질문

- endpoint는 어떤 정보로 구성되는가
- DTO는 어떻게 식별되는가
- MyBatis XML에서 table은 어떻게 추출되는가

## 6단계. 경계 연결을 본다

### 읽을 파일

1. [packages/core/src/linkers/CrossBoundaryResolver.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/CrossBoundaryResolver.ts)
2. [packages/core/src/linkers/ApiCallLinker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/ApiCallLinker.ts)
3. [packages/core/src/linkers/MyBatisLinker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/MyBatisLinker.ts)
4. [packages/core/src/linkers/DtoFlowLinker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/DtoFlowLinker.ts)
5. [packages/core/src/linkers/NativeBridgeLinker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/linkers/NativeBridgeLinker.ts)

### 확인 질문

- 어떤 unresolved edge가 여기서 해소되는가
- 어떤 것은 끝까지 unresolved로 남을 수 있는가
- "의미상 역방향" edge는 왜 필요한가

## 7단계. 분석기와 품질 기능을 본다

### 읽을 파일

1. [packages/core/src/analyzers/CircularDependencyAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/analyzers/CircularDependencyAnalyzer.ts)
2. [packages/core/src/analyzers/ImpactAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/analyzers/ImpactAnalyzer.ts)
3. [packages/core/src/analyzers/DtoConsistencyChecker.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/analyzers/DtoConsistencyChecker.ts)
4. [packages/core/src/analyzers/RuleEngine.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/analyzers/RuleEngine.ts)
5. [packages/core/src/git/ChangeImpactAnalyzer.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/core/src/git/ChangeImpactAnalyzer.ts)

## 8단계. 제품 표면을 본다

### 읽을 파일

1. [packages/cli/src/commands/analyze.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/analyze.ts)
2. [packages/cli/src/commands/impact.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/cli/src/commands/impact.ts)
3. [packages/server/src/routes/graphRoutes.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/routes/graphRoutes.ts)
4. [packages/server/src/routes/analysisRoutes.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/server/src/routes/analysisRoutes.ts)
5. [packages/web-ui/src/stores/graphStore.ts](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/stores/graphStore.ts)
6. [packages/web-ui/src/components/graph/ForceGraphView.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/ForceGraphView.vue)
7. [packages/web-ui/src/components/graph/TreeView.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/TreeView.vue)
8. [packages/web-ui/src/components/graph/BottomUpView.vue](/home/ubuntu/workspace/vue_dependency_analyzer/packages/web-ui/src/components/graph/BottomUpView.vue)

## 9단계. 지원 범위와 현실의 차이를 본다

### 읽을 문서

1. [docs/supported-patterns.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/supported-patterns.md)
2. [docs/score-gap-and-100-requirements.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/score-gap-and-100-requirements.md)
3. [docs/executive-si-effort-assessment.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/executive-si-effort-assessment.md)

### 목적

- 구현이 잘된 점만이 아니라, 재구현 시 반드시 보완해야 할 지점을 같이 학습한다.
