import { writeFileSync } from 'fs';
import { runAnalysis, loadConfig, type CliOptions } from '../config.js';

export async function exportCommand(
  dir: string,
  options: CliOptions & { format?: string; output?: string },
): Promise<void> {
  const config = await loadConfig(dir, options);
  console.log(`\n📦 Exporting dependency graph...\n`);

  const { graph } = await runAnalysis(config);

  let output: string;
  const format = options.format || 'json';

  if (format === 'dot') {
    const { toDot } = await import('@vda/core');
    output = toDot(graph);
  } else {
    const { toJSON } = await import('@vda/core');
    output = JSON.stringify(toJSON(graph), null, 2);
  }

  if (options.output) {
    writeFileSync(options.output, output, 'utf-8');
    console.log(`✅ Exported to ${options.output} (${format} format)\n`);
  } else {
    console.log(output);
  }
}
