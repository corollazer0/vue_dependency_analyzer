# Module 07. 분석기와 품질 기능

## 1. 목적

그래프 위에서 실제로 어떤 분석 가치가 계산되는지 이해한다.

## 2. 핵심 파일

- `packages/core/src/analyzers/CircularDependencyAnalyzer.ts`
- `packages/core/src/analyzers/OrphanDetector.ts`
- `packages/core/src/analyzers/ComplexityScorer.ts`
- `packages/core/src/analyzers/ImpactAnalyzer.ts`
- `packages/core/src/analyzers/DtoConsistencyChecker.ts`
- `packages/core/src/analyzers/RuleEngine.ts`
- `packages/core/src/git/ChangeImpactAnalyzer.ts`

## 3. Circular Dependency

- Tarjan SCC 알고리즘 기반
- 순환은 구조적 결함 신호다
- 전체 그래프뿐 아니라 특정 edge kind 집합에 대해서도 볼 수 있다

## 4. Orphan / Hub / Complexity

- orphan: 아무도 참조하지 않는 노드
- hub: 너무 많은 의존자를 가진 노드
- complexity: fan-in / fan-out 기반 구조 지표

이 값들은 설계 리팩터링 후보를 찾는 데 유용하다.

## 5. ImpactAnalyzer

핵심은 reverse traversal이다.

- 내가 바뀌면 누가 깨지는가
- direct dependents는 1-hop
- transitive dependents는 전체 reachable set

## 6. DtoConsistencyChecker

백엔드 DTO와 프론트 TS interface를 비교한다.

비교 축은 아래다.

- frontend missing field
- backend missing field
- type mismatch
- optional 여부

즉, 단순 존재 여부가 아니라 타입 호환성까지 본다.

## 7. RuleEngine

이 도구가 제품형으로 확장될 때 매우 중요하다.

대표 rule 유형:

- `deny-circular`
- `deny-direct`
- `allow-only`
- `max-depth`
- `max-dependents`

즉, 단순 시각화가 아니라 아키텍처 통제 도구로도 갈 수 있다.

## 8. Git Change Impact

- changed file를 graph node로 매핑
- 직접 영향과 전이 영향을 계산
- affected endpoint, affected table을 추출

폐쇄망 운영에서 변경 승인, 영향 예측, 검증 범위 선정과 연결된다.

## 9. 실습 포인트

- 하나의 변경 파일을 넣고 영향 노드 종류를 분류
- DTO mismatch 사례를 손으로 예측한 뒤 결과 확인
- rule violation을 일부러 만드는 fixture를 가정해보기

## 10. 체크 질문

- impact는 왜 reverse traversal인가
- rule engine은 왜 edge kind filter를 받는가
- DTO consistency는 어떤 metadata가 있어야 동작하는가
- circular dependency와 max-depth는 어떤 서로 다른 문제를 보는가
