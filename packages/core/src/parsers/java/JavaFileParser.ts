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

      const isRepository = annotations.some(a => a === 'Repository');
      const isMapper = annotations.some(a => a === 'Mapper');
      const isConfiguration = annotations.some(a => a === 'Configuration');
      const isComponent = annotations.some(a => a === 'Component');
      const hasRequiredArgsConstructor = annotations.some(a => a === 'RequiredArgsConstructor');
      const fqn = packageName ? `${packageName}.${className}` : className;

      if (isController) {
        const controllerNodeId = `spring-controller:${filePath}`;
        const endpoints = extractEndpoints(content, filePath, basePath, controllerNodeId);

        nodes.push({
          id: controllerNodeId,
          kind: 'spring-controller',
          label: className,
          filePath,
          metadata: { className, packageName, basePath, fqn, endpointCount: endpoints.length },
        });

        for (const ep of endpoints) {
          nodes.push(ep.node);
          edges.push(ep.edge);
        }
      } else if (isService || isRepository || isMapper || isConfiguration || isComponent) {
        nodes.push({
          id: `spring-service:${filePath}`,
          kind: 'spring-service',
          label: className,
          filePath,
          metadata: {
            className, packageName, fqn,
            isRepository, isMapper, isConfiguration, isComponent,
          },
        });

        // @Bean methods in @Configuration classes
        if (isConfiguration) {
          const beanEdges = extractBeanMethods(content, filePath);
          edges.push(...beanEdges);
        }
      }

      // Detect DTO classes and extract their fields
      const isDto = /(?:DTO|Dto|Request|Response|VO|Summary|Detail)$/.test(className);
      if (isDto) {
        const fields = extractDtoFields(content);
        // If this class wasn't already added as a controller/service, add it as a spring-service with DTO metadata
        const existingNode = nodes.find(n => n.label === className);
        if (existingNode) {
          existingNode.metadata.isDto = true;
          existingNode.metadata.fields = fields;
        } else {
          nodes.push({
            id: `spring-service:${filePath}`,
            kind: 'spring-service',
            label: className,
            filePath,
            metadata: { className, packageName, fqn, isDto: true, fields },
          });
        }
      }

      // Detect @Autowired / constructor injection / @RequiredArgsConstructor
      const injections = extractInjections(content, filePath, hasRequiredArgsConstructor);
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

      // Spring Events: publishEvent() and @EventListener
      const events = extractSpringEvents(content, filePath, sourceId);
      edges.push(...events);
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
  const classMatch = content.match(/(?:public\s+)?(?:class|interface)\s+(\w+)/);
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

    const sig = extractMethodSignature(content, match.index);
    addEndpoint(endpoints, filePath, controllerNodeId, endpointPath, httpMethod, handlerMethod, line, sig.returnType, sig.paramTypes);
  }

  // Process each mapping type with global regex
  for (const mp of mappingPatterns) {
    const globalPattern = new RegExp(mp.pattern.source, 'g');
    while ((match = globalPattern.exec(content)) !== null) {
      const methodPath = (mp as any).noPath ? '' : match[1];
      const endpointPath = normalizePath(basePath + (methodPath || ''));
      const handlerMethod = extractMethodName(content, match.index);
      const line = content.substring(0, match.index).split('\n').length;
      const sig = extractMethodSignature(content, match.index);

      addEndpoint(endpoints, filePath, controllerNodeId, endpointPath, mp.method, handlerMethod, line, sig.returnType, sig.paramTypes);
    }
  }

  return endpoints;
}

function addEndpoint(
  endpoints: EndpointInfo[], filePath: string, controllerNodeId: string,
  endpointPath: string, httpMethod: string, handlerMethod: string, line: number,
  returnType: string = '', paramTypes: string[] = [],
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
      metadata: { httpMethod, path: endpointPath, handlerMethod, returnType, paramTypes },
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

function extractMethodSignature(content: string, annotationPos: number): { returnType: string; paramTypes: string[] } {
  const after = content.substring(annotationPos, annotationPos + 500);
  const methodMatch = after.match(/(?:public|protected|private)?\s+(\w+(?:<[^>]+>)?)\s+\w+\s*\(([^)]*)\)/);
  if (!methodMatch) return { returnType: '', paramTypes: [] };
  const returnType = methodMatch[1];
  const params = methodMatch[2];
  const paramTypes: string[] = [];
  if (params.trim()) {
    const paramPattern = /(?:@\w+(?:\([^)]*\))?\s+)*(\w+(?:<[^>]+>)?)\s+\w+/g;
    let m;
    while ((m = paramPattern.exec(params)) !== null) {
      paramTypes.push(m[1]);
    }
  }
  return { returnType, paramTypes };
}

function normalizePath(p: string): string {
  // Ensure leading slash, remove trailing slash, no double slashes
  let normalized = '/' + p.replace(/^\/+/, '').replace(/\/+$/, '');
  normalized = normalized.replace(/\/+/g, '/');
  return normalized;
}

function extractInjections(content: string, filePath: string, hasRequiredArgsConstructor: boolean = false): string[] {
  const injections: string[] = [];

  // @Autowired pattern
  const autowiredPattern = /@Autowired\s+(?:private\s+)?(\w+)\s+\w+/g;
  let match;
  while ((match = autowiredPattern.exec(content)) !== null) {
    injections.push(match[1]);
  }

  // @RequiredArgsConstructor (Lombok): all private final fields are injected
  if (hasRequiredArgsConstructor) {
    const finalFieldPattern = /private\s+final\s+(\w+)\s+\w+\s*;/g;
    while ((match = finalFieldPattern.exec(content)) !== null) {
      const type = match[1];
      if (/^[A-Z]/.test(type) && !['String', 'Integer', 'Long', 'Boolean', 'List', 'Map', 'Set'].includes(type)) {
        injections.push(type);
      }
    }
  }

  // Constructor injection pattern
  const constructorPattern = /(?:public\s+)?\w+\s*\(\s*((?:\w+\s+\w+\s*,?\s*)+)\)/;
  const ctorMatch = content.match(constructorPattern);
  if (ctorMatch) {
    const params = ctorMatch[1].split(',').map(p => p.trim());
    for (const param of params) {
      const parts = param.split(/\s+/);
      if (parts.length >= 2 && /^[A-Z]/.test(parts[0]) && /Service$|Repository$|Mapper$/.test(parts[0])) {
        injections.push(parts[0]);
      }
    }
  }

  return [...new Set(injections)];
}

function extractBeanMethods(content: string, filePath: string): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const configNodeId = `spring-service:${filePath}`;
  const beanPattern = /@Bean\s*(?:\([^)]*\))?\s*(?:public\s+)?(\w+)(?:<[^>]+>)?\s+(\w+)\s*\(/g;
  let match;

  while ((match = beanPattern.exec(content)) !== null) {
    const returnType = match[1];
    const methodName = match[2];
    edges.push({
      id: `${configNodeId}:spring-injects:bean:${methodName}`,
      source: configNodeId,
      target: `spring-service:${returnType}`,
      kind: 'spring-injects',
      metadata: { viaBean: true, beanMethod: methodName, beanType: returnType },
    });
  }

  return edges;
}

export function extractDtoFields(content: string): { name: string; type: string }[] {
  const fields: { name: string; type: string }[] = [];
  const pattern = /private\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*;/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    fields.push({ type: match[1], name: match[2] });
  }
  return fields;
}

function extractSpringEvents(content: string, filePath: string, sourceNodeId: string): GraphEdge[] {
  const edges: GraphEdge[] = [];

  // publishEvent(new XxxEvent(...))
  const publishPattern = /publishEvent\(\s*new\s+(\w+)/g;
  let match;
  while ((match = publishPattern.exec(content)) !== null) {
    const eventClass = match[1];
    const line = content.substring(0, match.index).split('\n').length;
    edges.push({
      id: `${sourceNodeId}:emits-event:event:${eventClass}`,
      source: sourceNodeId,
      target: `event:${eventClass}`,
      kind: 'emits-event',
      metadata: { eventClass },
      loc: { filePath, line, column: 0 },
    });
  }

  // @EventListener methods
  const listenerPattern = /@EventListener[\s\S]*?(?:public|protected|private)\s+\w+\s+\w+\s*\(\s*(\w+)/g;
  while ((match = listenerPattern.exec(content)) !== null) {
    const eventClass = match[1];
    const line = content.substring(0, match.index).split('\n').length;
    edges.push({
      id: `${sourceNodeId}:listens-event:event:${eventClass}`,
      source: `event:${eventClass}`,
      target: sourceNodeId,
      kind: 'listens-event',
      metadata: { eventClass },
      loc: { filePath, line, column: 0 },
    });
  }

  return edges;
}
