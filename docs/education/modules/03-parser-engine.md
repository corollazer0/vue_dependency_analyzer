# Module 03. 파싱 엔진과 캐시

## 1. 목적

파일을 어떻게 찾고, 어떻게 파싱하고, 어떻게 cache와 worker를 적용하는지 이해한다.

## 2. 핵심 파일

- `packages/core/src/engine/ParallelParser.ts`
- `packages/core/src/engine/ParseCache.ts`
- `packages/core/src/engine/parseWorker.ts`
- `packages/server/src/engine.ts`
- `packages/cli/src/config.ts`

## 3. 분석 파이프라인

### 파일 발견

- CLI와 server는 config를 읽는다.
- `vueRoot`, `springBootRoot`, `services[]`, include/exclude 계열 설정이 분석 범위를 결정한다.

### 파일별 파싱

- 확장자 또는 파일 종류별 parser를 선택한다.
- parser는 각 파일에 대해 `ParseResult`를 반환한다.

### 그래프 병합

- 모든 파일 결과를 하나의 `DependencyGraph`에 합친다.
- parse error는 실패로 버리지 않고 metadata에 남긴다.

### 경계 연결

- 그래프가 다 모인 뒤 linker를 실행한다.

## 4. ParallelParser를 보는 관점

- 핵심 질문은 "진짜 병렬인가"가 아니라 "언제 worker가 의미가 있는가"다.
- uncached file 수가 적으면 main thread fallback이 더 빠를 수 있다.
- file reading과 cache check는 main thread에서 한다.
- parse 자체만 worker로 넘긴다.

## 5. ParseCache를 보는 관점

- key는 file path
- invalidation 기준은 content hash
- config hash도 cache 재사용 여부에 영향을 준다
- cache는 정확도를 보존해야 한다

## 6. 꼭 이해해야 하는 위험

### synthetic node 누락 위험

cache를 filePath 기반으로만 묶으면, file-backed가 아닌 synthetic node가 유실될 수 있다.

### partial graph 위험

warm run에서 edge만 남고 target node가 사라지면, UI와 impact 계산이 동시에 오염된다.

### config drift 위험

alias, apiBaseUrl, services가 바뀌었는데 cache를 그대로 쓰면 결과가 잘못될 수 있다.

## 7. server engine이 추가하는 것

- WebSocket progress broadcast
- watch mode
- incremental remove/reparse
- graph metadata 관리
- API 제공용 query surface

## 8. 이 모듈의 실습 포인트

- cold run과 warm run의 node/edge 수 비교
- parseErrors 확인
- 특정 file change 후 reanalysis 흐름 설명

## 9. 체크 질문

- worker를 언제 쓰고 언제 main thread fallback을 하는가
- cache correctness는 왜 성능보다 더 중요한가
- parse error를 metadata로 남기는 이유는 무엇인가
- server engine과 CLI analysis의 공통점과 차이점은 무엇인가
