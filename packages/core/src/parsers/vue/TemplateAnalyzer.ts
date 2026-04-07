import { parse as parseTemplate } from '@vue/compiler-dom';
import type { GraphEdge, ParseError } from '../../graph/types.js';
import type {
  TemplateChildNode,
  ElementNode,
  DirectiveNode,
} from '@vue/compiler-core';

interface TemplateAnalysisResult {
  edges: GraphEdge[];
  errors: ParseError[];
}

const BUILTIN_ELEMENTS = new Set([
  // HTML elements (not exhaustive, but covers common ones)
  'div', 'span', 'p', 'a', 'button', 'input', 'form', 'img', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'section', 'article', 'nav', 'header', 'footer', 'main', 'aside',
  'label', 'select', 'option', 'textarea', 'br', 'hr', 'pre', 'code',
  'strong', 'em', 'b', 'i', 'small', 'sub', 'sup', 'video', 'audio', 'canvas', 'svg',
  // Vue built-in components
  'template', 'slot', 'component', 'transition', 'transition-group', 'keep-alive',
  'teleport', 'suspense',
  // Common Vue Router components
  'router-view', 'router-link', 'RouterView', 'RouterLink',
]);

const BUILTIN_DIRECTIVES = new Set([
  'if', 'else', 'else-if', 'for', 'show', 'model', 'bind', 'on', 'slot',
  'html', 'text', 'pre', 'cloak', 'once', 'memo',
]);

export function analyzeTemplate(
  templateContent: string,
  filePath: string,
  componentNodeId: string,
): TemplateAnalysisResult {
  const edges: GraphEdge[] = [];
  const errors: ParseError[] = [];

  let ast;
  try {
    ast = parseTemplate(templateContent, { comments: false });
  } catch (e) {
    errors.push({
      filePath,
      message: `Failed to parse template: ${e instanceof Error ? e.message : String(e)}`,
      severity: 'error',
    });
    return { edges, errors };
  }

  const seenComponents = new Set<string>();
  const seenDirectives = new Set<string>();

  function visitNode(node: TemplateChildNode): void {
    if (node.type === 1 /* ELEMENT */) {
      const element = node as ElementNode;
      const tag = element.tag;

      // Detect custom components (PascalCase or kebab-case non-HTML)
      if (!BUILTIN_ELEMENTS.has(tag) && !BUILTIN_ELEMENTS.has(tag.toLowerCase())) {
        const normalizedTag = toPascalCase(tag);
        if (!seenComponents.has(normalizedTag)) {
          seenComponents.add(normalizedTag);
          edges.push({
            id: `${componentNodeId}:uses-component:${normalizedTag}`,
            source: componentNodeId,
            target: `component:${normalizedTag}`,
            kind: 'uses-component',
            metadata: { componentName: normalizedTag, rawTag: tag },
          });
        }
      }

      // Detect custom directives
      for (const prop of element.props) {
        if (prop.type === 7 /* DIRECTIVE */) {
          const directive = prop as DirectiveNode;
          if (!BUILTIN_DIRECTIVES.has(directive.name)) {
            const directiveName = directive.name;
            if (!seenDirectives.has(directiveName)) {
              seenDirectives.add(directiveName);
              edges.push({
                id: `${componentNodeId}:uses-directive:${directiveName}`,
                source: componentNodeId,
                target: `directive:${directiveName}`,
                kind: 'uses-directive',
                metadata: { directiveName },
              });
            }
          }
        }
      }

      // Recurse into children
      for (const child of element.children) {
        visitNode(child);
      }
    } else if (node.type === 11 /* FOR */ || node.type === 9 /* IF */) {
      // These have branches/children
      const n = node as any;
      if (n.children) {
        for (const child of n.children) visitNode(child);
      }
      if (n.branches) {
        for (const branch of n.branches) {
          if (branch.children) {
            for (const child of branch.children) visitNode(child);
          }
        }
      }
    }
  }

  for (const child of ast.children) {
    visitNode(child);
  }

  return { edges, errors };
}

function toPascalCase(str: string): string {
  if (str.includes('-')) {
    return str
      .split('-')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
  }
  return str;
}
