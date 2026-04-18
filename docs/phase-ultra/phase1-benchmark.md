# Phase 1 — Benchmark Record

> Generated: 2026-04-18
> Branch: `feature/ultra-phase`
> Harness: `packages/server/src/__tests__/benchmark-phase1.ts`
> Node: v22.x, in-process Fastify inject (no network)

Phase 1 gate (FINAL-PLAN §3):

1. `/api/graph` response size ≥ −80% vs pre-Phase-1 baseline.
2. At least one TTFB measurement recorded.
3. All existing tests green.

## Results

### test-project-ecommerce (269 nodes / 532 edges)

| Metric | Before (uncompressed) | After (brotli q=4) | Delta |
|---|---:|---:|---:|
| `/api/graph` payload | 416,280 B | 22,064 B | **−94.7 %** |
| Cold TTFB (first request) | 17.7 ms | 25.4 ms | +7.7 ms (encode cost) |
| Warm TTFB (dirty-flag cache hit, 200) | — | 4.6 ms | **−74 %** vs cold uncompressed |
| Revalidated TTFB (ETag match, 304) | — | 0.9 ms | **−95 %** vs cold uncompressed |

### test-project (1,054 nodes / 4,174 edges)

| Metric | Before (uncompressed) | After (brotli q=4) | Delta |
|---|---:|---:|---:|
| `/api/graph` payload | 3,127,445 B | 122,452 B | **−96.1 %** |
| Cold TTFB (first request) | 28.1 ms | 45.2 ms | +17.1 ms |
| Warm TTFB (cache hit, 200) | — | 24.5 ms | −13 % vs cold |
| Revalidated TTFB (ETag match, 304) | — | 0.9 ms | **−97 %** vs cold |

## Interpretation

- Payload reduction clears the −80 % gate on both fixtures by a wide margin. Brotli
  quality 4 was chosen intentionally over 11 — on these JSON payloads the extra CPU
  buys <2 % size; q=4 keeps encode under 20 ms even on the 3 MB case.
- Cold TTFB increases by the encode cost (expected). The real user-visible win is
  on the second and subsequent requests: 304 revalidation returns in ~1 ms regardless
  of graph size, and warm 200 cuts serialization + stringify on the hot path.
- `Cache-Control: private, max-age=0, must-revalidate` forces every request to
  revalidate, so the client never serves stale data — it just pays a 1 ms round-trip
  when the graph hasn't mutated.

## How to reproduce

```bash
npx tsx packages/server/src/__tests__/benchmark-phase1.ts test-project-ecommerce
npx tsx packages/server/src/__tests__/benchmark-phase1.ts test-project
```

## Test suite

```
turbo run test  →  311 tests across 25 files, all green
  - @vda/core   263
  - @vda/cli      4
  - @vda/server  44 (added: brotli-compression + ETag-revalidation)
```
