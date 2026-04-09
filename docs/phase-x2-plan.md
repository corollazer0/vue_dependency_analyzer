# Phase X-2: 세계 최고 수준 의존성 분석 도구 + 제품화

> 근거: `docs/review-target/world-class-gap-analysis.md`, `docs/score-gap-and-100-requirements.md`
> 범위: 기능 차별화 (Tier S/A/B) + 제품화/운영/보안 (R-PROD/R-FIN/R-DEL)

---

## Part 1: 세계 최고 수준 기능 (개발자 PainPoint 해결)

### Tier S: 핵심 차별화 — 개발자가 매일 쓰게 만드는 기능

#### S-1. 아키텍처 규칙 엔진

**목표**: 사용자 정의 규칙으로 의존성 위반을 자동 감지, CI/CD 통합

**구현 범위**:
- `packages/core/src/rules/` — 규칙 엔진 모듈
  - `RuleParser.ts` — `.vdarc.json`의 rules 섹션 파싱
  - `RuleEvaluator.ts` — 그래프 위에서 규칙 평가
  - `RuleViolation.ts` — 위반 결과 구조체
- 규칙 타입:
  - `deny: "circular"` — 특정 종류 간 순환 금지
  - `deny: "direct"` — 특정 레이어 간 직접 의존 금지
  - `allow: "only"` — 허용된 의존만 인정
  - `max-depth: N` — 의존 체인 깊이 제한
  - `max-dependents: N` — 의존자 수 제한 (허브 방지)
- CLI: `vda lint` 명령 → 위반 리포트 (exit code로 CI 통합)
- Server API: `GET /api/analysis/rule-violations`
- Web UI: 위반 노드/엣지 빨간 하이라이트 + 위반 패널

**공수**: L (4-6주)

---

#### S-2. Git Diff 기반 변경 영향 분석

**목표**: 특정 커밋/PR의 변경 파일 기준 영향 범위 자동 계산

**구현 범위**:
- `packages/core/src/git/` — Git 연동 모듈
  - `GitDiffParser.ts` — `git diff` 출력 파싱, 변경 파일 목록 추출
  - `ChangeImpactAnalyzer.ts` — 변경 파일 → 그래프에서 영향 범위 계산
- CLI: `vda impact --diff HEAD~1..HEAD` 또는 `vda impact --branch feature/xxx`
- Server API: `POST /api/analysis/change-impact { files: string[] }`
- Web UI: "Change Impact" 모드 — 변경 파일 빨강, 직접 영향 주황, 전이 영향 노랑
- 출력: 변경 파일 수, 직접/전이 의존자 수, 영향받는 API/DB 테이블 요약

**공수**: L (4-6주)

---

#### S-3. 의존성 매트릭스 뷰

**목표**: 모듈/레이어 간 의존성을 히트맵 매트릭스로 표시

**구현 범위**:
- `packages/web-ui/src/components/graph/MatrixView.vue` — 신규 뷰
- 행/열: 디렉토리 또는 모듈 (클러스터 단위)
- 셀: 의존 수 (색상 강도)
- 대각선 아래/위로 양방향 의존성 식별
- 행/열 클릭 → 해당 모듈의 의존성 상세
- App.vue에 "Graph / Tree / Matrix" 3탭

**공수**: M (2-3주)

---

#### S-4. IDE 통합 (VSCode Extension)

**목표**: VSCode에서 파일 열 때 의존성 정보 자동 표시

**구현 범위**:
- `packages/vscode-ext/` — VSCode Extension 패키지
- 기능:
  - 사이드바: 현재 파일의 의존성 트리
  - CodeLens: 함수/컴포넌트 위에 "N dependents | M dependencies"
  - 우클릭: "Show in VDA Graph" → 웹 UI 열기
  - 상태바: VDA 서버 연결 상태
- VDA 서버와 HTTP API로 통신

**공수**: XL (6-8주)

---

### Tier A: 분석 깊이 강화

#### A-1. Bottom-Up 영향도 뷰 (DB 테이블 기준)

**목표**: DB 테이블 선택 → 프론트엔드까지 전체 역추적 전용 뷰

**구현 범위**:
- Tree 뷰의 "← Dependents" 방향이 이미 역추적 기능 — 하지만 전용 UI 필요
- `packages/web-ui/src/components/graph/BottomUpView.vue`
- DB 테이블 목록에서 시작 → Statement → Mapper → Repository → Service → Controller → Endpoint → API call → Vue Component
- "이 테이블이 변경되면 영향받는 화면" 요약

**공수**: M (2-3주)

---

#### A-2. 타입 수준 DTO 비교

**목표**: Java 타입 ↔ TypeScript 타입 호환성 자동 검사

**구현 범위**:
- `packages/core/src/analyzers/DtoTypeChecker.ts`
- Java→TS 타입 매핑 테이블: `Long→number`, `String→string`, `BigDecimal→number`, `LocalDateTime→string`, `List<X>→X[]`
- 매핑 불일치 시 경고

**공수**: M (2-3주)

---

#### A-3. JPA/Hibernate 지원

**목표**: MyBatis 외에 JPA 기반 프로젝트도 분석

**구현 범위**:
- `packages/core/src/parsers/java/JpaEntityParser.ts`
- `@Entity`, `@Table(name="xxx")`, `@OneToMany`, `@ManyToOne`, `@Query` 파싱
- Entity → DB 테이블 매핑
- Repository interface의 메서드 이름 기반 쿼리 추론 (findByXxx → SELECT from xxx)

**공수**: L (4-6주)

---

#### A-4. Mermaid/PlantUML 다이어그램 내보내기

**목표**: 선택 영역을 Mermaid/PlantUML 코드로 내보내기

**구현 범위**:
- `packages/core/src/graph/mermaidExporter.ts`
- `packages/core/src/graph/plantumlExporter.ts`
- CLI: `vda export --format mermaid`
- Web UI: "Copy as Mermaid" 버튼

**공수**: S (1주)

---

## Part 2: 제품화/운영/보안 (기존 R-PROD/R-FIN/R-DEL)

### 인증/권한 (R-PROD-001~002)

| 항목 | 내용 | 공수 |
|------|------|------|
| SSO/LDAP 연동 | Fastify + passport/OIDC | L |
| RBAC | admin/manager/viewer 역할 + API middleware | L |
| JWT 세션 | 토큰 발급/검증/갱신 | M |

### 운영 기능 (R-PROD-003~004)

| 항목 | 내용 | 공수 |
|------|------|------|
| 분석 작업 관리 | 작업 큐, 시작/중지/재실행/예약, 이력 DB | L |
| 관리자 콘솔 | 프로젝트 등록, 사용자/권한 관리 UI | L |

### 배포/설치 (R-PROD-005)

| 항목 | 내용 | 공수 |
|------|------|------|
| Docker 패키징 | Dockerfile + docker-compose | M |
| 폐쇄망 설치 | npm pack + offline deps + 설치 스크립트 | M |

### 관제/복구 (R-PROD-006~007)

| 항목 | 내용 | 공수 |
|------|------|------|
| Health check | GET /health, GET /ready | S |
| Prometheus metrics | 분석 시간, 캐시 히트율, 노드 수 | M |
| Structured logging | JSON 로그 + 요청 추적 ID | M |
| 백업/복구 문서 | 설정/캐시/감사로그 백업 절차 | M |

### 보안 (R-PROD-008~010)

| 항목 | 내용 | 공수 |
|------|------|------|
| 감사 로그 | 로그인/분석/설정변경/결과조회 기록 | M |
| 비밀값 관리 | 환경변수/Vault, 평문 저장 금지 | M |
| SBOM | npm SBOM + 취약점 스캔 자동화 | S |

### 금융권 적합성 (R-FIN-001~006)

| 항목 | 내용 | 공수 |
|------|------|------|
| 조직/프로젝트 모델 | 계층 구조 + 접근 제한 | L |
| 저장소 승인 프로세스 | 등록 요청→관리자 승인 | M |
| 변경영향 리포트 | PDF/HTML export | L |
| Git 연계 | GitLab/GitHub API, branch/commit 기준 | L |
| 민감정보 마스킹 | 시크릿 탐지 + 마스킹 옵션 | M |

### 납품 패키지 (R-DEL-001~005)

| 항목 | 내용 | 공수 |
|------|------|------|
| 납품 산출물 세트 | 7종 문서 패키지 | L |
| 검수 기준서 | 기능/성능/보안/운영 검수 항목 | M |
| 릴리즈 게이트 | CI/CD 파이프라인 | M |
| 성능 기준서 | cold/warm/메모리/동시사용자 | S |
| 보안 점검 | SBOM, 정적분석, 시크릿 탐지 | M |

---

## 실행 순서 (권장)

```
Phase X-2a (3-4주): 핵심 차별화 시작
  S-1 아키텍처 규칙 엔진 (CI 통합 핵심)
  A-4 Mermaid/PlantUML 내보내기 (빠른 가치)

Phase X-2b (4-6주): Git + 매트릭스
  S-2 Git Diff 영향 분석
  S-3 의존성 매트릭스 뷰
  A-1 Bottom-Up 영향도

Phase X-2c (4-6주): 제품화 기반
  인증/권한 (SSO, RBAC)
  Docker 패키징
  감사 로그 + 비밀값 관리

Phase X-2d (4-6주): 분석 확장
  A-2 타입 DTO 비교
  A-3 JPA 지원
  관리자 콘솔

Phase X-2e (6-8주): IDE + 납품
  S-4 VSCode Extension
  금융권 적합성 (조직 모델, 승인, 리포트, Git)
  납품 패키지 완성
```

---

## 성공 기준

Phase X-2 완료 시:
1. `vda lint` → 아키텍처 규칙 위반 자동 감지 (CI exit code)
2. `vda impact --diff` → 변경 영향 범위 자동 계산
3. 매트릭스 뷰에서 레이어 분리도 한눈에 파악
4. Mermaid/PlantUML 다이어그램 내보내기
5. SSO 로그인 + RBAC 권한 제어
6. Docker 원클릭 배포
7. 감사 로그 + 비밀값 암호화
8. 납품 산출물 7종 문서 패키지
9. (장기) VSCode Extension으로 IDE 통합
