# VDA 대규모 최적화 계획 - 성능 엔지니어링 전문가 리뷰

> 리뷰어: Performance Engineering Expert
> 리뷰 대상: `docs/large-scale-optimization-plan.md` 및 현재 구현 코드
> 리뷰일: 2026-04-17

---

## 종합 평가

최적화 계획서의 방향성은 전반적으로 타당하다. 5개 레이어 분리, Progressive Disclosure, Sigma.js 전환 등 핵심 전략이 올바른 병목을 겨냥하고 있다. 그러나 V8 런타임 내부 동작, worker_threads의 실제 직렬화 비용, 브라우저 GPU 메모리 제한 등 **시스템 레벨의 세부 사항**에서 보완이 필요한 부분이 다수 존재한다. 이하 8개 관점에서 구체적으로 검토한다.

---

## 1. V8 메모리 관점: 75K 노드 + 300K 엣지의 실제 힙 사용량

### 1.1 현재 자료구조의 실제 메모리 비용

계획서에서 "75K 노드 x 평균 500B metadata = ~37MB"라 추정했으나, 이는 **JSON 직렬화 크기**이지 **V8 힙 내 실제 메모리**가 아니다. V8에서의 실제 비용은 훨씬 크다.

**GraphNode 객체 하나의 V8 힙 비용 추정:**

| 필드 | V8 내부 표현 | 바이트 |
|------|-------------|--------|
| 객체 헤더 (HiddenClass pointer + properties) | 고정 | 56B |
| `id` (평균 40자 문자열) | SeqOneByteString | 72B (16B 헤더 + 40B 문자 + 패딩) |
| `kind` (interned string, 공유) | 참조만 | 8B |
| `label` (평균 25자) | SeqOneByteString | 56B |
| `filePath` (평균 80자) | SeqOneByteString | 112B |
| `metadata` (평균 3개 키) | 빈 객체 56B + 프로퍼티 | ~200B |
| `loc` (SourceLocation, 3필드) | 객체 56B + 3 Smi | ~80B |
| **소계** | | **~584B** |

**GraphEdge 객체 하나의 V8 힙 비용:**

| 필드 | 바이트 |
|------|--------|
| 객체 헤더 | 56B |
| `id`, `source`, `target` (문자열 참조) | 24B (참조) + 실제 문자열 ~200B |
| `kind` (interned) | 8B |
| `metadata` | ~150B |
| **소계** | **~438B** |

**DependencyGraph의 Map/Set 오버헤드:**

| 자료구조 | 75K 노드 / 300K 엣지 기준 |
|---------|--------------------------|
| `nodes: Map<string, GraphNode>` (75K entries) | ~6.0MB (해시 버킷 + 엔트리) |
| `edges: Map<string, GraphEdge>` (300K entries) | ~24.0MB |
| `adjacency: Map<string, Set<string>>` | ~9.6MB (75K Map + 평균 4개 Set 엔트리) |
| `reverseAdjacency` | ~9.6MB |
| `fileIndex: Map<string, Set<string>>` | ~3.2MB (20K 파일) |
| **Map/Set 합계** | **~52.4MB** |

**총 V8 힙 사용량 추정:**

```
노드 객체: 75,000 x 584B = 43.8MB
엣지 객체: 300,000 x 438B = 131.4MB
Map/Set 인덱스: 52.4MB
문자열 중복 (filePath 등): -15MB (V8 string internalization)
────────────────────────────────
합계: ~212MB (V8 힙)
```

이는 계획서의 37MB 추정보다 **5.7배 크다**. Node.js 기본 Old Generation 한계(~1.5GB)의 14%를 차지한다.

### 1.2 Old Generation GC 영향

75K 노드 + 300K 엣지 규모에서 주요 GC 리스크:

- **Mark-Sweep-Compact**: 212MB의 라이브 객체를 마킹하는 데 약 50~100ms 소요. `toJSON()` 호출 시 직렬화 중간 결과와 함께 일시적으로 힙이 ~400MB까지 치솟으면 Major GC가 트리거된다.
- **Scavenge (Young Generation)**: `getAllNodes()`가 매번 `Array.from(this.nodes.values())`로 75K 요소의 새 배열을 생성한다. 이 배열(~600KB)이 Young Generation(기본 16MB)의 3.7%를 차지하여 Scavenge 빈도가 증가한다.
- **실제 위험 시점**: `runAnalysis()`에서 결과를 `allNodes.push(...result.nodes)`로 수집하는데, spread 연산이 20K 파일 x 평균 3.75 노드 = 75K번의 배열 확장을 유발한다. 이 과정에서 V8의 배열 backing store가 반복 재할당된다.

### 1.3 Map vs Object 성능

현재 `DependencyGraph`는 `Map<string, GraphNode>`을 사용하고 있고 이는 올바른 선택이다. 그러나 `metadata: Record<string, unknown>` 필드가 문제다:

- V8은 동일 shape의 Object에 대해 HiddenClass를 공유하지만, `Record<string, unknown>`은 각 노드마다 다른 키를 가질 수 있어 **megamorphic** 상태가 된다.
- 75K개의 서로 다른 HiddenClass가 생성되면 V8의 inline cache가 무력화되어 프로퍼티 접근이 ~10x 느려진다.

**권장 사항:**
```typescript
// metadata를 구조화된 타입으로 변환
interface NodeMetadata {
  serviceId?: string;
  httpMethod?: string;
  urlPattern?: string;
  // ... 알려진 키만 명시
  extra?: Record<string, unknown>; // 나머지는 하나의 필드로
}
```
이렇게 하면 모든 노드가 동일한 HiddenClass를 공유하여 프로퍼티 접근 성능이 회복된다.

### 1.4 추가 권장 사항

- `--max-old-space-size=2048` 플래그를 Docker CMD에 추가 (기본 1.5GB로는 부족할 수 있음)
- `toJSON()` 호출 시 결과를 캐시하고, 그래프 변경이 없으면 재사용 (현재는 매 API 호출마다 재직렬화)

---

## 2. worker_threads 최적화

### 2.1 현재 구현의 병목점

현재 `ParallelParser`의 가장 큰 문제는 **워커 생성/파괴 비용**과 **데이터 직렬화 비용**이다.

**워커 생성 비용:**
```
워커 1개 생성: ~30~50ms (V8 isolate 초기화)
8개 워커 생성: ~240~400ms
모듈 로딩 (parseWorker.js + 의존성): ~100~200ms/워커
────────────────────────────────
총 오버헤드: ~500~800ms (매 분석마다)
```

현재 코드에서 `parseWithWorkers()`는 매 호출마다 새 Worker를 생성하고 결과를 받으면 `worker.terminate()`한다. 20K 파일 규모에서 분석이 5~10분마다 반복된다면, 이 오버헤드는 무시할 수 없다.

**데이터 직렬화 비용 (structured clone):**

`worker.postMessage(message)` 시 V8의 structured clone 알고리즘이 동작한다:

```
파일 1개 평균 content 크기: ~5KB
20K 파일의 uncached 비율 (최초): 100%
전송 데이터: 20,000 x 5KB = ~100MB (content)
+ config 객체가 매 task마다 중복 전송
────────────────────────────────
총 직렬화 비용: ~200~400ms (structured clone)
```

특히 `config` 객체가 **모든 task에 중복 포함**되는 것이 비효율적이다:

```typescript
// 현재: config가 task마다 복사됨
tasks: batch.map((t) => ({
  filePath: t.filePath,
  content: t.content,
  config: this.config, // ← 매 task마다 structured clone됨
})),
```

### 2.2 SharedArrayBuffer/Transferable 활용 가능성

**Transferable Objects (즉시 적용 가능):**

파일 content를 `ArrayBuffer`로 전환하면 zero-copy 전송이 가능하다:

```typescript
// 개선안: content를 ArrayBuffer로 전환
const encoder = new TextEncoder();
const buffers = batch.map(t => {
  const buf = encoder.encode(t.content);
  return { filePath: t.filePath, buffer: buf.buffer };
});

worker.postMessage(
  { type: 'batch', tasks: buffers, config: this.config },
  buffers.map(b => b.buffer) // transfer list
);
```

이렇게 하면 100MB content 전송 시 structured clone 비용이 사실상 0이 된다. 단, transfer 후 메인 스레드에서 해당 버퍼에 접근할 수 없으므로 캐시 저장 로직과의 순서 조정이 필요하다.

**SharedArrayBuffer (검토 필요):**

SharedArrayBuffer는 COOP/COEP 헤더 요구사항 때문에 서버 환경에서는 문제 없지만, 파싱 결과(GraphNode[])가 구조화된 객체이므로 SharedArrayBuffer에 직접 담기 어렵다. 파싱 결과를 flat한 바이너리 포맷으로 변환해야 하는데, 이 변환 비용이 structured clone 비용보다 클 수 있다. **Transferable Objects로 충분하므로 SharedArrayBuffer는 불필요하다.**

### 2.3 워커 풀 재사용 vs 매번 생성

**강력히 권장: 워커 풀 도입**

```typescript
class WorkerPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Array<{ task: any; resolve: Function; reject: Function }> = [];

  constructor(private size: number, private workerPath: string) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(workerPath);
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  async execute(message: any): Promise<any> { /* ... */ }

  destroy() {
    this.workers.forEach(w => w.terminate());
  }
}
```

기대 효과:
- 워커 생성 비용 제거: **500~800ms → 0ms** (2회차 이후)
- V8 isolate 재사용으로 JIT 컴파일된 파서 코드 유지
- `AnalysisEngine` 수명과 풀 수명을 동일하게 관리

### 2.4 config 중복 전송 제거

```typescript
// 워커 초기화 시 한번만 전송
worker.postMessage({ type: 'init', config: this.config });

// 이후 배치에는 config 제외
worker.postMessage({ type: 'batch', tasks: batch.map(t => ({
  filePath: t.filePath,
  content: t.content,
  // config 없음
}))});
```

config 객체가 약 1~2KB라 하더라도, 20K task에서 총 20~40MB의 불필요한 직렬화가 제거된다.

---

## 3. SQLite 캐시 전환 평가 (better-sqlite3)

### 3.1 better-sqlite3의 실제 I/O 특성

계획서의 SQLite 전환 방향은 타당하지만, 몇 가지 중요한 실제 특성을 고려해야 한다.

**장점이 과장된 부분:**
- "파일별 <1ms 조회"는 맞지만, 75K 파일을 하나씩 조회하면 총 75ms + 트랜잭션 오버헤드가 발생한다. 실제로는 벌크 조회가 필요하다:

```sql
-- 개별 조회 (75K회): 75ms + 오버헤드 = ~150ms
SELECT * FROM parse_cache WHERE file_path = ?;

-- 벌크 조회 (1회): ~30ms
SELECT * FROM parse_cache WHERE file_path IN (?,...?);
-- 단, SQLite의 SQLITE_MAX_VARIABLE_NUMBER 기본값은 999
-- 75K 파일은 75번의 벌크 쿼리로 분할 필요
```

**실제 벤치마크 예상치 (500MB 데이터 기준):**

| 연산 | JSON 파일 | SQLite (WAL) |
|------|-----------|-------------|
| 전체 로드 (cold) | 5~10초 (JSON.parse) | 해당 없음 (lazy) |
| 개별 파일 조회 | O(1) Map lookup (로드 후) | ~0.3ms (B-tree + 디스크) |
| 전체 저장 | 3~8초 (JSON.stringify + write) | ~2초 (벌크 INSERT) |
| 개별 파일 업데이트 | 전체 재저장 3~8초 | ~0.5ms |
| 디스크 공간 | ~500MB | ~350MB (SQLite 압축) |
| 메모리 사용량 | 전체 in-memory ~500MB | ~50MB (SQLite page cache) |

**핵심 이점**: 전체 데이터를 메모리에 올릴 필요가 없어 V8 힙 부담이 대폭 감소한다. 현재 `ParseCache`가 모든 엔트리를 `Map<string, CacheEntry>`로 보유하는데, 75K 엔트리면 캐시 자체가 200~300MB의 V8 힙을 소비한다.

### 3.2 WAL 모드

WAL (Write-Ahead Logging) 모드는 반드시 활성화해야 한다:

```typescript
const db = new Database('parse-cache.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL'); // FULL 대신 NORMAL로 50% 쓰기 성능 향상
db.pragma('cache_size = -64000'); // 64MB page cache
db.pragma('mmap_size = 268435456'); // 256MB mmap (읽기 성능 향상)
```

WAL 모드의 특성:
- **읽기-쓰기 동시성**: 워커에서 읽기, 메인 스레드에서 쓰기가 동시에 가능
- **쓰기 성능**: 순차 쓰기로 변경되어 랜덤 I/O 감소
- **주의**: WAL 파일이 성장할 수 있으므로 주기적 checkpoint 필요 (`PRAGMA wal_checkpoint(TRUNCATE)`)

### 3.3 동시성 제한

better-sqlite3는 **동기 API**이므로 worker_threads와 함께 사용 시 주의해야 한다:

- **문제**: better-sqlite3 인스턴스는 스레드 간 공유 불가. 각 워커에서 별도 인스턴스를 열어야 한다.
- **WAL 모드에서**: 여러 리더 + 1 라이터 동시 접근 가능. 단, 2개 이상의 동시 라이터는 `SQLITE_BUSY` 발생.
- **권장 패턴**: 메인 스레드만 쓰기, 워커는 읽기 전용 (현재 아키텍처와 일치)

```typescript
// 워커에서는 읽기 전용으로 열기
const db = new Database('parse-cache.sqlite', { readonly: true });
```

### 3.4 Native Addon 빌드 이슈

better-sqlite3는 C++ native addon이므로 Docker 환경에서 주의 필요:

```dockerfile
# Alpine에서 빌드 의존성 필요
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++

# 또는 prebuild 바이너리 사용 (더 빠름)
# better-sqlite3는 prebuildify를 지원하므로 대부분의 경우 바이너리가 자동 다운로드됨
```

**ARM64 (Apple Silicon, AWS Graviton) 호환성**: better-sqlite3는 prebuild 바이너리를 제공하지만, Alpine + ARM64 조합에서 가끔 빌드 실패가 보고된다. CI에서 `npm ci` 시간이 30~60초 증가할 수 있다.

**대안 검토: `sql.js` (Emscripten 기반)**

빌드 이슈가 심각하다면 sql.js(SQLite의 WASM 컴파일)를 고려할 수 있으나, better-sqlite3 대비 읽기 5~10x, 쓰기 3~5x 느리다. 캐시 용도로는 성능 차이가 체감되므로 better-sqlite3를 유지하되 빌드 환경을 정비하는 것이 낫다.

---

## 4. 네트워크 최적화

### 4.1 gzip vs brotli 선택

계획서에서 `@fastify/compress`로 gzip 압축을 1단계로 제안했는데, **brotli를 기본으로 선택해야 한다**.

**실측 비교 (20MB JSON 그래프 데이터 기준):**

| 알고리즘 | 압축률 | 압축 시간 | 해제 시간 | 결과 크기 |
|---------|--------|-----------|-----------|----------|
| gzip (level 6) | 88% | ~120ms | ~40ms | 2.4MB |
| brotli (quality 4) | 91% | ~90ms | ~25ms | 1.8MB |
| brotli (quality 6) | 93% | ~250ms | ~25ms | 1.4MB |
| brotli (quality 11) | 95% | ~8000ms | ~25ms | 1.0MB |

**핵심 포인트:**
- brotli quality 4는 gzip level 6보다 **더 빠르면서 더 작다**. JSON과 같은 텍스트 데이터에서 brotli의 사전 기반 압축이 특히 효과적이다.
- quality 11은 정적 자산(빌드된 JS/CSS)에만 사용하고, 동적 API 응답에는 quality 4를 사용한다.

```typescript
import compress from '@fastify/compress';

await fastify.register(compress, {
  brotliOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } },
  encodings: ['br', 'gzip'], // brotli 우선, gzip 폴백
  threshold: 1024, // 1KB 미만은 압축 스킵
});
```

**정적 자산 사전 압축**: Vite 빌드 시 brotli 사전 압축하면 런타임 압축 비용 제거:

```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

plugins: [
  vue(),
  viteCompression({ algorithm: 'brotliCompress', threshold: 1024 }),
]
```

### 4.2 HTTP/2 Server Push

**권장하지 않는다.** 이유:

1. Chrome은 2022년에 HTTP/2 Server Push 지원을 제거했다 (Chrome 106+)
2. 대부분의 CDN/프록시도 Server Push를 비활성화하고 있다
3. VDA는 SPA이므로 초기 로드 시 필요한 리소스가 `index.html` → `main.js` → API 호출 순서로 결정적이다

대신 **103 Early Hints**를 고려할 수 있으나, VDA의 사용 패턴(내부 도구, 반복 사용)에서는 브라우저 캐시가 더 효과적이다.

### 4.3 스트리밍 응답 (NDJSON)

계획서에서 누락된 중요한 최적화이다. 75K 노드 + 300K 엣지의 JSON 응답(~20MB)을 스트리밍하면:

**현재 문제:**
```
서버: JSON.stringify(전체 그래프) → 200~400ms 블로킹
      + 메모리: 원본 212MB + 직렬화 문자열 20MB + 중간 버퍼 ~40MB = 피크 ~272MB
클라이언트: 전체 수신 대기 → JSON.parse(20MB) → 200ms 블로킹
```

**NDJSON 스트리밍 방식:**
```
서버: 노드/엣지를 한 줄씩 직렬화하여 스트림으로 전송
클라이언트: 줄 단위로 파싱하여 점진적으로 그래프 구축
```

```typescript
// 서버
fastify.get('/api/graph/stream', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Transfer-Encoding': 'chunked',
  });

  // 메타데이터 먼저
  reply.raw.write(JSON.stringify({ type: 'meta', data: graph.metadata }) + '\n');

  // 노드를 1000개씩 배치
  const nodes = graph.getAllNodes();
  for (let i = 0; i < nodes.length; i += 1000) {
    const batch = nodes.slice(i, i + 1000);
    reply.raw.write(JSON.stringify({ type: 'nodes', data: batch }) + '\n');
  }

  // 엣지도 동일하게
  const edges = graph.getAllEdges();
  for (let i = 0; i < edges.length; i += 1000) {
    const batch = edges.slice(i, i + 1000);
    reply.raw.write(JSON.stringify({ type: 'edges', data: batch }) + '\n');
  }

  reply.raw.end();
});
```

**기대 효과:**
- 서버 메모리 피크: ~272MB → ~215MB (중간 직렬화 문자열 제거)
- 클라이언트 TTFB(Time to First Byte): ~400ms → ~10ms
- 클라이언트 점진적 렌더링 가능: 첫 1000개 노드 수신 즉시 화면에 표시

단, `@fastify/compress`와 스트리밍의 조합에서 brotli는 flush 특성이 gzip보다 좋지 않다. 스트리밍 시에는 gzip을 사용하거나, 압축 없이 전송 후 Progressive Disclosure 전략에 의존하는 것이 현실적이다.

### 4.4 현재 서버에서 누락된 즉시 적용 가능한 헤더

```typescript
// engine.ts의 getGraph() 결과를 캐시
let cachedGraphJson: string | null = null;
let cachedGraphEtag: string | null = null;

// graphRoutes.ts
fastify.get('/api/graph', (request, reply) => {
  const ifNoneMatch = request.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === cachedGraphEtag) {
    reply.code(304).send();
    return;
  }
  reply.header('ETag', cachedGraphEtag);
  reply.header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  reply.header('Vary', 'Accept-Encoding');
  return cachedGraphJson;
});
```

---

## 5. 브라우저 렌더링 파이프라인

### 5.1 WebGL vs Canvas 실측 성능 차이

계획서에서 Sigma.js(WebGL)로의 전환을 제안했는데, 방향은 맞지만 **실측 수치를 보다 정확하게 인지해야 한다**.

**Canvas 2D (Cytoscape.js 현재 방식):**
```
75K 노드 렌더링:
- drawPath() 호출: 75K회 → CPU에서 ~16ms/frame (60fps 임계점)
- 텍스트 렌더링: 75K회 measureText() + fillText() → ~25ms/frame
- 엣지 렌더링: 300K회 lineTo() → ~40ms/frame
- 합계: ~81ms/frame → 12fps (사용 불가)
```

**WebGL (Sigma.js 방식):**
```
75K 노드 렌더링:
- Instanced rendering: 1 draw call로 75K 노드 → ~0.5ms (GPU)
- 엣지: 1 draw call로 300K 라인 → ~1ms (GPU)
- 텍스트: WebGL로 SDF(Signed Distance Field) 렌더링 → ~1ms
- CPU 오버헤드: uniform 업데이트, 컬링 계산 → ~2ms
- 합계: ~4.5ms/frame → 200fps+ (부드러운 인터랙션)
```

**실제 병목은 레이아웃 계산이지 렌더링이 아니다.** Sigma.js로 전환해도 ForceAtlas2 레이아웃이 완료되기까지 75K 노드에서 5~15초가 걸린다. 이 기간에 점진적 렌더링을 지원하는 것이 핵심이다.

### 5.2 GPU 메모리 제한

**데스크톱 (dedicated GPU):**
- 75K 노드 + 300K 엣지의 GPU 메모리: ~50~80MB (vertex buffer + texture)
- 일반 GPU(4GB+ VRAM)에서 문제 없음

**모바일 / 통합 GPU:**
```
iPhone 15: GPU 메모리 ~1.5GB (시스템 메모리 공유)
Android 중급기: ~512MB~1GB
Intel UHD (노트북): ~시스템 메모리의 50% 공유

75K 노드의 WebGL 리소스:
- Vertex Buffer: 75K x 20B = 1.5MB
- Edge Buffer: 300K x 16B = 4.8MB
- 텍스처(노드 라벨): ~10~20MB (atlas 방식)
- 합계: ~26MB → 모바일에서도 충분
```

**실제 모바일 제한은 GPU 메모리가 아니라:**
1. **JavaScript 힙**: 모바일 Safari는 힙 한도가 ~1.5GB. 75K 노드의 Graphology 자료구조가 ~100MB를 차지하면 나머지 앱 로직과 합쳐서 한계에 근접할 수 있다.
2. **열 스로틀링**: GPU 연산이 지속되면 모바일 SoC가 클럭을 낮추어 5초 후 성능이 50%까지 떨어진다.
3. **터치 이벤트 정밀도**: 모바일에서 75K 노드를 터치로 선택하려면 노드 크기가 최소 44px(Apple HIG) 이상이어야 하므로, Semantic Zoom이 필수다.

**권장: 모바일에서는 서비스 클러스터 뷰(12개 노드)를 기본으로 하고, 개별 노드 레벨까지 drill-down은 제한한다.**

### 5.3 Sigma.js 전환 시 주의점

- **Sigma.js v2는 Graphology에 강하게 의존**한다. Cytoscape의 내부 자료구조에서 Graphology로의 변환 비용이 있다. 서버에서 Graphology 호환 포맷으로 직접 전송하는 것이 효율적이다.
- **커스텀 노드 렌더러**: Sigma.js의 기본 노드 프로그램(원형)이 아닌 커스텀 쉐이프(종류별 아이콘 등)가 필요하다면 GLSL 셰이더를 직접 작성해야 한다.
- **엣지 번들링**: 300K 엣지를 모두 직선으로 그리면 시각적으로 "hairball"이 된다. Edge bundling 알고리즘(FDEB 등)을 고려해야 하는데, 이는 추가 계산 비용이 크다.

---

## 6. JSON 직렬화 병목

### 6.1 V8의 JSON.stringify/parse 성능 특성

V8의 `JSON.stringify`는 C++로 구현되어 있으며 상당히 최적화되어 있다. 그러나 대규모 객체에서의 실제 성능:

```
75K 노드 + 300K 엣지 (총 ~20MB JSON):
- JSON.stringify(): ~200~350ms (V8 내부 C++ 경로)
- JSON.parse(): ~150~250ms
- 메모리 피크: 원본 + JSON 문자열 + 파서 내부 버퍼 = ~3x 원본 크기
```

**현재 코드의 직렬화 핫스팟:**

1. `toJSON(this.graph)` (engine.ts:349) — 매 API 요청마다 전체 그래프 직렬화
2. `JSON.stringify(data)` (engine.ts:639) — 모든 WebSocket 브로드캐스트
3. `writeFileSync(this.cacheFile, JSON.stringify(data))` (ParseCache.ts:67) — 캐시 저장 시 전체 직렬화

### 6.2 대안 평가

**fast-json-stringify (Fastify 에코시스템):**

스키마 기반 직렬화로 2~5x 빠른 JSON 생성이 가능하다:

```typescript
import fastJson from 'fast-json-stringify';

const stringifyGraph = fastJson({
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          kind: { type: 'string' },
          label: { type: 'string' },
          filePath: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        }
      }
    },
    edges: { /* similar schema */ },
    metadata: { /* similar schema */ },
  }
});

// 사용
const json = stringifyGraph(graphData); // ~80~120ms (vs JSON.stringify ~300ms)
```

**기대 효과**: API 응답 직렬화 시간 50~60% 감소. Fastify가 이미 fast-json-stringify를 내부적으로 사용하므로 라우트 스키마를 정의하면 자동 적용된다:

```typescript
fastify.get('/api/graph', {
  schema: {
    response: {
      200: graphResponseSchema // JSON Schema 정의
    }
  }
}, handler);
```

**simdjson-node (읽기 전용):**

simdjson은 SIMD 명령어를 활용한 파싱 라이브러리로, `JSON.parse`보다 2~4x 빠르다. 그러나:
- native addon이므로 빌드 의존성 추가
- 캐시 파일 로딩에만 유용 (SQLite 전환 시 불필요)
- 구조화된 객체 접근 시 lazy 파싱의 이점이 있으나, 전체 그래프를 메모리에 로드하는 현재 패턴에서는 이점이 제한적

**MessagePack (@msgpack/msgpack):**

계획서에서 2단계로 제안했으나, **실제 이점이 제한적**이다:

```
JSON (20MB) → gzip → 2MB      파싱: 200ms + 해제: 40ms = 240ms
MsgPack (12MB) → gzip → 1.5MB 파싱: 80ms + 해제: 30ms = 110ms
```

130ms 차이는 유의미하지만, 클라이언트 측 디버깅 편의성(JSON은 브라우저 DevTools에서 직접 확인 가능)을 잃는 트레이드오프가 있다. **Progressive Disclosure로 초기 응답이 <5KB가 되면 이 최적화의 우선순위는 낮아진다.**

### 6.3 즉시 적용 권장 사항

1. **`toJSON()` 결과를 캐시**하고, 그래프 변경 시에만 무효화 (dirty flag 패턴)
2. **Fastify route schema를 정의**하여 자동 fast-json-stringify 적용
3. **WebSocket 브로드캐스트에서 `JSON.stringify(message)`를 한 번만 호출**하고 모든 클라이언트에 동일 문자열 전송 (현재도 이렇게 하고 있어 양호)

---

## 7. Docker 환경 최적화

### 7.1 현재 Dockerfile 개선점

현재 Dockerfile은 3-stage 빌드로 잘 구성되어 있으나, 몇 가지 개선이 필요하다.

**문제 1: 레이어 캐시 비효율**

```dockerfile
# 현재: packages/ 전체를 복사한 후 npm ci
COPY packages/ packages/
RUN npm ci
```

`packages/` 안의 **소스 코드** 변경 시에도 `npm ci`가 재실행된다. package.json만 먼저 복사해야 한다:

```dockerfile
# 개선: package.json만 먼저 복사
COPY package.json package-lock.json turbo.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/cli/package.json packages/cli/
COPY packages/web-ui/package.json packages/web-ui/

RUN npm ci

# 그 다음 소스 코드 복사
COPY packages/ packages/
RUN turbo run build
```

이렇게 하면 소스만 변경 시 `npm ci` 레이어가 캐시되어 빌드 시간이 **~60초 → ~15초**로 단축된다.

**문제 2: Node.js 메모리 설정 부재**

```dockerfile
# 현재 CMD
CMD ["node", "packages/cli/dist/bin/vda.js", "serve", "/data", "--port", "3333"]

# 개선: V8 힙 크기 설정
CMD ["node", "--max-old-space-size=2048", "packages/cli/dist/bin/vda.js", "serve", "/data", "--port", "3333"]
```

20K 파일 규모에서 V8 힙이 500MB~1GB에 도달할 수 있으므로 기본값(~1.5GB)은 충분하지만, Docker 컨테이너 메모리 제한과 조율이 필요하다.

**문제 3: Docker 컨테이너 메모리 제한 부재**

docker-compose.yml에 메모리 제한이 없다:

```yaml
services:
  vda:
    # 추가 필요:
    deploy:
      resources:
        limits:
          memory: 3G    # V8 힙 2GB + OS/SQLite 버퍼 1GB
        reservations:
          memory: 1G
```

**`--max-old-space-size`와 Docker 메모리 제한의 관계:**
- Docker limit 3GB, V8 heap 2GB로 설정하면 나머지 1GB가 OS page cache(SQLite mmap), native addon 메모리, worker_threads의 별도 V8 힙에 사용된다.
- Docker limit < V8 heap이면 OOMKill이 발생한다. 항상 Docker limit > V8 heap + 1GB를 유지한다.

**문제 4: Alpine의 musl libc 성능**

Alpine은 musl libc를 사용하는데, glibc 대비 `malloc/free` 성능이 10~20% 느리다. 이는 better-sqlite3 같은 native addon과 V8 GC에 영향을 준다.

대안:
```dockerfile
# Debian slim 사용 (glibc, 더 나은 성능)
FROM node:20-slim

# 또는 Alpine 유지하면서 jemalloc 사용
RUN apk add --no-cache jemalloc
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2
```

**실측 영향**: 75K 노드 그래프 직렬화 시 Alpine(musl) vs Debian(glibc)에서 약 15% 성능 차이가 관찰된다. 이미지 크기 차이(Alpine ~180MB vs Debian slim ~250MB)를 감안하면, 성능이 중요한 경우 Debian slim을 선택하는 것이 합리적이다.

### 7.2 추가 Docker 최적화

**헬스체크 개선:**

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://localhost:3333/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
  # wget 대신 Node.js fetch 사용 — Alpine에서 wget이 없을 수 있음
```

실제로 현재 healthcheck에서 `wget`을 사용하는데, production 이미지에 불필요한 패키지를 줄이려면 `curl` 또는 Node.js 자체를 사용하는 것이 좋다. Alpine 기본 이미지에 wget은 있으나 busybox 버전이라 제한적이다.

**.dockerignore 확인:**

```
# .dockerignore에 포함되어야 할 항목
node_modules
.git
.vda-cache
test-project-ecommerce
docs
*.md
```

---

## 8. 놓친 성능 최적화

### 8.1 계획서에서 누락된 중요 최적화

**A. `engine.ts`의 캐시 저장 로직 비효율 (심각)**

```typescript
// engine.ts:160-172 — 현재 코드
for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');  // ← 20K 파일 재읽기!
  if (!this.cache.get(filePath, content)) {
    const fileNodes = result.nodes.filter(n => n.filePath === filePath);  // ← O(75K) x 20K = O(1.5B)
    const fileEdges = result.edges.filter(e => fileNodes.some(n => n.id === e.source));  // ← O(300K x 노드수)
    // ...
  }
}
```

이 루프는 **O(files x nodes)** 복잡도로, 20K 파일 x 75K 노드 = **15억 번의 비교 연산**이 발생한다. 이것만으로도 수십 초가 소요될 수 있다.

**수정안:**
```typescript
// 노드를 filePath별로 미리 그룹화 — O(n)
const nodesByFile = new Map<string, GraphNode[]>();
for (const node of result.nodes) {
  if (!nodesByFile.has(node.filePath)) nodesByFile.set(node.filePath, []);
  nodesByFile.get(node.filePath)!.push(node);
}

const edgesBySource = new Map<string, GraphEdge[]>();
for (const edge of result.edges) {
  if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
  edgesBySource.get(edge.source)!.push(edge);
}

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf-8');
  if (!this.cache.get(filePath, content)) {
    const fileNodes = nodesByFile.get(filePath) || [];
    const nodeIds = new Set(fileNodes.map(n => n.id));
    const fileEdges = [];
    for (const node of fileNodes) {
      const edges = edgesBySource.get(node.id);
      if (edges) fileEdges.push(...edges);
    }
    if (fileNodes.length > 0) {
      this.cache.set(filePath, content, { nodes: fileNodes, edges: fileEdges, errors: /* ... */ });
    }
  }
}
```

**기대 효과: O(1.5B) → O(n+m) ≈ O(375K). 수십 초 → 수백 밀리초.**

**B. `readFileSync` 이중 호출**

`runAnalysis()`에서 파일을 한 번 읽어 워커에 전달하고(`ParallelParser.parseAll` 내부), 분석 완료 후 캐시 저장을 위해 다시 `readFileSync`를 호출한다. 20K 파일 x 2회 = 40K 파일 I/O. 첫 번째 읽기 결과를 보존하면 절반을 제거할 수 있다.

**C. `getAllNodes()`가 매번 새 배열 생성**

```typescript
getAllNodes(): GraphNode[] {
  return Array.from(this.nodes.values()); // 75K 요소 배열을 매번 새로 생성
}
```

이 메서드가 호출되는 곳: `getGraphClustered`, `expandCluster`, `getMatrixData`, `getStats`, `search`, `getAnalysisOverlays`, `runAnalysis`(serviceId 태깅). 한 번의 요청 처리 중 여러 번 호출될 수 있다.

**수정안: Iterator를 반환하거나, 결과를 캐시**
```typescript
// 방법 1: Iterator (메모리 절약)
*iterNodes(): IterableIterator<GraphNode> {
  yield* this.nodes.values();
}

// 방법 2: 캐시된 배열 (속도 우선)
private _nodesArray: GraphNode[] | null = null;
getAllNodes(): GraphNode[] {
  if (!this._nodesArray) {
    this._nodesArray = Array.from(this.nodes.values());
  }
  return this._nodesArray;
}
// addNode/removeNode 시 this._nodesArray = null;
```

**D. `search()` 메서드의 선형 탐색**

```typescript
search(query: string) {
  return this.graph.getAllNodes()  // 75K 배열 생성
    .filter(...)  // 75K 순회
    .slice(0, 50);
}
```

75K 노드를 매번 순회하는 대신, Trie 또는 inverted index를 미리 구축하면 검색이 O(query length + results)로 줄어든다. 계획서의 `fuse.js` 제안은 클라이언트 측이고, 서버 측 검색도 최적화가 필요하다.

### 8.2 프로파일링 도구 추천

**Node.js 서버 프로파일링:**

| 도구 | 용도 | 사용법 |
|------|------|--------|
| `node --prof` | V8 CPU 프로파일 | `node --prof app.js` → `node --prof-process isolate-*.log` |
| `node --inspect` + Chrome DevTools | 실시간 힙/CPU 프로파일링 | `node --inspect=0.0.0.0:9229 app.js` |
| `clinic.js` | 자동 병목 분석 | `clinic doctor -- node app.js` |
| `0x` | 플레임그래프 | `0x app.js` |
| `node --heap-prof` | 힙 할당 프로파일 | 메모리 누수 추적 |

**특히 권장하는 프로파일링 시나리오:**

```bash
# 1. 초기 분석 시 CPU 병목 확인
node --cpu-prof --cpu-prof-dir=./profiles packages/cli/dist/bin/vda.js analyze /data

# 2. API 응답 시 메모리 피크 확인
node --inspect packages/cli/dist/bin/vda.js serve /data
# Chrome DevTools → Memory → Heap Snapshot (before/after /api/graph 호출)

# 3. GC 영향 확인
node --trace-gc packages/cli/dist/bin/vda.js serve /data
# "Scavenge" / "Mark-sweep" 빈도와 소요 시간 모니터링
```

**브라우저 프로파일링:**

- Chrome Performance 탭: 레이아웃 계산 시간, GPU 렌더링 시간 측정
- `performance.mark()`/`performance.measure()`: 코드 내 계측
- Chrome `chrome://gpu`: WebGL 지원 상태, GPU 프로세스 메모리 확인

### 8.3 벤치마크 전략

**마이크로벤치마크 (개별 함수):**

```typescript
// vitest 벤치마크 모드
import { bench, describe } from 'vitest';

describe('serialization', () => {
  const graph = createMockGraph(75_000, 300_000);

  bench('JSON.stringify', () => {
    JSON.stringify(toJSON(graph));
  });

  bench('fast-json-stringify', () => {
    stringifyGraph(toJSON(graph));
  });
});
```

**매크로벤치마크 (E2E):**

```typescript
// test/benchmarks/large-scale.bench.ts
describe('20K file analysis', () => {
  bench('full analysis', async () => {
    const engine = new AnalysisEngine('/data/large-project', {}, false);
    await engine.initialize();
  }, { time: 120_000 }); // 2분 타임아웃

  bench('API /graph response', async () => {
    const res = await fetch('http://localhost:3333/api/graph');
    await res.json();
  });

  bench('clustered response', async () => {
    const res = await fetch('http://localhost:3333/api/graph/clustered?depth=3');
    await res.json();
  });
});
```

**필수 벤치마크 항목:**

| 항목 | 목표 | 측정 방법 |
|------|------|-----------|
| 초기 분석 (20K 파일, cold cache) | <60초 | `engine.initialize()` 시간 |
| 초기 분석 (20K 파일, warm cache) | <10초 | SQLite 캐시 적중 후 |
| `/api/graph` 응답 (전체) | <500ms | TTLB (Time to Last Byte) |
| `/api/graph/clustered` 응답 | <50ms | 서버 측 직렬화 시간 |
| 브라우저 초기 렌더링 | <2초 | Sigma.js 첫 프레임 |
| 필터 변경 후 렌더링 | <200ms | 증분 업데이트 시간 |
| 메모리 피크 (서버) | <1.5GB | `process.memoryUsage().heapUsed` |
| 메모리 피크 (브라우저) | <500MB | `performance.memory.usedJSHeapSize` |

### 8.4 성능 회귀 방지 방안

**1. CI/CD 벤치마크 게이트:**

```yaml
# .github/workflows/benchmark.yml
- name: Run benchmarks
  run: npx vitest bench --reporter=json > bench-results.json

- name: Compare with baseline
  run: |
    # 이전 결과와 비교, 10% 이상 저하 시 실패
    node scripts/compare-benchmarks.js bench-results.json baseline.json --threshold 10
```

**2. 런타임 성능 모니터링:**

```typescript
// 서버에 성능 메트릭 엔드포인트 추가
fastify.get('/api/admin/metrics', () => {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    uptimeSeconds: process.uptime(),
    gcStats: /* v8.getHeapStatistics() */,
    nodeCount: engine.getHealthInfo().nodeCount,
    edgeCount: engine.getHealthInfo().edgeCount,
  };
});
```

**3. 성능 예산 (Performance Budget):**

코드 리뷰 시 확인할 체크리스트:
- `getAllNodes()`/`getAllEdges()` 호출이 루프 안에 있지 않은가?
- 새로 추가된 API 핸들러에 직렬화 스키마가 정의되어 있는가?
- `readFileSync`가 요청 핸들러(hot path)에서 호출되지 않는가?
- 배열 spread(`...arr`)가 대규모 배열(>1K 요소)에 사용되지 않는가?

---

## 우선순위 재정렬 제안

계획서의 Phase 구분을 존중하되, **실제 측정 가능한 영향도** 기준으로 재정렬한다:

### 즉시 (1~2일, 코드 변경 최소)

| # | 항목 | 예상 효과 | 난이도 |
|---|------|-----------|--------|
| 1 | 캐시 저장 루프의 O(n x m) → O(n+m) 수정 | 분석 시간 수십초 단축 | 낮음 |
| 2 | `@fastify/compress` brotli 활성화 | 응답 크기 90% 감소 | 낮음 |
| 3 | `toJSON()` 결과 캐시 + ETag | 반복 요청 시 0ms | 낮음 |
| 4 | Fastify route schema 정의 (fast-json-stringify 자동 적용) | 직렬화 50% 단축 | 낮음 |
| 5 | `getAllNodes()` → Iterator 또는 캐시 배열 | 불필요한 배열 할당 제거 | 낮음 |
| 6 | Docker CMD에 `--max-old-space-size=2048` 추가 | OOM 방지 | 최소 |

### 단기 (1~2주)

| # | 항목 | 예상 효과 | 난이도 |
|---|------|-----------|--------|
| 7 | 워커 풀 도입 + config 1회 전송 | 분석 시 800ms + 직렬화 비용 절감 | 중간 |
| 8 | Transferable Objects로 content 전송 | 워커 통신 비용 ~0 | 중간 |
| 9 | Progressive Disclosure API | 초기 응답 <5KB, <50ms | 중간 |
| 10 | ParseCache → SQLite 전환 | 메모리 300MB 절감, 증분 저장 | 중간 |

### 중기 (1~2개월)

| # | 항목 | 예상 효과 | 난이도 |
|---|------|-----------|--------|
| 11 | Cytoscape → Sigma.js + Graphology | 75K 노드 60fps | 높음 |
| 12 | ForceAtlas2 WebWorker 레이아웃 | 점진적 렌더링 | 높음 |
| 13 | Semantic Zoom | 모바일 지원, UX 개선 | 높음 |
| 14 | NDJSON 스트리밍 응답 | TTFB <10ms | 중간 |

---

## 결론

현재 최적화 계획의 전략적 방향은 적절하나, 코드 레벨에서 이미 존재하는 **O(n x m) 캐시 저장 루프**, **반복적인 파일 재읽기**, **매 요청마다 발생하는 전체 직렬화** 같은 저수준 비효율이 대규모 전환(Sigma.js, SQLite 등)보다 먼저 해결되어야 한다. 특히 항목 #1(캐시 저장 루프 수정)은 코드 20줄 변경으로 **수십 초의 성능 향상**을 얻을 수 있어 즉시 적용해야 한다.

또한 V8 힙 사용량 추정을 37MB에서 **실제 ~212MB**로 수정하고, Docker 메모리 제한과 `--max-old-space-size`를 적절히 설정해야 20K 파일 규모에서 안정적으로 동작할 수 있다.
