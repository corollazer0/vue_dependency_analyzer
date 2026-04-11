# 학습 운영 방식

## 1. 일일 운영

하루 학습을 아래 네 구간으로 고정한다.

1. 개념 정리 45분
2. 코드 읽기 60분
3. 실행 및 추적 60분
4. 기록 및 설명 30분

총 3시간 15분이 기본 단위다.

## 2. 매일 남겨야 하는 기록

- 오늘 읽은 파일 3개
- 오늘 이해한 흐름 1개
- 아직 모르는 것 3개
- 내일 확인할 질문 3개

기록은 반드시 템플릿을 사용한다.

- [study-log-template.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/templates/study-log-template.md)
- [system-trace-template.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/templates/system-trace-template.md)

## 3. 주간 운영

매주 마지막 날에는 아래 4가지를 수행한다.

1. 이번 주 Golden Path 요약 1장 작성
2. 지원/미지원 패턴 10개 정리
3. 구두 설명 30분
4. 다음 주 위험요소 5개 정리

## 4. 학습의 기준

### 읽기 기준

- 파일 하나를 읽을 때 "이 파일이 시스템에서 맡는 책임"을 먼저 적는다.
- 함수 내부 구현보다 "입력, 출력, 부작용"을 먼저 본다.

### 실행 기준

- `npm test`
- `vda analyze`
- `vda serve`
- API 호출

위 4가지는 반복 실행해서 결과와 구조를 연결해야 한다.

### 설명 기준

설명이 막히면 아직 이해하지 못한 것이다.

다음 3가지 방식으로 설명해본다.

- 비전공자에게 3분 설명
- 엔지니어에게 10분 설명
- 아키텍트에게 1장 설계 메모 설명

## 5. 학습 금지 패턴

- 하루에 20개 파일 이상 읽기
- 코드 실행 없이 문서만 읽기
- 미지원 패턴을 보지 않고 성공 케이스만 보기
- UI만 보면서 엔진을 이해했다고 판단하기
- 단순 암기로 노드 종류를 외우기

## 6. 추천 반복 루프

1. 가설을 세운다.
2. 파일을 읽는다.
3. 테스트나 실행으로 확인한다.
4. 결과를 기록한다.
5. 설명해본다.
6. 틀린 가설을 수정한다.

이 루프가 끝나야 학습이 완료된다.

## 7. 산출물 중심 학습

이번 교육은 "열심히 읽었다"가 아니라 "무엇을 만들었는가"로 평가한다.

필수 산출물은 아래다.

- 파일 책임 맵
- Golden Path 추적서
- 지원 패턴 매트릭스
- 운영 리스크 목록
- zero-base 재설계 초안

## 8. 세션 시작과 종료 규칙

### 세션 시작

- `docs/education/state/STATE.md` 읽기
- `docs/education/state/QNA.md`의 Open 질문 읽기
- `docs/education/state/AUDIT_LOG.md` 최신 항목 읽기
- 오늘 시작할 모듈과 목표를 확인하기

### 세션 종료

- 오늘 진행한 내용을 `AUDIT_LOG.md`에 기록
- 다음 시작점을 `STATE.md`에 반영
- 새 질문이 생기면 `QNA.md`에 추가
- 다른 에이전트에게 넘길 필요가 있으면 `AGENT_HANDOFF_PROMPT.md` 기준으로 전달
