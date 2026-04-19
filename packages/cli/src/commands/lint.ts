import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { evaluateRules, classifyAntiPatterns } from '@vda/core';

export async function lintCommand(
  dir: string,
  options: CliOptions & {
    json?: boolean;
    patterns?: boolean;
    cache?: boolean;
    /** Phase 11-5 — list stale (≥90d untouched) high-fan-in nodes. */
    hotSpots?: boolean;
    /** Override the staleness window in days (default 90). */
    staleDays?: number;
    /** Minimum fan-in to flag (default 5). */
    minFanIn?: number;
  },
): Promise<void> {
  const config = await loadConfig(dir, options);
  const noCache = options.cache === false ? true : options.noCache;

  // Phase 11-5 — `--hot-spots` lists nodes that haven't been touched in
  // a while AND have many dependents. The intuition: stale code that
  // many other parts of the codebase depend on is the riskiest to leave
  // alone — touching it ripples, but ignoring it accumulates debt.
  if (options.hotSpots) {
    if (!options.json) console.log(`\n🔥 Hot-spot lint: ${dir}\n`);
    const { graph } = await runAnalysis(config, { noCache, withGitBlame: true });
    const staleDays = options.staleDays ?? 90;
    const minFanIn = options.minFanIn ?? 5;
    const cutoffMs = Date.now() - staleDays * 86_400_000;

    type HotSpot = {
      id: string; label: string; kind: string; filePath: string;
      fanIn: number; lastTouchedAt: string; lastAuthor: string; ageDays: number;
    };
    const hits: HotSpot[] = [];
    for (const node of graph.getAllNodes()) {
      const md = node.metadata as Record<string, unknown>;
      const lastTouchedAt = md.lastTouchedAt as string | undefined;
      if (!lastTouchedAt) continue;
      const t = new Date(lastTouchedAt).getTime();
      if (!isFinite(t) || t > cutoffMs) continue;
      const fanIn = graph.getInEdges(node.id).length;
      if (fanIn < minFanIn) continue;
      hits.push({
        id: node.id, label: node.label, kind: node.kind, filePath: node.filePath,
        fanIn, lastTouchedAt,
        lastAuthor: (md.lastAuthor as string | undefined) ?? '',
        ageDays: Math.round((Date.now() - t) / 86_400_000),
      });
    }
    // Sort by (ageDays * fanIn) descending — the riskier-with-time bucket first.
    hits.sort((a, b) => b.ageDays * b.fanIn - a.ageDays * a.fanIn);

    if (options.json) {
      console.log(JSON.stringify({
        staleDays, minFanIn, count: hits.length, hotSpots: hits,
      }, null, 2));
      return;
    }
    if (hits.length === 0) {
      console.log(`✅ No stale (≥${staleDays}d) high-fan-in (≥${minFanIn}) hot-spots.\n`);
      return;
    }
    console.log(`Found ${hits.length} stale hot-spot(s) (≥${staleDays}d untouched, fan-in ≥ ${minFanIn}):\n`);
    for (const h of hits.slice(0, 25)) {
      console.log(`  • [${h.kind}] ${h.label}`);
      console.log(`      file: ${h.filePath}`);
      console.log(`      fan-in: ${h.fanIn}   age: ${h.ageDays}d   author: ${h.lastAuthor || '—'}`);
    }
    if (hits.length > 25) console.log(`  …and ${hits.length - 25} more`);
    console.log('');
    return;
  }

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
