#!/usr/bin/env node
// Phase 5-4 — formats the harness JSON report as a PR comment body and
// emits GH Actions step outputs (`body`, `marker`). The marker is fixed so
// the workflow can find-and-replace the prior comment instead of stacking
// one per push.
import { readFileSync } from 'fs';

const MARKER = '<!-- vda-bench-report -->';

function emoji(verdict) {
  return verdict === 'MET' ? '✅' : '🚨';
}

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: format-bench-report.mjs <report.json>');
    process.exit(1);
  }
  const r = JSON.parse(readFileSync(path, 'utf-8'));
  const g = r.gate;
  const res = r.result;

  const lines = [
    MARKER,
    '### VDA render-time harness (Phase 5-2)',
    '',
    '| Gate | Budget | Measured | Verdict |',
    '|---|---:|---:|:---:|',
    `| G1 (5K first-paint) | ${g.G1_budget} ms | ${g.G1_firstPaintMs} ms | ${emoji(g.G1_verdict)} ${g.G1_verdict} |`,
    `| G2 (filter repaint) | ${g.G2_budget} ms | ${g.G2_filterMs} ms | ${emoji(g.G2_verdict)} ${g.G2_verdict} |`,
    '',
    '<details><summary>Harness details</summary>',
    '',
    `- Fixture: \`${res.nodeCount}\` nodes, \`${res.edgeCount}\` edges`,
    `- Chromium: ${res.chromiumVersion}`,
    `- User-Agent: \`${res.userAgent}\``,
    `- Page errors: ${res.pageErrors.length}`,
    '',
    '</details>',
    '',
    '_Warn-only gate — budget breach will not fail the job until the Phase 5 regression policy flips to blocking._',
  ];

  const body = lines.join('\n');

  // Multiline workflow output using the GH Actions heredoc format.
  process.stdout.write('marker=' + MARKER + '\n');
  process.stdout.write('body<<__BENCH_BODY__\n');
  process.stdout.write(body + '\n');
  process.stdout.write('__BENCH_BODY__\n');
}

main();
