# Learning State

## Metadata

- Last Updated: 2026-04-11
- Owner: User
- Purpose: `Vue Dependency Analyzer`를 사내 폐쇄망으로 반입해 다시 설계, 구현, 운영할 수 있을 정도로 완전히 이해한다.
- Current Stage: 교육 패키지 준비 완료, Day 1 시작 전
- Current Level Assumption: 초급 이하, 사실상 zero-base

## Non-Negotiable Goal

사용자는 이 저장소를 단순히 읽는 것이 아니라, 같은 급의 시스템을 zero-base에서 다시 설계하고 구현할 수 있어야 한다.

## Learning Strategy

- 기본 전략: `기초 개념 -> Golden Path -> 수평 레이어 분석 -> 운영/제약 -> zero-base 재설계`
- 기준: 문서보다 코드와 테스트
- 설명 기준: 이해한 것이 아니라 설명 가능한 것이 기준
- 운영 기준: 폐쇄망 반입, 감사, 권한, 패키징, 운영 통제까지 포함

## Canonical Documents

우선순위 순서:

1. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/README.md`
2. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/01-program-overview.md`
3. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/04-reading-order.md`
4. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/05-weekly-plan.md`
5. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/modules/01-foundations.md`
6. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/README.md`
7. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/QNA.md`
8. `/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/state/AUDIT_LOG.md`

## Completed So Far

- `/docs/education` 전체 교육 패키지 생성 완료
- 프로그램 개요, 숙련도 맵, 학습 운영 방식, 코드 읽기 순서, 12주 계획, 용어집 작성 완료
- 모듈 9개 작성 완료
- 실습 5개 작성 완료
- 평가 3개 작성 완료
- 템플릿 5개 작성 완료
- 세션 연속성 유지를 위한 state management 디렉터리 생성 완료

## In Progress

- 아직 실제 Day 1 교육은 시작하지 않음
- 학습자는 현재 핵심 개념을 거의 모르는 상태로 가정

## Immediate Next Action

다음 세션에서는 아래 순서로 시작한다.

1. `docs/education/README.md` 재확인
2. `docs/education/modules/01-foundations.md`로 Day 1 수업 시작
3. `docs/education/assessments/00-diagnostic.md`는 압박용이 아니라 baseline 기록용으로 사용
4. `docs/education/labs/lab-01-golden-path-trace.md`는 Day 1이 아니라 기초 개념 이후 착수

## Current Constraints

- 학습자는 현재 대부분의 개념을 모른다.
- 설명은 기초부터 단계적으로 진행해야 한다.
- 바로 vertical trace부터 들어가면 안 된다.
- 학습의 최종 목적은 재설계와 운영 가능성이다.

## Design Decisions Already Fixed

- `vertical -> horizontal` 단독 접근 대신 `기초 -> Golden Path -> horizontal -> 재설계` 전략 사용
- 지원/미지원 패턴 문서를 학습의 핵심 산출물로 다룸
- parser/linker/analyzer 분리를 절대적 원칙으로 둠
- cold/warm/incremental 결과 일관성을 핵심 품질 기준으로 둠
- 폐쇄망 운영 요구사항을 교육 후반이 아니라 전체 맥락에 계속 반영함

## Session Start Checklist

새 세션이나 새 에이전트는 아래를 수행한다.

1. `STATE.md` 읽기
2. `QNA.md`의 Open 질문 읽기
3. `AUDIT_LOG.md` 최신 항목 읽기
4. 현재 어떤 모듈까지 끝났는지 확인
5. 이미 설명한 내용을 불필요하게 반복하지 않기
6. 세션 종료 전 `STATE.md`와 `AUDIT_LOG.md` 갱신하기

## Session End Checklist

1. 오늘 다룬 모듈과 주제 기록
2. 새로 생긴 질문을 `QNA.md`에 추가
3. 다음 세션 시작점을 `STATE.md`에 반영
4. `AUDIT_LOG.md`에 append-only로 기록
