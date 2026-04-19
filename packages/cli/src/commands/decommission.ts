import { resolve } from 'path';
import {
  collectEntrypoints,
  reachableFromEntrypoints,
} from '@vda/core';
import { runAnalysis, loadConfig, type CliOptions } from '../config.js';
import type { GraphNode } from '@vda/core';

// Phase 7b-2 — F2 decommission helper.
//
// Given a file path, run the analysis once, then ask: which other
// nodes become unreachable from the entrypoint set if this file is
// removed? Surfaces both:
//   * "must-keep" — files this one depends on that are *still* used
//     elsewhere (deleting them would break the rest of the codebase).
//   * "safe-to-delete" — files only kept alive by the target file.

export async function decommissionCommand(
  file: string,
  options: CliOptions & { cache?: boolean; dir?: string },
): Promise<void> {
  const dir = options.dir ?? '.';
  const config = await loadConfig(dir, options);
  const noCache = options.cache === false ? true : options.noCache;

  const targetPath = resolve(config.projectRoot, file);
  console.log(`\n🗑  Decommission impact for: ${targetPath}\n`);

  const { graph } = await runAnalysis(config, { noCache });

  // Map: filePath -> all nodes hosted in that file.
  const nodesByFile = new Map<string, GraphNode[]>();
  for (const n of graph.getAllNodes()) {
    if (!n.filePath) continue;
    if (!nodesByFile.has(n.filePath)) nodesByFile.set(n.filePath, []);
    nodesByFile.get(n.filePath)!.push(n);
  }

  const targetNodes = nodesByFile.get(targetPath) ?? [];
  if (targetNodes.length === 0) {
    console.log(`No graph nodes found for ${targetPath}.`);
    console.log('Was the path absolute? Try a path relative to the analysed project root.');
    return;
  }
  const targetIds = new Set(targetNodes.map(n => n.id));

  const entrypoints = collectEntrypoints(graph);
  // 1. Reachable WITH the target file present.
  const reachableNormal = reachableFromEntrypoints(graph, entrypoints);

  // 2. Reachable WITHOUT the target — pretend its nodes don't exist.
  // Cheapest correct approach: rerun forward DFS but treat targetIds
  // as already-visited so they don't get expanded, AND drop the
  // entrypoints that ARE the target.
  const visited = new Set<string>(targetIds);
  const stack: string[] = [];
  for (const ep of entrypoints) {
    if (targetIds.has(ep.node.id)) continue;
    if (!visited.has(ep.node.id)) {
      visited.add(ep.node.id);
      stack.push(ep.node.id);
    }
  }
  const SKIP_KINDS = new Set(['dto-flows', 'api-implements']);
  while (stack.length > 0) {
    const id = stack.pop()!;
    for (const e of graph.getOutEdges(id)) {
      if (SKIP_KINDS.has(e.kind)) continue;
      if (targetIds.has(e.target)) continue;
      if (visited.has(e.target)) continue;
      visited.add(e.target);
      stack.push(e.target);
    }
  }
  // Subtract the target itself from "reachable without" so it doesn't
  // appear as kept-alive.
  for (const id of targetIds) visited.delete(id);

  // Diff: nodes that were reachable normally but not without target.
  const wouldGoDead = new Set<string>();
  for (const id of reachableNormal) {
    if (!targetIds.has(id) && !visited.has(id)) wouldGoDead.add(id);
  }

  // Group by file — file is "safe to delete with the target" iff
  // EVERY node in it would go dead.
  const filesPossible = new Set<string>();
  for (const [fp, ns] of nodesByFile.entries()) {
    if (fp === targetPath) continue;
    if (ns.length === 0) continue;
    if (ns.every(n => wouldGoDead.has(n.id))) filesPossible.add(fp);
  }

  // Outgoing references the target keeps alive: nodes the target's
  // out-edges reach that survive *because of* it (= in wouldGoDead).
  const wouldStillSurvive: GraphNode[] = [];
  for (const t of targetNodes) {
    for (const e of graph.getOutEdges(t.id)) {
      if (e.kind === 'dto-flows' || e.kind === 'api-implements') continue;
      const targetNode = graph.getNode(e.target);
      if (!targetNode || targetIds.has(e.target)) continue;
      if (visited.has(e.target)) wouldStillSurvive.push(targetNode);
    }
  }

  console.log(`Target carries ${targetNodes.length} node(s).`);
  console.log('');
  console.log(`✅ Safe to delete with the target (${filesPossible.size} file(s)):`);
  if (filesPossible.size === 0) {
    console.log('   (none — every dependency is still used elsewhere)');
  } else {
    for (const f of [...filesPossible].sort()) {
      console.log(`   ${f}`);
    }
  }
  console.log('');
  console.log(`⚠️  Still in use after target is removed (${wouldStillSurvive.length} node(s) referenced):`);
  if (wouldStillSurvive.length === 0) {
    console.log('   (target referenced nothing else, or all references already shared)');
  } else {
    const seenLabels = new Set<string>();
    for (const n of wouldStillSurvive) {
      const key = `${n.kind}:${n.label}`;
      if (seenLabels.has(key)) continue;
      seenLabels.add(key);
      console.log(`   [${n.kind}] ${n.label}  (${n.filePath})`);
    }
  }
}
