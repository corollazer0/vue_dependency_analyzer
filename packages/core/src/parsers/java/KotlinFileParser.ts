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

      const classOrInterfaceMatch = content.match(/(?:class|interface)\s+(\w+)/);
      if (!classOrInterfaceMatch) return { nodes, edges, errors };
      const className = classOrInterfaceMatch[1];
      const fqn = packageName ? `${packageName}.${className}` : className;

      const isController = /@RestController|@Controller/.test(content);
      const isService = /@Service\b/.test(content);
      const isRepository = /@Repository\b/.test(content);
      const isComponent = /@Component\b/.test(content);
      const isMapper = /@Mapper\b/.test(content);

      if (isController) {
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
      } else if (isService || isRepository || isComponent || isMapper) {
        const serviceNodeId = `spring-service:${filePath}`;
        nodes.push({
          id: serviceNodeId,
          kind: 'spring-service',
          label: className,
          filePath,
          metadata: {
            className, packageName, fqn,
            isRepository, isMapper, isComponent,
          },
        });
      }

      // Detect constructor injection: class Xxx(private val foo: FooType, ...)
      const ctorPattern = /class\s+\w+\s*\(([^)]+)\)/;
      const ctorMatch = content.match(ctorPattern);
      if (ctorMatch && nodes.length > 0) {
        const sourceId = isController ? `spring-controller:${filePath}` : `spring-service:${filePath}`;
        const params = ctorMatch[1].split(',').map(p => p.trim());
        for (const param of params) {
          // Match patterns like: private val repo: XxxRepository  or  val service: XxxService
          const paramTypeMatch = param.match(/(?:private\s+)?val\s+\w+\s*:\s*(\w+)/);
          if (paramTypeMatch) {
            const injectedType = paramTypeMatch[1];
            // Only inject types that look like Spring beans (start with uppercase)
            if (/^[A-Z]/.test(injectedType) && !['String', 'Int', 'Long', 'Boolean', 'List', 'Map', 'Set'].includes(injectedType)) {
              edges.push({
                id: `${sourceId}:spring-injects:${injectedType}`,
                source: sourceId,
                target: `spring-service:${injectedType}`,
                kind: 'spring-injects',
                metadata: { injectedType },
              });
            }
          }
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
