import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { analyzeChangeImpact, parseGitDiff } from '@vda/core';
import { formatPrReport, type ImpactSummary } from './prReport.js';

export async function impactCommand(
  dir: string,
  options: CliOptions & { diff?: string; files?: string; json?: boolean; format?: string; cache?: boolean },
): Promise<void> {
  const config = await loadConfig(dir, options);
  const noCache = options.cache === false ? true : options.noCache;

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
    if (options.format === 'github-pr') {
      // Always print *something* for the PR-comment workflow.
      console.log(formatPrReport({
        changedFiles: [],
        impact: { summary: { changed: 0, direct: 0, transitive: 0, endpoints: 0, tables: 0 }, changedNodes: [], directImpact: [], transitiveImpact: [], affectedEndpoints: [], affectedTables: [] } as unknown as ImpactSummary,
        ruleViolationDelta: 0,
      }));
      return;
    }
    console.log('No changed files found.');
    return;
  }

  if (options.format !== 'github-pr') {
    console.log(`\n🔍 Analyzing impact of ${changedFiles.length} changed file(s)...\n`);
  }

  const { graph } = await runAnalysis(config, { noCache });
  const impact = analyzeChangeImpact(graph, changedFiles, config.projectRoot);

  if (options.format === 'github-pr') {
    console.log(formatPrReport({
      changedFiles,
      impact: impact as unknown as ImpactSummary,
      ruleViolationDelta: 0, // wired up properly when 7b-3 LayerDsl lands
    }));
    return;
  }

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
