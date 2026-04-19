# 의존성 분석 도구로서의 Pain Point 분석 및 기능 제안서

> 작성일: 2026-04-18
> 범위: 성능 최적화(Phase-Ultra) 외, **의존성 분석 도구의 사용자 가치** 관점에서 현 VDA 의 기능을 비판적으로 검토
> 관점: 실무 개발자(시니어 백엔드·프론트엔드·아키텍트) 가 일상 업무에서 실제로 겪는 pain 을 해결하는지
> 대상: Phase-Ultra 착수와 별개로, Phase 7+ 의 기능 로드맵 설계용

---

## 1. 프레임워크 — 의존성 분석 도구의 5대 Painpoint

Vue + Spring Boot + MyBatis 라는 풀스택 환경을 가진 조직에서 의존성 분석 도구가 해결해야 하는 문제는 아래 5가지로 수렴한다.

| # | Painpoint | 질문 형태 |
|---|---|---|
| P1 | **변경 영향 예측의 불확실성** | "이 파일 고치면 누구까지 깨지나?" |
| P2 | **죽은 코드·과잉 결합의 누적** | "지워도 되는 파일은 어떤 것들인가?" |
| P3 | **아키텍처 경계 침범** | "컨트롤러가 Repository 를 직접 부르는 게 있나?" |
| P4 | **온보딩·지식 전수** | "이 기능은 어디서부터 보면 되나?" |
| P5 | **장애 대응 시 원인 추적** | "이 API 느려지면 실제로 어디가 문제인가?" |

VDA 는 P1·P2·P3 에는 강하게, P4·P5 에는 약하게 대응 중이다. 아래 2·3절에서 현황을, 4·5절에서 개선안을 제시한다.

---

## 2. 현 VDA 기능 매핑 — 무엇을 얼마나 풀고 있나

### 2-1. P1 (변경 영향 예측) — **커버리지 70%**

- **구현됨**
  - `git` 기반 Change Impact Analyzer (`packages/core/src/git/ChangeImpactAnalyzer.ts`)
  - `impactOf()` 쿼리 (`packages/core/src/graph/query.ts:64`)
  - CLI `vda impact --diff HEAD~1..HEAD` / UI `ChangeImpactPanel`
  - 서버 API `/api/analysis/change-impact`
- **미흡한 지점**
  - **"깨지나" 의 기준이 의존 그래프 도달성뿐**. 실제로는 "API 호환성 깨짐", "DB 컬럼 제거", "DTO 필드 변경으로 런타임 오류" 같은 **타입 수준 breaking change** 가 핵심인데 여기는 미탐지
  - **PR 레벨 리포트 포맷** 없음 (CLI JSON 은 있으나 GitHub PR 코멘트 템플릿 부재)
  - 영향도 **점수화**(예: 파급 노드 N개 + 테스트 커버리지 가중) 없이 단순 리스트

### 2-2. P2 (죽은 코드·결합도) — **커버리지 50%**

- **구현됨**
  - Orphan Detector (고립 노드), Tarjan SCC (순환), Complexity Scorer (fan-in·out)
- **미흡한 지점**
  - **실제 "죽은" 판정 근거가 약함** — 엔트리 포인트(라우터, main.ts, Controller) 역추적(reachability from roots)이 orphan 검출과 합쳐져야 실용적. 현재는 "엣지 0" 만으로 판정하므로 false negative 다수 (ex: main.ts 에서만 한 번 쓰이는 화면도 orphan 로 뜨지 않음)
  - **decommission 워크플로우** 부재: "이 파일을 지우려면 무엇을 함께 지워야 하는가" (리버스 영향) 가 분리된 UI 로 없음
  - Complexity Score 는 **임계치 기반 알람** 이 없음 (fan-in > 8 같은 규칙은 있으나 "God Object" 같은 패턴 탐지는 없음)

### 2-3. P3 (아키텍처 경계) — **커버리지 80%**

- **구현됨** (Phase X-2a)
  - RuleEngine 5종(deny-circular / deny-direct / allow-only / max-depth / max-dependents)
  - Mermaid/PlantUML 내보내기, 심각도(error/warning), CLI exit code
- **미흡한 지점**
  - **레이어 규칙 원형 표현 없음**: "controller → service → repository" 같은 **DSL 레벨** 의 아키텍처 표현이 없고, 모든 규칙을 쌍 단위로 써야 함
  - **규칙 위반의 "왜" 설명 부족**: violation 리포트가 "A → B 허용 안됨" 만 출력. 어떤 규칙의 어떤 조항에 걸렸는지, 제안 대안은 무엇인지 없음
  - **예외 허용(waiver) 관리 없음**: 레거시 코드에서는 "이 케이스만 당분간 허용" 이 현실인데, `.vdaignore` 나 inline suppression 이 없음

### 2-4. P4 (온보딩·지식 전수) — **커버리지 20%**

- **구현됨**
  - Web UI 의 4개 뷰, 검색, PathFinder
  - URL Hash 공유
- **미흡한 지점** (가장 큰 공백)
  - **"기능 단위 스토리" 표현 없음**: 개발자가 새 프로젝트에서 제일 먼저 묻는 "결제 기능은 어디부터 보면 돼?" 에 답하는 장치가 없다. 노드가 수백-수천 개인데 검색으로 들어가도 "시작점" 이 없음
  - **주석·PR·커밋 메시지 같은 자연어 컨텍스트 통합 없음** — git blame / PR link 가 노드 메타데이터에 없음
  - **"중요도" 힌트 없음** — 신입이 first load 때 어떤 노드가 도메인 핵심인지 구분 불가

### 2-5. P5 (장애 대응·런타임 원인 추적) — **커버리지 10%**

- **구현됨**
  - API call site → Spring endpoint 매핑, MyBatis → db-table
- **미흡한 지점**
  - **정적 분석만으로는 P5 에 못 닿음**: APM/로그/OpenTelemetry 데이터와의 조인이 없음
  - "이 엔드포인트 slow log 원인이 이 쿼리" 를 연결할 축 없음

---

## 3. 현 기능의 "품질" 이슈 — 이미 구현됐지만 개선 필요

Phase 6 오딧·코드 레벨 확인에서 드러난 **기능 완성도** 이슈. Phase-Ultra 성능 트랙과 별개로 다룰 필요가 있다.

### 3-1. `findPaths` 의 제품 수준 문제 (성능 외 의미)
- `packages/core/src/graph/query.ts:97` DFS 는 **순환 방지만 할 뿐 최단 경로 보장 없음**. "A→B 경로" 를 찾을 때 사용자가 기대하는 것은 **1) 짧은 순 2) 의미 있는 순(예: import 체인) 3) 다양한 경로 샘플** 이다. 현 구현은 모든 경로를 DFS 로 나열 후 결과 캡만 걸면 되는 Phase-Ultra 수정안이 있으나, **경로 스코어링**(짧을수록·타입 일관성 높을수록 가중치)이 빠져 있다.

### 3-2. Orphan 판정 근본 재정의 필요
- 현재 `OrphanDetector` 는 "in·out 엣지 0" 기준. 실제로는 **"엔트리 포인트(RestController · @Scheduled · main.ts · router 진입점)로부터 도달 불가"** 가 정답. 이걸 바꾸지 않으면 CLI가 "orphan 0" 이라 오해를 부를 수 있다.

### 3-3. `ComplexityScorer` 결과의 actionability
- fan-in × fan-out 만 제시되고, **권장 조치**(분리, 파사드 도입, 하위 도메인 이관)는 없음. 사용자는 "hot node" 리스트를 받고 무엇을 해야 할지 모름. 점수 + **패턴 분류**(God Object · Entry Hub · Utility Sink) 를 같이 내야 실무적임.

### 3-4. DTO Consistency Checker 는 edge type 만 정의됨
- Phase 6 오딧 기준 `dto-flows` 엣지는 생성되지 않음. `DtoConsistencyChecker` 가 fan 기능으로만 남아 있다. 실무에서 가장 빈번한 장애 원인(Vue DTO ↔ Spring DTO ↔ Entity 필드 불일치)을 다루는 기능이므로 **완성 우선순위 최상**.

### 3-5. 현재 Java 파서는 어노테이션 기반만 다룸
- Kotlin Sealed class, Java record, Bean validation 어노테이션, Jackson @JsonProperty 등 **타입 수준 정보** 가 미수집. 3-4 의 DTO Consistency 완성과 함께 필요.

### 3-6. Vue 파서는 실제 API 호출을 정확히 잡지 못할 가능성
- `api-call-site` 는 `axios.get('/x')` 같은 리터럴만 잡을 것으로 보임. 실무에서는 **axios 인스턴스 + baseURL + 템플릿 리터럴 + 변수 조립** 형태가 대다수. 커버리지 측정 · 샘플 케이스 검증 필요.

### 3-7. MSA 다중 서비스는 config 만 있고 실행 미연결
- `.vdarc.json` services[] 가 로드되지만 `analyze` / `serve` 가 실제 사용하지 않는 Phase 6 P3. **11개 서비스 규모를 타겟으로 한다면 가장 먼저 복원되어야 할 기능.**

---

## 4. 신규 기능 제안 (우선순위순)

> 아래 제안의 공통 원칙:
> - **정적 분석으로 유의미한 것만**. 런타임/APM 통합은 별도 트랙으로 분리
> - **"정보 제시" 가 아니라 "의사결정 지원"** 이 되도록 설계
> - 기존 4개 뷰·RuleEngine·Impact 에 얹는 방식이어야 함

### P0 — 완성도 보강 (Phase 7 착수 권장)
기존 기능의 약한 부분을 제품 수준으로 올리는 작업. 신규 가치보다 크다.

#### F1. **DTO Consistency 완전 구현 + 확장**
- Vue 의 TS interface ↔ Spring DTO ↔ MyBatis ResultMap ↔ DB column 을 단일 그래프로 연결
- 필드 단위 `dto-flows` 엣지 생성
- 누락·타입 불일치·nullable 불일치를 위반으로 검출
- **왜 P0**: 실장애에서 가장 자주 발생하는 종류이면서 정적 분석으로만 높은 ROI

#### F2. **Entrypoint-aware Orphan / Dead Code**
- `@RestController`, `@Scheduled`, `@EventListener`, Vue router, main.ts, `vue-router` 정의, worker 등록을 **엔트리 포인트** 로 선언
- 엔트리 집합에서 도달 불가한 노드를 "dead" 로 리포트
- 파일 삭제 시 함께 삭제 가능한 의존 파일을 계산 (`vda decommission <file>`)
- **왜 P0**: 현재 Orphan 정확도가 낮아 쓰이지 않음

#### F3. **아키텍처 레이어 DSL**
```yaml
layers:
  - name: presentation
    includes: ["**/controller/**", "src/views/**"]
  - name: application
    includes: ["**/service/**"]
  - name: infrastructure
    includes: ["**/repository/**", "**/mapper/**"]
rules:
  - presentation -> application -> infrastructure  # allow only downward
  - deny: presentation -> infrastructure
```
- 기존 5종 rule 을 내부적으로 생성. 사용자는 **레이어 모델** 을 선언
- **왜 P0**: 현 RuleEngine 은 일반적이지만 실제 조직이 쓰기에는 너무 저레벨

### P1 — 신규 핵심 가치

#### F4. **"Feature Slice" — 기능 단위 지식 맵**
- `.vdarc.json` 에 `features[]` 선언 가능:
  ```json
  "features": [
    { "id": "payment", "entry": "src/pages/Checkout.vue" },
    { "id": "order", "entry": "src/pages/OrderList.vue" }
  ]
  ```
- 각 feature 의 entry 로부터 도달 가능한 노드 집합 = "기능 슬라이스"
- UI 에 **Feature 탭** 추가 → 기능별 독립 서브그래프 시각화
- 온보딩 시 "결제 기능 보러 가기" 클릭으로 진입
- **차별점**: 단순 검색이 아닌, **domain-centric 진입점**. 실무에서 가장 자주 부재하는 기능.

#### F5. **PR Review Report (Markdown / GitHub Comment)**
- `vda impact --diff HEAD~1 --format github-pr` 출력:
  ```markdown
  ## 📊 Dependency Impact Report
  * Files changed: 4
  * Directly affected: 12 nodes (3 DB tables, 5 endpoints)
  * Transitively affected: 47 nodes
  * ⚠️ Breaking risks: 2 (DTO field removed, endpoint param type changed)
  * ✅ Architecture rules: passing
  ```
- GitHub Actions 바인딩 예시 포함
- **왜 P1**: P1 painpoint(영향 예측) 의 가치는 "PR 에서 보이는가" 여부가 90%

#### F6. **Breaking Change Detector**
- Java/TS 타입 시그니처 저장 → diff 시 "signature" 레벨 변경 감지
- 감지 종류:
  - DTO 필드 제거 / 필수화
  - 엔드포인트 파라미터 타입 변경
  - DB 컬럼 삭제 (MyBatis SQL 분석)
  - 공개 메서드 시그니처 변경
- **왜 P1**: F5 PR Report 의 신뢰도를 결정짓는 구성요소

#### F7. **Waiver / Ignore 체계**
- `.vdaignore` 파일 또는 inline 주석:
  ```
  # file: .vdaignore
  deny-direct controller→repository { file: "legacy/OldController.java", reason: "TICKET-123", expires: "2026-12-31" }
  ```
- 만료 날짜 지난 waiver 는 위반 재등장
- **왜 P1**: 규칙이 실무에 도입되려면 반드시 필요

### P2 — 중장기 가치

#### F8. **Git Blame · PR · Commit 통합**
- 노드 메타데이터에 `lastModified`, `lastCommitMessage`, `owners` (git blame top 3 contributors) 주입
- UI 에서 노드 선택 시 "최근 변경 맥락" 패널
- **조건**: 캐시 레이어 재설계 선행 (대규모 리포에서 git blame 은 느림)

#### F9. **Complexity Anti-Pattern Classifier**
- fan-in/out 값만이 아닌 **패턴 분류**:
  - **God Object**: fan-out 많음 + 파일 크기 큼 + 연루 패키지 다수
  - **Entry Hub**: fan-in 많음 + out 적음 → 의도된 퍼사드
  - **Utility Sink**: in 많음 + out 0 → 지속 확장 주의
- 분류별 권장 리팩토링 액션 태그

#### F10. **Service-to-Service (MSA) 의존성 분석**
- 11개 Spring 서비스간 HTTP 호출 / Kafka topic / gRPC 추적
- 개별 서비스 내부가 아닌 **서비스 그래프** 별도 뷰
- `service-mesh` vs "코드에서 실제 부르는 서비스" 교차 검증
- **왜 P2**: 2-3절 3-7 의 MSA config 복원 완료 이후 가능

#### F11. **Schema Drift Detector**
- `CREATE TABLE` DDL 파일과 MyBatis SQL 의 실제 참조 테이블/컬럼을 비교
- 존재하지 않는 컬럼 참조 경고

#### F12. **Architecture Diff Over Time**
- 각 분석 결과를 타임스탬프로 저장, 시간축 그래프에 **"규칙 위반 수", "순환 수", "hub 노드 수"** 트렌드 표시
- 조직에 **아키텍처 부채가 늘어나는지 줄어드는지** 객관화

### P3 — 선택 가치 (구현 비용 큼)

- **F13 IDE Extension (VSCode)**: 파일 열 때 패널에 해당 파일의 impact·rule-violation 노출
- **F14 C4 / Structurizr Export**: 기존 PlantUML export 의 상위 호환
- **F15 AI-assisted Explain**: "이 노드는 어떤 역할?" 을 LLM 에 노드 이웃 컨텍스트만 전달해 요약 (온디바이스 모델 고려)

---

## 5. 제안 기능의 상호 의존도

```
F1 DTO Consistency ─┬─> F6 Breaking Change Detector ─> F5 PR Report
F3 Layer DSL ───────┤                                    │
F7 Waiver ──────────┘                                    │
F2 Entrypoint Orphan ─> F9 Anti-Pattern Classifier       │
F4 Feature Slice ─────────────────────────────────┬──────┘
                                                  │
F8 Git Blame ─────────────────────────────────────┤
F10 MSA ─> (Phase 6 P3 복원) ───────────────────> F12 Diff Over Time
F11 Schema Drift ─> F1 확장
```

**우선순위 제안**:
1. **Phase 7 (3-4주)**: F1 + F2 + F3 — 기존 기능 정수화
2. **Phase 8 (3-4주)**: F5 + F6 + F7 — PR 통합 패키지
3. **Phase 9 (3-4주)**: F4 + F9 — 온보딩/품질 가이드
4. **Phase 10+ (조건부)**: F8, F10~F15 는 실사용 데이터 기반으로 취사선택

---

## 6. 무엇을 만들지 말아야 하나 (Anti-Suggestions)

- **런타임 프로파일러 자체 구축**: APM·OTel 과 경쟁하지 말 것. 연동만 하라
- **자체 IDE 개발**: VSCode extension 으로 충분
- **LLM 에 대규모 그래프 전체 투입**: 노드 컨텍스트 제한된 기능(F15 등)만 취할 것
- **실시간 코드 작성 보조(Copilot 유사 기능)**: 도구 정체성 흐림
- **모든 프레임워크 지원**: Vue + Spring Boot(+ Kotlin) 로 한정할 때 품질이 유지됨. Next.js / Nuxt 지원은 유혹이지만 ROI 저조

---

## 7. 결론

VDA 는 **경계 규칙(P3)과 영향 분석(P1)** 에서 이미 업계 상위 수준에 가깝다. Phase-Ultra 가 **성능 병목을 제거**하는 트랙이라면, Phase 7+ 는 **"있는 기능의 완성도"(F1~F3)와 "PR 워크플로우 결합"(F5~F7)** 에 투자했을 때 ROI 가 가장 크다.

가장 중요한 단일 결정은 이것이다:

> **VDA 의 성공 지표를 "그래프 정확도" 에서 "PR 에서 인용되는 빈도" 로 재정의하라.**

즉, CLI/UI 에서 보는 도구가 아니라 **모든 PR 의 기본 코멘트로 붙는 도구** 로 포지셔닝할 때 조직에 락인된다. F5 PR Report 와 F6 Breaking Change Detector 가 이 포지셔닝을 결정하는 핵심 기능이다.

성능과 기능 개선은 독립 트랙이 아니다. 제품 가치가 커지면 데이터량이 커지고, 데이터량이 커지면 성능이 다시 핵심이 되므로, **두 로드맵은 피드백 루프로 설계**되어야 한다.

— 본 제안은 현재(2026-04-18) 기능 상태를 기준으로 하며, Phase 7 착수 전 사용자 인터뷰 3-5건으로 F1·F2·F5 의 우선순위를 재검증하기를 권장한다.
