import { describe, it, expect } from 'vitest';
import { readOtelTraces, reduceSpans } from '../OtelReader.js';
import { resolve } from 'path';

const fixture = resolve(import.meta.dirname, '../../../../../test-project-ecommerce/.phase9-fixtures/otel-sample.json');

describe('OtelReader (Phase 9-11)', () => {
  it('matches OTLP span names against known endpoint patterns and computes p95 + errorRate', () => {
    const known = new Set([
      'GET /api/users',
      'GET /api/users/{id}',
      'POST /api/auth/login',
      'GET /api/products',
      'GET /api/products/{id}',
    ]);
    const result = readOtelTraces(fixture, known);
    expect(result.totalSpans).toBeGreaterThanOrEqual(15);
    expect(result.byEndpoint.size).toBe(5);

    const usersList = result.byEndpoint.get('GET /api/users')!;
    expect(usersList).toBeDefined();
    expect(usersList.traceCount).toBeGreaterThanOrEqual(5);
    expect(usersList.errorRate).toBeGreaterThan(0);
    expect(usersList.p95Ms).toBeGreaterThan(0);

    const usersById = result.byEndpoint.get('GET /api/users/{id}')!;
    expect(usersById.errorRate).toBe(0);

    // Phase 9 PoC gate — match rate >= 80%
    const matchRate = (result.totalSpans - result.unmatchedTraceCount) / result.totalSpans;
    expect(matchRate).toBeGreaterThanOrEqual(0.8);
  });

  it('counts unmatched spans without crashing on unknown shapes', () => {
    const noKnown = new Set<string>();
    const result = readOtelTraces(fixture, noKnown);
    expect(result.totalSpans).toBeGreaterThan(0);
    expect(result.unmatchedTraceCount).toBe(result.totalSpans);
    expect(result.byEndpoint.size).toBe(0);
  });

  it('reduceSpans handles empty input', () => {
    const result = reduceSpans([], new Set());
    expect(result.totalSpans).toBe(0);
    expect(result.byEndpoint.size).toBe(0);
    expect(result.unmatchedTraceCount).toBe(0);
  });
});
