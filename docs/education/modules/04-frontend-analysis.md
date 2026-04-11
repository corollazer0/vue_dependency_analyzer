# Module 04. 프론트엔드 분석

## 1. 목적

Vue 3 + TypeScript 파일에서 어떤 구조를 추출하는지 이해한다.

## 2. 핵심 파일

- `packages/core/src/parsers/vue/VueSfcParser.ts`
- `packages/core/src/parsers/vue/ScriptAnalyzer.ts`
- `packages/core/src/parsers/vue/TemplateAnalyzer.ts`
- `packages/core/src/parsers/typescript/TsFileParser.ts`
- `packages/core/src/parsers/typescript/ImportResolver.ts`
- `docs/supported-patterns.md`

## 3. Vue SFC 파싱의 기본

### component node 생성

`.vue` 파일은 기본적으로 `vue-component` 노드를 만든다.

### script 분석

script 영역에서는 아래를 주로 본다.

- import
- store 사용
- composable 사용
- API 호출
- native bridge 호출
- provide/inject
- props/emits metadata

### template 분석

template 영역에서는 아래를 본다.

- child component 사용
- directive 사용
- event listener

## 4. TsFileParser의 역할

`.ts`, `.js`, `.tsx`, `.jsx` 파일에서 다음을 수행한다.

- module kind 추정
- import / re-export 추출
- exported function / interface / type 추출
- API call-site 생성
- vue-router route 추정
- navigation 메타데이터 수집

## 5. 지원 패턴과 미지원 패턴

이 모듈에서는 `docs/supported-patterns.md`를 반드시 같이 본다.

### 지원 예시

- `import Foo from './Foo.vue'`
- `useXxxStore()`
- `useXxx()`
- `axios.get('/api/users')`
- `component: () => import('@/views/X.vue')`
- `<ChildComponent />`

### 미지원 또는 제한 예시

- Options API의 깊은 의존성 추적
- `axios(config)` 객체 방식
- 변수 기반 동적 URL
- `import(path)` 런타임 경로
- `<component :is="comp">`
- 복잡한 router children 재귀

## 6. ImportResolver를 이해해야 하는 이유

파서는 일단 `unresolved:...` target을 남길 수 있다. 실제 파일 경로 해석은 이후 단계에서 수행한다.

핵심은 아래다.

- 상대 경로 해석
- alias 해석
- `index.ts` 해석
- 확장자 후보 탐색

## 7. 실무적으로 중요한 포인트

- 프론트 분석의 품질은 API call 매칭 품질에 직결된다.
- TS interface 추출은 DTO consistency 검사와 연결된다.
- store/composable 감지는 화면 영향도 설명에 중요하다.

## 8. 이 모듈 실습

- `test-project/frontend/src/views/ProductDetailView.vue`에서 시작해 import, composable, api-call-site를 추적한다.
- `test-project-ecommerce/frontend/src/App.vue`와 router를 연결한다.
- 하나의 component가 어떤 metadata를 남기는지 기록한다.

## 9. 체크 질문

- Vue SFC parser와 TS parser의 경계는 어디인가
- 왜 template 분석만으로는 child component target을 완전히 확정할 수 없는가
- `api-call-site`는 왜 node인가, 단순 metadata가 아닌 이유는 무엇인가
- TS interface 추출은 어떤 analyzer에서 사용되는가
