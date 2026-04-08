# 제품 요구사항 정의서 (PRD): 풀스택 프로젝트 의존성 분석기

## 1. 프로젝트 개요 (Overview)
본 프로젝트는 소스 코드의 AST(Abstract Syntax Tree) 정적 분석을 기반으로, 프론트엔드(Vue 3)부터 백엔드(Spring Boot), 그리고 데이터베이스(DB Table)에 이르는 전체 시스템의 의존성을 완벽하게 추적하고 시각화하는 최고 수준의 엔터프라이즈급 의존성 분석 도구 개발을 목표로 합니다. 

## 2. 핵심 목표 (Objectives)
* **Full-Stack Visibility:** 프론트엔드 렌더링부터 백엔드 쿼리 실행까지 이어지는 엔드투엔드(E2E) 의존성 파악.
* **Architecture Insight:** 헤어볼(Hairball) 현상을 방지하는 최적화된 UX/UI 제공 및 아키텍처 리팩토링 타겟 자동 식별.
* **Single Source of Truth:** 별도 문서에 의존하지 않고, 실제 소스 코드(전처리 파싱) 기반의 100% 신뢰 가능한 정합성 확보.

---

## 3. 기능적 요구사항 (Functional Requirements)

### 3.1. 시각화 및 내비게이션 (UX/UI Foundations)
* **초기 로딩 클러스터링:** 대규모 노드 렌더링 시 도메인/모듈 단위로 그룹화하여 시각적 인지 부하 최소화.
* **좌우측 패널 접기(Toggle):** 캔버스(Canvas) 작업 공간을 극대화하기 위한 사이드바 토글 기능.
* **GNB 브레드크럼:** 노드 탐색 시 진입점부터 현재 노드까지의 탐색 뎁스(Depth) 및 경로 제공.
* **시맨틱 줌(Semantic Zoom) & LOD:** 화면 확대/축소 레벨에 따라 정보의 상세도(라벨 숨김 -> 요약 -> 전체 메타데이터)를 동적 조절.
* **미니맵(Minimap):** 전체 그래프 아키텍처 내에서 현재 화면이 위치한 영역을 우측 하단에 표시.
* **로컬 기반 탐색 이력 유지:** `localStorage` 또는 `IndexedDB`를 활용하여 최근 확인한 노드, 검색어, 경로 상태 복구 기능.

### 3.2. 인터랙션 및 애니메이션 (Advanced Interaction)
* **마우스오버 자석 효과(Local Repulsion):** 밀집 구역에서 특정 노드에 마우스 오버 시, 겹침을 방지하기 위해 주변 노드들이 국소적으로 밀려나는 애니메이션.
* **검색 포커스 모드(Ego-Network Toggle):** 검색한 특정 노드 및 직접 연결된 1-Depth 노드만 남기고, 나머지 그래프 배경은 투명화(Dimming) 처리.
* **엣지 번들링(Edge Bundling):** 동일한 흐름을 가지는 다수의 연결선(Edge)을 굵은 다발 형태로 묶어 정보 과부하 방지.

### 3.3. 심층 분석 및 추적 (Deep Analysis & Tracking)
* **임팩트 분석(Impact Analysis):** 특정 노드 수정 시 파급을 받는 상위(Upstream)/하위(Downstream) 영향도 하이라이트.
* **경로 추적(Pathfinding):** 선택한 두 노드 A와 B 사이의 최단 의존성 경로 및 가능한 모든 연결선 단독 시각화.
* **순환 의존성(Circular Dependency) 감지:** 아키텍처 결함인 순환 참조 구간을 자동 식별하여 경고 색상(Red)으로 표시.
* **고립 노드 & 허브 노드 식별:** 참조되지 않는 데드 코드(Orphan Node)와 과도하게 결합된 병목 노드(God Module) 시각적 분리.
* **의존성 강도/타입 필터링:** 정적 임포트, 동적 임포트, 타입 참조 등 연결 속성에 따른 선 스타일(점선/실선) 구분 및 필터 토글 제공.
* **고급 조건 쿼리 & 서브 그래프 추출:** 아웃바운드 연결 N개 이상 등 그래프 구조 기반 검색 및 특정 클러스터 영역의 JSON/이미지 Export 지원.

### 3.4. Vue 3 생태계 특화 분석 (Frontend AST Analytics)
* **Vue Router 경로 파싱:** `routes` 배열 및 `router.push()` 등을 분석하여 화면(Page) 중심의 진입점(Entry) 의존성 도출.
* **Pinia Store 구독 추적:** `defineStore`와 `storeToRefs` 등을 파싱하여, UI 컴포넌트가 구독 중인 특정 전역 상태(State/Action) 매핑.
* **Composition API (Composables) 분석:** `<script setup>` 내 커스텀 훅(`useXXX`)의 재사용성(Fan-in) 및 비즈니스 로직 결합도 분석.

### 3.5. Spring Boot 백엔드 심층 분석 (Backend AST Analytics)
* **어노테이션 기반 DI 추적:** `@Autowired`, `@RequiredArgsConstructor` 파싱 및 인터페이스-구현체(Impl) 간 런타임 바인딩 정적 분석.
* **MyBatis 연결 브릿지 파싱:** Java Mapper 인터페이스와 XML 내부 `namespace`, `id`를 크로스 체크하여 E2E 쿼리 실행 흐름 매핑.
* **DTO 중심 데이터 플로우 분석:** Controller-Service-Repository 레이어를 관통하는 DTO(Request/Response) 객체의 전달 흐름 추적.
* **Configuration 및 Bean 분석:** `@Configuration` 내 팩토리 메서드 및 프레임워크 레벨의 숨겨진 주입 객체 식별.

### 3.6. 프론트-백엔드 크로스보더 결합 (Cross-border Dependency)
* **엔드포인트(Endpoint) 자동 매칭:** 프론트 HTTP 클라이언트(Axios)의 URL/Method와 백엔드 Controller 매핑.
* **API 스펙 변경 임팩트 전파:** 백엔드 DTO/파라미터 변경 시 영향을 받는 프론트엔드의 최종 화면 컴포넌트까지 위험도 전파 선 시각화.
* **DTO 정합성 검사:** 백엔드 Response DTO와 프론트엔드 TypeScript Interface 간의 타입 누락 및 불일치 자동 감지.

### 3.7. 이벤트/메시징 기반 분석 (Loose Coupling Tracking)
* **프론트엔드 Event 흐름:** Vue `emit` 및 컴포넌트 간 통신(Event Bus 등)의 가상 엣지(Virtual Edge) 시각화.
* **백엔드 Event 흐름:** Spring `ApplicationEventPublisher` 및 `@EventListener` 기반의 비동기 트랜잭션 의존성 연결.

### 3.8. 데이터베이스 테이블 레이어 확장 (Data Layer Connectivity)
* **테이블 노드화 및 CRUD 매핑:** MyBatis XML의 SQL(`SELECT`, `INSERT` 등)을 파싱하여 DB 테이블을 최하단 뎁스의 노드로 생성.
* **Bottom-up 영향도 추적:** DB 테이블 스키마 변경 시, 관련된 XML -> Backend -> Frontend UI까지 역추적하는 파급 효과 분석.

### 3.9. 컨텍스트 드릴다운 & 메타데이터 관리 (Context & Metadata)
* **인라인 소스 스니펫 뷰어:** 엣지(선) 클릭 시, 의존성이 발생한 실제 소스 코드 라인 및 코드 블록 팝업 제공.
* **컴포넌트 명세 외부 연결:** UI 컴포넌트 노드 클릭 시 연관된 디자인 시스템 가이드(Figma, Storybook) 외부 링크 이동.
* **파싱 맹점 리포트 및 수동 연결:** 정적 분석이 실패한 동적 임포트/리플렉션 구간 리포팅 및 사용자가 직접 엣지를 드래그 앤 드롭으로 연결하는 수동 맵핑 기능.

### 3.10. AI Transformation (AX) 기능
* **AI 의존성 요약:** 복잡한 클러스터 선택 시, 해당 모듈들의 역할과 결합 이유를 LLM 기반 자연어로 요약 설명.
* **AI 리팩토링 제안:** 과도한 결합도, 핫스팟(잦은 변경) 구역을 분석하여 아키텍처 분리 및 개선 가이드 자동 제공.

---

## 4. 비기능적 요구사항 (Non-Functional Requirements)
* **렌더링 성능 최적화:** WebGL/Canvas 기반의 특화 렌더링 엔진(e.g., Sigma.js, Force-Graph) 도입 및 Web Worker를 활용한 레이아웃 백그라운드 연산 처리로 1,000개 이상의 노드 환경에서 60fps 보장.
* **프론트엔드 아키텍처:** UI 프레임(사이드바, 검색창 등)은 Vue 3 컴포넌트 주도 개발(CDD)을 적용하여 확장성 확보.