import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { evaluateRules, classifyAntiPatterns } from '@vda/core';

export async function lintCommand(
  dir: string,
  options: CliOptions & { json?: boolean; patterns?: boolean; cache?: boolean },
): Promise<void> {
  const config = await loadConfig(dir, options);
  const noCache = options.cache === false ? true : options.noCache;

  // Phase 9-10 — `--patterns` mode runs only the AntiPatternClassifier.
  if (options.patterns) {
    console.log(`\n🔍 Anti-pattern lint: ${dir}\n`);
    const { graph } = await runAnalysis(config, { noCache });
    const thresholds = (config as { complexityThresholds?: import('@vda/core').ComplexityThresholds }).complexityThresholds;
    const result = classifyAntiPatterns(graph, thresholds ? { thresholds } : undefined);

    if (options.json) {
      const flat = [...result.byNodeId.entries()].map(([nodeId, tags]) => {
        const node = graph.getNode(nodeId);
        return { nodeId, label: node?.label, kind: node?.kind, filePath: node?.filePath, tags };
      });
      console.log(JSON.stringify({ totals: result.totals, suggestions: result.suggestions, hits: flat }, null, 2));
      return;
    }

    const totalHits = Object.values(result.totals.byTag).reduce((a, b) => a + b, 0);
    if (totalHits === 0) {
      console.log('✅ No anti-patterns detected.\n');
      return;
    }
    console.log(`Found ${totalHits} pattern hit(s):\n`);
    for (const tag of ['god-object', 'entry-hub', 'utility-sink', 'cyclic-cluster'] as const) {
      const count = result.totals.byTag[tag] ?? 0;
      if (count === 0) continue;
      console.log(`  ${tag} (${count}) — ${result.suggestions[tag]}`);
      const matches = [...result.byNodeId.entries()].filter(([, tags]) => tags.includes(tag));
      for (const [id] of matches.slice(0, 10)) {
        const node = graph.getNode(id);
        console.log(`     • [${node?.kind}] ${node?.label}  (${node?.filePath})`);
      }
      if (matches.length > 10) console.log(`     …and ${matches.length - 10} more`);
      console.log('');
    }
    return;
  }

  if (!config.rules || config.rules.length === 0) {
    console.log('No architecture rules defined in .vdarc.json');
    console.log('Add a "rules" array to your config. Example:');
    console.log(JSON.stringify({
      rules: [
        { type: 'deny-circular', edgeKinds: ['imports'], severity: 'error' },
        { type: 'max-dependents', value: 8, severity: 'warning' },
      ],
    }, null, 2));
    return;
  }

  console.log(`\n🔍 Linting project: ${dir}\n`);

  const { graph } = await runAnalysis(config, { noCache });
  const violations = evaluateRules(graph, config.rules);

  if (options.json) {
    console.log(JSON.stringify({ violations, count: violations.length }, null, 2));
  } else {
    if (violations.length === 0) {
      console.log('✅ No rule violations found.\n');
    } else {
      const errors = violations.filter(v => v.severity === 'error');
      const warnings = violations.filter(v => v.severity === 'warning');

      console.log(`Found ${violations.length} violation(s): ${errors.length} error(s), ${warnings.length} warning(s)\n`);

      for (const v of violations) {
        const icon = v.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} [${v.ruleId}] ${v.message}`);
      }
      console.log('');
    }
  }

  // Exit with error code if any error-severity violations
  const hasErrors = violations.some(v => v.severity === 'error');
  if (hasErrors) {
    process.exit(1);
  }
}
