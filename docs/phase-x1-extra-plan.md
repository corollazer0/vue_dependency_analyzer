# Phase X-1 Extra: 기능 완성 — 남은 12개 항목

> API는 있는데 UI가 없거나, 파서가 부분 구현인 항목을 전부 닫는다.

---

## Batch A: 그래프 시각 강화 (API 있음 → UI 연결만)

### A-1. 순환/고아/허브 노드 그래프 하이라이트

**API**: `GET /api/analysis/overlays` → `{ circularNodeIds, orphanNodeIds, hubNodeIds }`
**구현**:
- `graphStore.ts`: `fetchOverlays()` → circularSet, orphanSet, hubSet 저장
- `ForceGraphView.vue`: 레이아웃 후 클래스 적용
  - `.circular` → 빨간 테두리 (border: 2px solid #ef4444)
  - `.orphan` → 50% 투명 + 점선 테두리
  - `.hub` → 주황 글로우 (overlay-color: #f59e0b)
- 툴바에 "Show Overlays" 토글 버튼

**파일**: `graphStore.ts`, `ForceGraphView.vue`
**공수**: S

### A-2. 그래프 이미지/SVG 내보내기

**구현**:
- `ForceGraphView.vue`: Export 버튼 → `cy.png({ full: true, scale: 2 })` → 다운로드
- PNG + SVG 옵션
- Command Palette에 "Export graph as PNG" 명령 추가

**파일**: `ForceGraphView.vue`, `CommandPalette.vue`
**공수**: S

### A-3. 필터 전체 선택/해제 + 프리셋

**구현**:
- `FilterPanel.vue`: "All" / "None" 버튼
- 프리셋 드롭다운:
  - "Vue Only" → vue-component, pinia-store, vue-composable, uses-store, uses-component, imports
  - "Spring Only" → spring-*, mybatis-*, db-table, spring-injects, api-serves
  - "Full Chain" → 전체 선택
  - "API Connections" → api-call-site, spring-endpoint, api-call
  - "DB Layer" → mybatis-*, db-table, reads-table, writes-table

**파일**: `FilterPanel.vue`, `graphStore.ts`
**공수**: S

---

## Batch B: 분석 결과 UI (API 있음 → 뷰 컴포넌트 신규)

### B-1. Pathfinder UI (두 노드 간 경로 탐색)

**API**: `GET /api/graph/paths?from=X&to=Y&maxDepth=10`
**구현**:
- 새 컴포넌트: `PathfinderPanel.vue`
  - "From" / "To" 검색 입력 (자동완성, /api/search 활용)
  - "Find Paths" 버튼 → API 호출
  - 결과: 경로 리스트 (각 경로의 hop 수 + 노드 이름 체인)
  - 경로 클릭 → 그래프에서 해당 경로 하이라이트
- `ForceGraphView.vue`: `.path-highlight` 스타일 (골든 라인)
- 툴바 또는 Command Palette에서 진입

**파일**: `PathfinderPanel.vue` (신규), `ForceGraphView.vue`, `App.vue`
**공수**: M

### B-2. 소스 코드 스니펫 뷰어

**API**: `GET /api/source-snippet?file=X&line=N&context=5`
**구현**:
- 새 컴포넌트: `SourceSnippet.vue`
  - 코드 라인 표시 (줄 번호 + 하이라이트 라인)
  - 간단한 키워드 색상 처리 (import, function, const 등)
- `NodeDetail.vue`: 엣지 항목에 "View Source" 버튼 → loc 정보로 API 호출
- 또는 `ForceGraphView.vue`: 엣지 클릭 시 팝업

**파일**: `SourceSnippet.vue` (신규), `NodeDetail.vue`
**공수**: M

### B-3. DTO 불일치 뷰

**API**: `GET /api/analysis/dto-consistency`
**구현**:
- 새 컴포넌트: `DtoConsistencyPanel.vue`
  - 불일치 테이블: endpoint, backend DTO, frontend interface, 누락 필드
  - 색상 코딩: 빨강 = 프론트엔드 누락, 주황 = 백엔드 누락
- Command Palette 또는 사이드바 탭으로 접근

**파일**: `DtoConsistencyPanel.vue` (신규), `App.vue`
**공수**: M

### B-4. 파싱 오류 패널

**API**: `GET /api/analysis/parse-errors`
**구현**:
- 새 컴포넌트: `ParseErrorPanel.vue`
  - 오류 리스트: 파일명, 라인, 메시지, 심각도
  - 파일명 클릭 → 해당 노드 선택 (있으면)
- 상태바에 오류 카운트 배지, 클릭 시 패널 열기

**파일**: `ParseErrorPanel.vue` (신규), `App.vue`
**공수**: S

---

## Batch C: NodeDetail 강화

### C-1. E2E 체인 경로 요약

**구현**:
- `NodeDetail.vue`에 "Chain" 섹션 추가
- 선택 노드에서 DB table까지 (또는 Vue component까지) 최단 경로 계산
- `/api/graph/paths` API 활용
- 경로를 시각적 체인으로 표시: `LoginPage → API → AuthController → AuthService → UserRepository → UserMapper → users`
- 각 노드 클릭 가능

**파일**: `NodeDetail.vue`
**공수**: M

### C-2. 그래프 탐색 히스토리 (뒤로/앞으로)

**구현**:
- `graphStore.ts`: navigationHistory 배열 + currentIndex
- selectNode/focusNode 호출 시 히스토리 push
- "← Back" / "→ Forward" 버튼 (브라우저 히스토리와 유사)
- 키보드 단축키: Alt+← / Alt+→

**파일**: `graphStore.ts`, `App.vue` (또는 toolbar)
**공수**: M

---

## Batch D: 분석 정확도 보강 (파서 개선)

### D-1. Kotlin Service/Repository 파싱

**현재**: KotlinFileParser가 Controller만 파싱
**구현**:
- `KotlinFileParser.ts`: `@Service`, `@Repository`, `@Component` 감지
- Kotlin `class` + constructor injection 파싱
- `private val xxxRepository: XxxRepository` 패턴

**파일**: `packages/core/src/parsers/java/KotlinFileParser.ts`
**공수**: M

### D-2. @Component 감지

**현재**: @Service, @Repository, @Controller만 감지
**구현**:
- `JavaFileParser.ts`: `@Component` 어노테이션 추가
- `spring-service` 노드로 생성 (isComponent=true)

**파일**: `packages/core/src/parsers/java/JavaFileParser.ts`
**공수**: S

### D-3. 중첩 routes children 파싱

**현재**: 최상위 routes 배열만 파싱
**구현**:
- `TsFileParser.ts`: routes 파싱 시 `children: [...]` 재귀 탐색
- 중첩 route도 `route-renders` 엣지 생성

**파일**: `packages/core/src/parsers/typescript/TsFileParser.ts`
**공수**: M

---

## 실행 순서

```
Batch A (S×3, 병렬):  A-1 overlays + A-2 export + A-3 filters
  ↓
Batch B (M×3 + S×1, 병렬가능):  B-1 pathfinder + B-2 source + B-3 DTO + B-4 errors
  ↓
Batch C (M×2):  C-1 chain + C-2 history
  ↓
Batch D (M×2 + S×1, 병렬):  D-1 kotlin + D-2 @Component + D-3 nested routes
```

## 성공 기준

- 모든 기존 API endpoint가 UI에서 접근 가능
- 순환/고아/허브 노드가 그래프에서 시각적으로 구분
- 두 노드 간 경로 탐색 + 하이라이트 동작
- 엣지 클릭 → 소스 코드 스니펫 팝업
- DTO 불일치 테이블 표시
- 필터 프리셋으로 한 번에 뷰 전환
- 그래프 PNG/SVG 내보내기
- Kotlin 서비스/레포지토리 감지
- @Component 감지
- 중첩 routes 파싱
- 238+ 기존 테스트 유지
