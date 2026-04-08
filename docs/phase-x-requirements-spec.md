# Phase X: 금융권 내부 의존성 분석 도구 상세 요구사항 명세서

작성일: 2026-04-08  
문서 상태: Draft v1.0  
기준 문서:
- `docs/executive-si-effort-assessment.md`
- `docs/score-gap-and-100-requirements.md`
- `docs/phase6-post-fix-reaudit.md`

## 1. 문서 목적

본 문서는 현재 저장소를 "금융권 내부 임직원의 개발·운영을 돕는 의존성 분석 도구"로 제품화하기 위한 상세 요구사항 명세서이다.

이 문서는 다음 용도로 사용한다.

1. 제품화 범위와 납품 수준을 정의한다.
2. 개발, QA, 보안, 운영, PM이 공통으로 참조할 기준을 제공한다.
3. 향후 백로그, WBS, 테스트 계획, 수용시험 기준의 상위 기준서 역할을 한다.

## 2. 제품 정의

### 2.1 제품명

- 가칭: `Vue Dependency Analyzer for Financial Internal Engineering`

### 2.2 제품 성격

- 금융권 내부 개발조직과 운영조직이 사용하는 개발지원 도구
- 소스코드, 모듈, API, Spring 계층, MyBatis, DB 테이블 간 의존성을 분석하고 시각화하는 내부용 분석 솔루션
- 직접적인 트랜잭션 처리 솔루션이나 API G/W 제품이 아님

### 2.3 목표

- 개발자가 변경 영향 범위를 빠르게 파악할 수 있어야 한다.
- 운영자가 장애 영향 범위와 연관 모듈을 빠르게 추적할 수 있어야 한다.
- 아키텍트가 서비스 간 구조와 코드 품질 리스크를 확인할 수 있어야 한다.
- 금융권 내부 통제 기준에 맞는 인증, 권한, 감사, 배포, 운영 체계를 제공해야 한다.

## 3. 사업 목표와 성공 기준

### 3.1 사업 목표

1. 프로젝트/저장소 단위로 소스 의존성을 자동 분석한다.
2. 프론트엔드, 백엔드, DB 레이어를 하나의 탐색 가능한 그래프로 제공한다.
3. 변경 영향 분석, 미사용 자산 탐지, 구조 탐색, 리포트 내보내기를 지원한다.
4. 금융권 내부 도구 수준의 인증, 권한, 감사, 운영 체계를 갖춘다.

### 3.2 성공 지표

| 구분 | 목표 |
|---|---|
| 분석 정확도 | cold/warm/incremental 결과 차이 0 |
| 상세조회 API 정상률 | 정상 입력 기준 100% |
| 분석 처리 성능 | 2,000 파일 기준 초기 분석 5분 이내, 재분석 1분 이내 |
| 운영 감사성 | 핵심 사용자 행위 100% 감사로그 기록 |
| 설치 가능성 | 사내망/폐쇄망 설치 절차 완비 |
| 납품 적합도 | 내부 보안/운영 검토 checklist 통과 |

## 4. 이해관계자 및 사용자

### 4.1 이해관계자

- 발주 부서 임원
- IT기획/아키텍처 조직
- 개발팀
- 운영팀
- 정보보안 조직
- 인프라/플랫폼 운영 조직
- 품질보증 조직

### 4.2 주요 사용자

#### U-01 개발자

- 관심사:
  - 특정 파일/모듈 수정 시 영향 범위
  - API 호출과 backend endpoint 연결
  - route/component/store/composable 관계

#### U-02 운영자

- 관심사:
  - 장애 API와 연관 서비스/매퍼/DB 테이블
  - 최근 변경 모듈의 영향 범위
  - 분석 이력과 결과 추적

#### U-03 아키텍트

- 관심사:
  - 전체 구조 시각화
  - 순환 의존성, 고아 노드, 복잡도 상위 자산
  - monorepo/MSA 구조 파악

#### U-04 보안/감사 담당자

- 관심사:
  - 누가 어떤 프로젝트를 열람했는지
  - 프로젝트 등록과 권한 변경 이력
  - 민감정보 비노출 정책

#### U-05 시스템 관리자

- 관심사:
  - 사용자/권한 관리
  - 프로젝트 등록 승인
  - 작업 스케줄, 캐시 관리, 모니터링, 백업/복구

## 5. 적용 범위

### 5.1 포함 범위

- 분석 엔진
- CLI
- 서버 API
- Web UI
- 관리자 기능
- 인증/권한/감사 기능
- 프로젝트 등록 및 형상관리 연계
- 설치/배포 패키지
- 운영/보안/검수 문서

### 5.2 제외 범위

- API Gateway 기능
- 실시간 트래픽 프록시/중계
- 코드 편집기 자체 제공
- 외부 인터넷 기반 SaaS 운영

## 6. 시스템 컨텍스트

### 6.1 외부 연계 대상

- 사내 인증 체계
  - OIDC/SAML SSO
  - LDAP/Active Directory
- 형상관리 시스템
  - GitLab
  - GitHub Enterprise
  - Bitbucket Server
- 알림/운영 연계
  - 이메일
  - Teams/Slack/사내 메신저
- 운영 인프라
  - VM
  - On-prem Kubernetes
  - 사내망/폐쇄망 배포 환경

### 6.2 배포 가정

- 인터넷이 차단되거나 제한된 내부망에서도 설치 가능해야 한다.
- 프로젝트 소스는 사내 형상관리 또는 사내 파일시스템에서 가져와야 한다.
- 저장소 접근정보와 인증정보는 사내 정책에 맞게 보호되어야 한다.

## 7. 핵심 업무 시나리오

### UC-01 프로젝트 등록

1. 프로젝트 관리자가 신규 프로젝트 등록을 요청한다.
2. 시스템 관리자가 저장소, 분석 범위, 권한 정책을 승인한다.
3. 분석 대상이 시스템에 등록된다.

### UC-02 정기 분석

1. 시스템이 예약된 시점에 프로젝트를 분석한다.
2. 분석 결과를 최신 스냅샷으로 저장한다.
3. 변경점과 실패 여부를 기록한다.

### UC-03 변경 영향 분석

1. 개발자가 특정 파일 또는 API를 검색한다.
2. 시스템은 관련 upstream/downstream dependency를 보여준다.
3. 사용자는 결과를 내보낸다.

### UC-04 장애 영향 분석

1. 운영자가 장애 API 또는 클래스명을 입력한다.
2. 시스템은 연결된 서비스, mapper, DB table, 프론트 호출 경로를 보여준다.
3. 운영자는 영향 범위를 리포트로 저장한다.

### UC-05 감사 추적

1. 감사 담당자가 특정 프로젝트의 조회/분석 이력을 조회한다.
2. 시스템은 사용자, 시각, 프로젝트, 작업결과, 정책버전을 보여준다.

## 8. 상세 기능 요구사항

## 8.1 거버넌스 및 문서 체계

### PX-GOV-001. 문서 상태 분리

- 우선순위: P0
- 현재 상태: 미흡
- 요구사항:
  - 제품 기능 문서와 roadmap 문서를 분리해야 한다.
  - 모든 기능 항목은 `implemented`, `partial`, `planned` 상태값을 가져야 한다.
  - 사용자 문서, 운영 문서, 개발 문서를 독립적으로 관리해야 한다.
- 세부 규칙:
  - 사용자 문서는 향후 계획을 포함하지 않는다.
  - roadmap는 기능 설명 대신 계획과 범위를 기술한다.
  - 릴리즈마다 문서 버전과 적용 릴리즈를 명시한다.
- 수용 기준:
  - phase summary와 user stories가 실제 구현과 충돌하지 않는다.

### PX-GOV-002. 요구사항 추적성

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 모든 핵심 기능은 요구사항 ID, 테스트 ID, 문서 ID로 연결되어야 한다.
- 세부 규칙:
  - 각 요구사항은 owner, priority, release target을 가져야 한다.
  - 기능 삭제/변경 시 이력과 영향 범위를 기록해야 한다.
- 수용 기준:
  - traceability matrix가 존재하고 릴리즈 전 검토를 통과한다.

## 8.2 인증 및 권한

### PX-AUTH-001. 사내 SSO 연동

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 사용자는 사내 SSO로 로그인해야 한다.
  - OIDC 또는 SAML 중 최소 1종 이상 지원해야 한다.
  - LDAP/AD 연동 대안을 제공해야 한다.
- 세부 규칙:
  - 로컬 관리자 계정은 선택적 비상계정으로만 허용한다.
  - 사용자 속성은 최소 `userId`, `name`, `email`, `department`, `roles`를 지원한다.
- 수용 기준:
  - 사내 계정 로그인 성공
  - 세션 만료 및 재로그인 정책 적용

### PX-AUTH-002. 역할 기반 권한관리

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 시스템 관리자, 보안 관리자, 프로젝트 관리자, 일반 사용자, 읽기 전용 사용자 역할을 제공해야 한다.
  - 프로젝트 단위 권한과 시스템 단위 권한을 분리해야 한다.
- 세부 규칙:
  - 프로젝트별 `조회`, `분석 실행`, `설정 변경`, `관리` 권한을 나눠야 한다.
  - UI 메뉴와 API 권한을 동일 정책으로 제어해야 한다.
- 수용 기준:
  - 권한 없는 기능 접근 시 403 반환
  - 역할별 UI와 API 접근 제어 확인

### PX-AUTH-003. 프로젝트 등록 승인 프로세스

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 신규 프로젝트 등록은 승인 기반으로 처리해야 한다.
- 세부 규칙:
  - 등록 요청자, 승인자, 승인 일시, 승인 정책을 저장해야 한다.
  - 승인 전 프로젝트는 분석 불가 상태로 유지한다.
- 수용 기준:
  - 승인 전/후 프로젝트 상태 전이가 기록된다.

## 8.3 감사 및 보안 통제

### PX-AUDIT-001. 감사로그

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 로그인, 로그아웃, 프로젝트 등록, 승인, 권한 변경, 분석 실행, 설정 변경, 결과 조회, export 수행을 감사로그로 기록해야 한다.
- 세부 규칙:
  - 감사로그는 최소 `eventId`, `timestamp`, `actor`, `projectId`, `action`, `result`, `ip`, `userAgent`를 가져야 한다.
  - 삭제 불가 정책 또는 위변조 감지 정책을 제공해야 한다.
  - 조회 가능한 보존기간과 archive 정책을 제공해야 한다.
- 수용 기준:
  - 핵심 행위 100% 감사로그 생성

### PX-SEC-001. 비밀값 및 민감정보 보호

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 저장소 접근토큰, 계정정보, 프로젝트 연결정보는 평문 저장을 금지해야 한다.
  - 화면과 로그에 민감정보가 노출되지 않아야 한다.
- 세부 규칙:
  - 비밀값은 암호화 저장 또는 외부 secret manager 연동을 지원한다.
  - 민감 경로, 민감 키워드, 비밀값 패턴에 대해 masking 규칙을 제공한다.
- 수용 기준:
  - 로그/DB/설정 export에서 평문 비밀값 0건

### PX-SEC-002. 오픈소스 및 취약점 관리

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 릴리즈 단위 SBOM을 생성해야 한다.
  - 취약점 스캔과 라이선스 점검을 수행해야 한다.
- 세부 규칙:
  - 고위험 취약점은 release gate에서 차단한다.
  - 예외 승인 프로세스를 기록해야 한다.
- 수용 기준:
  - 릴리즈 산출물에 SBOM과 취약점 보고서 포함

## 8.4 프로젝트 등록 및 소스 연계

### PX-PROJ-001. 프로젝트 등록

- 우선순위: P0
- 현재 상태: 부분 구현
- 요구사항:
  - 사용자는 프로젝트명, 설명, 조직, 저장소 주소, 브랜치, 분석 정책을 등록할 수 있어야 한다.
  - 프로젝트는 `draft`, `pending-approval`, `active`, `inactive`, `archived` 상태를 가져야 한다.
- 세부 규칙:
  - 등록 시 중복 프로젝트 검사를 수행한다.
  - 프로젝트별 기본 분석 정책과 보안 정책을 연결한다.
- 수용 기준:
  - UI와 API 모두에서 프로젝트 등록/수정/비활성화 가능

### PX-PROJ-002. 형상관리 연계

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 최소 1종 이상의 사내 Git 시스템 연동을 제공해야 한다.
  - branch, tag, commit 기준 분석을 지원해야 한다.
- 세부 규칙:
  - connector는 플러그인 방식으로 확장 가능해야 한다.
  - full clone, shallow clone, local mirror 정책을 선택 가능해야 한다.
- 수용 기준:
  - 특정 branch, 특정 commit 기준 분석 성공

### PX-PROJ-003. 분석 설정 관리

- 우선순위: P0
- 현재 상태: 부분 구현
- 요구사항:
  - `.vdarc.json` 또는 시스템 정책 기반 설정을 프로젝트와 연결해야 한다.
  - `services[]`, `include[]`, `exclude[]`, aliases, native bridges, apiBaseUrl을 실제 분석 경로에 반영해야 한다.
- 세부 규칙:
  - 설정 변경은 버전관리되어야 한다.
  - 분석결과에는 사용된 정책버전이 기록되어야 한다.
- 수용 기준:
  - 설정 변경 전/후 분석 결과 비교 가능

### PX-PROJ-004. monorepo/MSA 지원

- 우선순위: P0
- 현재 상태: 부분 구현
- 요구사항:
  - 복수 frontend, 복수 backend, 복수 service root를 하나의 프로젝트에서 관리할 수 있어야 한다.
- 세부 규칙:
  - service 단위 enable/disable
  - service 그룹/태그
  - cross-service dependency 표시
- 수용 기준:
  - 3개 이상 service가 있는 fixture에서 분석 성공

## 8.5 분석 엔진

### PX-ENG-001. 결과 일관성

- 우선순위: P0
- 현재 상태: 미흡
- 요구사항:
  - cold run, warm run, incremental run의 결과는 논리적으로 동일해야 한다.
- 세부 규칙:
  - node count, edge count, critical node kinds, path query 결과가 동일해야 한다.
  - synthetic node도 cache 경로에 완전 보존해야 한다.
- 수용 기준:
  - 동일 프로젝트 3종 실행 결과 diff 0

### PX-ENG-002. 캐시 무결성

- 우선순위: P0
- 현재 상태: 미흡
- 요구사항:
  - file-based cache가 multi-file synthetic output을 손실 없이 저장해야 한다.
  - cache corruption, config mismatch, partial invalidation을 처리해야 한다.
- 세부 규칙:
  - cache entry는 source file 외에도 derived node/edge를 보존해야 한다.
  - cache health 점검 API를 제공해야 한다.
- 수용 기준:
  - warm-cache에서 `db-table` 유실 재현 불가
  - cache integrity test 통과

### PX-ENG-003. node identity 및 transport key 재설계

- 우선순위: P0
- 현재 상태: 미흡
- 요구사항:
  - 내부 node key와 외부 API transport key를 분리해야 한다.
  - path param에 raw file path 기반 key 사용을 금지해야 한다.
- 세부 규칙:
  - opaque ID 또는 URL-safe encoded key 사용
  - backward compatibility migration 전략 제공
- 수용 기준:
  - 모든 node kind에 대해 detail/impact API 정상 동작

### PX-ENG-004. 분석 범위 확장

- 우선순위: P1
- 현재 상태: 부분 구현
- 요구사항:
  - 다음 분석 범위를 실제 구현해야 한다.
  - Vue router → component rendering
  - frontend emit/listener event graph
  - Java interface parsing
  - MyBatis mapper interface linking
  - DTO flow 분석
- 세부 규칙:
  - 각 분석 산출물은 node/edge kind 또는 metadata contract로 정의한다.
  - feature flag 없이 기본 기능으로 동작해야 한다.
- 수용 기준:
  - 대표 fixture에서 각 관계가 그래프에 표현됨

### PX-ENG-005. 대규모 프로젝트 처리

- 우선순위: P2
- 현재 상태: 부분 구현
- 요구사항:
  - worker 기반 병렬 파싱을 제공해야 한다.
  - cancellation, timeout, worker failure isolation을 지원해야 한다.
- 세부 규칙:
  - parser concurrency는 정책으로 조정 가능해야 한다.
  - 메모리 상한 보호 로직을 제공해야 한다.
- 수용 기준:
  - 2,000 파일 이상 fixture 분석 중 프로세스 안정성 확보

### PX-ENG-006. 분석 결과 품질 메타데이터

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 분석 결과는 coverage, parse error count, unresolved edge count, cache hit rate를 포함해야 한다.
- 세부 규칙:
  - 프로젝트별 품질 상태를 score로 계산할 수 있어야 한다.
- 수용 기준:
  - UI와 API에서 품질 메타데이터 조회 가능

## 8.6 분석 작업 관리

### PX-JOB-001. 분석 작업 실행 관리

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 사용자는 분석 작업을 시작, 중지, 재시도, 예약할 수 있어야 한다.
- 세부 규칙:
  - 작업 상태는 `queued`, `running`, `cancelled`, `failed`, `completed`를 가져야 한다.
  - 작업 단위 timeout을 설정할 수 있어야 한다.
- 수용 기준:
  - 분석 중지 요청 시 실제 작업이 취소됨

### PX-JOB-002. 작업 이력 및 정책 버전 관리

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 모든 분석 작업은 이력으로 남아야 하며, 실행 시점의 config hash와 connector 상태를 기록해야 한다.
- 세부 규칙:
  - 실패 원인, parse error 요약, cache stats, duration을 포함한다.
- 수용 기준:
  - 최근 100회 작업 이력을 UI/API로 조회 가능

## 8.7 서버 API

### PX-API-001. API 안정성

- 우선순위: P0
- 현재 상태: 부분 구현
- 요구사항:
  - 모든 공개 API는 request/response schema를 가져야 한다.
  - 오류 응답은 표준화된 error contract를 사용해야 한다.
- 세부 규칙:
  - 최소 공통 필드: `code`, `message`, `traceId`, `details`
  - 인증/권한 오류와 입력 오류를 구분해야 한다.
- 수용 기준:
  - API reference와 실제 응답이 일치

### PX-API-002. 상세 탐색 API

- 우선순위: P0
- 현재 상태: 부분 구현
- 요구사항:
  - node detail, impact, path finding, search, overlays, parse errors, source snippet API를 안정적으로 제공해야 한다.
- 세부 규칙:
  - detail/impact는 모든 정상 node에서 동작해야 한다.
  - path query는 maxDepth와 result limit 정책을 제공해야 한다.
- 수용 기준:
  - contract test 100% 통과

### PX-API-003. 관리자 API

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 프로젝트 관리, 사용자/권한 관리, 작업 제어, 정책 관리, 감사로그 조회 API를 제공해야 한다.
- 수용 기준:
  - 관리자 콘솔에서 필요한 기능을 모두 API로 수행 가능

## 8.8 Web UI 및 사용자 경험

### PX-UI-001. 탐색형 그래프 UX

- 우선순위: P1
- 현재 상태: 부분 구현
- 요구사항:
  - 그래프 탐색, 클러스터 확장, 검색, 필터, 상세조회, 영향분석 전환을 일관된 UX로 제공해야 한다.
- 세부 규칙:
  - node selection과 detail panel, graph focus, tree view가 일관되게 동작해야 한다.
  - stale 문서와 다른 interaction을 제거해야 한다.
- 수용 기준:
  - 주요 사용자 시나리오를 UI smoke test로 검증

### PX-UI-002. 접근성 및 디자인 토큰 일관성

- 우선순위: P1
- 현재 상태: 부분 구현
- 요구사항:
  - 모든 주요 컴포넌트는 design token을 사용해야 한다.
  - 키보드 접근성과 focus, ARIA labeling을 제공해야 한다.
- 세부 규칙:
  - hard-coded gray palette 제거
  - command palette, search, modal에 키보드 동선 정의
- 수용 기준:
  - 주요 화면 accessibility checklist 통과

### PX-UI-003. 리포트 및 내보내기

- 우선순위: P1
- 현재 상태: 부분 구현
- 요구사항:
  - JSON export 외에 HTML/PDF/CSV 형태의 보고서 내보내기를 지원해야 한다.
  - 변경영향 리포트와 구조진단 리포트를 별도 제공해야 한다.
- 세부 규칙:
  - 역할별 템플릿 제공
  - 민감정보 masking 정책 반영
- 수용 기준:
  - 운영회의/릴리즈회의용 리포트 직접 사용 가능

### PX-UI-004. 관리자 콘솔

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 프로젝트, 사용자, 권한, 정책, 작업, 감사로그를 관리하는 관리자 전용 UI를 제공해야 한다.
- 수용 기준:
  - 관리자 사용자는 shell 접속 없이 주요 운영 수행 가능

## 8.9 운영 및 관제

### PX-OPS-001. 설치 패키지

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - on-prem 설치 패키지와 폐쇄망 설치 절차를 제공해야 한다.
- 세부 규칙:
  - offline dependency bundle
  - 설치 스크립트
  - 업그레이드/rollback 절차
- 수용 기준:
  - 인터넷 차단 환경에서 설치 성공

### PX-OPS-002. 모니터링

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - health check, metrics, structured logs, alert hooks를 제공해야 한다.
- 세부 규칙:
  - 작업 실패율
  - cache integrity failure
  - connector failure
  - API latency
  - resource usage
- 수용 기준:
  - 운영자가 장애 징후를 시스템적으로 확인 가능

### PX-OPS-003. 백업 및 복구

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 프로젝트 메타데이터, 정책, 감사로그, 작업이력의 백업과 복구 절차를 제공해야 한다.
- 세부 규칙:
  - RPO/RTO 목표를 정의한다.
  - 복구 리허설 문서를 제공한다.
- 수용 기준:
  - 복구 시나리오 테스트 완료

### PX-OPS-004. 운영 매뉴얼

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - 관리자 매뉴얼, 운영자 매뉴얼, 장애 대응 매뉴얼, 보안 운영 가이드를 제공해야 한다.
- 수용 기준:
  - 운영 인수인계 교육 가능 수준의 문서 완비

## 8.10 품질보증 및 릴리즈 게이트

### PX-QA-001. 테스트 체계

- 우선순위: P0
- 현재 상태: 부분 구현
- 요구사항:
  - unit, integration, contract, performance, UI smoke, security baseline test를 포함해야 한다.
- 세부 규칙:
  - cache correctness test 필수
  - valid node detail/impact contract test 필수
  - document claim regression review 포함
- 수용 기준:
  - 치명 이슈가 테스트 미통과 없이 릴리즈되지 않음

### PX-QA-002. 릴리즈 게이트

- 우선순위: P0
- 현재 상태: 미구현
- 요구사항:
  - build, test, lint, security scan, SBOM, docs review, migration check를 통과해야 릴리즈 가능하다.
- 수용 기준:
  - 릴리즈 후보마다 증적 자동 생성

### PX-QA-003. 수용시험 패키지

- 우선순위: P1
- 현재 상태: 미구현
- 요구사항:
  - 기능 검수, 성능 검수, 운영 검수, 보안 검수 기준서를 제공해야 한다.
- 수용 기준:
  - 고객 수용시험 시나리오와 결과양식 제공

## 9. 비기능 요구사항

### 9.1 성능

- NFR-PERF-001
  - 500 파일 프로젝트 initial analysis: 30초 이내
- NFR-PERF-002
  - 2,000 파일 프로젝트 initial analysis: 5분 이내
- NFR-PERF-003
  - 동일 조건 warm analysis: cold 대비 50% 이상 단축
- NFR-PERF-004
  - search API p95: 1초 이내
- NFR-PERF-005
  - graph detail API p95: 2초 이내

### 9.2 안정성

- NFR-REL-001
  - 분석 작업 실패 시 다른 프로젝트 작업에 영향을 주지 않아야 한다.
- NFR-REL-002
  - connector 장애, worker 장애, cache 장애를 분리된 오류로 처리해야 한다.
- NFR-REL-003
  - 분석 중 취소 요청은 30초 이내 반영되어야 한다.

### 9.3 보안

- NFR-SEC-001
  - 모든 사용자 행위는 인증 후 수행되어야 한다.
- NFR-SEC-002
  - 최소권한 원칙을 적용해야 한다.
- NFR-SEC-003
  - 관리자 기능은 일반 사용자와 분리된 권한모델을 사용해야 한다.
- NFR-SEC-004
  - 민감정보는 저장/전송/로그에서 보호되어야 한다.

### 9.4 운영성

- NFR-OPS-001
  - 사내망 설치 문서와 업그레이드 문서를 제공해야 한다.
- NFR-OPS-002
  - 백업/복구 절차가 정의되어야 한다.
- NFR-OPS-003
  - 운영자 관점 health check와 alert hook를 제공해야 한다.

### 9.5 사용성

- NFR-UX-001
  - 주요 사용자 시나리오는 3클릭 이내 접근 가능해야 한다.
- NFR-UX-002
  - 그래프, 트리, 검색, 리포트 간 전환은 일관된 상태모델을 따라야 한다.
- NFR-UX-003
  - A11y checklist를 충족해야 한다.

## 10. 데이터 및 관리 객체

시스템은 최소한 아래 관리 객체를 가져야 한다.

- 조직
- 사용자
- 역할
- 프로젝트
- 저장소 연결정보
- 분석 정책
- 분석 작업
- 분석 스냅샷
- 감사로그
- 시스템 설정

각 관리 객체는 공통적으로 다음 메타데이터를 가져야 한다.

- `id`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `status`

## 11. 납품 산출물 요구사항

납품 시 아래 산출물을 제공해야 한다.

- 요구사항 명세서
- 아키텍처 설계서
- API 명세서
- DB/메타데이터 설계서
- 사용자 매뉴얼
- 관리자 매뉴얼
- 운영 매뉴얼
- 장애 대응 매뉴얼
- 설치/업그레이드 가이드
- 테스트 결과서
- 성능 결과서
- 보안 점검 결과서
- SBOM 및 오픈소스 현황표
- 릴리즈 노트

## 12. 단계별 구현 권장 순서

### Phase X-1: P0 안정화 및 무결성 확보

- PX-GOV-001
- PX-GOV-002
- PX-AUTH-001
- PX-AUTH-002
- PX-AUDIT-001
- PX-SEC-001
- PX-PROJ-001
- PX-PROJ-003
- PX-PROJ-004
- PX-ENG-001
- PX-ENG-002
- PX-ENG-003
- PX-JOB-001
- PX-API-001
- PX-API-002
- PX-OPS-001
- PX-OPS-004
- PX-QA-001
- PX-QA-002

### Phase X-2: 조직형 운영 기능과 제품화

- PX-AUTH-003
- PX-SEC-002
- PX-PROJ-002
- PX-ENG-004
- PX-ENG-006
- PX-JOB-002
- PX-API-003
- PX-UI-001
- PX-UI-002
- PX-UI-004
- PX-OPS-002
- PX-OPS-003
- PX-QA-003

### Phase X-3: 금융권 내부 도구 고도화

- PX-ENG-005
- PX-UI-003
- 비기능 요구사항 전체 달성
- 납품 산출물 완성

## 13. 최종 수용 조건

본 제품은 아래 조건을 모두 만족할 때 금융권 내부 임직원용 의존성 분석 도구로 수용 가능하다고 본다.

1. cold/warm/incremental 분석 결과가 일치한다.
2. 핵심 API가 모든 정상 입력에서 동작한다.
3. 사내 인증과 RBAC가 적용된다.
4. 감사로그와 관리자 기능이 존재한다.
5. 사내망/폐쇄망 설치가 가능하다.
6. 운영, 보안, 테스트, 납품 문서가 완비된다.
7. 사용자 수용시험과 보안 점검을 통과한다.
