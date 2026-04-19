# VDA Education Package

## 목적

이 문서 묶음은 `Vue Dependency Analyzer`를 단순히 "사용할 수 있는 수준"이 아니라, 사내 폐쇄망 환경으로 반입해 다시 설계, 구현, 운영할 수 있는 수준까지 이해시키기 위한 교육 패키지다.

기준일은 `2026-04-11`이며, 이 패키지는 현재 저장소의 실제 코드와 테스트를 기준으로 작성한다.

## 학습 목표

- 이 시스템의 전체 파이프라인을 설명할 수 있다.
- 특정 기능이 어느 파일에서 어떤 노드와 엣지를 만드는지 추적할 수 있다.
- 지원 패턴과 미지원 패턴을 구분할 수 있다.
- 결과의 신뢰 범위와 운영 리스크를 설명할 수 있다.
- 동일 수준의 시스템을 zero-base로 다시 설계할 수 있다.

## 권장 읽기 순서

1. [01-program-overview.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/01-program-overview.md)
2. [02-mastery-map.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/02-mastery-map.md)
3. [03-study-operations.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/03-study-operations.md)
4. [04-reading-order.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/04-reading-order.md)
5. [05-weekly-plan.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/05-weekly-plan.md)
6. [06-glossary.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/06-glossary.md)
7. `modules/` 전체
8. `labs/` 전체
9. `assessments/` 전체
10. `templates/` 전체

## 디렉터리 구성

- `01-program-overview.md`: 교육의 목적, 완료 기준, 산출물 기준
- `02-mastery-map.md`: 무엇을 어떤 수준까지 알아야 하는지
- `03-study-operations.md`: 일일/주간 학습 운영 방식
- `04-reading-order.md`: 실제 코드 읽는 순서
- `05-weekly-plan.md`: 12주 실행 계획
- `06-glossary.md`: 핵심 용어집
- `modules/`: 주제별 교안
- `labs/`: 실습 지침
- `assessments/`: 진단, 중간, 최종 평가 자료
- `templates/`: 학습 기록과 재설계 산출물 템플릿

## 이 패키지의 사용 원칙

- 문서보다 코드를 우선한다.
- 코드를 읽기 전에 "무엇을 확인할지"를 먼저 정의한다.
- 읽은 뒤 반드시 산출물을 남긴다.
- 수동 요약이 아니라, 실제 추적과 설명이 학습의 중심이다.
- "이해한 것"보다 "설명 가능한 것"을 기준으로 평가한다.

## 최소 산출물

교육 종료 시 아래 6개 산출물이 있어야 한다.

1. 시스템 전체 파이프라인 1장 요약
2. Golden Path 추적 6종
3. 지원/미지원 패턴 매트릭스
4. 영향도 분석 설명서
5. 폐쇄망 운영 설계 초안
6. zero-base 재설계 문서

## 주의

- 이 패키지는 현재 저장소를 완전히 긍정적으로 설명하지 않는다.
- 실제 구현, 테스트, 문서 사이의 차이도 학습 대상으로 포함한다.
- 특히 폐쇄망 반입 목적이라면 기능 이해만으로는 부족하며, 운영, 보안, 패키징, 추적성까지 함께 다뤄야 한다.

## 세션 연속성

세션이 바뀌거나 다른 에이전트를 사용할 때는 아래 문서를 먼저 읽는다.

1. [state/STATE.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/STATE.md)
2. [state/QNA.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/QNA.md)
3. [state/AUDIT_LOG.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/AUDIT_LOG.md)
4. [state/AGENT_HANDOFF_PROMPT.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/AGENT_HANDOFF_PROMPT.md)

세션 연속성 운영 규칙은 [state/README.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/README.md)에 정리되어 있다.
