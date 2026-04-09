# Phase X: 100점 달성 실행 계획

> 근거: `docs/score-gap-and-100-requirements.md`, `docs/executive-si-effort-assessment.md`
> 분류 기준: **분석 정확도 + 분석 처리 성능 = X-1**, **나머지 (제품화/운영/보안/문서/납품) = X-2**

---

## Phase X-1: 분석 정확도 + 분석 처리 성능 (기술 구현 67→95+)

> 목표: 분석 결과의 무결성과 처리 성능을 제품 수준으로 끌어올린다.
> Phase 7에서 대부분 해결했으나, 재감사 기준으로 아직 미충족 항목을 최종 닫는다.

### X1-01. R-TECH-001: 캐시 무결성 최종 검증

**현재 상태**: Phase 7 T0-01에서 db-table filePath 수정으로 기본 해결됨.
**남은 작업**:
- cold/warm/incremental 3가지 모드 결과 diff가 정확히 0인지 자동 검증 테스트
- virtual node (vue-event, spring-event)도 캐시 라운드트립 검증
- 기존 `.vda-cache` 마이그레이션 (버전 불일치 시 자동 무효화는 이미 구현)

**수용 기준**: `npm test`에서 cold==warm==incremental node/edge count 검증 통과
**영향 파일**: `packages/core/src/__tests__/performance.test.ts`
**공수**: S

---

### X1-02. R-TECH-002: Node ID 안정성 최종 검증

**현재 상태**: Phase 7 T0-02에서 query param 방식으로 전환 완료.
**남은 작업**:
- slash, colon, 한글, 특수문자 포함 node ID에 대한 contract test 추가
- 프론트엔드에서 node detail API 호출 시 query param 사용 확인
- `/api/graph/node/impact` 도 동일하게 query param으로 전환 완료 확인

**수용 기준**: 모든 node kind에 대해 detail/impact API 200 응답 contract test
**영향 파일**: `packages/server/src/__tests__/api.test.ts`
**공수**: S

---

### X1-03. R-TECH-003: Stats 분리 최종 검증

**현재 상태**: Phase 7 T0-03에서 `nodesByKind`/`edgesByKind` 분리 완료.
**남은 작업**:
- `/api/stats` 응답에서 nodesByKind/edgesByKind 구조 확인 테스트
- CLI 출력 형식 고정 테스트

**수용 기준**: CLI "Node Types"에 edge kind 미포함 assertion
**영향 파일**: `packages/server/src/__tests__/api.test.ts`
**공수**: S

---

### X1-04. R-TECH-004: services[]/include[]/exclude[] 반영 최종 검증

**현재 상태**: Phase 7 T1-05에서 services[] CLI+서버 연결 완료.
**남은 작업**:
- `include[]`/`exclude[]` 패턴이 discover 단계에서 실제 적용되는지 검증
- 현재 CLI/서버 모두 hard-coded 패턴 사용 → config의 include/exclude를 glob에 전달
- MSA fixture (test-project-ecommerce)에서 service별 분석 검증

**수정 범위**:
- `packages/cli/src/config.ts` — `config.include`가 있으면 패턴으로 사용
- `packages/server/src/engine.ts` — 동일
- 테스트: MSA fixture에서 serviceId 태깅 검증

**수용 기준**: test-project-ecommerce에서 3개 서비스 각각의 노드에 serviceId 태깅 확인
**공수**: M

---

### X1-05. R-TECH-005~008: 분석 범위 완결성 (이미 Phase 7에서 대부분 완료)

| 요구사항 | Phase 7 상태 | 남은 작업 |
|----------|-------------|----------|
| R-TECH-005 route-renders | ✅ T1-02 완료 | 라우터 파일 자동 감지 보강 (router/index.ts) |
| R-TECH-006 event virtual edges | ✅ T1-03 완료 | kebab→camel 엣지 케이스 테스트 |
| R-TECH-007 @Mapper interface | ✅ T1-01 완료 | interface 파싱 E2E 검증 |
| R-TECH-008 DTO flow | ✅ T2-01,02 완료 | DTO consistency API E2E 테스트 |

**남은 작업**: E2E fixture 기반 regression test로 모든 항목 자동 검증
**수용 기준**: `e2e-fixture.test.ts`의 37 assertions 전부 통과 (이미 통과)
**공수**: S

---

### X1-06. R-TECH-009: worker_threads 병렬 파싱 안정성

**현재 상태**: Phase 7 T1-04에서 구현 완료.
**남은 작업**:
- worker crash 시 전체 분석 프로세스가 정상 복구되는지 테스트
- 2000+ 파일에서 성능 벤치마크 (test-project 500파일 + ecommerce 140파일 = 640파일)
- worker timeout (30s) 검증

**수용 기준**: worker 실패 시 main-thread fallback 정상 동작 + 성능 기준 충족
**영향 파일**: `packages/core/src/engine/__tests__/ParallelParser.test.ts`
**공수**: S

---

### X1-07. R-TECH-010: 대형 그래프 UI 성능

**남은 작업**:
- Vite build의 `manualChunks` 설정으로 번들 분리 (cytoscape, d3를 별도 chunk)
- 클러스터 UX: 확장 시 incremental layout (전체 relayout 대신)
- web-ui 번들 740KB → 목표 500KB 이하

**수정 범위**:
- `packages/web-ui/vite.config.ts` — rollupOptions.output.manualChunks
- `packages/web-ui/src/components/graph/ForceGraphView.vue` — incremental layout

**수용 기준**: 빌드 경고 제거, main chunk 500KB 이하
**공수**: M

---

### X1-08. R-QA-001~002: 회귀 테스트 강화

**현재 상태**: Phase 7에서 cache hit 검증, E2E 37 assertions 구현 완료.
**남은 작업**:
- cold/warm diff=0 assertion 추가 (node count + edge count + critical kind counts)
- API contract test: 모든 node kind에 대해 detail API 200 테스트
- incremental (단일 파일 변경) 후 그래프 무결성 테스트

**수용 기준**: CI에서 회귀 자동 차단
**공수**: M

---

### X1-09. Controller→Service→Repository→Mapper→XML→Table 체인 정확도

**현재 상태**: Phase 7 마지막 커밋에서 resolveSpringInjects + resolveRepositoryToMapper 구현.
**남은 작업**:
- 체인 정확도 E2E 테스트: UserController부터 DB table까지 전체 경로 검증
- unresolved spring-injects (프레임워크 빈)를 silent 처리 (경고 아닌 정상)
- ecommerce fixture에서 3개 서비스 각각의 체인 검증

**수용 기준**: test-project + ecommerce 모두에서 Controller→Table 체인 자동 검증
**공수**: M

---

## Phase X-1 실행 순서

```
X1-01 (캐시 무결성) ─┐
X1-02 (Node ID)     ─┤── 병렬, 각 S
X1-03 (Stats)       ─┤
X1-06 (Workers)     ─┘
        ↓
X1-04 (MSA include/exclude) ── M
X1-05 (분석 범위 검증) ── S
        ↓
X1-07 (UI 번들 성능) ── M
X1-08 (회귀 테스트) ── M
X1-09 (체인 정확도) ── M
```

**예상 공수**: 4S + 4M = ~2주

---

## Phase X-2: 제품화/운영/보안/문서/납품 (46→95+)

> 목표: PoC→제품 전환. 인증/권한/감사/운영/배포/문서 체계 구축.
> 이 Phase는 코드 기능보다 **아키텍처/인프라/프로세스** 중심.

### X2-01. R-GOV-001~002: 문서 거버넌스

| 작업 | 내용 | 공수 |
|------|------|------|
| 문서 현재/계획 분리 | phase summary에 status: implemented/partial/planned 태깅 | S |
| 요구사항 추적 매트릭스 | R-ID → 테스트 ID → 문서 링크 매핑 테이블 | M |

---

### X2-02. R-PROD-001~002: 인증/권한

| 작업 | 내용 | 공수 |
|------|------|------|
| SSO/LDAP 연동 | Fastify에 passport 또는 @fastify/auth + OIDC provider 연동 | L |
| RBAC 구현 | 역할(admin/manager/viewer) + 프로젝트별 권한 + API middleware | L |
| 세션/토큰 관리 | JWT 발급/검증, refresh token, 세션 만료 | M |

---

### X2-03. R-PROD-003~004: 운영 기능

| 작업 | 내용 | 공수 |
|------|------|------|
| 분석 작업 관리 | 작업 큐, 시작/중지/재실행/예약, 이력 DB | L |
| 관리자 콘솔 | 프로젝트 등록/비활성화, 사용자/권한 관리 UI | L |
| 시스템 상태 페이지 | 캐시 상태, 분석 큐, 최근 작업 이력 | M |

---

### X2-04. R-PROD-005: 배포/설치

| 작업 | 내용 | 공수 |
|------|------|------|
| Docker 패키징 | Dockerfile + docker-compose (server+web-ui) | M |
| 폐쇄망 설치 패키지 | npm pack + offline deps + 설치 스크립트 | M |
| 환경 분리 | dev/stg/prod 설정 분리, 환경변수 기반 | S |

---

### X2-05. R-PROD-006~007: 관제/복구

| 작업 | 내용 | 공수 |
|------|------|------|
| Health check API | GET /health, GET /ready | S |
| Metrics endpoint | Prometheus 형식 메트릭 (분석 시간, 캐시 히트율, 노드 수) | M |
| Structured logging | JSON 로그, 요청 추적 ID | M |
| 백업/복구 문서 | 설정/캐시/감사로그 백업 절차 + 복구 runbook | M |

---

### X2-06. R-PROD-008~010: 보안

| 작업 | 내용 | 공수 |
|------|------|------|
| 감사 로그 | 로그인/분석실행/설정변경/결과조회 기록 | M |
| 비밀값 관리 | 환경변수/Vault 연동, 평문 저장 금지 | M |
| SBOM 생성 | npm SBOM + 취약점 스캔 자동화 | S |

---

### X2-07. R-DOC-001~002: 문서 체계

| 작업 | 내용 | 공수 |
|------|------|------|
| 제품 소개서 | 1-page 소개, 기능 개요, 스크린샷 | S |
| 사용자 가이드 | 설치→분석→시각화 step-by-step | M |
| 관리자 가이드 | 프로젝트 등록, 권한 설정, 정책 관리 | M |
| API Reference | OpenAPI 스펙 + 예제 | M |
| .vdarc.json 스키마 문서 | JSON Schema + MSA 예시 | S |

---

### X2-08. R-FIN-001~006: 금융권 적합성

| 작업 | 내용 | 공수 |
|------|------|------|
| 프로젝트/조직 모델 | 조직→시스템→프로젝트→저장소 계층 구조 | L |
| 저장소 승인 프로세스 | 등록 요청→관리자 승인→분석 허용 | M |
| 변경영향 리포트 | PDF/HTML export, 영향 범위 요약 | L |
| Git 연계 | GitLab/GitHub API 연동, branch/commit 기준 분석 | L |
| 민감정보 마스킹 | 경로/코드 내 시크릿 탐지 + 마스킹 옵션 | M |

---

### X2-09. R-DEL-001~005: 납품 패키지

| 작업 | 내용 | 공수 |
|------|------|------|
| 납품 산출물 세트 | 설치/운영/장애/관리자/사용자/API/보안 가이드 | L |
| 검수 기준서 | 기능/성능/보안/운영 검수 항목 문서 | M |
| 릴리즈 게이트 | CI/CD 파이프라인 (test+build+lint+scan→release) | M |
| 성능 기준서 | cold/warm 시간, 메모리, 동시사용자 기준 | S |
| 보안 점검 결과 | SBOM, 정적분석, 시크릿 탐지 리포트 | M |

---

## Phase X-2 실행 순서

```
X2-01 (문서 거버넌스) ─── 즉시
X2-04 (Docker/설치) ──── 즉시 (병렬)
        ↓
X2-02 (인증/권한) ────── 핵심 기반
X2-06 (보안) ─────────── 인증과 병렬
        ↓
X2-03 (운영 기능) ────── 인증 위에 구축
X2-05 (관제/복구) ────── 운영과 병렬
        ↓
X2-07 (문서 체계) ────── 기능 안정 후
X2-08 (금융권 적합성) ── 핵심 기능
        ↓
X2-09 (납품 패키지) ──── 마지막
```

**예상 공수**: X2 전체 ~20 MM (8~12 MM 추가 보완, 임원 보고서 기준과 일치)

---

## 총 요약

| Phase | 범위 | 핵심 목표 | 예상 공수 |
|-------|------|----------|----------|
| **X-1** | 분석 정확도 + 성능 | 기술 67→95+, QA 72→90+ | ~2주 |
| **X-2** | 제품화/운영/보안/문서/납품 | 제품화 46→85+, 금융 61→90+, 납품 24→80+ | ~6-8개월 |

**X-1 완료 후 즉시 X-2 착수 가능.** X-1은 현재 코드 위에서 테스트/검증 강화 중심이므로 빠르게 닫을 수 있음.
