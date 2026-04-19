# Lab 01. Golden Path 추적

## 목적

이 실습의 목표는 시스템의 가장 중요한 정상 흐름을 실제 코드와 결과로 연결하는 것이다.

## 준비

루트에서 아래 명령을 실행한다.

```bash
npm test
node packages/cli/dist/bin/vda.js analyze test-project --config .vdarc.json
```

## 추적 대상

아래 3개를 먼저 수행한다.

1. `Vue component -> api-call-site -> spring-endpoint`
2. `spring-controller -> spring-service -> mybatis-mapper -> mybatis-statement -> db-table`
3. `db-table -> upstream 영향 -> vue-component`

## 수행 절차

### 1. 시작 노드 선정

- 프론트 시작점: `test-project/frontend/src/views/ProductDetailView.vue`
- 백엔드 시작점: `test-project/backend/src/main/java/com/example/controller/ProductController.java`
- DB 시작점: `ProductMapper.xml`에서 찾은 실제 table

### 2. 파일별 역할 적기

아래 형식으로 기록한다.

- 이 파일은 무엇을 정의하는가
- 어떤 parser가 이 파일을 읽는가
- 어떤 node를 만드는가
- 어떤 edge를 만드는가

### 3. 연결 단계 적기

- 파서 단계에서 만들어지는 edge
- linker 단계에서 해소되는 edge
- analyzer 단계에서 활용되는 relation

### 4. 결과 검증

아래 질문에 답한다.

- api-call-site는 어떤 URL과 method를 갖는가
- endpoint는 어떤 path와 method를 갖는가
- mapper와 statement는 어떻게 이어지는가
- table node는 어떤 statement에서 생성되는가

## 제출 산출물

- [system-trace-template.md](/home/ubuntu/workspace/vue_dependency_analyzer/docs/education/templates/system-trace-template.md) 기반 추적서 3개
- Golden Path 요약 1장

## 통과 기준

- 최소 3개의 path를 end-to-end로 설명할 수 있다.
- parser/linker/analyzer 경계를 구분해서 적었다.
- synthetic node와 file-backed node를 구분했다.
