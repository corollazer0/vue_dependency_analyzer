# Lab 05. Zero-Base 재구현 스파이크

## 목적

학습 내용을 실제 재설계 문서로 전환한다.

## 범위

전체 제품이 아니라 핵심 골격만 설계한다.

- graph schema
- parser contract
- linker contract
- impact analyzer
- CLI analyze
- REST graph API

## 수행 절차

1. MVP 범위를 적는다.
2. NodeKind / EdgeKind를 다시 정의한다.
3. parser 입력/출력 contract를 쓴다.
4. unresolved edge 해소 전략을 쓴다.
5. cache invariants를 쓴다.
6. 최소 fixture와 회귀 테스트 전략을 쓴다.
7. Phase 2 확장 목록을 쓴다.

## 제출 산출물

- [redesign-template.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/templates/redesign-template.md)

## 통과 기준

- 기존 구현을 그대로 베끼지 않고 원칙 기반으로 재구성했다.
- MVP와 제품형 범위를 분리했다.
- parser/linker/analyzer contract가 명확하다.
