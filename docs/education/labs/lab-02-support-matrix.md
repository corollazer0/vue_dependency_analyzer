# Lab 02. 지원 패턴 매트릭스 작성

## 목적

이 실습의 목표는 이 프로젝트의 분석 정확도 경계를 스스로 문서화하는 것이다.

## 읽을 문서와 파일

- `docs/supported-patterns.md`
- `packages/core/src/parsers/vue/*`
- `packages/core/src/parsers/typescript/*`
- `packages/core/src/parsers/java/*`
- `packages/core/src/linkers/*`

## 수행 절차

1. Vue, TS, Spring, MyBatis, Cross-Boundary 다섯 영역으로 나눈다.
2. 각 영역마다 아래 3개를 적는다.
   - 자동 감지 가능
   - 부분 지원
   - 미지원
3. 각 항목마다 근거를 적는다.
   - 코드 근거
   - 문서 근거
   - 테스트 근거
4. 실제 운영 영향도 적는다.
   - 영향 없음
   - 분석 누락 가능
   - 오탐/미탐 위험
   - 운영상 보정 필요

## 제출 산출물

- [support-matrix-template.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/templates/support-matrix-template.md)

## 통과 기준

- 최소 25개 패턴을 정리했다.
- "왜 지원되는가" 또는 "왜 안 되는가"를 설명했다.
- 폐쇄망 운영에서 수동 보정이 필요한 영역을 표시했다.
