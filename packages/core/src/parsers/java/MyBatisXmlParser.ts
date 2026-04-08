import type { FileParser, ParseResult, AnalysisConfig, GraphNode, GraphEdge, ParseError } from '../../graph/types.js';

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

    nodes.push({
      id: mapperNodeId,
      kind: 'mybatis-mapper',
      label: mapperLabel,
      filePath,
      metadata: { namespace, fqn: namespace },
    });

    // Extract SQL statements
    const statementPattern = /<(select|insert|update|delete)\s+id\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi;
    let match;

    const seenTables = new Set<string>();

    while ((match = statementPattern.exec(content)) !== null) {
      const statementType = match[1].toLowerCase() as 'select' | 'insert' | 'update' | 'delete';
      const statementId = match[2];
      const sqlBody = match[3];
      const line = content.substring(0, match.index).split('\n').length;

      const stmtNodeId = `mybatis-statement:${namespace}.${statementId}`;
      nodes.push({
        id: stmtNodeId,
        kind: 'mybatis-statement',
        label: `${mapperLabel}.${statementId}`,
        filePath,
        metadata: { statementType, statementId, namespace },
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
