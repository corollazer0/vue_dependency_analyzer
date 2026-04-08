import ts from 'typescript';
import type { GraphEdge, GraphNode, ParseError, AnalysisConfig } from '../../graph/types.js';

interface ScriptAnalysisResult {
  edges: GraphEdge[];
  nodes: GraphNode[];
  errors: ParseError[];
  metadata: {
    props?: string[];
    emits?: string[];
    routerNavigations?: Array<{ method: string; path?: string; name?: string }>;
  };
}

export function analyzeScript(
  scriptContent: string,
  filePath: string,
  componentNodeId: string,
  lang: string,
  config: AnalysisConfig,
): ScriptAnalysisResult {
  const edges: GraphEdge[] = [];
  const nodes: GraphNode[] = [];
  const errors: ParseError[] = [];
  const metadata: ScriptAnalysisResult['metadata'] = {};

  const scriptKind = lang === 'ts' || lang === 'tsx' ? ts.ScriptKind.TS : ts.ScriptKind.JS;

  let sourceFile: ts.SourceFile;
  try {
    sourceFile = ts.createSourceFile(filePath, scriptContent, ts.ScriptTarget.Latest, true, scriptKind);
  } catch (e) {
    errors.push({
      filePath,
      message: `Failed to parse script: ${e instanceof Error ? e.message : String(e)}`,
      severity: 'error',
    });
    return { edges, nodes, errors, metadata };
  }

  function visit(node: ts.Node): void {
    // Import declarations
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      const importedNames = getImportedNames(node);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      edges.push({
        id: `${componentNodeId}:imports:${importPath}`,
        source: componentNodeId,
        target: `unresolved:${importPath}`,
        kind: 'imports',
        metadata: { importPath, importedNames },
        loc: { filePath, line, column: 0 },
      });
    }

    // Call expressions
    if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(sourceFile);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

      // Pinia store: useXxxStore()
      if (/^use\w+Store$/.test(callText)) {
        edges.push({
          id: `${componentNodeId}:uses-store:${callText}`,
          source: componentNodeId,
          target: `store:${callText}`,
          kind: 'uses-store',
          metadata: { storeName: callText },
          loc: { filePath, line, column: 0 },
        });
      }
      // Composable: useXxx() (but not useXxxStore)
      else if (/^use[A-Z]\w+$/.test(callText) && !/Store$/.test(callText)) {
        edges.push({
          id: `${componentNodeId}:uses-composable:${callText}`,
          source: componentNodeId,
          target: `composable:${callText}`,
          kind: 'uses-composable',
          metadata: { composableName: callText },
          loc: { filePath, line, column: 0 },
        });
      }

      // API calls: axios.get/post/put/delete/patch
      if (isApiCall(callText)) {
        const url = extractFirstStringArg(node, sourceFile);
        if (url) {
          const apiNodeId = `api-call:${filePath}:${line}`;
          nodes.push({
            id: apiNodeId,
            kind: 'api-call-site',
            label: `${extractHttpMethod(callText)} ${url}`,
            filePath,
            metadata: { url, httpMethod: extractHttpMethod(callText), rawCall: callText },
            loc: { filePath, line, column: 0 },
          });
          edges.push({
            id: `${componentNodeId}:api-call:${apiNodeId}`,
            source: componentNodeId,
            target: apiNodeId,
            kind: 'api-call',
            metadata: { url, httpMethod: extractHttpMethod(callText) },
            loc: { filePath, line, column: 0 },
          });
        }
      }

      // Native bridge: window.XXX.method() or XXX.method() where XXX is a known bridge
      if (isNativeBridgeCall(callText, config.nativeBridges || [])) {
        const { interfaceName, methodName } = parseNativeBridgeCall(callText);
        edges.push({
          id: `${componentNodeId}:native-call:${interfaceName}.${methodName}`,
          source: componentNodeId,
          target: `native:${interfaceName}.${methodName}`,
          kind: 'native-call',
          metadata: { interfaceName, methodName },
          loc: { filePath, line, column: 0 },
        });
      }

      // provide()
      if (callText === 'provide' && node.arguments.length >= 1) {
        const key = extractFirstStringArg(node, sourceFile);
        if (key) {
          edges.push({
            id: `${componentNodeId}:provides:${key}`,
            source: componentNodeId,
            target: `injection:${key}`,
            kind: 'provides',
            metadata: { injectionKey: key },
            loc: { filePath, line, column: 0 },
          });
        }
      }

      // inject()
      if (callText === 'inject' && node.arguments.length >= 1) {
        const key = extractFirstStringArg(node, sourceFile);
        if (key) {
          edges.push({
            id: `${componentNodeId}:injects:${key}`,
            source: componentNodeId,
            target: `injection:${key}`,
            kind: 'injects',
            metadata: { injectionKey: key },
            loc: { filePath, line, column: 0 },
          });
        }
      }

      // defineProps
      if (callText === 'defineProps') {
        metadata.props = extractDefinePropsKeys(node, sourceFile);
      }

      // defineEmits
      if (callText === 'defineEmits') {
        metadata.emits = extractDefineEmitsKeys(node, sourceFile);
      }

      // router.push / router.replace / this.$router.push / this.$router.replace
      if (/^(?:this\.\$router|router)\.(push|replace)$/.test(callText) && node.arguments.length > 0) {
        const method = callText.endsWith('push') ? 'push' : 'replace';
        const firstArg = node.arguments[0];
        let routePath: string | undefined;
        let routeName: string | undefined;

        if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
          routePath = firstArg.text;
        } else if (ts.isObjectLiteralExpression(firstArg)) {
          for (const prop of firstArg.properties) {
            if (ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === 'name' && ts.isStringLiteral(prop.initializer)) {
              routeName = prop.initializer.text;
            }
          }
        }

        if (routePath || routeName) {
          if (!metadata.routerNavigations) {
            (metadata as Record<string, unknown>).routerNavigations = [];
          }
          ((metadata as Record<string, unknown>).routerNavigations as Array<Record<string, unknown>>).push({
            method,
            ...(routePath ? { path: routePath } : {}),
            ...(routeName ? { name: routeName } : {}),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { edges, nodes, errors, metadata };
}

function getImportedNames(node: ts.ImportDeclaration): string[] {
  const names: string[] = [];
  if (node.importClause) {
    if (node.importClause.name) {
      names.push(node.importClause.name.text);
    }
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        for (const spec of node.importClause.namedBindings.elements) {
          names.push(spec.name.text);
        }
      } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        names.push(`* as ${node.importClause.namedBindings.name.text}`);
      }
    }
  }
  return names;
}

function isApiCall(callText: string): boolean {
  return /^(axios|this\.\$http|api|http|request)\.(get|post|put|delete|patch|head|options)$/i.test(callText)
    || callText === 'fetch'
    || /\.(get|post|put|delete|patch)\s*$/.test(callText);
}

function extractHttpMethod(callText: string): string {
  if (callText === 'fetch') return 'GET';
  const match = callText.match(/\.(get|post|put|delete|patch|head|options)$/i);
  return match ? match[1].toUpperCase() : 'GET';
}

function extractFirstStringArg(node: ts.CallExpression, sourceFile: ts.SourceFile): string | null {
  if (node.arguments.length === 0) return null;
  const firstArg = node.arguments[0];

  if (ts.isStringLiteral(firstArg)) {
    return firstArg.text;
  }
  if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
    return firstArg.text;
  }
  if (ts.isTemplateExpression(firstArg)) {
    // Extract static parts of template literal
    let result = firstArg.head.text;
    for (const span of firstArg.templateSpans) {
      result += `:param`;
      result += span.literal.text;
    }
    return result;
  }
  return null;
}

function isNativeBridgeCall(callText: string, knownBridges: string[]): boolean {
  // window.XXX.method() or known bridge patterns
  for (const bridge of knownBridges) {
    if (callText.startsWith(`window.${bridge}.`) || callText.startsWith(`${bridge}.`)) {
      return true;
    }
  }
  // Generic pattern: window.Something.method
  return /^window\.\w+\.\w+$/.test(callText);
}

function parseNativeBridgeCall(callText: string): { interfaceName: string; methodName: string } {
  const cleaned = callText.replace(/^window\./, '');
  const parts = cleaned.split('.');
  return {
    interfaceName: parts[0],
    methodName: parts.slice(1).join('.'),
  };
}

function extractDefinePropsKeys(node: ts.CallExpression, sourceFile: ts.SourceFile): string[] {
  // Handle defineProps({ key: Type }) or defineProps<{ key: type }>()
  if (node.arguments.length > 0 && ts.isObjectLiteralExpression(node.arguments[0])) {
    return node.arguments[0].properties
      .filter(ts.isPropertyAssignment)
      .map(p => p.name.getText(sourceFile));
  }
  // Type-based props are harder; just return empty for now
  return [];
}

function extractDefineEmitsKeys(node: ts.CallExpression, sourceFile: ts.SourceFile): string[] {
  // Handle defineEmits(['event1', 'event2'])
  if (node.arguments.length > 0 && ts.isArrayLiteralExpression(node.arguments[0])) {
    return node.arguments[0].elements
      .filter(ts.isStringLiteral)
      .map(e => e.text);
  }
  return [];
}
