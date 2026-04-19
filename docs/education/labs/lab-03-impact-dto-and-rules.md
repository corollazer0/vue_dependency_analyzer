# Lab 03. Impact, DTO, Rule 실습

## 목적

이 실습의 목표는 이 프로젝트가 단순 시각화 도구가 아니라, 변경 영향 분석과 품질 통제 도구라는 점을 체득하는 것이다.

## 준비 명령

```bash
node packages/cli/dist/bin/vda.js impact . --config test-project-ecommerce/.vdarc.json --files test-project-ecommerce/backend/product-service/src/main/java/com/shop/product/controller/ProductController.java
node packages/cli/dist/bin/vda.js lint test-project-ecommerce --config .vdarc.json
```

## 수행 절차

### A. Change Impact

- changed file를 1개 정한다.
- changedNodes, directImpact, transitiveImpact를 구분한다.
- affectedEndpoints, affectedTables를 따로 적는다.

### B. DTO Consistency

- endpoint 하나를 정한다.
- backend DTO 이름과 필드를 적는다.
- frontend interface 이름과 필드를 적는다.
- 누락과 타입 불일치를 적는다.

### C. Rule Violations

- `rules` 설정을 읽는다.
- 각 rule이 어떤 위험을 막으려는지 적는다.
- 실제 위반이 생기면 어떤 팀에게 어떤 지시를 해야 하는지 적는다.

## 제출 산출물

- 영향도 요약 1장
- DTO 정합성 사례 2개
- Rule 해설 문서 1장

## 통과 기준

- direct와 transitive의 차이를 설명했다.
- DTO mismatch를 필드 수준에서 설명했다.
- rule이 기술적 제약이 아니라 조직 통제와도 연결된다는 점을 적었다.
