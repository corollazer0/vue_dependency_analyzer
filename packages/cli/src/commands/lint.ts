import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { evaluateRules } from '@vda/core';

export async function lintCommand(dir: string, options: CliOptions & { json?: boolean }): Promise<void> {
  const config = await loadConfig(dir, options);

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

  const { graph } = await runAnalysis(config, { noCache: options.noCache });
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
