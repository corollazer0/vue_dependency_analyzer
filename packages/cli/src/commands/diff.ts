import { loadConfig, type CliOptions } from '../config.js';
import { ArchSnapshotStore } from '@vda/core';

// Phase 11-8 — `vda diff <fromLabel>..<toLabel>`
//
// Pure DB-backed comparison; never re-parses. The snapshot must have
// been written by `vda snapshot` (or the nightly workflow) first.
// Renders added / removed / changed kind buckets + hub deltas.

function parseRange(spec: string): [string, string] | null {
  const m = spec.match(/^([^.]+)\.\.([^.]+)$/);
  if (!m) return null;
  return [m[1], m[2]];
}

export async function diffCommand(
  dir: string,
  range: string | undefined,
  options: CliOptions & { json?: boolean },
): Promise<void> {
  const config = await loadConfig(dir, options);
  if (!range) {
    console.error('Usage: vda diff <fromLabel>..<toLabel>');
    process.exit(2);
  }
  const parsed = parseRange(range);
  if (!parsed) {
    console.error(`Invalid range \`${range}\` — expected \`from..to\` (e.g. \`2026-04-01..2026-04-19\`).`);
    process.exit(2);
  }
  const [fromLabel, toLabel] = parsed;

  const store = new ArchSnapshotStore(config.projectRoot);
  const diff = store.diff(fromLabel, toLabel);
  store.close();
  if (!diff) {
    const present = new ArchSnapshotStore(config.projectRoot);
    const labels = present.list().map(s => s.label);
    present.close();
    console.error(`Snapshot label not found. Available: ${labels.length > 0 ? labels.join(', ') : '(none)'}`);
    console.error('Run \`vda snapshot --label <name>\` first.');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(diff, null, 2));
    return;
  }

  console.log(`\n📊 Architecture diff ${diff.fromLabel} → ${diff.toLabel}\n`);
  console.log(`  totals: ${diff.totalsDelta.nodes >= 0 ? '+' : ''}${diff.totalsDelta.nodes} nodes, ` +
    `${diff.totalsDelta.edges >= 0 ? '+' : ''}${diff.totalsDelta.edges} edges`);

  function section(title: string, rows: Array<{ kind: string } & Record<string, unknown>>, fmt: (r: any) => string) {
    if (rows.length === 0) return;
    console.log(`\n  ${title}:`);
    for (const r of rows) console.log(`    ${fmt(r)}`);
  }

  section('Added node kinds', diff.addedKinds, r => `+ ${r.kind} (${r.count})`);
  section('Removed node kinds', diff.removedKinds, r => `- ${r.kind} (was ${r.was})`);
  section('Changed node kinds', diff.changedKinds.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    r => `~ ${r.kind} ${r.from} → ${r.to} (${r.delta >= 0 ? '+' : ''}${r.delta})`);

  section('Added edge kinds', diff.addedEdgeKinds, r => `+ ${r.kind} (${r.count})`);
  section('Removed edge kinds', diff.removedEdgeKinds, r => `- ${r.kind} (was ${r.was})`);
  section('Changed edge kinds', diff.changedEdgeKinds.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    r => `~ ${r.kind} ${r.from} → ${r.to} (${r.delta >= 0 ? '+' : ''}${r.delta})`);

  if (diff.newHubs.length > 0) {
    console.log(`\n  New hubs (top fan-in entered the sample):`);
    for (const id of diff.newHubs.slice(0, 10)) console.log(`    + ${id}`);
    if (diff.newHubs.length > 10) console.log(`    …and ${diff.newHubs.length - 10} more`);
  }
  if (diff.goneHubs.length > 0) {
    console.log(`\n  Gone hubs (dropped from the sample):`);
    for (const id of diff.goneHubs.slice(0, 10)) console.log(`    - ${id}`);
    if (diff.goneHubs.length > 10) console.log(`    …and ${diff.goneHubs.length - 10} more`);
  }
  console.log('');
}
