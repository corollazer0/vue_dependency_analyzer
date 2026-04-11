# 12주 학습 실행 계획

## 전제

- 기준 수준: "거의 모른다"
- 학습 목적: 폐쇄망 반입 후 재설계, 재구현, 운영
- 권장 시간: 주 5일, 하루 3시간 이상

## 1주차. 기초 개념 정렬

- 목표: 정적 분석, AST, 그래프, 의존성 방향 개념을 이해한다.
- 읽기: `01-program-overview`, `02-mastery-map`, `06-glossary`, `modules/01-foundations`
- 실습: `labs/lab-01-golden-path-trace.md` 준비 단계만 수행
- 산출물: 용어집 개인 버전, 시스템 한 줄 설명 5개

## 2주차. 그래프 계약 이해

- 목표: NodeKind, EdgeKind, query, impact traversal 구조를 이해한다.
- 읽기: `modules/02-graph-model`
- 실습: graph query를 손으로 추적
- 산출물: 노드/엣지 표, impact 설명서 초안

## 3주차. 파싱 엔진과 cache

- 목표: 파일 발견, parse result, worker, cache, error 수집을 이해한다.
- 읽기: `modules/03-parser-engine`
- 실습: cold/warm 분석 실행 결과 비교
- 산출물: parse pipeline 다이어그램

## 4주차. 프론트엔드 분석

- 목표: Vue SFC, TS parser, import resolver, store/composable/router/API 감지를 이해한다.
- 읽기: `modules/04-frontend-analysis`
- 실습: Vue component에서 api-call-site까지 추적
- 산출물: 프론트 지원/미지원 패턴 표

## 5주차. 백엔드 분석

- 목표: Spring endpoint, DI, DTO, MyBatis XML, db-table 추출을 이해한다.
- 읽기: `modules/05-backend-analysis`
- 실습: Controller에서 db-table까지 추적
- 산출물: 백엔드 지원/미지원 패턴 표

## 6주차. 경계 연결

- 목표: import resolution, API linker, MyBatis linker, DTO flow, event node를 이해한다.
- 읽기: `modules/06-linkers-and-cross-boundary`
- 실습: Vue -> endpoint -> table, table -> Vue 양방향 trace
- 산출물: Golden Path 6개 중 4개 완료

## 7주차. 분석기와 품질 기능

- 목표: circular, orphan, impact, DTO consistency, rule engine을 이해한다.
- 읽기: `modules/07-analyzers-and-quality`
- 실습: `labs/lab-03-impact-dto-and-rules.md`
- 산출물: 영향도 분석 요약 1장

## 8주차. CLI, 서버, UI, 운영 흐름

- 목표: 사용자가 시스템을 어떻게 쓰는지와 API/UI 계약을 이해한다.
- 읽기: `modules/08-product-surface-and-ops`
- 실습: analyze -> serve -> search -> node detail -> impact -> overlays 흐름 재현
- 산출물: 운영 관점 기능 맵

## 9주차. 폐쇄망 반입 관점 재정의

- 목표: 보안, 배포, 감사, 권한, 패키징, 운영 통제를 이해한다.
- 읽기: `modules/08-product-surface-and-ops`, `labs/lab-04-closed-network-operational-design`
- 산출물: 폐쇄망 도입 체크리스트

## 10주차. zero-base 재설계 초안

- 목표: 현재 구조를 모사하는 것이 아니라, 다시 설계할 구조를 만든다.
- 읽기: `modules/09-zero-base-redesign`
- 실습: `labs/lab-05-rebuild-spike.md`
- 산출물: 재설계 문서 v1

## 11주차. 리스크와 미지원 패턴 반영

- 목표: 설계를 실제 제약에 맞게 보정한다.
- 실습: 지원 범위, 오탐/미탐, 성능, 제품화 갭을 반영
- 산출물: 재설계 문서 v2, 테스트 전략

## 12주차. 최종 검증

- 목표: 말, 문서, 실습 셋 모두에서 재설계 가능 수준을 검증한다.
- 평가: `assessments/02-final-evaluation.md`
- 산출물: 최종 설계 패키지

## 주차별 완료 기준

- 각 주차마다 최소 문서 산출물 1개
- Golden Path 누적 추적 1개 이상
- 설명 가능한 질문 10개 이상
- 테스트나 실행 결과를 근거로 기록할 것

## 단축 플랜

시간이 적다면 12주를 8주로 압축할 수 있다.

- 1-2주차 통합
- 4-5주차 통합
- 8-9주차 통합
- 10-12주차 통합

단, 파서와 링크 단계는 절대 건너뛰면 안 된다.
