import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { analyzeChangeImpact, parseGitDiff } from '@vda/core';

export async function impactCommand(
  dir: string,
  options: CliOptions & { diff?: string; files?: string; json?: boolean },
): Promise<void> {
  const config = await loadConfig(dir, options);

  // Get changed files
  let changedFiles: string[];
  if (options.files) {
    changedFiles = options.files.split(',').map(f => f.trim()).filter(Boolean);
  } else if (options.diff) {
    changedFiles = parseGitDiff(config.projectRoot, options.diff);
  } else {
    // Default: uncommitted changes
    changedFiles = parseGitDiff(config.projectRoot, 'HEAD');
  }

  if (changedFiles.length === 0) {
    console.log('No changed files found.');
    return;
  }

  console.log(`\n🔍 Analyzing impact of ${changedFiles.length} changed file(s)...\n`);

  const { graph } = await runAnalysis(config, { noCache: options.noCache });
  const impact = analyzeChangeImpact(graph, changedFiles, config.projectRoot);

  if (options.json) {
    console.log(JSON.stringify({
      ...impact,
      changedNodes: impact.changedNodes.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
      directImpact: impact.directImpact.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
      transitiveImpact: impact.transitiveImpact.map(n => ({ id: n.id, label: n.label, kind: n.kind })),
      affectedEndpoints: impact.affectedEndpoints.map(n => ({ id: n.id, label: n.label })),
      affectedTables: impact.affectedTables.map(n => ({ id: n.id, label: n.label })),
    }, null, 2));
    return;
  }

  console.log(`📊 Change Impact Report:`);
  console.log(`   Changed files: ${changedFiles.length}`);
  console.log(`   Changed nodes: ${impact.summary.changed}`);
  console.log(`   Direct dependents: ${impact.summary.direct}`);
  console.log(`   Transitive dependents: ${impact.summary.transitive}`);
  console.log(`   Affected API endpoints: ${impact.summary.endpoints}`);
  console.log(`   Affected DB tables: ${impact.summary.tables}`);

  if (impact.changedNodes.length > 0) {
    console.log('\n   Changed:');
    for (const n of impact.changedNodes.slice(0, 10)) {
      console.log(`     ${n.label} (${n.kind})`);
    }
  }

  if (impact.directImpact.length > 0) {
    console.log('\n   Direct impact:');
    for (const n of impact.directImpact.slice(0, 10)) {
      console.log(`     ${n.label} (${n.kind})`);
    }
    if (impact.directImpact.length > 10) {
      console.log(`     ... and ${impact.directImpact.length - 10} more`);
    }
  }

  if (impact.affectedEndpoints.length > 0) {
    console.log('\n   Affected endpoints:');
    for (const n of impact.affectedEndpoints) {
      console.log(`     ${n.label}`);
    }
  }

  console.log('');
}
