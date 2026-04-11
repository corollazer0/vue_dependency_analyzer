# Zero-Base 재설계 템플릿

## 1. 목표

- 왜 다시 만드는가:
- 대상 사용자:
- 운영 환경:

## 2. 범위

- MVP 범위:
- 제외 범위:
- Phase 2 확장:

## 3. Graph Contract

- NodeKind:
- EdgeKind:
- ID scheme:
- metadata schema:

## 4. Parser Contract

- 입력:
- 출력:
- error 처리:
- unsupported patterns:

## 5. Linker Contract

- unresolved edge 전략:
- import resolution 전략:
- API matching 전략:
- mapper/table 연결 전략:

## 6. Analyzer Contract

- impact:
- circular:
- consistency:
- rules:

## 7. Cache / Incremental Invariants

- cold/warm 동등성:
- synthetic node 보존:
- config change invalidation:

## 8. Runtime Surface

- CLI:
- REST API:
- UI:
- WebSocket:

## 9. 폐쇄망 운영 설계

- 배포:
- 인증/권한:
- 감사:
- 모니터링:
- 백업/복구:

## 10. 테스트 전략

- fixture:
- unit:
- integration:
- regression:
- performance:
