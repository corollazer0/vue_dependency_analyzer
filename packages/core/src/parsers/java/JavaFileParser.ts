import type {
  FileParser,
  ParseResult,
  AnalysisConfig,
  GraphNode,
  GraphEdge,
  ParseError,
  SpringDtoField,
  SpringDtoNodeMetadata,
} from '../../graph/types.js';
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
          edges.push(...ep.edges);
        }
      } else if (isService || isRepository || isMapper || isConfiguration || isComponent) {
        // Phase 7b-1 — flag classes with @Scheduled methods so the
        // EntrypointCollector can treat them as runtime entry points.
        const hasScheduled = /@Scheduled\b/.test(content);
        nodes.push({
          id: `spring-service:${filePath}`,
          kind: 'spring-service',
          label: className,
          filePath,
          metadata: {
            className, packageName, fqn,
            isRepository, isMapper, isConfiguration, isComponent,
            ...(hasScheduled ? { hasScheduled: true } : {}),
          },
        });

        // @Bean methods in @Configuration classes
        if (isConfiguration) {
          const beanEdges = extractBeanMethods(content, filePath);
          edges.push(...beanEdges);
        }
      }

      // Detect DTO classes and emit a first-class `spring-dto` node
      // (Phase 7a-2). Pure DTOs no longer ride on a `spring-service` node;
      // hybrid classes (controller/service whose name happens to end in a
      // DTO suffix) get a sibling spring-dto node so consumers find DTO
      // metadata in one well-known place.
      const isDto = /(?:DTO|Dto|Request|Response|VO|Summary|Detail)$/.test(className);
      if (isDto) {
        const dtoFields = extractDtoFields(content);
        const dtoNodeId = `spring-dto:${filePath}`;
        if (!nodes.some(n => n.id === dtoNodeId)) {
          // Map the loose extractor output onto the frozen SpringDtoField
          // shape (Phase 7a-12). Phase 8 SignatureStore reads this directly.
          const fields: SpringDtoField[] = dtoFields.map((f) => ({
            name: f.name,
            typeRef: f.type,
            ...(f.nullable !== undefined ? { nullable: f.nullable } : {}),
            ...(f.jsonName !== undefined ? { jsonName: f.jsonName } : {}),
          }));
          const sourceRef = { filePath, line: 1, column: 0 };
          const metadata: SpringDtoNodeMetadata = {
            fqn,
            fields,
            sourceRef,
            className,
            packageName,
          };
          nodes.push({
            id: dtoNodeId,
            kind: 'spring-dto',
            label: className,
            filePath,
            metadata,
            loc: sourceRef,
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
  edges: GraphEdge[];
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
    edges: [
      {
        id: `${controllerNodeId}:api-serves:${nodeId}`,
        source: controllerNodeId,
        target: nodeId,
        kind: 'api-serves',
        metadata: { httpMethod, path: endpointPath },
      },
      // Reverse alias: lets a forward DFS from spring-endpoint reach back
      // into the controller (and onward to services/mappers/db-table).
      // Phase 7a-1 — Pathfinder direction fix.
      {
        id: `${nodeId}:api-implements:${controllerNodeId}`,
        source: nodeId,
        target: controllerNodeId,
        kind: 'api-implements',
        metadata: { httpMethod, path: endpointPath },
      },
    ],
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

export interface DtoField {
  name: string;
  type: string;
  nullable?: boolean;
  jsonName?: string;
}

export function extractDtoFields(content: string): DtoField[] {
  // Java 17 record: record Name(Type a, @Anno Type b) { }
  const recordMatch = content.match(/\brecord\s+\w+\s*\(([\s\S]*?)\)\s*(?:implements\s+[\w.<>,\s]+)?\s*\{/);
  if (recordMatch) {
    const components = extractRecordComponents(recordMatch[1]);
    if (components.length > 0) return components;
  }

  const fields: DtoField[] = [];
  // Capture leading annotations (may span multiple lines) + private [final] Type name;
  const pattern = /((?:@\w+(?:\s*\([^)]*\))?\s*)*)\bprivate\s+(?:final\s+|static\s+)*((?:\w+(?:\.\w+)*)(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?)\s+(\w+)\s*[;=]/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const annotations = match[1] || '';
    const type = match[2];
    const name = match[3];
    fields.push(buildDtoField(type, name, annotations));
  }
  return fields;
}

function extractRecordComponents(paramList: string): DtoField[] {
  const parts = splitTopLevelRecord(paramList);
  const out: DtoField[] = [];
  for (const raw of parts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^((?:@\w+(?:\s*\([^)]*\))?\s*)*)((?:\w+(?:\.\w+)*)(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?)\s+(\w+)\s*$/);
    if (!m) continue;
    out.push(buildDtoField(m[2], m[3], m[1] || ''));
  }
  return out;
}

function splitTopLevelRecord(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '<' || ch === '(') depth++;
    else if (ch === '>' || ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function buildDtoField(rawType: string, name: string, annotations: string): DtoField {
  const field: DtoField = { type: rawType, name };

  const jsonMatch = annotations.match(/@JsonProperty\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']/);
  if (jsonMatch) field.jsonName = jsonMatch[1];

  if (/@(NotNull|NotBlank|NotEmpty|NonNull)\b/.test(annotations)) {
    field.nullable = false;
  } else if (/@Nullable\b/.test(annotations)) {
    field.nullable = true;
  }

  const optionalMatch = rawType.match(/^Optional<(.+)>$/);
  if (optionalMatch) {
    field.type = optionalMatch[1].trim();
    field.nullable = true;
  }

  return field;
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

  // @EventListener / @TransactionalEventListener methods (Phase 7a-7).
  //   Form A: @EventListener public void onX(XEvent e) — type from the
  //           first method parameter.
  //   Form B: @EventListener(XEvent.class) public void onX() — type
  //           specified in the annotation argument when the method takes
  //           no event parameter (or e.g. wraps it in a wildcard).
  // @TransactionalEventListener follows the same shapes; both kinds were
  // previously dropped, masking event chains entirely.
  const seenListeners = new Set<string>();
  function addListener(eventClass: string, position: number): void {
    const dedup = `${eventClass}@${position}`;
    if (seenListeners.has(dedup)) return;
    seenListeners.add(dedup);
    const line = content.substring(0, position).split('\n').length;
    edges.push({
      id: `${sourceNodeId}:listens-event:event:${eventClass}@${line}`,
      source: `event:${eventClass}`,
      target: sourceNodeId,
      kind: 'listens-event',
      metadata: { eventClass },
      loc: { filePath, line, column: 0 },
    });
  }

  // Form A — type pulled off the method's first parameter.
  const listenerParamPattern = /@(?:Transactional)?EventListener(?:\s*\([^)]*\))?[\s\S]*?(?:public|protected|private)\s+\w+\s+\w+\s*\(\s*(\w+)/g;
  while ((match = listenerParamPattern.exec(content)) !== null) {
    const eventClass = match[1];
    // Skip primitives / collection markers — the annotation form
    // happens to capture e.g. `void onX()` -> 'void' on no-arg methods.
    if (/^(void|int|long|short|byte|float|double|boolean|char|String|List|Set|Map|Collection)$/.test(eventClass)) continue;
    addListener(eventClass, match.index);
  }

  // Form B — type lifted out of @EventListener(XEvent.class).
  const listenerAnnotationPattern = /@(?:Transactional)?EventListener\s*\(\s*(?:classes\s*=\s*)?\{?\s*(\w+)\.class/g;
  while ((match = listenerAnnotationPattern.exec(content)) !== null) {
    addListener(match[1], match.index);
  }

  return edges;
}
