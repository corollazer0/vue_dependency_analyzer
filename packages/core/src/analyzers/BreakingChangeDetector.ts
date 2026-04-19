import type { SignatureDiff, SignatureRecord } from '../engine/SignatureStore.js';
import type { SchemaDiff } from '../engine/SchemaSnapshotStore.js';

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

/**
 * Phase 13-9 — when supplied, the schema diff is OR-unioned with the
 * SignatureStore diff for B4. Schema-driven removals dedupe against
 * id matches in `signatureDiff.removed` so we don't double-count.
 */
export interface DetectBreakingChangesOptions {
  schemaDiff?: SchemaDiff | null;
}

export function detectBreakingChanges(diff: SignatureDiff, opts: DetectBreakingChangesOptions = {}): BreakingChangesReport {
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

  // Phase 13-9 — schema-diff-driven B4. Reports any DDL-side removed
  // table or column as B4. Dedupes against the SignatureStore-driven
  // ids that were already pushed above (by signatureId).
  if (opts.schemaDiff) {
    const seenIds = new Set(changes.map(c => c.signatureId));
    for (const t of opts.schemaDiff.removedTables) {
      const id = t.table;
      if (seenIds.has(id)) continue;
      changes.push({
        code: 'B4', severity: 'error', signatureId: id,
        message: `DB table dropped (DDL): \`${t.table}\` (was ${t.was.length} cols)`,
      });
      byCode.B4 += 1;
      seenIds.add(id);
    }
    for (const t of opts.schemaDiff.changedTables) {
      for (const c of t.removedColumns) {
        const id = `${t.table}.${c.name}`;
        if (seenIds.has(id)) continue;
        changes.push({
          code: 'B4', severity: 'error', signatureId: id,
          message: `DB column dropped (DDL): \`${id}\``,
        });
        byCode.B4 += 1;
        seenIds.add(id);
      }
      // Type changes — warning (matches the SignatureStore code path).
      for (const c of t.changedColumns) {
        const id = `${t.table}.${c.name}`;
        if (seenIds.has(id)) continue;
        // Don't push if the type actually didn't change (only nullable).
        if (c.from.type === c.to.type && c.from.nullable === c.to.nullable) continue;
        changes.push({
          code: 'B4', severity: 'warning', signatureId: id,
          message: `DB column changed (DDL): \`${id}\` ${c.from.type}${c.from.nullable === false ? ' NOT NULL' : ''} → ${c.to.type}${c.to.nullable === false ? ' NOT NULL' : ''}`,
        });
        byCode.B4 += 1;
        seenIds.add(id);
      }
    }
  }

  return { changes, byCode, renamed: diff.renamed ?? [] };
}
