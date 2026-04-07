import type { FileParser, ParseResult, AnalysisConfig, GraphNode, GraphEdge, ParseError } from '../../graph/types.js';

export class KotlinFileParser implements FileParser {
  supports(filePath: string): boolean {
    return filePath.endsWith('.kt');
  }

  parse(filePath: string, content: string, config: AnalysisConfig): ParseResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const errors: ParseError[] = [];

    try {
      const packageMatch = content.match(/package\s+([\w.]+)/);
      const packageName = packageMatch ? packageMatch[1] : '';

      const classMatch = content.match(/class\s+(\w+)/);
      if (!classMatch) return { nodes, edges, errors };
      const className = classMatch[1];

      const isController = /@RestController|@Controller/.test(content);

      if (!isController) return { nodes, edges, errors };

      // Extract base path
      let basePath = '';
      const baseMatch = content.match(/@RequestMapping\(\s*["']([^"']+)["']\s*\)/);
      if (baseMatch) basePath = baseMatch[1];

      const controllerNodeId = `spring-controller:${filePath}`;
      nodes.push({
        id: controllerNodeId,
        kind: 'spring-controller',
        label: className,
        filePath,
        metadata: { className, packageName, basePath },
      });

      // Extract endpoints
      const mappings = [
        { regex: /@GetMapping\(\s*["']([^"']+)["']\s*\)/g, method: 'GET' },
        { regex: /@PostMapping\(\s*["']([^"']+)["']\s*\)/g, method: 'POST' },
        { regex: /@PutMapping\(\s*["']([^"']+)["']\s*\)/g, method: 'PUT' },
        { regex: /@DeleteMapping\(\s*["']([^"']+)["']\s*\)/g, method: 'DELETE' },
        { regex: /@PatchMapping\(\s*["']([^"']+)["']\s*\)/g, method: 'PATCH' },
      ];

      for (const { regex, method } of mappings) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const endpointPath = normalizePath(basePath + match[1]);
          const line = content.substring(0, match.index).split('\n').length;
          const nodeId = `spring-endpoint:${method}:${endpointPath}`;

          nodes.push({
            id: nodeId,
            kind: 'spring-endpoint',
            label: `${method} ${endpointPath}`,
            filePath,
            metadata: { httpMethod: method, path: endpointPath },
            loc: { filePath, line, column: 0 },
          });
          edges.push({
            id: `${controllerNodeId}:api-serves:${nodeId}`,
            source: controllerNodeId,
            target: nodeId,
            kind: 'api-serves',
            metadata: { httpMethod: method, path: endpointPath },
          });
        }
      }
    } catch (e) {
      errors.push({
        filePath,
        message: `Kotlin parse error: ${e instanceof Error ? e.message : String(e)}`,
        severity: 'error',
      });
    }

    return { nodes, edges, errors };
  }
}

function normalizePath(p: string): string {
  let normalized = '/' + p.replace(/^\/+/, '').replace(/\/+$/, '');
  normalized = normalized.replace(/\/+/g, '/');
  return normalized;
}
