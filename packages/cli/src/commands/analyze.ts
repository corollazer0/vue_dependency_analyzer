import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { SignatureStore, type ProgressInfo } from '@vda/core';

export async function analyzeCommand(
  dir: string,
  options: CliOptions & { cache?: boolean; signaturesOnly?: boolean; label?: string },
): Promise<void> {
  const config = await loadConfig(dir, options);
  console.log(`\n🔍 Analyzing project: ${dir}\n`);

  let lastLine = '';
  function showProgress(info: ProgressInfo): void {
    const pct = Math.round((info.processed / info.total) * 100);
    const elapsed = (info.elapsedMs / 1000).toFixed(1);
    const avgMs = info.processed > 0 ? info.elapsedMs / info.processed : 0;
    const remaining = ((info.total - info.processed) * avgMs / 1000).toFixed(0);
    const cached = info.cachedCount > 0 ? ` (${info.cachedCount} cached)` : '';
    const line = `   [${pct}%] ${info.processed}/${info.total} files${cached} | ${elapsed}s elapsed | ~${remaining}s remaining`;
    process.stdout.write(`\r${line.padEnd(lastLine.length)}`);
    lastLine = line;
  }

  // Phase 7a-10 — `.option('--no-cache')` in commander binds to
  // `options.cache === false` (via the auto-generated negation flag),
  // not `options.noCache`. The previous read silently ignored the flag
  // and the SQLite parse cache served stale results across runs.
  const noCache = options.cache === false ? true : options.noCache;

  const { graph, stats } = await runAnalysis(config, {
    noCache,
    onProgress: showProgress,
  });

  // Clear progress line
  if (lastLine) process.stdout.write('\r' + ' '.repeat(lastLine.length) + '\r');

  // Phase 8-11 — `--signatures-only` skips reporting + JSON dump and
  // just persists the snapshot under `--label <name>`. The full
  // parse cost is unchanged (we still need the graph to extract
  // signatures), but downstream steps (Cytoscape render, JSON
  // serialization, dto-consistency, etc.) are skipped.
  if (options.signaturesOnly) {
    const label = options.label ?? 'main';
    const store = new SignatureStore(config.projectRoot);
    const records = store.snapshot(label, graph);
    store.close();
    console.log(`💾 Snapshot \`${label}\` written: ${records.length} signature(s) (${stats.totalFiles} files parsed in ${(stats.durationMs / 1000).toFixed(1)}s).`);
    return;
  }

  if (options.json) {
    const { toJSON } = await import('@vda/core');
    console.log(JSON.stringify(toJSON(graph), null, 2));
  } else {
    const duration = (stats.durationMs / 1000).toFixed(1);
    console.log(`📊 Analysis Results (${duration}s, ${stats.cachedCount} cached/${stats.totalFiles} total):`);
    console.log(`   Nodes: ${graph.getNodeCount()}`);
    console.log(`   Edges: ${graph.getEdgeCount()}`);
    console.log('');

    const allStats = graph.getStats();
    console.log('   Node Types:');
    for (const [key, count] of Object.entries(allStats.nodesByKind)) {
      console.log(`     ${key}: ${count}`);
    }
    console.log('');
    console.log('   Edge Types:');
    for (const [key, count] of Object.entries(allStats.edgesByKind)) {
      console.log(`     ${key}: ${count}`);
    }

    if (stats.circularDeps.length > 0) {
      console.log(`\n   ⚠️  Circular Dependencies: ${stats.circularDeps.length}`);
      for (const cycle of stats.circularDeps.slice(0, 5)) {
        console.log(`     ${cycle.join(' → ')} → ${cycle[0]}`);
      }
      if (stats.circularDeps.length > 5) {
        console.log(`     ... and ${stats.circularDeps.length - 5} more`);
      }
    }

    if (stats.orphans.length > 0) {
      console.log(`\n   🔍 Orphan Nodes: ${stats.orphans.length}`);
      for (const orphan of stats.orphans.slice(0, 10)) {
        console.log(`     ${orphan}`);
      }
      if (stats.orphans.length > 10) {
        console.log(`     ... and ${stats.orphans.length - 10} more`);
      }
    }

    console.log('\n✅ Analysis complete.\n');
  }
}
