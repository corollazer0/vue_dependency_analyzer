# Phase X-1 전수 리뷰 대상 문서

> 작성일: 2026-04-10
> 목적: 다른 에이전트가 Phase X-1 (X-1 기본 + X-1 Extra + X-1 Extra P2) 전체 구현을 전수 테스트/리뷰하기 위한 가이드
> 커밋 기준: 현재 워킹 트리 (미커밋 상태, `git diff --stat HEAD` 참조)

---

## 1. 리뷰 범위

Phase X-1은 3단계로 나뉜다.

| 단계 | 범위 | 커밋 상태 |
|------|------|----------|
| X-1 기본 | 분석 정확도 + 성능 (캐시, 워커, 병렬 파서) | 커밋 완료 (`b274fa2`) |
| X-1 Extra | 12개 기능 항목 (그래프 오버레이, 프리셋, Pathfinder 등) | 커밋 완료 (Batch A~D) |
| X-1 Extra 보강 (P0+P1+P2) | 리뷰에서 지적된 9개 결함 수정 + 6개 확장 | **미커밋 — 워킹 트리에서 리뷰** |

이 문서는 **X-1 Extra 보강 (P0+P1+P2)** 를 중심으로 리뷰한다. 변경된 파일 20개, 추가된 코드 약 1,151줄.

---

## 2. 변경 파일 목록

### Core (`packages/core/src/`)

| 파일 | 변경 내용 |
|------|----------|
| `parsers/typescript/TsFileParser.ts` | interface/type 추출 (+fieldTypes), alias lazy route 파싱 |
| `parsers/typescript/__tests__/TsFileParser.test.ts` | interface 추출 5개 + alias route 4개 테스트 추가 |
| `analyzers/DtoConsistencyChecker.ts` | FieldDetail 타입, Java→TS 타입 매핑, severity 분류 |
| `linkers/CrossBoundaryResolver.ts` | resolveRouteRenders() 추가, confidence 메타데이터 설정 |
| `linkers/__tests__/CrossBoundaryResolver.test.ts` | route-renders 해소 2개 테스트 추가 |
| `graph/query.ts` | findPaths()에 edgeKinds 필터 옵션 추가 |
| `index.ts` | FieldDetail 타입 export |

### Server (`packages/server/src/`)

| 파일 | 변경 내용 |
|------|----------|
| `engine.ts` | getUnresolvedEdges() 추가, findPaths() edgeKinds 전달 |
| `routes/graphRoutes.ts` | `/api/analysis/unresolved-edges` 엔드포인트, paths API edgeKinds 파라미터 |

### Web UI (`packages/web-ui/src/`)

| 파일 | 변경 내용 |
|------|----------|
| `types/graph.ts` | SourceLocation 타입, GraphNode/Edge에 loc 필드, vue-event/spring-event NodeKind |
| `stores/graphStore.ts` | highlightedPath, savedPresets (localStorage), vue-event/spring-event 프리셋 |
| `components/graph/NodeDetail.vue` | hasEdgeLoc(edge.loc), Chain Summary, getChainSemantic(), confidence 배지 |
| `components/graph/ForceGraphView.vue` | path-highlight 스타일, cytoscape-svg import, SVG export, highlightedPath watcher |
| `components/graph/PathfinderPanel.vue` | node label 표시, edge kind 표시, 경로 클릭 하이라이트, Options (maxDepth/shortest/edgeKinds) |
| `components/sidebar/FilterPanel.vue` | 사용자 저장형 프리셋 UI (Save/Delete/Apply) |
| `components/DtoConsistencyPanel.vue` | 펼침식 fieldDetails 행, severity 배지, 타입 비교 표시 |
| `components/ParseErrorPanel.vue` | 파일 경로 클릭 → 노드 네비게이션 |
| `components/UnresolvedEdgePanel.vue` | **신규** — unresolved edge 전용 패널 |
| `components/App.vue` | UnresolvedEdgePanel 연동, 상태바 unresolved 카운트 배지 |
| `cytoscape-svg.d.ts` | **신규** — cytoscape-svg 타입 선언 |

---

## 3. 테스트 현황

```
@vda/core:   242 tests passed (19 files)
@vda/server:  21 tests passed (1 file)
@vda/cli:      4 tests passed (1 file)
합계:        267 tests passed
```

### 신규 추가된 테스트 (17개)

| 테스트 파일 | 테스트명 | 검증 대상 |
|------------|---------|----------|
| `TsFileParser.test.ts` | should extract exported interfaces with fields | interface 이름, fields, fieldTypes 추출 |
| `TsFileParser.test.ts` | should extract exported type aliases with object shape | type alias → fields/fieldTypes |
| `TsFileParser.test.ts` | should separate exported and non-exported interfaces | export 여부 분리 |
| `TsFileParser.test.ts` | should not set metadata when no interfaces exist | 빈 경우 metadata 미생성 |
| `TsFileParser.test.ts` | should extract multiple exported interfaces (DTO-style) | 다수 인터페이스 추출 |
| `TsFileParser.test.ts` | should resolve alias references to unresolved: import paths | alias lazy route → unresolved: 변환 |
| `TsFileParser.test.ts` | should preserve import paths from aliases | alias에서 원본 import path 보존 |
| `TsFileParser.test.ts` | should mark alias field on alias-resolved edges | alias 메타데이터 표시 |
| `TsFileParser.test.ts` | should not create duplicate edges for the same import path | 중복 엣지 방지 |
| `CrossBoundaryResolver.test.ts` | should resolve component: prefix route-renders | component: → vue-component 노드 해소 |
| `CrossBoundaryResolver.test.ts` | should leave unresolvable route-renders unchanged | 해소 불가 시 원본 유지 |
| `DtoConsistencyChecker.test.ts` | should dedup by (endpointPath, dtoName) when multiple call sites | 동일 endpoint+DTO 중복 제거 |
| `DtoConsistencyChecker.test.ts` | should include fieldDetails with type info and severity | fieldDetails 타입 매핑, severity 분류 |
| `api.test.ts` | should return unresolved edges array | /api/analysis/unresolved-edges 200 응답 |
| `api.test.ts` | should exclude external package imports | 외부 패키지 필터 검증 |
| `api.test.ts` | should include sourceLabel and prefix fields | 응답 필드 구조 검증 |
| `api.test.ts` | should accept edgeKinds query parameter | /api/graph/paths edgeKinds 파라미터 |
| `api.test.ts` | should treat empty edgeKinds as no allowed edge kinds | edgeKinds= 빈 문자열 → 0 결과 |

---

## 4. 런타임 실측 데이터 (`test-project-ecommerce` 기준)

리뷰어는 아래 수치를 직접 검증해야 한다. 캐시를 삭제하고 재분석 필요.

```bash
rm -rf ./test-project-ecommerce/.vda-cache
npm -w packages/core run build && npm -w packages/server run build
```

### 4.1 그래프 규모

| 항목 | 값 |
|------|---|
| 총 노드 | 269 |
| 총 엣지 | 545 |
| Vue Components | 50 |
| Spring Endpoints | 33 |
| DB Tables | 7 |
| vue-event 노드 | 8 |
| spring-event 노드 | 4 |

### 4.2 P0 수용 기준 검증

| # | 항목 | 수용 기준 | 실측 값 | 검증 방법 |
|---|------|----------|--------|----------|
| P0-1 | E2E Chain Summary | 노드 선택 시 1~3개 경로 표시 | UI 확인 필요 | 서버 실행 후 노드 클릭, Chain Summary 섹션 확인 |
| P0-2 | SourceSnippet loc | edge.loc 있는 엣지에 📄 버튼 | 182/545 엣지에 loc 존재 | `json.edges.filter(e => e.loc?.filePath).length` |
| P0-3 | TS interface 추출 | api.ts DTO가 메타데이터에 반영 | 6개 interface (UserResponse 등) | `json.nodes.filter(n => n.metadata.interfaces).length` |
| P0-4 | route-renders 해소 | resolved ≠ 0 | **8/14 resolved** | `json.edges.filter(e => e.kind === 'route-renders' && !e.target.startsWith('unresolved:') && !e.target.startsWith('component:')).length` |

**P0-4 해소 불가 6건의 원인:**
- `@/components/auth/Login.vue` → 실제 파일명은 `LoginPage.vue` (이름 불일치)
- `@/components/auth/Register.vue` → 실제 파일명은 `RegisterPage.vue`
- `@/components/product/ProductDetail.vue` → 파일 미존재
- `@/components/product/ProductCreate.vue` → 파일 미존재
- `@/components/auth/Settings.vue` → 파일 미존재
- `@/components/auth/NotFound.vue` → 파일 미존재

### 4.3 P1 수용 기준 검증

| # | 항목 | 검증 방법 |
|---|------|----------|
| P1-1 | Pathfinder 하이라이트 | Pathfinder에서 경로 찾은 후 경로 행 클릭 → 그래프에서 파란색 하이라이트 확인 |
| P1-2 | Pathfinder 라벨 | 경로 결과가 node ID가 아닌 label로 표시되는지, edge kind가 노드 사이에 표시되는지 확인 |
| P1-3 | ParseError 네비게이션 | Parse Error 패널에서 파일 경로 클릭 → 관련 노드 선택 + 패널 닫힘 |
| P1-4 | SVG export | 그래프 하단 SVG 버튼 클릭 → .svg 파일 다운로드 (cytoscape-svg 의존성 확인) |
| P1-5 | Event 노드 UI | 필터 패널에서 vue-event/spring-event 토글 가능, 프리셋(Vue/Spring/All)에 포함 |

### 4.4 P2 수용 기준 검증

| # | 항목 | 실측 값 | 검증 방법 |
|---|------|--------|----------|
| P2-1 | 사용자 필터 프리셋 | localStorage 기반 | FilterPanel에서 현재 필터 저장 → 새로고침 후 복원 확인 |
| P2-2 | Unresolved edge 패널 | 6건 (외부 패키지+외부 composable 제외) | 상태바 "6 unresolved" 배지 클릭 → 패널에서 source/target/prefix 표시 확인 |
| P2-3 | Pathfinder 옵션 | - | Options 토글 → maxDepth 슬라이더, shortest only, edge kind 필터 작동 확인 |
| P2-4 | 체인 semantic label | - | Chain Summary에 "Frontend → API", "API → Database" 등 배지 표시 확인 |
| P2-5 | DTO 비교 고도화 | 23건 (unique, fieldDetails 포함) | DTO 패널에서 행 클릭 → 필드별 backendType/frontendType/severity 표시 확인 |
| P2-6 | 분석 신뢰도 | high:57, medium:58, low:4 | NodeDetail 의존성 목록에서 초록/노랑/회색 dot 배지 표시 확인 |

---

## 5. 핵심 코드 경로 — 리뷰어가 반드시 읽어야 하는 파일

### 5.1 TsFileParser interface 추출

- **위치**: `packages/core/src/parsers/typescript/TsFileParser.ts:49-57` (extractMembers)
- **위치**: `packages/core/src/parsers/typescript/TsFileParser.ts:98-120` (interface/type 감지 in visit())
- **위치**: `packages/core/src/parsers/typescript/TsFileParser.ts:155-160` (metadata 저장)
- **검증**: `fieldTypes`가 `{name, type, optional}[]` 형태인지, interface와 type alias 모두 처리하는지

### 5.2 Alias lazy route 파싱

- **위치**: `packages/core/src/parsers/typescript/TsFileParser.ts:233-295` (parseRouteRenders 전체)
- **핵심 로직**: Step 1에서 `const X = () => import(...)` 맵 구축 → Step 3에서 `component: X`가 alias면 `unresolved:` 엣지로 변환
- **검증**: 중복 엣지 방지 로직 (`handledPaths` Set)

### 5.3 route-renders 해소

- **위치**: `packages/core/src/linkers/CrossBoundaryResolver.ts:369-416` (resolveRouteRenders)
- **핵심 로직**: `unresolved:` → ImportResolver로 파일 매칭, `component:` → label 매칭
- **검증**: 해소된 엣지에 `confidence: 'high'` (파일 해소) 또는 `'medium'` (label 매칭) 메타데이터

### 5.4 DtoConsistencyChecker 고도화

- **위치**: `packages/core/src/analyzers/DtoConsistencyChecker.ts:1-55` (FieldDetail, JAVA_TO_TS_MAP, areTypesCompatible)
- **위치**: `packages/core/src/analyzers/DtoConsistencyChecker.ts:100-145` (fieldDetails 빌드 로직)
- **검증**: Java `Long` → TS `number` 매핑이 동작하는지, severity 분류가 올바른지

### 5.5 Chain Summary

- **위치**: `packages/web-ui/src/components/graph/NodeDetail.vue:25-175` (전체 chain 로직)
- **핵심**: `getChainTargets()` — kind별 탐색 방향/대상, `getChainSemantic()` — 의미 판별
- **검증**: API 응답 `{paths, count}` 파싱이 올바른지 (line 143), `immediate: true` watch (line 172)

### 5.6 Confidence 메타데이터

- **위치**: CrossBoundaryResolver의 각 resolve 메서드 내 `metadata: { ...edge.metadata, confidence: '...' }`
- 전수 확인 필요:
  - `resolveImports()` → `high` (line 78)
  - `resolveComponentReferences()` → `medium` (line 106)
  - `resolveStoreReferences()` → `medium` (line 134)
  - `resolveComposableReferences()` → `medium` (line 436)
  - `resolveRouteRenders()` lazy → `high` (line 391), static → `medium` (line 414)
  - `resolveSpringInjects()` → `medium` (line 318)
  - `resolveRepositoryToMapper()` → `low` (line 349, 360)

### 5.7 Pathfinder 옵션

- **Core**: `packages/core/src/graph/query.ts:92-130` (FindPathsOptions, edgeKindSet 필터링)
- **Server**: `packages/server/src/routes/graphRoutes.ts:61-78` (edgeKinds 쿼리 파싱)
- **UI**: `packages/web-ui/src/components/graph/PathfinderPanel.vue` (Options 패널)

---

## 6. 실행 검증 가이드

### 6.1 테스트 전체 실행

```bash
npm test
# 기대: 267 tests passed (core 242 + server 21 + cli 4)
```

### 6.2 웹 UI 빌드

```bash
npm -w packages/web-ui run build
# 기대: vite build 성공, dist/ 생성
```

### 6.3 런타임 검증 스크립트

캐시 삭제 후 분석 실행:

```bash
rm -rf ./test-project-ecommerce/.vda-cache
npm -w packages/core run build && npm -w packages/server run build
```

아래 Node.js 스크립트로 수치 확인:

```js
// run: node --input-type=module -e "..."
import { AnalysisEngine } from './packages/server/dist/engine.js';

const engine = new AnalysisEngine('./test-project-ecommerce', {}, false);
await engine.runAnalysis();
const json = engine.getGraph();

// P0-2: loc
console.log('Edges with loc:', json.edges.filter(e => e.loc?.filePath).length);
// 기대: 182

// P0-3: interfaces
const ifaceNodes = json.nodes.filter(n => n.metadata.interfaces?.length > 0);
console.log('Nodes with interfaces:', ifaceNodes.length);
ifaceNodes.forEach(n => console.log(' ', n.label, n.metadata.interfaces.map(i => i.name)));
// 기대: 1개 노드 (api), 6개 인터페이스 (UserResponse 등)

// P0-3: fieldTypes 존재 확인
const ft = ifaceNodes[0]?.metadata.interfaces[0]?.fieldTypes;
console.log('fieldTypes sample:', ft?.[0]);
// 기대: { name: 'id', type: 'number', optional: false }

// P0-4: route-renders
const re = json.edges.filter(e => e.kind === 'route-renders');
const resolved = re.filter(e => !e.target.startsWith('unresolved:') && !e.target.startsWith('component:'));
console.log('route-renders:', re.length, 'resolved:', resolved.length);
// 기대: 14 total, 8 resolved

// P2-5: DTO fieldDetails
const dto = engine.checkDtoConsistency();
console.log('DTO mismatches:', dto.length, 'with fieldDetails:', dto.filter(d => d.fieldDetails?.length).length);
// 기대: 23 mismatches (unique dedup), 23 with fieldDetails

// P2-6: confidence
const conf = json.edges.filter(e => e.metadata?.confidence);
console.log('Edges with confidence:', conf.length,
  'high:', conf.filter(e => e.metadata.confidence === 'high').length,
  'medium:', conf.filter(e => e.metadata.confidence === 'medium').length,
  'low:', conf.filter(e => e.metadata.confidence === 'low').length);
// 기대: 119 total, high:57, medium:58, low:4

// P2-2: unresolved
console.log('Unresolved edges:', engine.getUnresolvedEdges().length);
// 기대: 6 (외부 패키지 + 외부 composable 제외, 파일 미존재만 남음)

// Event nodes
console.log('Event nodes:', json.nodes.filter(n => n.kind === 'vue-event' || n.kind === 'spring-event').length);
// 기대: 12
```

### 6.4 서버 기동 후 UI 수동 검증

```bash
npm -w packages/server run dev
# 또는
npm start
```

브라우저에서 확인할 체크리스트:

- [ ] 노드 클릭 → NodeDetail에 Chain Summary 표시 (1~3개 경로)
- [ ] Chain Summary 각 노드 클릭 → 해당 노드로 이동
- [ ] Chain Summary에 semantic label 배지 표시 (Frontend → API 등)
- [ ] edge.loc 있는 엣지에 📄 버튼 표시 → 클릭 시 SourceSnippet 모달
- [ ] NodeDetail 의존성 목록에 confidence dot (초록/노랑/회색)
- [ ] Pathfinder → 경로 결과에 node label + edge kind 표시
- [ ] Pathfinder → 경로 행 클릭 → 그래프에 파란색 하이라이트
- [ ] Pathfinder → Options → maxDepth 슬라이더, shortest only, edge kind 토글
- [ ] FilterPanel → "Save Current" 입력 → 저장 → 새로고침 → 복원
- [ ] FilterPanel → 저장된 프리셋 적용/삭제
- [ ] FilterPanel → vue-event, spring-event 체크박스 존재
- [ ] 상태바 → "N unresolved" 배지 클릭 → Unresolved Edge 패널
- [ ] Unresolved Edge 패널 → source 클릭 → 노드 이동
- [ ] Parse Error 패널 → 파일 경로 클릭 → 노드 이동
- [ ] 그래프 하단 → PNG/SVG 버튼 둘 다 존재, SVG 클릭 시 다운로드
- [ ] DTO 패널 → 행 클릭 → fieldDetails 펼침 (타입, severity)

---

## 7. 알려진 한계/의도된 동작

1. **route-renders 6건 미해소**: test-project-ecommerce fixture의 라우터가 참조하는 파일명과 실제 컴포넌트 파일명 불일치 (Login.vue vs LoginPage.vue). 분석기 버그가 아닌 fixture 데이터 문제.

2. **DTO mismatch 23건**: (endpointPath, backendDto) 기준 dedup 적용. 프론트엔드 interface가 `api.ts` 1개 파일에만 존재하므로, 대부분의 mismatch는 "프론트엔드 interface 없음" 케이스.

3. **SVG export**: `cytoscape-svg` 패키지의 `cy.svg()` 메서드 사용. Cytoscape.js 코어에 포함되지 않으므로 의존성 설치 + `cytoscape.use(cytoscapeSvg)` 등록이 필요. `packages/web-ui/package.json`에 `cytoscape-svg` 의존성 존재 확인 필수.

4. **confidence 미설정 엣지**: 파서가 직접 생성한 엣지 (imports, api-call 등)에는 confidence가 없음. CrossBoundaryResolver를 거쳐 해소된 엣지만 confidence 메타데이터 보유 (119/545).

5. **Chain Summary API 호출**: 노드 선택마다 최대 10개 후보 × API 호출이 발생. AbortController로 이전 요청 취소하지만 빠른 연속 선택 시 약간의 지연 가능.

6. **사용자 프리셋 localStorage**: 브라우저 간 동기화 없음. `vda-saved-presets` 키로 JSON 저장. 스키마 변경 시 corrupt 데이터는 무시.

---

## 8. 리뷰어 판정 기준 제안

| 등급 | 기준 |
|------|------|
| **적정** (8+/10) | npm test 전체 통과, 실측 수치가 4.2절과 ±5% 이내, UI 체크리스트 80% 이상 통과 |
| **부분 적정** (6~7/10) | 테스트 통과하지만 UI 기능 일부 미작동 또는 수치 편차 큼 |
| **부적정** (<6/10) | 테스트 실패, 핵심 기능 (route-renders, Chain Summary) 동작 안 함 |

---

## 9. 이전 리뷰 문서 참조

- 원 계획: `docs/phase-x1-extra-plan.md`
- 이전 리뷰 (6.0/10 판정): `docs/phase-x1-extra-review.md`
- X-2 계획 (다음 단계): `docs/phase-x2-plan.md`
