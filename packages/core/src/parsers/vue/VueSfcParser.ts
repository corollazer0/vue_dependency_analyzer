import { parse as parseSfc } from '@vue/compiler-sfc';
import type { FileParser, ParseResult, AnalysisConfig, GraphNode, GraphEdge, ParseError } from '../../graph/types.js';
import { analyzeScript } from './ScriptAnalyzer.js';
import { analyzeTemplate } from './TemplateAnalyzer.js';
import { countLines, distinctPackageCount } from '../_shared/fileMetrics.js';
import path from 'path';

export class VueSfcParser implements FileParser {
  supports(filePath: string): boolean {
    return filePath.endsWith('.vue');
  }

  parse(filePath: string, content: string, config: AnalysisConfig): ParseResult {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const errors: ParseError[] = [];

    const { descriptor, errors: sfcErrors } = parseSfc(content, {
      filename: filePath,
    });

    for (const err of sfcErrors) {
      errors.push({
        filePath,
        message: err.message,
        line: 'loc' in err ? (err as any).loc?.start.line : undefined,
        severity: 'error',
      });
    }

    const componentName = getComponentName(filePath);
    const nodeId = `vue:${filePath}`;

    // Phase 10-2 — universal lineCount/packageCount stamped on every node.
    const fileLineCount = countLines(content);
    const componentNode: GraphNode = {
      id: nodeId,
      kind: 'vue-component',
      label: componentName,
      filePath,
      metadata: {
        isSetupScript: !!descriptor.scriptSetup,
        props: [] as string[],
        emits: [] as string[],
        lineCount: fileLineCount,
        packageCount: 0,
      },
    };
    nodes.push(componentNode);

    // Analyze script
    const scriptContent = descriptor.scriptSetup?.content || descriptor.script?.content;
    const scriptLang = descriptor.scriptSetup?.lang || descriptor.script?.lang || 'js';
    if (scriptContent) {
      const scriptResult = analyzeScript(scriptContent, filePath, nodeId, scriptLang, config);
      edges.push(...scriptResult.edges);
      nodes.push(...scriptResult.nodes);
      errors.push(...scriptResult.errors);

      // Extract props/emits into metadata
      if (scriptResult.metadata.props) {
        (componentNode.metadata as Record<string, unknown>).props = scriptResult.metadata.props;
      }
      if (scriptResult.metadata.emits) {
        (componentNode.metadata as Record<string, unknown>).emits = scriptResult.metadata.emits;
      }
      if (scriptResult.metadata.storeToRefsUsage) {
        (componentNode.metadata as Record<string, unknown>).storeToRefsUsage = scriptResult.metadata.storeToRefsUsage;
      }
    }

    // Analyze template
    if (descriptor.template?.content) {
      const templateResult = analyzeTemplate(descriptor.template.content, filePath, nodeId);
      edges.push(...templateResult.edges);
      errors.push(...templateResult.errors);
    }

    // Phase 10-2 — finalize packageCount from imports edges; stamp on all nodes.
    const importPaths: string[] = [];
    for (const e of edges) {
      if (e.kind === 'imports') {
        const ip = (e.metadata as Record<string, unknown> | undefined)?.importPath;
        if (typeof ip === 'string') importPaths.push(ip);
      }
    }
    const filePkg = distinctPackageCount(importPaths);
    (componentNode.metadata as Record<string, unknown>).packageCount = filePkg;
    for (const n of nodes) {
      if (n === componentNode) continue;
      const m = (n.metadata ??= {}) as Record<string, unknown>;
      if (m.lineCount === undefined) m.lineCount = fileLineCount;
      if (m.packageCount === undefined) m.packageCount = filePkg;
    }

    return { nodes, edges, errors };
  }
}

function getComponentName(filePath: string): string {
  const base = path.basename(filePath, '.vue');
  return base;
}
