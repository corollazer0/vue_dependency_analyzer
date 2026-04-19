# 핵심 용어집

## 정적 분석

코드를 실행하지 않고 소스 자체를 읽어 구조와 관계를 추출하는 방식.

## AST

Abstract Syntax Tree. 코드를 기계가 분석하기 쉬운 트리 구조로 표현한 것.

## Parse Result

파서가 파일 하나를 읽고 만든 결과. 보통 `nodes`, `edges`, `errors`로 구성된다.

## Node

그래프의 점. 이 시스템에서는 컴포넌트, store, endpoint, service, mapper, table 등이 노드가 된다.

## Edge

그래프의 선. 어떤 노드가 다른 노드에 의존하거나 연결되는 관계를 표현한다.

## NodeKind

노드 종류. 예: `vue-component`, `spring-endpoint`, `db-table`.

## EdgeKind

엣지 종류. 예: `imports`, `api-call`, `spring-injects`, `reads-table`.

## unresolved edge

파서 단계에서는 목표를 정확히 모를 때 임시로 남겨두는 엣지. 이후 linker가 실제 target으로 바꾼다.

## Parser

파일 내용을 읽어서 사실을 추출하는 구성요소.

## Linker

파서가 만든 분리된 사실들을 실제 관계로 연결하는 구성요소.

## Analyzer

그래프 위에서 순환, 영향도, 정합성, 규칙 위반 같은 계산을 수행하는 구성요소.

## Impact

어떤 노드나 파일이 바뀌었을 때 영향을 받는 다른 노드 집합.

## Upstream / Downstream

의존성 방향을 기준으로 위/아래를 나타내는 표현. 이 시스템에서는 "누가 나를 쓰는가", "내가 누구를 쓰는가"를 구분할 때 중요하다.

## Reverse Semantic Edge

물리적 edge 방향과 의미적 추적 방향이 다른 경우. 예를 들어 `api-serves`, `mybatis-maps`.

## cold run

캐시 없이 전체를 처음 분석하는 실행.

## warm run

캐시를 사용해 이전 결과를 재활용하는 실행.

## incremental analysis

일부 변경 파일만 다시 파싱하고 나머지는 재사용하는 분석 방식.

## Golden Path

핵심 기능 흐름을 대표하는 정상 경로. 가장 먼저 끝까지 추적해야 하는 흐름.

## DTO

데이터 전달 객체. 이 프로젝트에서는 Request/Response/Dto/Summary/Detail 같은 이름 규칙으로 자주 식별한다.

## MyBatis Mapper

Java interface와 XML SQL 매핑을 연결해주는 구성. XML의 `namespace`와 `id`가 핵심이다.

## serviceId

MSA 또는 다중 서비스 프로젝트에서 노드가 어느 서비스에 속하는지를 나타내는 메타데이터.

## parse error

파싱 중 생긴 오류. 분석 실패가 아니라 그래프 메타데이터의 일부로 유지될 수 있다.

## supported pattern

정적 분석기가 자동으로 감지 가능한 코드 패턴.

## unsupported pattern

현재 분석기가 감지하지 못하거나 일부만 감지하는 패턴.

## product surface

사용자가 직접 접하는 표면. 이 프로젝트에서는 CLI, REST API, WebSocket, Web UI가 해당된다.
