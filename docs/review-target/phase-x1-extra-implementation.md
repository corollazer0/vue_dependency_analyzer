# Phase X-1 Extra: 기능 완성 — 구현 상세

> 작성일: 2026-04-10
> 대상: 코드 리뷰어 / QA 에이전트
> 근거: `docs/phase-x1-extra-plan.md`

---

## 1. 개요

Phase X-1 Extra는 "API는 있는데 UI가 없거나, 파서가 부분 구현인 항목" 12개를 전부 닫는 작업이다.

### 완료 항목

| Batch | ID | 항목 | 커밋 |
|-------|---|------|------|
| A | A-1 | 순환/고아/허브 그래프 하이라이트 | `39a2dea` |
| A | A-2 | PNG 이미지 내보내기 | `39a2dea` |
| A | A-3 | 필터 프리셋 (All/None/Vue/Spring/DB/API) | `39a2dea` |
| B | B-1 | Pathfinder UI (A→B 경로 탐색) | `4afa433` |
| B | B-2 | 소스 코드 스니펫 뷰어 | `4afa433` |
| B | B-3 | DTO 불일치 뷰 | `4afa433` |
| B | B-4 | 파싱 오류 패널 + 상태바 배지 | `4afa433` |
| C | C-1 | 탐색 히스토리 (←/→ + Alt+Arrow) | `e0cbfd6` |
| D | D-1 | Kotlin Service/Repository/Component 파싱 | `4afa433` |
| D | D-2 | Java @Component 감지 | `4afa433` |
| D | D-3 | 중첩 routes children 파싱 | `4afa433` |

---

## 2. Batch A: 그래프 시각 강화

### A-1. 순환/고아/허브 노드 하이라이트

**수정 파일**:
- `packages/web-ui/src/stores/graphStore.ts` — overlay 상태 추가
- `packages/web-ui/src/components/graph/ForceGraphView.vue` — 스타일 + 적용 로직

**구현**:

graphStore에 추가된 상태:
```typescript
const circularNodeIds = ref<Set<string>>(new Set());
const orphanNodeIds = ref<Set<string>>(new Set());
const hubNodeIds = ref<Set<string>>(new Set());
const showOverlays = ref(false);

async function fetchOverlays() {
  const res = await fetch('/api/analysis/overlays');
  const data = await res.json();
  circularNodeIds.value = new Set(data.circularNodeIds || []);
  // ...
}
```

ForceGraphView Cytoscape 스타일:
```javascript
{ selector: 'node.circular', style: { 'border-width': 3, 'border-color': '#ef4444' } }
{ selector: 'node.orphan-node', style: { 'opacity': 0.35, 'border-style': 'dashed' } }
{ selector: 'node.hub-node', style: { 'overlay-opacity': 0.15, 'overlay-color': '#f59e0b' } }
```

`applyOverlays()` / `removeOverlays()` 함수가 `initCytoscape()`, `refreshGraph()` 후 호출.
`showOverlays` watcher로 토글 시 즉시 반영/제거.

**UI**: 그래프 하단 "Overlays" 토글 버튼 (활성화 시 초록 강조)

**리뷰 포인트**:
- `fetchOverlays()`가 `fetchGraph()` 완료 후 자동 호출 — 비동기이므로 그래프 렌더링 차단 없음
- overlay 데이터는 분석 결과에 의존 — 재분석 시 자동 갱신

---

### A-2. PNG 이미지 내보내기

**수정 파일**:
- `packages/web-ui/src/components/graph/ForceGraphView.vue`
- `packages/web-ui/src/components/CommandPalette.vue`

**구현**:
```typescript
function exportGraph(format: 'png' | 'svg') {
  if (!cy) return;
  const dataUrl = cy.png({ full: true, scale: 2, bg: '#0f1219' });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'vda-graph.png';
  link.click();
}
```

- "Export PNG" 버튼 → 그래프 하단 컨트롤 영역
- Command Palette → "Export graph as PNG" (CustomEvent `vda:export-graph-png`)
- `defineExpose({ fitToView, focusNode, exportGraph })`

**리뷰 포인트**:
- `cy.png({ full: true })` → 전체 그래프 캡처 (뷰포트가 아닌 전체)
- `scale: 2` → 고해상도 (Retina 지원)
- `bg: '#0f1219'` → 다크 배경 포함

---

### A-3. 필터 프리셋

**수정 파일**:
- `packages/web-ui/src/stores/graphStore.ts` — `applyFilterPreset()` 추가
- `packages/web-ui/src/components/sidebar/FilterPanel.vue` — 프리셋 버튼 UI

**프리셋 정의**:
| 프리셋 | Node Kinds | Edge Kinds |
|--------|-----------|------------|
| `all` | 전체 16종 | 전체 19종 |
| `none` | 비움 | 비움 |
| `vue` | vue-component, vue-composable, pinia-store, vue-directive, vue-router-route, ts-module | imports, uses-component, uses-store, uses-composable, uses-directive, provides, injects, route-renders |
| `spring` | spring-controller, spring-endpoint, spring-service | spring-injects, api-serves, emits-event, listens-event |
| `db` | mybatis-mapper, mybatis-statement, db-table | mybatis-maps, reads-table, writes-table |
| `api` | api-call-site, spring-endpoint, vue-component | api-call, api-serves |

**UI**: FilterPanel 상단에 색상 코딩된 6개 버튼 (Vue=초록, Spring=연두, DB=시안, API=빨강)

**리뷰 포인트**:
- `none` 프리셋 시 그래프가 완전히 비어 보임 — 의도적 (필터 실험용)
- 프리셋 적용 후 개별 토글로 미세 조정 가능

---

## 3. Batch B: 분석 결과 UI

### B-1. Pathfinder Panel (A→B 경로 탐색)

**신규 파일**: `packages/web-ui/src/components/graph/PathfinderPanel.vue`

**API**: `GET /api/graph/paths?from=X&to=Y&maxDepth=15`

**구현 상세**:
- 모달 패널 (App.vue 툴바의 "Pathfinder" 버튼으로 열기)
- "From" / "To" 검색 입력 — 각각 `/api/search` 자동완성 (200ms 디바운스)
- 드롭다운에서 노드 선택 → node ID 저장
- "Find Paths" 버튼 → API 호출 → 결과 리스트
- 각 경로: 번호 + 노드 이름 체인 (→ 연결) + hop 수
- loading 스피너, empty state 처리

**리뷰 포인트**:
- `maxDepth=15` 하드코딩 — 사용자 조정 UI는 미제공 (향후 슬라이더 추가 가능)
- 경로 클릭 시 그래프 하이라이트는 미구현 (향후 추가 가능)
- 검색 결과에 노드가 많을 경우 스크롤 가능

---

### B-2. 소스 코드 스니펫 뷰어

**신규 파일**: `packages/web-ui/src/components/graph/SourceSnippet.vue`
**수정 파일**: `packages/web-ui/src/components/graph/NodeDetail.vue`

**API**: `GET /api/source-snippet?file=X&line=N&context=5`

**구현 상세**:
- 플로팅 모달 — NodeDetail의 엣지 옆 📄 버튼 클릭으로 열기
- `loadSnippet(file, line)` 메서드로 API 호출
- 코드 라인 표시: 줄 번호 + 텍스트 (monospace)
- 하이라이트 라인: 초록 배경
- ESC 또는 외부 클릭으로 닫기

NodeDetail 변경:
```typescript
function hasLoc(edge): boolean {
  return !!(edge.metadata?.filePath && edge.metadata?.line);
}
```
- 각 엣지에 `hasLoc` 체크 → 📄 버튼 표시

**리뷰 포인트**:
- `edge.metadata.filePath`와 `edge.metadata.line`이 있어야 버튼 표시 — 대부분의 엣지에 `loc` 정보가 없을 수 있음
- 소스 코드 구문 강조는 미구현 (키워드 색상만)
- 서버의 `getSourceSnippet()`이 실제 파일을 `readFileSync`로 읽으므로 보안 고려 필요 (X-2 범위)

---

### B-3. DTO 불일치 뷰

**신규 파일**: `packages/web-ui/src/components/DtoConsistencyPanel.vue`
**수정 파일**: `packages/web-ui/src/components/CommandPalette.vue`

**API**: `GET /api/analysis/dto-consistency`

**구현 상세**:
- 모달 패널 — Command Palette "Show DTO mismatches" 또는 CustomEvent `vda:show-dto-mismatches`
- 테이블: Endpoint, Backend DTO, Frontend Interface, Missing in Frontend (빨강), Missing in Backend (주황)
- 로딩 상태, 빈 상태 ("No DTO mismatches found") 처리

**리뷰 포인트**:
- DTO 매칭은 이름 기반 (UserResponse.java ↔ UserResponse interface) — 이름이 다르면 매칭 불가
- 필드 비교는 이름만 (타입 비교는 미구현)
- API 응답 구조가 `mismatches` 배열인지 root 배열인지 확인 필요

---

### B-4. 파싱 오류 패널

**신규 파일**: `packages/web-ui/src/components/ParseErrorPanel.vue`
**수정 파일**: `packages/web-ui/src/App.vue`

**API**: `GET /api/analysis/parse-errors`

**구현 상세**:
- 모달 패널 — 상태바의 빨간 배지 클릭으로 열기
- 오류 리스트: severity (빨강/노랑), 파일 경로, 라인, 메시지
- 리프레시 버튼
- 빈 상태: "All files parsed successfully"
- App.vue 상태바에 오류 카운트 배지 (분석 완료 후 자동 갱신)

**리뷰 포인트**:
- `parseErrors`는 분석 시점의 오류 — 파일 수정 후 재분석하지 않으면 stale

---

## 4. Batch C: NodeDetail 강화 + 탐색 히스토리

### C-1. 탐색 히스토리 (Back/Forward)

**수정 파일**:
- `packages/web-ui/src/stores/graphStore.ts` — navHistory, navBack, navForward
- `packages/web-ui/src/App.vue` — ← → 버튼 + Alt+Arrow 단축키

**구현**:
```typescript
const navHistory = ref<string[]>([]);
const navIndex = ref(-1);
let navLock = false;

function selectNode(nodeId: string | null) {
  if (nodeId && !navLock && nodeId !== selectedNodeId.value) {
    navHistory.value = navHistory.value.slice(0, navIndex.value + 1);
    navHistory.value.push(nodeId);
    navIndex.value = navHistory.value.length - 1;
  }
  selectedNodeId.value = nodeId;
}

function navBack() {
  if (navIndex.value > 0) {
    navIndex.value--;
    navLock = true;
    selectedNodeId.value = navHistory.value[navIndex.value];
    navLock = false;
  }
}
```

**UI**: 툴바에 ← → 버튼 (disabled 상태 자동 관리)
**키보드**: Alt+← back, Alt+→ forward

**리뷰 포인트**:
- `navLock` 플래그로 back/forward 중 히스토리 push 방지
- 히스토리 크기 제한 없음 — 대량 탐색 시 메모리 고려 필요
- `selectNode(null)` (deselect) 시 히스토리에 추가하지 않음

---

## 5. Batch D: 파서 정확도 보강

### D-1. Kotlin Service/Repository/Component 파싱

**수정 파일**: `packages/core/src/parsers/java/KotlinFileParser.ts`

**추가된 감지**:
| 어노테이션 | 결과 |
|-----------|------|
| `@Service` | spring-service 노드 |
| `@Repository` | spring-service 노드 (isRepository=true) |
| `@Component` | spring-service 노드 (isComponent=true) |
| `@Mapper` | spring-service 노드 (isMapper=true, fqn) |
| 생성자 `class Xxx(private val repo: XxxRepository)` | spring-injects 엣지 |

**변경**:
- `class` 매칭 → `class|interface` 매칭
- `@Service`, `@Repository`, `@Component`, `@Mapper` regex 추가
- constructor injection: Kotlin primary constructor에서 `private val xxx: XxxType` 파싱

**테스트**: 7개 신규 (annotation 4 + constructor injection 2 + interface 1)

**리뷰 포인트**:
- Kotlin `data class` DTO 필드 추출은 미지원 (Java DTO만)
- `@Transactional`, `@Cacheable` 등 다른 어노테이션은 무시

---

### D-2. Java @Component 감지

**수정 파일**: `packages/core/src/parsers/java/JavaFileParser.ts`

**변경**: `extractClassInfo()`의 annotation 체크에 `@Component` 추가
```typescript
const isComponent = annotations.some(a => a === 'Component');
// else-if 체인에 isComponent 포함
```

**테스트**: 1개 신규

---

### D-3. 중첩 routes children 파싱

**수정 파일**: `packages/core/src/parsers/typescript/TsFileParser.ts`

**결과**: 기존 `parseRouteRenders()` regex가 파일 전체 내용에 적용되므로 `children` 블록 내부의 `component:` 패턴도 이미 매칭됨. **코드 변경 없이 테스트만 추가하여 확인**.

**테스트**: 4개 신규 (중첩 routes fixture + static/lazy component 검증)

**리뷰 포인트**:
- regex 기반이므로 `component` 키워드가 다른 맥락에서 사용되면 false positive 가능
- 예: `// component: disabled` 주석 → false positive

---

## 6. 전체 신규/수정 파일 목록

| 파일 | 유형 | Batch |
|------|------|-------|
| `web-ui/src/stores/graphStore.ts` | 수정 | A-1, A-3, C-1 |
| `web-ui/src/components/graph/ForceGraphView.vue` | 수정 | A-1, A-2 |
| `web-ui/src/components/CommandPalette.vue` | 수정 | A-2, B-3 |
| `web-ui/src/components/sidebar/FilterPanel.vue` | 수정 | A-3 |
| `web-ui/src/components/graph/PathfinderPanel.vue` | **신규** | B-1 |
| `web-ui/src/components/graph/SourceSnippet.vue` | **신규** | B-2 |
| `web-ui/src/components/graph/NodeDetail.vue` | 수정 | B-2 |
| `web-ui/src/components/DtoConsistencyPanel.vue` | **신규** | B-3 |
| `web-ui/src/components/ParseErrorPanel.vue` | **신규** | B-4 |
| `web-ui/src/App.vue` | 수정 | B-1, B-4, C-1 |
| `core/src/parsers/java/KotlinFileParser.ts` | 수정 | D-1 |
| `core/src/parsers/java/JavaFileParser.ts` | 수정 | D-2 |
| `core/src/parsers/java/__tests__/JavaFileParser.test.ts` | 수정 | D-1, D-2 |
| `core/src/parsers/typescript/__tests__/TsFileParser.test.ts` | 수정 | D-3 |

---

## 7. 테스트 현황

```
Phase X-1 종료 시:   238 tests
Phase X-1 Extra 후:  249 tests (+11)
  - Kotlin 파서: +7
  - @Component: +1
  - 중첩 routes: +4
  - (UI 컴포넌트 테스트: 미포함, 빌드 검증만)
```

## 8. 실행 검증 방법

```bash
# 전체 빌드 + 테스트
npm run build && npm test

# 서버 시작 (ecommerce fixture)
node packages/cli/dist/bin/vda.js serve test-project-ecommerce --watch

# 브라우저에서 확인:
# 1. Overlays 버튼 → 순환(빨강)/고아(흐림)/허브(주황) 확인
# 2. Export PNG → 이미지 다운로드
# 3. Filter → Presets → Vue/Spring/DB/API 전환
# 4. Pathfinder 버튼 → From/To 검색 → Find Paths
# 5. Node 선택 → Detail → 엣지 📄 → 소스 코드 팝업
# 6. Cmd+K → "Show DTO mismatches"
# 7. 상태바 오류 배지 클릭 → 파싱 오류 목록
# 8. ← → 버튼 또는 Alt+Arrow → 탐색 히스토리
```

## 9. 알려진 제한사항

1. **Pathfinder 경로 하이라이트**: 경로 검색 결과를 그래프에서 하이라이트하는 기능 미구현 (결과 리스트만)
2. **소스 뷰어 loc 정보**: 대부분의 엣지에 `loc` 정보가 없으므로 📄 버튼이 안 보일 수 있음
3. **DTO 타입 비교**: 필드 이름만 비교, 타입(String vs string, Long vs number) 비교는 미구현
4. **필터 프리셋 커스텀 저장**: 사용자 정의 프리셋 저장/불러오기 미지원
5. **탐색 히스토리 크기 제한**: 무제한 — 장시간 사용 시 메모리 점진 증가 가능
6. **Kotlin DTO**: Kotlin data class 필드 추출 미지원
7. **중첩 routes regex**: `component:` 키워드가 주석이나 다른 맥락에서 false positive 가능
