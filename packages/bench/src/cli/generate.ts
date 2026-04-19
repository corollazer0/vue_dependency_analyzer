#!/usr/bin/env node
// Generates a synthetic Phase 5 fixture and writes it to disk as
// SerializedGraph JSON. Used by the headless browser harness to drive
// G1/G2 render-time gates.
//
//   tsx src/cli/generate.ts [--nodes 5000] [--seed 0x5EED] [--out fixture.json]
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { generateSyntheticGraph } from '../syntheticFixture.js';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[key] = next; i++; }
      else out[key] = 'true';
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const nodeCount = args.nodes ? parseInt(args.nodes, 10) : 5000;
  const seed = args.seed ? parseInt(args.seed, 16) : 0x5EED;
  const avgOutDegree = args.avgOutDegree ? parseFloat(args.avgOutDegree) : 3;
  const out = resolve(args.out ?? `synthetic-${nodeCount}.json`);

  const graph = generateSyntheticGraph({ nodeCount, seed, avgOutDegree });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(graph));
  const bytes = Buffer.byteLength(JSON.stringify(graph), 'utf8');
  process.stderr.write(
    `[fixture] wrote ${out}\n` +
    `          ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${(bytes / 1024).toFixed(1)} kB\n`,
  );
}

main();
