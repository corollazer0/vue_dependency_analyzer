# State Management

## 목적

이 디렉터리는 세션이 바뀌거나, 다른 에이전트가 들어오거나, 학습 간격이 생겨도 맥락을 잃지 않도록 상태를 유지하기 위한 공간이다.

## 파일 역할

- `STATE.md`: 현재 학습 상태의 단일 진실원천
- `AUDIT_LOG.md`: 세션별 작업 기록과 의사결정 로그
- `QNA.md`: 개인 질문, 답변, 보류 항목 저장소
- `AGENT_HANDOFF_PROMPT.md`: 어떤 세션/에이전트에서도 바로 이어갈 수 있는 공통 부트스트랩 프롬프트

## 읽는 순서

1. `STATE.md`
2. `QNA.md`
3. `AUDIT_LOG.md`의 최신 항목
4. `AGENT_HANDOFF_PROMPT.md`

## 운영 원칙

- `STATE.md`는 항상 최신 상태를 반영한다.
- `AUDIT_LOG.md`는 append-only로 운영한다.
- `QNA.md`는 `Open`, `Answered`, `Deferred`를 구분한다.
- 세션 종료 전에는 최소한 `STATE.md`와 `AUDIT_LOG.md`를 갱신한다.

## 권장 습관

- 새로운 세션 시작 시 먼저 이 디렉터리를 읽는다.
- 새로운 에이전트에게는 `AGENT_HANDOFF_PROMPT.md`를 그대로 전달한다.
- 개인적인 질문이 생기면 먼저 `QNA.md`에 적고, 답을 찾은 뒤 상태를 바꾼다.
