# Module 08. 제품 표면과 운영

## 1. 목적

엔진 내부만이 아니라 실제 사용 표면과 운영 제약을 함께 이해한다.

## 2. 핵심 파일

- `packages/cli/src/index.ts`
- `packages/cli/src/commands/*.ts`
- `packages/server/src/index.ts`
- `packages/server/src/routes/*.ts`
- `packages/web-ui/src/App.vue`
- `packages/web-ui/src/stores/graphStore.ts`
- `packages/web-ui/src/components/graph/*.vue`

## 3. CLI가 제공하는 것

- `analyze`: 전체 분석과 요약
- `serve`: 서버 실행
- `export`: graph 내보내기
- `impact`: 변경 영향도 분석
- `lint`: 아키텍처 규칙 점검
- `init`: 프로젝트 구조 자동 감지

CLI는 단순 편의도구가 아니라 운영 자동화의 시작점이다.

## 4. 서버 API가 제공하는 것

### graph 계열

- `/api/graph`
- `/api/graph/node`
- `/api/graph/node/impact`
- `/api/graph/paths`
- `/api/graph/matrix`

### analysis 계열

- `/api/analysis/dto-consistency`
- `/api/analysis/change-impact`
- `/api/analysis/rule-violations`
- `/api/analysis/overlays`
- `/api/analysis/parse-errors`
- `/api/analysis/unresolved-edges`

### 보조 기능

- `/api/search`
- `/api/source-snippet`
- `/ws`

## 5. UI가 제공하는 관점

- Force Graph: 전체 구조 탐색
- Tree View: dependency/dependent 트리
- Matrix View: 관계를 매트릭스로 보기
- Bottom-Up View: DB table에서 화면까지 역추적
- overlays: circular, orphan, hub, impact, path 강조

## 6. 운영 관점 핵심

### watch mode

파일 변경을 감지하고 그래프를 갱신한다.

### cache

분석 속도뿐 아니라 결과 일관성의 핵심이다.

### parse errors / unresolved edges

이 둘은 운영자에게 매우 중요하다. 분석이 "실패했는지", 아니면 "제한된 범위에서 성공했는지"를 구분하게 해준다.

## 7. 폐쇄망 반입 시 추가로 필요한 것

현재 저장소만으로는 부족한 항목들이다.

- 오프라인 빌드/패키징
- 사설 npm registry 또는 패키지 미러
- SBOM
- 오픈소스 라이선스 점검
- 인증/권한/RBAC
- 감사 로그
- 분석 이력 및 승인 흐름
- 운영 모니터링과 백업/복구

## 8. 실습 포인트

- `serve`로 서버를 띄운 뒤 API를 직접 호출해보기
- WebSocket progress 이벤트 흐름 적기
- UI의 각 view가 어떤 graph query 관점인지 연결하기
- parse error와 unresolved edge를 의도적으로 상상해보고 운영 대응 적기

## 9. 체크 질문

- 왜 이 도구는 단순 라이브러리가 아니라 제품 표면이 필요한가
- Bottom-Up View는 어떤 edge semantics를 전제로 하는가
- parse error panel과 unresolved edge panel은 운영상 왜 중요한가
- 폐쇄망에서 가장 먼저 막히는 것은 코드가 아니라 무엇인가
