import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import {
  analyzeChangeImpact,
  parseGitDiff,
  SignatureStore,
  detectBreakingChanges,
  loadWaivers,
  type BreakingChange,
} from '@vda/core';
import { formatPrReport, type ImpactSummary } from './prReport.js';

function renderBreakingMarkdown(changes: BreakingChange[]): string {
  if (changes.length === 0) return '_No breaking changes detected._';
  const lines: string[] = [];
  for (const c of changes) {
    const icon = c.severity === 'error' ? '🔴' : '🟠';
    lines.push(`- ${icon} **${c.code}** \`${c.signatureId}\` — ${c.message}`);
  }
  return lines.join('\n');
}

export async function impactCommand(
  dir: string,
  options: CliOptions & {
    diff?: string;
    files?: string;
    json?: boolean;
    format?: string;
    cache?: boolean;
    breaking?: boolean;
    baseline?: string;
  },
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

  // Phase 8-5 — when --breaking is set, snapshot the *current* analysis
  // and diff against the baseline label (`--baseline`, default 'main').
  // The PR Report then fills the marker slot with the rendered list.
  let breakingMarkdown: string | undefined;
  if (options.breaking) {
    const baseline = options.baseline ?? 'main';
    const store = new SignatureStore(config.projectRoot);
    if (store.count(baseline) === 0) {
      breakingMarkdown = `_(no baseline snapshot \`${baseline}\` — run \`vda analyze --signatures-only --label ${baseline}\` on the base ref first)_`;
    } else {
      store.snapshot('__pending__', graph);
      const diff = store.diff(baseline, '__pending__');
      let report = detectBreakingChanges(diff);
      // Apply waivers (Phase 7b-5 contract) — `breaking <code>` rule id.
      const waivers = loadWaivers(config.projectRoot, graph);
      const today = new Date().toISOString().slice(0, 10);
      const filtered = report.changes.filter(c => {
        const m = waivers.isWaived(
          { ruleId: 'breaking', target: c.code, file: c.before?.sourceFile ?? c.after?.sourceFile },
          today,
        );
        return !m.waived;
      });
      report = { changes: filtered, byCode: filtered.reduce((acc, c) => { acc[c.code] = (acc[c.code] ?? 0) + 1; return acc; }, { B1: 0, B2: 0, B3: 0, B4: 0 } as typeof report.byCode) };
      breakingMarkdown = renderBreakingMarkdown(report.changes);
    }
    store.close();
  }

  if (options.format === 'github-pr') {
    console.log(formatPrReport({
      changedFiles,
      impact: impact as unknown as ImpactSummary,
      ruleViolationDelta: 0,
      breakingRisksMarkdown: breakingMarkdown,
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
