import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ─── Types ───

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  target: string;
  ip: string;
  details?: string;
}

// ─── In-Memory Audit Log Store ───

const MAX_ENTRIES = 1000;

export class AuditLog {
  private entries: AuditEntry[] = [];

  record(entry: Omit<AuditEntry, 'timestamp'>): void {
    this.entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    // FIFO eviction
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
  }

  getEntries(limit: number = 50): AuditEntry[] {
    // Return newest first
    return this.entries.slice(-limit).reverse();
  }

  get size(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}

// ─── Audit Paths ───

/** Routes that should be recorded in audit log */
const AUDIT_PATTERNS: { method: string; path: string; action: string }[] = [
  { method: 'POST', path: '/api/analyze', action: 'analysis:run' },
  { method: 'POST', path: '/api/analyze/cancel', action: 'analysis:cancel' },
  { method: 'POST', path: '/api/analysis/change-impact', action: 'analysis:change-impact' },
  { method: 'GET', path: '/api/analysis/rule-violations', action: 'query:rule-violations' },
  { method: 'GET', path: '/api/analysis/dto-consistency', action: 'query:dto-consistency' },
  { method: 'GET', path: '/api/graph', action: 'query:graph' },
  { method: 'GET', path: '/api/stats', action: 'query:stats' },
  { method: 'GET', path: '/api/admin/audit-log', action: 'admin:view-audit-log' },
];

function matchAuditPattern(method: string, url: string): string | null {
  // Strip query string for matching
  const path = url.split('?')[0];
  for (const pattern of AUDIT_PATTERNS) {
    if (pattern.method === method && path === pattern.path) {
      return pattern.action;
    }
  }
  return null;
}

// ─── Fastify Hook ───

export function registerAuditHook(fastify: FastifyInstance, auditLog: AuditLog): void {
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const action = matchAuditPattern(request.method, request.url);
    if (!action) return;

    const user = (request as any).user?.sub || 'anonymous';
    auditLog.record({
      user,
      action,
      target: request.url,
      ip: request.ip,
      details: `${reply.statusCode}`,
    });
  });
}
