# Phase X-2c: 제품화 기반 — 구현 계획서

> 작성일: 2026-04-10
> 선행 완료: X-2a (규칙 엔진, Mermaid), X-2b (Git 영향 분석, 매트릭스, Bottom-Up)
> 커밋 기준: `167baf3`

---

## 1. 목표

분석 도구를 팀/조직 수준에서 운영 가능한 제품으로 전환하기 위한 기반을 구축한다. 전체 X-2 계획서의 R-PROD 영역에서 **즉시 구현 가능하고 다른 기능의 전제 조건이 되는 6개 핵심 항목**을 선별한다.

---

## 2. 현재 서버 아키텍처

| 항목 | 현재 상태 |
|------|----------|
| HTTP 프레임워크 | Fastify 5.2 |
| 미들웨어 | CORS (permissive), WebSocket, Static |
| 인증 | 없음 |
| 로깅 | console.log만 |
| 헬스체크 | 없음 |
| 모니터링 | 없음 |
| Docker | 없음 |
| 환경변수 | 없음 (CLI 옵션만) |

---

## 3. 구현 항목

### 3.1 Health Check + Readiness

**신규**: `packages/server/src/routes/healthRoutes.ts`

```typescript
GET /health → { status: 'ok', uptime: number, version: string }
GET /health/ready → { ready: boolean, nodeCount: number, edgeCount: number, analyzedAt: string }
```

- `/health`: 서버 프로세스 생존 확인 (Kubernetes liveness probe 용)
- `/health/ready`: 분석 완료 여부 확인 (readiness probe 용)
- 인증 불필요

**수정**: `packages/server/src/index.ts` — `registerHealthRoutes()` 호출 추가
**테스트**: `packages/server/src/__tests__/api.test.ts` — 2개 (health, ready)

---

### 3.2 Structured Logging

**수정**: `packages/server/src/index.ts`

```typescript
const fastify = Fastify({
  logger: {
    level: process.env.VDA_LOG_LEVEL || 'info',
    // production에서는 JSON 자동, dev에서는 pretty-print
  },
  requestIdLogLabel: 'requestId',
  genReqId: () => crypto.randomUUID(),
});
```

Fastify 내장 pino logger 활성화:
- 모든 요청에 자동 requestId
- 요청/응답 로깅 (method, url, statusCode, responseTime)
- 분석 엔진에서 `fastify.log.info({ event: 'analysis:start' })` 로깅

**수정**: `packages/server/src/engine.ts` — 분석 시작/완료/오류에 구조화 로그 추가

---

### 3.3 JWT 기반 API 인증

**의존성**: `@fastify/jwt`

**신규**: `packages/server/src/middleware/auth.ts`

```typescript
// 환경변수 기반 제어
VDA_AUTH_ENABLED=true|false (기본 false)
VDA_JWT_SECRET=<secret> (미설정 시 랜덤 생성)
VDA_ADMIN_USER=admin
VDA_ADMIN_PASSWORD=<password>
```

API:
- `POST /api/auth/login` — `{ username, password }` → `{ token }` (JWT, 24시간 만료)
- `GET /api/auth/me` — 현재 인증된 사용자 정보

보호 범위:
- `/api/*` 전체에 `preHandler` 훅으로 JWT 검증
- 제외: `/health`, `/health/ready`, `/api/auth/login`, static 파일, WebSocket

초기 구현:
- 단일 계정 (환경변수 기반) — 향후 DB/LDAP/OIDC 연동으로 확장
- `VDA_AUTH_ENABLED=false`이면 모든 인증 건너뜀 (개발 편의)

**수정**: `packages/server/src/index.ts` — JWT 플러그인 등록 + preHandler 훅
**테스트**: 인증 활성 시 401, 로그인 후 200 확인

---

### 3.4 감사 로그

**신규**: `packages/server/src/middleware/auditLog.ts`

기록 대상:
- 로그인 성공/실패
- 분석 실행 (`POST /api/analyze`)
- 결과 조회 (DTO, rule violations, change impact)
- 설정 변경 (향후)

저장:
- 초기: 메모리 배열 (최대 1000건, FIFO)
- 향후: SQLite 또는 파일 기반

API:
- `GET /api/admin/audit-log?limit=50` → `{ logs: AuditEntry[] }`
- `AuditEntry`: `{ timestamp, user, action, target, ip, details }`

**수정**: 주요 라우트 핸들러에 `auditLog.record()` 호출 추가

---

### 3.5 Docker 패키징

**신규**: `Dockerfile` (프로젝트 루트)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/ packages/
RUN npm ci && npx turbo run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/core/dist packages/core/dist
COPY --from=builder /app/packages/core/package.json packages/core/
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/server/package.json packages/server/
COPY --from=builder /app/packages/web-ui/dist packages/web-ui/dist
COPY --from=builder /app/packages/cli/dist packages/cli/dist
COPY --from=builder /app/packages/cli/package.json packages/cli/
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json .
EXPOSE 3333
CMD ["node", "packages/cli/dist/bin/vda.js", "serve", "/data", "--port", "3333"]
```

**신규**: `docker-compose.yml`

```yaml
version: '3.8'
services:
  vda:
    build: .
    ports:
      - "3333:3333"
    volumes:
      - ./test-project-ecommerce:/data:ro
    environment:
      - PORT=3333
      - VDA_AUTH_ENABLED=false
      - VDA_LOG_LEVEL=info
```

**신규**: `.dockerignore` — node_modules, .git, dist, .vda-cache

---

### 3.6 환경변수 통합

**수정**: `packages/server/src/index.ts`

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 3333 | 서버 포트 |
| `VDA_AUTH_ENABLED` | false | 인증 활성화 여부 |
| `VDA_JWT_SECRET` | 랜덤 | JWT 서명 키 |
| `VDA_ADMIN_USER` | admin | 관리자 계정 |
| `VDA_ADMIN_PASSWORD` | (필수, auth 활성 시) | 관리자 비밀번호 |
| `VDA_LOG_LEVEL` | info | 로그 레벨 (debug/info/warn/error) |
| `VDA_CORS_ORIGIN` | * | CORS 허용 오리진 |

**신규**: `.env.example` — 모든 환경변수 문서화

---

## 4. 파일 변경 계획

### 신규 파일 (7개)

| 파일 | 내용 |
|------|------|
| `packages/server/src/routes/healthRoutes.ts` | Health check API |
| `packages/server/src/middleware/auth.ts` | JWT 인증 미들웨어 |
| `packages/server/src/middleware/auditLog.ts` | 감사 로그 |
| `Dockerfile` | Docker 이미지 빌드 |
| `docker-compose.yml` | 개발용 Docker 구성 |
| `.dockerignore` | Docker 빌드 제외 파일 |
| `.env.example` | 환경변수 문서 |

### 수정 파일 (3개)

| 파일 | 변경 |
|------|------|
| `packages/server/src/index.ts` | logger 활성화, JWT 플러그인, health 라우트, env 읽기 |
| `packages/server/src/engine.ts` | 구조화 로그 추가 |
| `packages/server/package.json` | `@fastify/jwt` 의존성 추가 |

### 테스트 추가

| 파일 | 추가 테스트 |
|------|------------|
| `packages/server/src/__tests__/api.test.ts` | health/ready 2개, audit-log 1개 |

---

## 5. 구현 순서

| 순서 | 항목 | 의존성 |
|------|------|--------|
| 1 | Health Check | 없음 |
| 2 | 환경변수 + .env.example | 없음 |
| 3 | Structured Logging | 환경변수 (VDA_LOG_LEVEL) |
| 4 | JWT 인증 | 환경변수 (VDA_AUTH_ENABLED, VDA_JWT_SECRET) |
| 5 | 감사 로그 | 인증 (사용자 식별) |
| 6 | Docker | 1~5 완료 후 |

---

## 6. 검증 체크리스트

- [ ] `npm test` 전체 통과
- [ ] `GET /health` → 200 `{ status: 'ok' }`
- [ ] `GET /health/ready` → 200 `{ ready: true, nodeCount: >0 }`
- [ ] `VDA_AUTH_ENABLED=false` → 인증 없이 API 정상 동작 (기존 동작 유지)
- [ ] `VDA_AUTH_ENABLED=true` + JWT 없이 → 401
- [ ] `POST /api/auth/login` → 200 `{ token }`
- [ ] JWT 포함 요청 → 200 정상
- [ ] `GET /api/admin/audit-log` → 기록된 로그 반환
- [ ] `docker build -t vda .` → 성공
- [ ] `docker-compose up` → 서버 기동, `http://localhost:3333` 접속
- [ ] web-ui 빌드 성공

---

## 7. 범위 외 (X-2c 이후로 이관)

- SSO/LDAP/OIDC 연동 → X-2d 또는 별도 sprint
- RBAC (admin/manager/viewer 역할 분리) → SSO 이후
- Prometheus metrics 엔드포인트 → 모니터링 인프라 결정 후
- 폐쇄망 설치 (npm pack + offline deps) → Docker 우선, 이후 추가
- 관리자 콘솔 UI → X-2d
