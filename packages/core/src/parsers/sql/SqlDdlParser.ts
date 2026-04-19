// Phase 13-5 — minimal SQL DDL parser.
//
// Scope (per phase13-plan §1-2):
//   - CREATE TABLE foo (col1 type [NULL|NOT NULL] [DEFAULT x], col2 type, …)
//   - ALTER TABLE foo ADD [COLUMN] col type
//   - ALTER TABLE foo DROP [COLUMN] col
//   - ALTER TABLE foo MODIFY [COLUMN] col type            (MySQL)
//   - ALTER TABLE foo ALTER COLUMN col type               (PG/H2)
//   - ALTER TABLE foo RENAME COLUMN old TO new            (PG)
//
// Out: indexes, triggers, foreign keys, sequences, partial column types
// (just first word). Liquibase XML is a separate Phase 14+ track.

export interface SqlColumn {
  name: string;
  /** First word only — e.g. `VARCHAR(255)` → `VARCHAR`. */
  type: string;
  nullable?: boolean;
  default?: string | null;
}

export type SqlDdlOp =
  | { kind: 'create-table'; table: string; columns: SqlColumn[] }
  | { kind: 'add-column'; table: string; column: SqlColumn }
  | { kind: 'drop-column'; table: string; column: string }
  | { kind: 'modify-column'; table: string; column: SqlColumn }
  | { kind: 'rename-column'; table: string; from: string; to: string }
  | { kind: 'drop-table'; table: string };

/**
 * Parse a single SQL file into the ordered list of DDL ops it contains.
 * Anything we don't understand (CREATE INDEX, BEGIN/COMMIT, etc.) is
 * skipped silently — we only care about table-shape changes.
 */
export function parseSqlDdl(sql: string): SqlDdlOp[] {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const ops: SqlDdlOp[] = [];

  // CREATE TABLE — collect columns inside the outer-most parens.
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\)\s*(?:ENGINE|;)/gi;
  let m: RegExpExecArray | null;
  while ((m = createRe.exec(cleaned)) !== null) {
    const table = m[1].toLowerCase();
    const body = m[2];
    const columns = parseColumnList(body);
    ops.push({ kind: 'create-table', table, columns });
  }

  // ALTER TABLE — sequential per-statement scan because many forms exist.
  const alterRe = /ALTER\s+TABLE\s+[`"]?(\w+)[`"]?\s+([\s\S]+?);/gi;
  while ((m = alterRe.exec(cleaned)) !== null) {
    const table = m[1].toLowerCase();
    const tail = m[2].trim();
    // Each ALTER TABLE can have multiple comma-separated clauses.
    for (const clause of splitTopLevel(tail)) {
      const c = clause.trim();
      let cm: RegExpMatchArray | null;
      if ((cm = c.match(/^ADD\s+(?:COLUMN\s+)?[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]*\))?)([\s\S]*)$/i))) {
        const candName = cm[1].toLowerCase();
        // Filter out ALTER TABLE ADD CONSTRAINT/INDEX/FOREIGN KEY/PRIMARY KEY/UNIQUE.
        if (['constraint', 'index', 'key', 'primary', 'foreign', 'unique', 'check'].includes(candName)) continue;
        const col = parseColumnTrailing(candName, cm[2], cm[3] ?? '');
        ops.push({ kind: 'add-column', table, column: col });
      } else if ((cm = c.match(/^DROP\s+(?:COLUMN\s+)?[`"]?(\w+)[`"]?$/i))) {
        ops.push({ kind: 'drop-column', table, column: cm[1].toLowerCase() });
      } else if ((cm = c.match(/^MODIFY\s+(?:COLUMN\s+)?[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]*\))?)([\s\S]*)$/i))) {
        ops.push({ kind: 'modify-column', table, column: parseColumnTrailing(cm[1].toLowerCase(), cm[2], cm[3] ?? '') });
      } else if ((cm = c.match(/^ALTER\s+COLUMN\s+[`"]?(\w+)[`"]?\s+(?:TYPE\s+)?(\w+(?:\([^)]*\))?)([\s\S]*)$/i))) {
        ops.push({ kind: 'modify-column', table, column: parseColumnTrailing(cm[1].toLowerCase(), cm[2], cm[3] ?? '') });
      } else if ((cm = c.match(/^RENAME\s+COLUMN\s+[`"]?(\w+)[`"]?\s+TO\s+[`"]?(\w+)[`"]?$/i))) {
        ops.push({ kind: 'rename-column', table, from: cm[1].toLowerCase(), to: cm[2].toLowerCase() });
      }
      // Unknown ALTER clause — skip silently.
    }
  }

  // DROP TABLE — only the simple form.
  const dropRe = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*;/gi;
  while ((m = dropRe.exec(cleaned)) !== null) {
    ops.push({ kind: 'drop-table', table: m[1].toLowerCase() });
  }
  return ops;
}

function parseColumnList(body: string): SqlColumn[] {
  const out: SqlColumn[] = [];
  for (const part of splitTopLevel(body)) {
    const piece = part.trim();
    if (!piece) continue;
    // Skip table-level constraints (PRIMARY KEY (id), CONSTRAINT … etc.)
    if (/^(PRIMARY\s+KEY|UNIQUE|CONSTRAINT|FOREIGN\s+KEY|CHECK|KEY|INDEX)\b/i.test(piece)) continue;
    const m = piece.match(/^[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]*\))?)([\s\S]*)$/);
    if (!m) continue;
    out.push(parseColumnTrailing(m[1].toLowerCase(), m[2], m[3] ?? ''));
  }
  return out;
}

function parseColumnTrailing(name: string, rawType: string, trailing: string): SqlColumn {
  // Type = first word; throw away parens for downstream.
  const type = rawType.replace(/\(.*$/, '').toUpperCase();
  const t = trailing.toUpperCase();
  let nullable: boolean | undefined = undefined;
  if (/\bNOT\s+NULL\b/.test(t)) nullable = false;
  else if (/\bNULL\b/.test(t)) nullable = true;
  let def: string | null | undefined = undefined;
  const dm = trailing.match(/\bDEFAULT\s+([^,\s]+)/i);
  if (dm) def = dm[1];
  const col: SqlColumn = { name, type };
  if (nullable !== undefined) col.nullable = nullable;
  if (def !== undefined) col.default = def;
  return col;
}

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}
