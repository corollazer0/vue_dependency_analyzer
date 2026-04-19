import type { FileParser, ParseResult, AnalysisConfig, GraphNode, GraphEdge, ParseError } from '../../graph/types.js';

export interface ResultMapping {
  property: string;
  column: string;
  javaType?: string;
  jdbcType?: string;
}

export interface ResultMap {
  id: string;
  type: string;        // FQN
  typeSimple: string;  // class name
  mappings: ResultMapping[];
}

export class MyBatisXmlParser implements FileParser {
  supports(filePath: string): boolean {
    return filePath.endsWith('.xml');
  }

  parse(filePath: string, content: string, config: AnalysisConfig): ParseResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const errors: ParseError[] = [];

    // Only parse MyBatis mapper XMLs
    const namespaceMatch = content.match(/<mapper\s+namespace\s*=\s*["']([^"']+)["']/);
    if (!namespaceMatch) return { nodes, edges, errors };

    const namespace = namespaceMatch[1];
    const mapperNodeId = `mybatis-mapper:${namespace}`;
    const mapperLabel = namespace.split('.').pop() || namespace;

    // Parse <resultMap> declarations first
    const resultMaps = extractResultMaps(content);
    const resultMapIndex = new Map<string, ResultMap>();
    for (const rm of resultMaps) resultMapIndex.set(rm.id, rm);

    nodes.push({
      id: mapperNodeId,
      kind: 'mybatis-mapper',
      label: mapperLabel,
      filePath,
      metadata: {
        namespace,
        fqn: namespace,
        resultMaps,
      },
    });

    // Extract SQL statements
    const statementPattern = /<(select|insert|update|delete)\s+([^>]*?)>([\s\S]*?)<\/\1>/gi;
    let match;

    const seenTables = new Set<string>();

    while ((match = statementPattern.exec(content)) !== null) {
      const statementType = match[1].toLowerCase() as 'select' | 'insert' | 'update' | 'delete';
      const attrs = match[2];
      const idAttr = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
      if (!idAttr) continue;
      const statementId = idAttr[1];
      const sqlBody = match[3];
      const line = content.substring(0, match.index).split('\n').length;

      const resultMapRef = attrs.match(/\bresultMap\s*=\s*["']([^"']+)["']/)?.[1];
      const resultTypeRef = attrs.match(/\bresultType\s*=\s*["']([^"']+)["']/)?.[1];
      const parameterTypeRef = attrs.match(/\bparameterType\s*=\s*["']([^"']+)["']/)?.[1];

      let resultMapType: string | undefined;
      let resultMapTypeSimple: string | undefined;
      let fieldMappings: ResultMapping[] | undefined;

      if (resultMapRef) {
        const localId = resultMapRef.includes('.') ? resultMapRef.split('.').pop()! : resultMapRef;
        const rm = resultMapIndex.get(localId) || resultMapIndex.get(resultMapRef);
        if (rm) {
          resultMapType = rm.type;
          resultMapTypeSimple = rm.typeSimple;
          fieldMappings = rm.mappings;
        }
      } else if (resultTypeRef) {
        resultMapType = resultTypeRef;
        resultMapTypeSimple = resultTypeRef.split('.').pop()!;
        // Inline: synthesize mappings from SELECT column list
        fieldMappings = extractInlineColumnMappings(sqlBody);
      }

      const stmtNodeId = `mybatis-statement:${namespace}.${statementId}`;
      const stmtMeta: Record<string, unknown> = { statementType, statementId, namespace };
      if (resultMapType) stmtMeta.resultMapType = resultMapType;
      if (resultMapTypeSimple) stmtMeta.resultMapTypeSimple = resultMapTypeSimple;
      if (fieldMappings) stmtMeta.fieldMappings = fieldMappings;
      if (parameterTypeRef) {
        stmtMeta.parameterType = parameterTypeRef;
        stmtMeta.parameterTypeSimple = parameterTypeRef.split('.').pop();
      }

      nodes.push({
        id: stmtNodeId,
        kind: 'mybatis-statement',
        label: `${mapperLabel}.${statementId}`,
        filePath,
        metadata: stmtMeta,
        loc: { filePath, line, column: 0 },
      });

      // mapper → statement
      edges.push({
        id: `${mapperNodeId}:mybatis-maps:${stmtNodeId}`,
        source: mapperNodeId,
        target: stmtNodeId,
        kind: 'mybatis-maps',
        metadata: { statementType },
      });

      // Extract table names from SQL
      const tables = extractTableNames(sqlBody);
      for (const table of tables) {
        const tableNodeId = `db-table:${table}`;
        if (!seenTables.has(table)) {
          seenTables.add(table);
          nodes.push({
            id: tableNodeId,
            kind: 'db-table',
            label: table,
            filePath,
            metadata: { tableName: table },
          });
        }

        const edgeKind = statementType === 'select' ? 'reads-table' : 'writes-table';
        edges.push({
          id: `${stmtNodeId}:${edgeKind}:${tableNodeId}`,
          source: stmtNodeId,
          target: tableNodeId,
          kind: edgeKind,
          metadata: { statementType, tableName: table },
        });
      }
    }

    return { nodes, edges, errors };
  }
}

function extractTableNames(sql: string): string[] {
  const tables = new Set<string>();

  // Remove XML CDATA, comments, string literals
  let cleaned = sql
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'[^']*'/g, "''")
    .replace(/\$\{[^}]+\}/g, 'param');

  // Patterns: FROM table, JOIN table, INTO table, UPDATE table
  const patterns = [
    /\bFROM\s+(\w+)/gi,
    /\bJOIN\s+(\w+)/gi,
    /\bINTO\s+(\w+)/gi,
    /\bUPDATE\s+(\w+)/gi,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(cleaned)) !== null) {
      const name = m[1].toLowerCase();
      // Skip SQL keywords that might follow FROM
      if (!SQL_KEYWORDS.has(name)) {
        tables.add(name);
      }
    }
  }

  return Array.from(tables);
}

const SQL_KEYWORDS = new Set([
  'select', 'where', 'set', 'values', 'and', 'or', 'not', 'null',
  'order', 'group', 'having', 'limit', 'offset', 'union', 'exists',
  'case', 'when', 'then', 'else', 'end', 'as', 'on', 'in', 'is',
  'like', 'between', 'distinct', 'dual',
]);

function extractResultMaps(content: string): ResultMap[] {
  const out: ResultMap[] = [];
  const rmPattern = /<resultMap\s+([^>]*?)>([\s\S]*?)<\/resultMap>/gi;
  let m;
  while ((m = rmPattern.exec(content)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const id = attrs.match(/\bid\s*=\s*["']([^"']+)["']/)?.[1];
    const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/)?.[1];
    if (!id || !type) continue;

    const mappings: ResultMapping[] = [];
    const childPattern = /<(id|result)\s+([^/]*?)\/>/gi;
    let c;
    while ((c = childPattern.exec(body)) !== null) {
      const childAttrs = c[2];
      const property = childAttrs.match(/\bproperty\s*=\s*["']([^"']+)["']/)?.[1];
      const column = childAttrs.match(/\bcolumn\s*=\s*["']([^"']+)["']/)?.[1];
      if (!property || !column) continue;
      const javaType = childAttrs.match(/\bjavaType\s*=\s*["']([^"']+)["']/)?.[1];
      const jdbcType = childAttrs.match(/\bjdbcType\s*=\s*["']([^"']+)["']/)?.[1];
      const mapping: ResultMapping = { property, column };
      if (javaType) mapping.javaType = javaType;
      if (jdbcType) mapping.jdbcType = jdbcType;
      mappings.push(mapping);
    }

    out.push({
      id,
      type,
      typeSimple: type.split('.').pop() || type,
      mappings,
    });
  }
  return out;
}

/**
 * Attempt to infer column↔property mappings from inline SELECT statements.
 * For `SELECT col AS alias, col2 FROM ...`, produces [{property: alias, column: col}, ...].
 * Unqualified columns map 1:1 (property = column in camelCase).
 */
function extractInlineColumnMappings(sqlBody: string): ResultMapping[] {
  const mappings: ResultMapping[] = [];
  const cleaned = sqlBody
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const selectMatch = cleaned.match(/\bSELECT\s+([\s\S]*?)\bFROM\b/i);
  if (!selectMatch) return mappings;
  const projection = selectMatch[1].trim();
  if (projection === '*' || /\.\*/.test(projection)) return mappings;

  for (const raw of splitTopLevel(projection)) {
    const expr = raw.trim();
    if (!expr) continue;
    const asMatch = expr.match(/^([\w.]+)\s+(?:AS\s+)?(\w+)$/i);
    if (asMatch) {
      const column = asMatch[1].split('.').pop()!;
      const property = asMatch[2];
      mappings.push({ property, column });
      continue;
    }
    const bareMatch = expr.match(/^([\w.]+)$/);
    if (bareMatch) {
      const column = bareMatch[1].split('.').pop()!;
      mappings.push({ property: snakeToCamel(column), column });
    }
  }
  return mappings;
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/gi, (_, c) => c.toUpperCase());
}
