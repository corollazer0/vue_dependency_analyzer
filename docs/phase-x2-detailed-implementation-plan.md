# Phase X-2 Detailed Implementation Plan

> 작성일: 2026-04-10
> 기준 문서: `docs/phase-x2-plan.md`
> 보조 근거: `docs/review-target/world-class-gap-analysis.md`, `docs/score-gap-and-100-requirements.md`
> 목적: Phase X-2의 상위 계획을 현재 코드 구조와 실제 패키지 의존성에 맞는 실행 가능한 상세 구현 계획으로 재구성한다.

---

## 1. 현재 프로그램 동작 원리

### 1.1 패키지 의존 구조

현재 저장소의 런타임 구조는 아래와 같다.

```text
@vda/core
  ├─ 그래프 타입 / 그래프 저장소 / serializer
  ├─ 파일 파서 (Vue, TS/JS, Java, Kotlin, MyBatis XML)
  ├─ 교차 링크 해소기 (API, DI, MyBatis, DTO, native bridge, event)
  └─ 분석기 (impact, circular, orphan, complexity, DTO consistency)

@vda/cli
  ├─ @vda/core 의 runAnalysis 조합 로직을 직접 보유
  ├─ analyze / export / init 명령 제공
  └─ serve 명령에서 @vda/server 를 동적 import

@vda/server
  ├─ @vda/core 를 사용해 서버 내 분석 엔진을 직접 보유
  ├─ REST API + WebSocket + watch mode 제공
  └─ web-ui dist 정적 서빙

@vda/web-ui
  ├─ server REST/WebSocket 소비
  ├─ Graph / Tree / 각종 panel UI 제공
  └─ graph DTO 타입을 로컬에서 별도 정의
```

핵심 특징은 `@vda/core`가 순수 분석 엔진이고, `@vda/cli`와 `@vda/server`가 각각 별도의 orchestration 코드를 가지고 있다는 점이다.

### 1.2 분석 파이프라인

현재 실제 분석 흐름은 CLI와 Server에서 거의 동일하다.

1. 프로젝트 루트와 `.vdarc.json`을 읽어 `AnalysisConfig`를 만든다.
2. Vue/Spring/MSA 경로를 기준으로 파일 목록을 수집한다.
3. `ParseCache`로 캐시 여부를 확인한다.
4. `ParallelParser.parseAll()`이 파일별 파서를 실행한다.
5. 파서 결과를 `DependencyGraph`에 적재한다.
6. `CrossBoundaryResolver`가 unresolved import, API 연결, Spring DI, MyBatis, DTO flow, event를 후처리한다.
7. CLI는 결과를 출력/내보내기 하고, Server는 메모리에 유지하면서 API/WS로 노출한다.

### 1.3 각 레이어의 책임

#### Core

- 입력 단위: 파일 경로 + 텍스트
- 출력 단위: `GraphNode[]`, `GraphEdge[]`, `ParseError[]`
- 책임:
  - 파일 파싱
  - 그래프 생성
  - 교차 링크 해소
  - 분석 계산
  - serializer/export

#### CLI

- 책임:
  - 설정 로딩
  - 분석 실행
  - 결과 출력
  - 서버 기동 브리지

#### Server

- 책임:
  - 분석 엔진 수명주기
  - watch mode
  - REST/WS API
  - web-ui 정적 배포

#### Web UI

- 책임:
  - 서버에서 직렬화된 그래프를 받아 상태 저장
  - 필터/검색/하이라이트/탐색
  - ForceGraph, Tree, detail panel 렌더링

### 1.4 현재 구조의 핵심 제약

Phase X-2를 진행하기 전에 반드시 염두에 둬야 할 제약은 아래 5가지다.

1. CLI와 Server가 설정 로딩, 파일 탐색, 분석 orchestration을 중복 구현한다.
2. Server와 Web UI가 그래프 DTO 계약을 공유하지 않고 별도 타입을 유지한다.
3. Server는 현재 무상태 메모리 엔진이며, 사용자/권한/작업/감사/프로젝트를 저장할 영속 계층이 없다.
4. Web UI는 단일 그래프 API를 직접 소비하는 thin client라서, Matrix/Bottom-Up/Change Impact 같은 전용 view를 위한 별도 query 모델이 없다.
5. Core는 분석 기능에는 적합하지만, 규칙 엔진, Git 연동, 조직형 리포트, IDE 연동에 필요한 use case 계층이 없다.

---

## 2. 프로그램간 의존성 정리

### 2.1 내부 패키지 의존성

| 소비자 | 의존 대상 | 현재 의존 방식 | 문제점 |
|---|---|---|---|
| `@vda/cli` | `@vda/core` | 정적 import | 분석 orchestration 중복 |
| `@vda/cli` | `@vda/server` | `serve` 명령에서 동적 import | 배포/버전 정합성 관리 어려움 |
| `@vda/server` | `@vda/core` | 정적 import | 서버 전용 orchestration이 core 밖에 흩어짐 |
| `@vda/web-ui` | `@vda/server` | REST/WS | DTO 계약 버전 관리 부재 |
| `@vda/web-ui` | graph DTO | 로컬 정의 | core/server와 drift 가능 |

### 2.2 외부 시스템 의존성

Phase X-2에서 추가될 주요 외부 의존성은 아래와 같다.

| 영역 | 외부 시스템 | 목적 |
|---|---|---|
| Git | 로컬 git CLI, GitHub/GitLab API | diff 기반 영향 분석, 변경 이력 |
| 인증 | OIDC/SSO, LDAP/AD | 로그인과 조직 연동 |
| 운영 | PostgreSQL 또는 동급 RDBMS | 사용자, 프로젝트, 작업, 감사, 설정 저장 |
| 모니터링 | Prometheus, 로그 수집기 | 메트릭, structured logging |
| 배포 | Docker / compose / 폐쇄망 번들 | 설치 패키지 |
| IDE | VSCode Extension Host | editor 통합 |

### 2.3 Phase X-2에서 추가해야 할 내부 패키지

현재 구조를 유지한 채 기능만 누적하면 중복과 계약 drift가 커진다. 따라서 아래 2개 패키지를 선행 도입하는 것이 적절하다.

1. `packages/app`
   - 역할: CLI/Server 공용 application service 계층
   - 책임: 설정 로딩, 파일 discovery, 분석 실행, 증분 재분석, 규칙 평가, change impact use case
2. `packages/contracts`
   - 역할: Server/Web UI/VSCode 간 API DTO 계약 공유
   - 책임: graph DTO, matrix DTO, violation DTO, impact DTO, auth/job/admin DTO, WS event 타입

이후 구조는 아래와 같이 정리한다.

```text
@vda/core        : 파서/그래프/분석 순수 엔진
@vda/app         : 프로젝트 분석 use case, 규칙/impact/application facade
@vda/contracts   : API/WS/DTO 계약
@vda/server      : 인증/권한/API/job/운영 껍데기
@vda/web-ui      : contracts 기반 프런트엔드
@vda/cli         : app 기반 CLI
@vda/vscode-ext  : contracts/server API 기반 IDE 통합
```

---

## 3. Phase X-2 설계 원칙

1. `@vda/core`는 pure analysis engine으로 유지한다.
2. CLI와 Server의 중복 orchestration은 `@vda/app`으로 끌어올린다.
3. UI는 raw graph 하나에 과도하게 의존하지 않고, feature별 query DTO를 소비한다.
4. 제품화 기능은 Server에 직접 뒤섞지 말고 `auth`, `projects`, `jobs`, `audit`, `ops` 모듈로 분리한다.
5. 모든 신규 기능은 `core unit test + server contract test + UI/E2E test`를 함께 추가한다.
6. 문서와 구현 상태를 분리한다. `phase-x2-plan.md`는 roadmap, 본 문서는 execution plan으로 유지한다.

---

## 4. 상세 구현 계획

## 4.1 Phase X-2 Foundation (선행 2주)

이 단계는 원본 계획의 기능 추가 전에 반드시 수행해야 하는 기반 정리 단계다.

### F0-1. 공용 분석 orchestration 계층 도입

**신규 패키지**
- `packages/app/src/config/ProjectConfigLoader.ts`
- `packages/app/src/analyze/ProjectAnalyzer.ts`
- `packages/app/src/analyze/IncrementalAnalyzer.ts`
- `packages/app/src/analyze/FileDiscovery.ts`

**작업 내용**
- `packages/cli/src/config.ts`와 `packages/server/src/engine.ts`에 중복된
  - 설정 로딩
  - 파일 탐색
  - cache 적용
  - graph 조립
  - serviceId tagging
  - cross-boundary resolve
  로직을 `@vda/app`으로 이동한다.
- CLI는 `ProjectAnalyzer.analyze()`를 호출하도록 변경한다.
- Server는 `AnalysisEngine` 내부에서 `ProjectAnalyzer`와 `IncrementalAnalyzer`를 사용하도록 단순화한다.

**수용 기준**
- CLI analyze/export와 Server initial analysis 결과가 동일하다.
- 설정/파일 탐색 관련 로직이 CLI/Server에 중복되지 않는다.

### F0-2. 공유 DTO 계약 패키지 도입

**신규 패키지**
- `packages/contracts/src/graph.ts`
- `packages/contracts/src/api.ts`
- `packages/contracts/src/ws.ts`

**작업 내용**
- `packages/web-ui/src/types/graph.ts`의 graph DTO 부분을 `@vda/contracts`로 이동한다.
- Server route 응답 타입과 WebSocket event 타입을 contracts로 통합한다.
- UI는 local graph DTO 대신 contracts 타입을 import한다.

**수용 기준**
- graph DTO가 server/web-ui에서 동일 타입을 사용한다.
- `/api/graph`, `/api/search`, `/api/stats`, WS payload가 명시적 타입을 가진다.

### F0-3. X-2 진행 차단 이슈 정리

Phase X-2 기능이 현재 구조 위에서 다시 흔들리지 않게, 아래 이슈를 먼저 닫는다.

1. `route-renders` lazy alias 해소 보강
2. `NodeDetail` chain summary 응답 계약 수정
3. SVG export용 Cytoscape plugin 도입 또는 기능 제거
4. cold/warm/incremental 결과 parity 회귀 테스트 강화
5. `include[]`/`exclude[]`/`services[]` 실동작 검증 추가

**수용 기준**
- `test-project-ecommerce` 기준 route-renders resolved count가 0이 아니다.
- chain summary UI가 실제 경로 데이터를 렌더링한다.
- export 기능이 런타임 예외 없이 동작한다.

### F0-4. 테스트 체계 확장

**신규 구성**
- 루트 `e2e/` 또는 `packages/e2e/`
- Playwright 기반 smoke test

**작업 내용**
- CLI analyze/export/serve smoke
- Server API contract
- Web UI graph render/search/pathfinder/change-impact smoke
- fixture 2종 유지
  - 소형 synthetic fixture
  - `test-project-ecommerce`

---

## 4.2 Phase X-2a (3~4주)

범위:
- `S-1. 아키텍처 규칙 엔진`
- `A-4. Mermaid/PlantUML 내보내기`

### S-1. 아키텍처 규칙 엔진

#### Core 작업

**신규 디렉토리**
- `packages/core/src/rules/`

**주요 파일**
- `RuleTypes.ts`
- `RuleParser.ts`
- `RuleMatcher.ts`
- `RuleEvaluator.ts`
- `RuleViolation.ts`
- `RuleFormatter.ts`

**설계**
- 규칙 selector는 아래 축을 지원한다.
  - `kind`
  - `path glob`
  - `serviceId`
  - `label regex`
  - `tag`
- 1차 지원 규칙:
  - `deny: "circular"`
  - `deny: "direct"`
  - `allow: "only"`
  - `max-depth`
  - `max-dependents`
- `DependencyGraph` 직접 순회 대신 `graph/query.ts`에 selector/query helper를 추가한다.

#### App 작업

- `RuleAnalysisUseCase.ts`
- `RuleConfigLoader.ts`
- 분석 후 규칙 평가를 하나의 use case로 결합

#### CLI 작업

- `vda lint`
- 출력 형식:
  - table
  - json
  - sarif
- exit code:
  - error violation 존재 시 non-zero

#### Server 작업

- `GET /api/analysis/rule-violations`
- `POST /api/analysis/rule-violations/recompute`
- 프로젝트별 rules config 조회 endpoint

#### Web UI 작업

- `RuleViolationPanel.vue`
- graph overlay에 violation highlight 추가
- violation 클릭 시 관련 node/edge focus

#### 테스트

- core: 규칙별 evaluator 단위 테스트
- server: REST contract test
- cli: exit code test
- ui/e2e: violation panel interaction

### A-4. Mermaid/PlantUML 내보내기

#### Core 작업

- `packages/core/src/graph/mermaidExporter.ts`
- `packages/core/src/graph/plantumlExporter.ts`
- subgraph export용 selector helper 추가

#### CLI 작업

- `vda export --format mermaid`
- `vda export --format plantuml`

#### Server/Web UI 작업

- server: 선택 node set 전달용 export endpoint
- UI: `Copy as Mermaid`, `Copy as PlantUML` 버튼

#### 수용 기준

- 선택한 노드 집합이 문서화 가능한 코드 포맷으로 일관되게 출력된다.
- CLI/Server/UI가 동일 exporter를 사용한다.

---

## 4.3 Phase X-2b (4~6주)

범위:
- `S-2. Git Diff 기반 변경 영향 분석`
- `S-3. 의존성 매트릭스 뷰`
- `A-1. Bottom-Up 영향도 뷰`

### S-2. Git Diff 기반 변경 영향 분석

#### Core 작업

**신규 디렉토리**
- `packages/core/src/git/`

**주요 파일**
- `GitDiffParser.ts`
- `GitRepository.ts`
- `ChangeImpactAnalyzer.ts`

**설계**
- 입력:
  - `diff range`
  - `branch`
  - `explicit file list`
- 출력:
  - changed files
  - changed nodes
  - direct impact
  - transitive impact
  - affected endpoints
  - affected db tables
  - risk score

#### App 작업

- `ChangeImpactUseCase.ts`
- git diff 결과와 graph 영향 분석을 결합

#### CLI 작업

- `vda impact --diff`
- `vda impact --branch`
- `vda impact --files`

#### Server 작업

- `POST /api/analysis/change-impact`
- `POST /api/analysis/change-impact/git`

#### Web UI 작업

- `ChangeImpactPanel.vue`
- graph mode:
  - changed: red
  - direct impact: orange
  - transitive impact: yellow

### S-3. 의존성 매트릭스 뷰

#### Core/App 작업

- `computeDependencyMatrix()`를 core 또는 app query layer에 추가
- matrix 기준 단위:
  - directory depth
  - service
  - logical layer

#### Server 작업

- `GET /api/graph/matrix?groupBy=directory&depth=2`

#### Web UI 작업

- `packages/web-ui/src/components/graph/MatrixView.vue`
- `App.vue`에 `Graph / Tree / Matrix` 3탭 추가
- row/column click 시 drill-down panel 제공

### A-1. Bottom-Up 영향도 뷰

#### Core/App 작업

- reverse traversal 전용 query 추가
- 시작점은 `db-table` 또는 `mybatis-statement`
- chain compression helper 추가

#### Server 작업

- `GET /api/graph/bottom-up?startNodeId=...`
- 영향받는 화면, API, 서비스 요약 반환

#### Web UI 작업

- `BottomUpView.vue`
- DB 테이블 목록에서 시작하는 전용 화면

#### 수용 기준

- DB 테이블 1개 선택 시 프론트 화면까지 역추적 체인이 전용 UI에서 확인된다.
- Matrix와 Change Impact가 같은 contracts/query layer를 공유한다.

---

## 4.4 Phase X-2c (4~6주)

범위:
- 인증/권한
- 작업 관리
- Docker/관제/보안 제품화 기반

이 단계부터는 Server에 영속 계층이 필요하다.

### X2c-1. 영속 계층 도입

**신규 모듈**
- `packages/server/src/platform/db/`
- `packages/server/src/platform/repositories/`

**저장 대상**
- users
- roles
- projects
- analysis_jobs
- analysis_runs
- audit_logs
- saved_views / presets

### X2c-2. 인증/권한

**신규 모듈**
- `src/auth/oidc/`
- `src/auth/rbac/`
- `src/auth/jwt/`

**작업 내용**
- OIDC/SSO 우선, LDAP는 adapter로 추가
- Fastify auth middleware
- role:
  - admin
  - manager
  - viewer

### X2c-3. 분석 작업 관리

**신규 모듈**
- `src/jobs/AnalysisJobQueue.ts`
- `src/jobs/AnalysisScheduler.ts`
- `src/jobs/AnalysisRunRepository.ts`

**작업 내용**
- 분석 시작/중지/재실행/예약
- 실행 이력 저장
- 진행률 스트림을 job 단위로 분리

### X2c-4. 운영/보안 기본기

**작업 내용**
- `/health`, `/ready`
- Prometheus metrics endpoint
- structured logging + request ID
- secrets via env/vault adapter
- audit logging
- Dockerfile + compose

### Web UI 작업

- 로그인 화면
- 관리자/프로젝트 선택 레이아웃
- 작업 이력 패널
- 권한 기반 메뉴 노출 제어

---

## 4.5 Phase X-2d (4~6주)

범위:
- `A-2. 타입 수준 DTO 비교`
- `A-3. JPA/Hibernate 지원`
- 관리자 콘솔

### A-2. 타입 수준 DTO 비교

#### Core 작업

- `packages/core/src/analyzers/DtoTypeChecker.ts`

**선행 메타데이터 보강**
- Java/Kotlin parser에서 field type, generic type, nullable 정보 확장
- TS parser에서 interface/type alias field type 확장
- 필요 시 Vue script type extraction 추가

**비교 규칙**
- Java primitive/wrapper ↔ TS primitive
- collection ↔ array
- `LocalDateTime`/`Instant` ↔ string/date policy
- nullable mismatch
- optional field mismatch

#### Server/UI 작업

- DTO mismatch panel을 name-only 비교와 type-aware 비교로 분리
- severity 계산

### A-3. JPA/Hibernate 지원

#### Core 작업

**신규 파일**
- `packages/core/src/parsers/java/JpaEntityParser.ts`
- `packages/core/src/linkers/JpaLinker.ts`

**그래프 확장**
- 신규 node kind 제안:
  - `jpa-entity`
  - `jpa-repository`
- 또는 최소 1차에서는 metadata 기반 확장 후, 2차에 node kind 분리

**파싱 범위**
- `@Entity`
- `@Table`
- `@Id`
- `@OneToMany`, `@ManyToOne`
- `@Query`
- repository method name inference

### 관리자 콘솔

#### Server/UI 작업

- 프로젝트 등록
- 저장소 승인
- 사용자/권한 관리
- 분석 정책 관리

---

## 4.6 Phase X-2e (6~8주)

범위:
- `S-4. VSCode Extension`
- 금융권 적합성 기능
- 납품 패키지

### S-4. VSCode Extension

**신규 패키지**
- `packages/vscode-ext/`

**기능**
- 현재 파일 dependency tree
- CodeLens
- "Show in VDA Graph"
- 서버 상태 표시

**의존성**
- `@vda/contracts`
- server auth/session
- graph query endpoints

### 금융권 적합성 기능

#### Server/UI 작업

- 조직/프로젝트 모델
- 저장소 등록 승인
- 변경 영향 리포트 PDF/HTML
- GitHub/GitLab integration
- 민감정보 마스킹

### 납품 패키지

#### 산출물

- 설치 가이드
- 운영 가이드
- 관리자 가이드
- 사용자 가이드
- 장애 대응 문서
- 보안 점검 결과
- 성능 기준서

---

## 5. 기능별 선후행 의존성

| 기능 | 선행 조건 |
|---|---|
| 규칙 엔진 | `@vda/app`, contracts, graph query helper |
| Mermaid/PlantUML export | shared graph selection model |
| Change Impact | git module, app use case, stable contracts |
| Matrix view | server-side aggregated query DTO |
| Bottom-Up view | reverse traversal query, DB chain completeness |
| 인증/RBAC | persistence, project model, request context |
| 작업 관리 | persistence, job queue, WS event versioning |
| DTO type check | parser metadata enrichment |
| JPA support | graph schema 확장 |
| VSCode extension | auth/session, stable API contracts |

---

## 6. 테스트 및 품질 게이트

모든 Phase X-2 기능은 아래 4단계 검증을 통과해야 한다.

1. `core unit test`
   - parser/linker/analyzer 정확도
2. `server contract test`
   - REST/WS 응답 구조와 권한 정책
3. `web-ui component/e2e test`
   - 패널, 뷰, 라우팅, 모드 전환
4. `fixture regression`
   - `test-project-ecommerce` 기준 핵심 수치 회귀 감시

Phase gate는 아래를 만족해야 통과로 본다.

- cold/warm/incremental parity 유지
- 신규 API는 contracts 타입과 contract test를 함께 추가
- 문서 상태는 `implemented`, `partial`, `planned` 중 하나로 명시
- 성능 회귀가 기준치 이내

---

## 7. 최종 권장 실행 순서

실행 순서는 원본 `phase-x2-plan.md`를 유지하되, 실제 구현은 아래 순서로 진행하는 것이 안전하다.

1. `Foundation`
   - `@vda/app`
   - `@vda/contracts`
   - 남은 X-1 안정화
   - E2E harness
2. `X-2a`
   - 규칙 엔진
   - Mermaid/PlantUML export
3. `X-2b`
   - Git diff impact
   - Matrix view
   - Bottom-Up view
4. `X-2c`
   - persistence
   - auth/rbac
   - job management
   - ops/security baseline
5. `X-2d`
   - DTO type checker
   - JPA support
   - admin console
6. `X-2e`
   - VSCode extension
   - 금융권 적합성
   - 납품 패키지

이 순서를 따르는 이유는 간단하다.

- `Foundation` 없이 시작하면 CLI/Server/UI 계약 drift가 다시 발생한다.
- `Rules`와 `Impact`는 Phase X-2의 핵심 가치이며, 조직형 제품화보다 먼저 개발자 효용을 만들어야 한다.
- 인증/권한/감사는 persistence 없이는 안정적으로 붙일 수 없다.
- VSCode Extension은 API contracts와 auth/session이 안정화된 뒤에 붙이는 편이 리스크가 낮다.

