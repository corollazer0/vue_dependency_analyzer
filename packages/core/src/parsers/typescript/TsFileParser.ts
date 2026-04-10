import ts from 'typescript';
import type { FileParser, ParseResult, AnalysisConfig, GraphNode, GraphEdge, NodeKind, ParseError } from '../../graph/types.js';
import path from 'path';

export class TsFileParser implements FileParser {
  supports(filePath: string): boolean {
    return /\.(ts|js|tsx|jsx)$/.test(filePath) && !filePath.endsWith('.d.ts');
  }

  parse(filePath: string, content: string, config: AnalysisConfig): ParseResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const errors: ParseError[] = [];

    const kind = detectModuleKind(filePath, content);
    const nodeId = `${kind}:${filePath}`;
    const label = path.basename(filePath, path.extname(filePath));

    const moduleNode: GraphNode = {
      id: nodeId,
      kind,
      label,
      filePath,
      metadata: {
        exportedFunctions: [] as string[],
        isBarrel: false,
      },
    };
    nodes.push(moduleNode);

    let sourceFile: ts.SourceFile;
    try {
      const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX
        : filePath.endsWith('.jsx') ? ts.ScriptKind.JSX
        : filePath.endsWith('.js') ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
      sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
    } catch (e) {
      errors.push({ filePath, message: `Parse error: ${e}`, severity: 'error' });
      return { nodes, edges, errors };
    }

    const exportedFunctions: string[] = [];
    const interfaces: Array<{ name: string; fields: string[]; fieldTypes: Array<{ name: string; type: string; optional: boolean }> }> = [];
    const exportedTypes: Array<{ name: string; fields: string[]; fieldTypes: Array<{ name: string; type: string; optional: boolean }> }> = [];
    let isBarrel = true;
    let hasNonReExport = false;

    function extractMembers(members: ts.NodeArray<ts.TypeElement>): { fields: string[]; fieldTypes: Array<{ name: string; type: string; optional: boolean }> } {
      const fields: string[] = [];
      const fieldTypes: Array<{ name: string; type: string; optional: boolean }> = [];
      for (const member of members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = member.name.getText(sourceFile);
          fields.push(name);
          const typeText = member.type ? member.type.getText(sourceFile) : 'unknown';
          const optional = !!member.questionToken;
          fieldTypes.push({ name, type: typeText, optional });
        }
      }
      return { fields, fieldTypes };
    }

    function visit(node: ts.Node): void {
      // Import declarations
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const importPath = node.moduleSpecifier.text;
        edges.push({
          id: `${nodeId}:imports:${importPath}`,
          source: nodeId,
          target: `unresolved:${importPath}`,
          kind: 'imports',
          metadata: { importPath },
        });
      }

      // Export declarations (re-exports)
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const exportPath = node.moduleSpecifier.text;
        edges.push({
          id: `${nodeId}:imports:${exportPath}`,
          source: nodeId,
          target: `unresolved:${exportPath}`,
          kind: 'imports',
          metadata: { importPath: exportPath, isReExport: true },
        });
      }

      // Exported function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const mods = ts.getCombinedModifierFlags(node);
        if (mods & ts.ModifierFlags.Export) {
          exportedFunctions.push(node.name.text);
          hasNonReExport = true;
        }
      }

      // Exported variable statements (const useXxx = ...)
      if (ts.isVariableStatement(node)) {
        const mods = ts.getCombinedModifierFlags(node.declarationList.declarations[0]);
        if (mods & ts.ModifierFlags.Export) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              exportedFunctions.push(decl.name.text);
              hasNonReExport = true;
            }
          }
        }
      }

      // Interface declarations
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const name = node.name.text;
        const { fields, fieldTypes } = extractMembers(node.members);
        interfaces.push({ name, fields, fieldTypes });
        const mods = ts.getCombinedModifierFlags(node);
        if (mods & ts.ModifierFlags.Export) {
          exportedTypes.push({ name, fields, fieldTypes });
        }
      }

      // Type alias declarations with object literal shape
      if (ts.isTypeAliasDeclaration(node) && node.name) {
        if (ts.isTypeLiteralNode(node.type)) {
          const name = node.name.text;
          const { fields, fieldTypes } = extractMembers(node.type.members);
          interfaces.push({ name, fields, fieldTypes });
          const mods = ts.getCombinedModifierFlags(node);
          if (mods & ts.ModifierFlags.Export) {
            exportedTypes.push({ name, fields, fieldTypes });
          }
        }
      }

      // Non-export/import statements mean not a barrel
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node) && !ts.isExportAssignment(node)) {
        if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node) ||
            ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
          hasNonReExport = true;
        }
      }

      // API calls within TS files
      if (ts.isCallExpression(node)) {
        const callText = node.expression.getText(sourceFile);
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

        if (isApiCall(callText) && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          let url: string | null = null;
          if (ts.isStringLiteral(firstArg)) url = firstArg.text;
          else if (ts.isNoSubstitutionTemplateLiteral(firstArg)) url = firstArg.text;

          if (url) {
            const apiNodeId = `api-call:${filePath}:${line}`;
            nodes.push({
              id: apiNodeId,
              kind: 'api-call-site',
              label: `${extractHttpMethod(callText)} ${url}`,
              filePath,
              metadata: { url, httpMethod: extractHttpMethod(callText) },
              loc: { filePath, line, column: 0 },
            });
            edges.push({
              id: `${nodeId}:api-call:${apiNodeId}`,
              source: nodeId,
              target: apiNodeId,
              kind: 'api-call',
              metadata: { url, httpMethod: extractHttpMethod(callText) },
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    (moduleNode.metadata as Record<string, unknown>).exportedFunctions = exportedFunctions;
    (moduleNode.metadata as Record<string, unknown>).isBarrel = !hasNonReExport && edges.length > 0;
    if (interfaces.length > 0) {
      (moduleNode.metadata as Record<string, unknown>).interfaces = interfaces;
    }
    if (exportedTypes.length > 0) {
      (moduleNode.metadata as Record<string, unknown>).exportedTypes = exportedTypes;
    }

    // Route-renders edge generation for vue-router route files
    if (kind === 'vue-router-route') {
      parseRouteRenders(content, nodeId, edges);
    }

    // Detect router.push / router.replace navigation calls in any TS/JS file
    parseRouterNavigation(content, nodeId, moduleNode);

    return { nodes, edges, errors };
  }
}

function detectModuleKind(filePath: string, content: string): NodeKind {
  const base = path.basename(filePath);

  // Pinia store detection
  if (/defineStore/.test(content) || /Store\.(ts|js)$/.test(base)) {
    return 'pinia-store';
  }

  // Composable detection
  if (/^use[A-Z]/.test(base)) {
    return 'vue-composable';
  }

  // Router detection — check basename and parent directory name
  const dir = path.basename(path.dirname(filePath));
  if ((/router/i.test(base) || /router/i.test(dir)) && /createRouter|RouteRecordRaw/.test(content)) {
    return 'vue-router-route';
  }

  return 'ts-module';
}

function isApiCall(callText: string): boolean {
  return /^(axios|this\.\$http|api|http|request)\.(get|post|put|delete|patch)$/i.test(callText)
    || callText === 'fetch';
}

function extractHttpMethod(callText: string): string {
  if (callText === 'fetch') return 'GET';
  const match = callText.match(/\.(get|post|put|delete|patch)$/i);
  return match ? match[1].toUpperCase() : 'GET';
}

/**
 * Parse route definitions to create route-renders edges.
 * Handles three patterns:
 *   1. Inline lazy: component: () => import('...')
 *   2. Alias lazy:  const XView = () => import('...') then component: XView
 *   3. Pure static: component: SomeImportedComponent (no alias match)
 */
function parseRouteRenders(content: string, nodeId: string, edges: GraphEdge[]): void {
  let match: RegExpExecArray | null;

  // Step 1: Build alias map from "const Xxx = () => import('...')" declarations
  const aliasToPath = new Map<string, string>();
  const aliasPattern = /const\s+([A-Z]\w+)\s*=\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = aliasPattern.exec(content)) !== null) {
    aliasToPath.set(match[1], match[2]);
  }

  // Step 2: Inline lazy pattern: component: () => import('...')
  const inlineLazyPattern = /component\s*:\s*\(\s*\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g;
  const handledPaths = new Set<string>();
  while ((match = inlineLazyPattern.exec(content)) !== null) {
    const importPath = match[1];
    handledPaths.add(importPath);
    edges.push({
      id: `${nodeId}:route-renders:${importPath}`,
      source: nodeId,
      target: `unresolved:${importPath}`,
      kind: 'route-renders',
      metadata: { importPath, isLazy: true },
    });
  }

  // Step 3: Static component pattern: component: SomeIdentifier
  const staticPattern = /component\s*:\s*([A-Z]\w+)/g;
  while ((match = staticPattern.exec(content)) !== null) {
    const componentName = match[1];
    const aliasPath = aliasToPath.get(componentName);

    if (aliasPath && !handledPaths.has(aliasPath)) {
      // Alias resolves to a lazy import — emit as unresolved with the real path
      handledPaths.add(aliasPath);
      edges.push({
        id: `${nodeId}:route-renders:${aliasPath}`,
        source: nodeId,
        target: `unresolved:${aliasPath}`,
        kind: 'route-renders',
        metadata: { importPath: aliasPath, isLazy: true, alias: componentName },
      });
    } else if (!aliasPath) {
      // Truly static (imported at top level), keep component: prefix
      edges.push({
        id: `${nodeId}:route-renders:component:${componentName}`,
        source: nodeId,
        target: `component:${componentName}`,
        kind: 'route-renders',
        metadata: { componentName },
      });
    }
    // If aliasPath is already handled, skip (dedup)
  }
}

/**
 * Detect router.push() / router.replace() / this.$router.push() / this.$router.replace()
 * calls and store them as metadata on the module node.
 */
function parseRouterNavigation(content: string, _nodeId: string, moduleNode: GraphNode): void {
  const navPattern = /(?:this\.\$router|router)\.(push|replace)\(\s*(?:['"]([^'"]+)['"]|\{[^}]*name\s*:\s*['"]([^'"]+)['"][^}]*\})/g;
  const navigations: Array<{ method: string; path?: string; name?: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = navPattern.exec(content)) !== null) {
    const method = match[1];
    const path = match[2] || undefined;
    const name = match[3] || undefined;
    navigations.push({ method, path, name });
  }

  if (navigations.length > 0) {
    (moduleNode.metadata as Record<string, unknown>).routerNavigations = navigations;
  }
}
