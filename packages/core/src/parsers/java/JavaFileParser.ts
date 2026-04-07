import type { FileParser, ParseResult, AnalysisConfig, GraphNode, GraphEdge, ParseError } from '../../graph/types.js';
import path from 'path';

export class JavaFileParser implements FileParser {
  supports(filePath: string): boolean {
    return filePath.endsWith('.java');
  }

  parse(filePath: string, content: string, config: AnalysisConfig): ParseResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const errors: ParseError[] = [];

    try {
      const classInfo = extractClassInfo(content, filePath);
      if (!classInfo) return { nodes, edges, errors };

      const { className, packageName, annotations, basePath } = classInfo;
      const isController = annotations.some(a =>
        a === 'RestController' || a === 'Controller'
      );
      const isService = annotations.some(a => a === 'Service');

      if (isController) {
        const controllerNodeId = `spring-controller:${filePath}`;
        const endpoints = extractEndpoints(content, filePath, basePath, controllerNodeId);

        nodes.push({
          id: controllerNodeId,
          kind: 'spring-controller',
          label: className,
          filePath,
          metadata: {
            className,
            packageName,
            basePath,
            endpointCount: endpoints.length,
          },
        });

        for (const ep of endpoints) {
          nodes.push(ep.node);
          edges.push(ep.edge);
        }
      } else if (isService) {
        nodes.push({
          id: `spring-service:${filePath}`,
          kind: 'spring-service',
          label: className,
          filePath,
          metadata: { className, packageName },
        });
      }

      // Detect @Autowired / constructor injection
      const injections = extractInjections(content, filePath);
      const sourceId = isController ? `spring-controller:${filePath}` : `spring-service:${filePath}`;
      if (nodes.length > 0) {
        for (const injection of injections) {
          edges.push({
            id: `${sourceId}:spring-injects:${injection}`,
            source: sourceId,
            target: `spring-service:${injection}`,
            kind: 'spring-injects',
            metadata: { injectedType: injection },
          });
        }
      }
    } catch (e) {
      errors.push({
        filePath,
        message: `Java parse error: ${e instanceof Error ? e.message : String(e)}`,
        severity: 'error',
      });
    }

    return { nodes, edges, errors };
  }
}

interface ClassInfo {
  className: string;
  packageName: string;
  annotations: string[];
  basePath: string;
}

function extractClassInfo(content: string, filePath: string): ClassInfo | null {
  // Extract package
  const packageMatch = content.match(/package\s+([\w.]+)\s*;/);
  const packageName = packageMatch ? packageMatch[1] : '';

  // Extract class-level annotations and class name
  // Match patterns like: @RestController @RequestMapping("/api/users") public class UserController
  const classPattern = /(?:@(\w+)(?:\(([^)]*)\))?\s*)*(?:public\s+)?class\s+(\w+)/g;

  // First, find all annotations before the class declaration
  const classMatch = content.match(/(?:public\s+)?class\s+(\w+)/);
  if (!classMatch) return null;

  const className = classMatch[1];

  // Find annotations in the area before class declaration
  const classPos = content.indexOf(classMatch[0]);
  const beforeClass = content.substring(Math.max(0, classPos - 500), classPos);

  const annotations: string[] = [];
  const annotationPattern = /@(\w+)/g;
  let m;
  while ((m = annotationPattern.exec(beforeClass)) !== null) {
    annotations.push(m[1]);
  }

  // Extract base path from @RequestMapping on class
  let basePath = '';
  const requestMappingPattern = /@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["']/;
  const basePathMatch = beforeClass.match(requestMappingPattern);
  if (basePathMatch) {
    basePath = basePathMatch[1];
  }

  return { className, packageName, annotations, basePath };
}

interface EndpointInfo {
  node: GraphNode;
  edge: GraphEdge;
}

function extractEndpoints(content: string, filePath: string, basePath: string, controllerNodeId: string): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];

  const mappingPatterns = [
    { pattern: /@GetMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/, method: 'GET' },
    { pattern: /@PostMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/, method: 'POST' },
    { pattern: /@PutMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/, method: 'PUT' },
    { pattern: /@DeleteMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/, method: 'DELETE' },
    { pattern: /@PatchMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/, method: 'PATCH' },
  ];

  // Also handle @RequestMapping with method specification
  const requestMappingMethodPattern = /@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["']\s*,\s*method\s*=\s*RequestMethod\.(\w+)/g;

  let match;
  while ((match = requestMappingMethodPattern.exec(content)) !== null) {
    const endpointPath = normalizePath(basePath + match[1]);
    const httpMethod = match[2].toUpperCase();
    const handlerMethod = extractMethodName(content, match.index);
    const line = content.substring(0, match.index).split('\n').length;

    addEndpoint(endpoints, filePath, controllerNodeId, endpointPath, httpMethod, handlerMethod, line);
  }

  // Process each mapping type with global regex
  for (const mp of mappingPatterns) {
    const globalPattern = new RegExp(mp.pattern.source, 'g');
    while ((match = globalPattern.exec(content)) !== null) {
      const methodPath = (mp as any).noPath ? '' : match[1];
      const endpointPath = normalizePath(basePath + (methodPath || ''));
      const handlerMethod = extractMethodName(content, match.index);
      const line = content.substring(0, match.index).split('\n').length;

      addEndpoint(endpoints, filePath, controllerNodeId, endpointPath, mp.method, handlerMethod, line);
    }
  }

  return endpoints;
}

function addEndpoint(
  endpoints: EndpointInfo[], filePath: string, controllerNodeId: string,
  endpointPath: string, httpMethod: string, handlerMethod: string, line: number,
): void {
  const nodeId = `spring-endpoint:${httpMethod}:${endpointPath}`;

  // Skip duplicates
  if (endpoints.some(e => e.node.id === nodeId)) return;

  endpoints.push({
    node: {
      id: nodeId,
      kind: 'spring-endpoint',
      label: `${httpMethod} ${endpointPath}`,
      filePath,
      metadata: { httpMethod, path: endpointPath, handlerMethod },
      loc: { filePath, line, column: 0 },
    },
    edge: {
      id: `${controllerNodeId}:api-serves:${nodeId}`,
      source: controllerNodeId,
      target: nodeId,
      kind: 'api-serves',
      metadata: { httpMethod, path: endpointPath },
    },
  });
}

function extractMethodName(content: string, annotationPos: number): string {
  // Look for method declaration after the annotation
  const after = content.substring(annotationPos, annotationPos + 500);
  const methodMatch = after.match(/(?:public|protected|private)?\s+\w+(?:<[^>]+>)?\s+(\w+)\s*\(/);
  return methodMatch ? methodMatch[1] : 'unknown';
}

function normalizePath(p: string): string {
  // Ensure leading slash, remove trailing slash, no double slashes
  let normalized = '/' + p.replace(/^\/+/, '').replace(/\/+$/, '');
  normalized = normalized.replace(/\/+/g, '/');
  return normalized;
}

function extractInjections(content: string, filePath: string): string[] {
  const injections: string[] = [];

  // @Autowired pattern
  const autowiredPattern = /@Autowired\s+(?:private\s+)?(\w+)\s+\w+/g;
  let match;
  while ((match = autowiredPattern.exec(content)) !== null) {
    injections.push(match[1]);
  }

  // Constructor injection pattern (most common in modern Spring)
  // Look for constructor with parameters typed as services
  const constructorPattern = /(?:public\s+)?\w+\s*\(\s*((?:\w+\s+\w+\s*,?\s*)+)\)/;
  const ctorMatch = content.match(constructorPattern);
  if (ctorMatch) {
    const params = ctorMatch[1].split(',').map(p => p.trim());
    for (const param of params) {
      const parts = param.split(/\s+/);
      if (parts.length >= 2 && /^[A-Z]/.test(parts[0]) && /Service$|Repository$/.test(parts[0])) {
        injections.push(parts[0]);
      }
    }
  }

  return injections;
}
