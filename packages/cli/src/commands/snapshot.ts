import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import { ArchSnapshotStore } from '@vda/core';

// Phase 11-7 — `vda snapshot --label <name>`
//
// Runs the full analysis pipeline (cross-boundary linker included so
// edge counts reflect the resolved graph) and writes a snapshot row to
// `.vda-cache/snapshots.sqlite`. The intent is short, recurring runs
// from CI (Phase 11-11 nightly workflow) so we keep output minimal —
// one summary line on success, JSON when --json is set.

export async function snapshotCommand(
  dir: string,
  options: CliOptions & { label?: string; cache?: boolean; json?: boolean },
): Promise<void> {
  const config = await loadConfig(dir, options);
  const noCache = options.cache === false ? true : options.noCache;
  const label = options.label ?? new Date().toISOString().slice(0, 10);

  const { graph } = await runAnalysis(config, { noCache });
  const store = new ArchSnapshotStore(config.projectRoot);
  const snap = store.snapshot(label, graph);
  store.close();

  if (options.json) {
    console.log(JSON.stringify(snap, null, 2));
    return;
  }
  console.log(
    `📸 Snapshot \`${label}\` written: ${snap.summary.nodeCount} nodes, ` +
    `${snap.summary.edgeCount} edges, ${snap.summary.hubSampleIds.length} hub samples ` +
    `(taken ${snap.takenAt}).`,
  );
}
