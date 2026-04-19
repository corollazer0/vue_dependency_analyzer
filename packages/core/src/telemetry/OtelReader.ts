import { readFileSync } from 'fs';

// Phase 9-11 — Read-only OTLP JSON trace reader (PoC).
//
// Loads a Spring auto-instrumentation export (OTLP JSON, batch shape)
// and groups span durations by HTTP method + path pattern. Output keys
// are stringified `${httpMethod} ${pathPattern}` so they can be looked
// up against `spring-endpoint` node metadata directly.
//
// Anti-suggestion guard (plan §6 / R4): this module is read-only —
// no live collection, no agent, no network. Real APM systems handle
// shipping. We just consume the JSON they (or the user) export.

export interface SpanRecord {
  name: string;
  httpMethod?: string;
  httpTarget?: string;
  durationNs: number;
  status?: 'ok' | 'error' | 'unset';
}

export interface EndpointTraceStats {
  endpointKey: string;     // `${httpMethod} ${pathPattern}`
  traceCount: number;
  p95Ms: number;
  errorRate: number;       // 0..1
}

export interface OtelReadResult {
  /** Per-endpoint stats keyed by `${HTTPMethod} ${pathPattern}`. */
  byEndpoint: Map<string, EndpointTraceStats>;
  /** Spans we couldn't match to any endpoint shape. */
  unmatchedTraceCount: number;
  /** Total spans processed. */
  totalSpans: number;
}

function p95(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

function attrLookup(attrs: any[] | undefined, key: string): string | undefined {
  if (!attrs) return undefined;
  for (const a of attrs) {
    if (a?.key === key) {
      const v = a.value ?? {};
      return v.stringValue ?? v.intValue?.toString() ?? v.boolValue?.toString();
    }
  }
  return undefined;
}

/**
 * Walks the OTLP-JSON tree (resourceSpans → scopeSpans → spans) and
 * yields one normalised span record per HTTP-server span.
 */
function *iterSpans(otelDoc: any): IterableIterator<SpanRecord> {
  const resourceSpans = Array.isArray(otelDoc?.resourceSpans) ? otelDoc.resourceSpans : [];
  for (const rs of resourceSpans) {
    const scopes = Array.isArray(rs?.scopeSpans) ? rs.scopeSpans : (Array.isArray(rs?.instrumentationLibrarySpans) ? rs.instrumentationLibrarySpans : []);
    for (const sc of scopes) {
      const spans = Array.isArray(sc?.spans) ? sc.spans : [];
      for (const s of spans) {
        const name = String(s?.name ?? '');
        const startNs = Number(s?.startTimeUnixNano ?? 0);
        const endNs = Number(s?.endTimeUnixNano ?? 0);
        const durationNs = Math.max(0, endNs - startNs);
        const httpMethod = attrLookup(s?.attributes, 'http.method') ?? attrLookup(s?.attributes, 'http.request.method');
        const httpTarget = attrLookup(s?.attributes, 'http.target') ?? attrLookup(s?.attributes, 'http.route') ?? attrLookup(s?.attributes, 'url.path');
        const statusCode = s?.status?.code;
        const status: SpanRecord['status'] = statusCode === 2 ? 'error' : statusCode === 1 ? 'ok' : 'unset';
        if (!name && !httpMethod) continue;
        yield { name, httpMethod, httpTarget, durationNs, status };
      }
    }
  }
}

const SPAN_NAME_RE = /^([A-Z]+)\s+(\/.+)$/;

/**
 * `endpointPathPatterns`: known endpoint keys (`${method} ${path}`)
 * pulled from the SerializedGraph. Spans whose normalised key matches
 * are bucketed; the rest are counted as `unmatchedTraceCount`.
 */
export function readOtelTraces(filePath: string, endpointPathPatterns: Iterable<string>): OtelReadResult {
  const raw = readFileSync(filePath, 'utf-8');
  const doc = JSON.parse(raw);
  const known = new Set(endpointPathPatterns);
  return reduceSpans([...iterSpans(doc)], known);
}

export function reduceSpans(spans: SpanRecord[], knownEndpoints: Set<string>): OtelReadResult {
  const byKey = new Map<string, { durations: number[]; errors: number; count: number }>();
  let unmatched = 0;
  for (const s of spans) {
    let key: string | undefined;
    // Prefer span-name parse — Spring auto-instrumentation emits
    // `GET /api/users/{id}` directly.
    const m = SPAN_NAME_RE.exec(s.name);
    if (m) key = `${m[1]} ${m[2]}`;
    else if (s.httpMethod && s.httpTarget) key = `${s.httpMethod.toUpperCase()} ${s.httpTarget}`;
    if (!key || !knownEndpoints.has(key)) {
      unmatched += 1;
      continue;
    }
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = { durations: [], errors: 0, count: 0 };
      byKey.set(key, bucket);
    }
    bucket.durations.push(s.durationNs / 1_000_000); // ms
    bucket.count += 1;
    if (s.status === 'error') bucket.errors += 1;
  }
  const byEndpoint = new Map<string, EndpointTraceStats>();
  for (const [key, bucket] of byKey.entries()) {
    byEndpoint.set(key, {
      endpointKey: key,
      traceCount: bucket.count,
      p95Ms: Math.round(p95(bucket.durations) * 100) / 100,
      errorRate: bucket.count === 0 ? 0 : bucket.errors / bucket.count,
    });
  }
  return { byEndpoint, unmatchedTraceCount: unmatched, totalSpans: spans.length };
}
