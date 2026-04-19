import type { SignatureDiff, SignatureRecord } from '../engine/SignatureStore.js';

// Phase 8-2 + 8-3 + 8-4 — translate a `SignatureDiff` into the four
// breaking-change codes the plan tracks:
//
//   B1 — DTO field removed   (`dto-field` in `removed[]`)
//   B2 — DTO field flipped from nullable=true → nullable=false
//   B3 — Spring endpoint signature changed or removed
//   B4 — DB column removed   (signals to MyBatis statements break)
//
// The detector does NOT consult the current graph — it operates purely
// on the SignatureDiff so two snapshots produced by `--signatures-only`
// can be compared without re-running the full analysis.

export type BreakingCode = 'B1' | 'B2' | 'B3' | 'B4';

export interface BreakingChange {
  code: BreakingCode;
  severity: 'error' | 'warning';
  /** Stable id from the SignatureRecord — `${fqn}#field`,
   *  `${controllerFqn}#${method}`, or `${table}.${column}`. */
  signatureId: string;
  message: string;
  before?: SignatureRecord;
  after?: SignatureRecord;
}

export interface BreakingChangesReport {
  changes: BreakingChange[];
  byCode: Record<BreakingCode, number>;
  /**
   * Phase 10-4 — DTO fields detected as a rename pair (same simple
   * className, same field name) by `SignatureStore.diff`'s rename
   * heuristic. These are excluded from the B1 count even though the
   * before-record still appears in `diff.removed`.
   */
  renamed: Array<{ before: SignatureRecord; after: SignatureRecord }>;
}

function emptyByCode(): Record<BreakingCode, number> {
  return { B1: 0, B2: 0, B3: 0, B4: 0 };
}

function isNullable(value: unknown): boolean {
  return value === true;
}

export function detectBreakingChanges(diff: SignatureDiff): BreakingChangesReport {
  const changes: BreakingChange[] = [];
  const byCode = emptyByCode();

  // Phase 10-4 — IDs that the rename heuristic paired up. Skip B1 for these
  // so a class moved between packages doesn't loud-fail every field as
  // "removed". The companion `added` records remain (so the new id is
  // visible) — they aren't a breaking change either, just a rename.
  const renamedRemovedIds = new Set<string>();
  for (const pair of diff.renamed ?? []) renamedRemovedIds.add(pair.before.id);

  // B1 — removed DTO fields.
  for (const r of diff.removed) {
    if (r.kind === 'dto-field' && !renamedRemovedIds.has(r.id)) {
      changes.push({
        code: 'B1',
        severity: 'error',
        signatureId: r.id,
        message: `DTO field removed: \`${r.id}\``,
        before: r,
      });
      byCode.B1 += 1;
    }
  }

  // B3 — removed endpoints (treated as a signature change of "gone").
  for (const r of diff.removed) {
    if (r.kind === 'endpoint') {
      changes.push({
        code: 'B3',
        severity: 'error',
        signatureId: r.id,
        message: `Spring endpoint removed: \`${r.id}\` (${r.metadata.httpMethod ?? '?'} ${r.metadata.path ?? '?'})`,
        before: r,
      });
      byCode.B3 += 1;
    }
  }

  // B4 — removed db columns (or whole tables).
  for (const r of diff.removed) {
    if (r.kind === 'db-column') {
      changes.push({
        code: 'B4',
        severity: 'error',
        signatureId: r.id,
        message: `DB column removed: \`${r.id}\``,
        before: r,
      });
      byCode.B4 += 1;
    }
  }

  // B2 / B3 from modifications.
  for (const m of diff.modified) {
    if (m.before.kind === 'dto-field') {
      const wasNullable = isNullable(m.before.metadata.nullable);
      const isNullableNow = isNullable(m.after.metadata.nullable);
      if (wasNullable && !isNullableNow) {
        changes.push({
          code: 'B2',
          severity: 'warning',
          signatureId: m.before.id,
          message: `DTO field made required (Optional → required): \`${m.before.id}\``,
          before: m.before,
          after: m.after,
        });
        byCode.B2 += 1;
      }
      // Type-ref change on a still-existing field is *also* a breaking
      // candidate but is reported as B1 to keep severity consistent
      // with field-removed (caller can refine via metadata diff).
      if (m.before.metadata.typeRef !== m.after.metadata.typeRef) {
        changes.push({
          code: 'B1',
          severity: 'error',
          signatureId: m.before.id,
          message: `DTO field type changed: \`${m.before.id}\` (${m.before.metadata.typeRef} → ${m.after.metadata.typeRef})`,
          before: m.before,
          after: m.after,
        });
        byCode.B1 += 1;
      }
    } else if (m.before.kind === 'endpoint') {
      changes.push({
        code: 'B3',
        severity: 'error',
        signatureId: m.before.id,
        message: `Endpoint signature changed: \`${m.before.id}\``,
        before: m.before,
        after: m.after,
      });
      byCode.B3 += 1;
    } else if (m.before.kind === 'db-column') {
      // Type-only column changes — warning, not error (most DBs accept
      // widening; narrowing is an operational issue that's still worth
      // flagging).
      changes.push({
        code: 'B4',
        severity: 'warning',
        signatureId: m.before.id,
        message: `DB column type changed: \`${m.before.id}\``,
        before: m.before,
        after: m.after,
      });
      byCode.B4 += 1;
    }
  }

  return { changes, byCode, renamed: diff.renamed ?? [] };
}
