#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { serveCommand } from './commands/serve.js';
import { exportCommand } from './commands/export.js';
import { initCommand } from './commands/init.js';
import { lintCommand } from './commands/lint.js';
import { impactCommand } from './commands/impact.js';
import { decommissionCommand } from './commands/decommission.js';

const program = new Command();

program
  .name('vda')
  .description('Vue Dependency Analyzer - Analyze dependencies in Vue.js + Spring Boot projects')
  .version('0.1.0');

program
  .command('analyze')
  .description('Analyze project dependencies')
  .argument('[dir]', 'Project directory', '.')
  .option('--vue-root <path>', 'Vue project root (relative to dir)')
  .option('--spring-root <path>', 'Spring Boot project root (relative to dir)')
  .option('--config <path>', 'Config file path', '.vdarc.json')
  .option('--json', 'Output as JSON')
  .option('--signatures-only', 'Skip reporting and persist a SignatureStore snapshot only')
  .option('--label <name>', 'Snapshot label for --signatures-only (default: main)')
  .option('--no-cache', 'Disable parse cache')
  .action(analyzeCommand);

program
  .command('serve')
  .description('Start the visualization server')
  .argument('[dir]', 'Project directory', '.')
  .option('--vue-root <path>', 'Vue project root')
  .option('--spring-root <path>', 'Spring Boot project root')
  .option('--config <path>', 'Config file path', '.vdarc.json')
  .option('-p, --port <number>', 'Server port', '3333')
  .option('--watch', 'Watch for file changes')
  .action(serveCommand);

program
  .command('export')
  .description('Export dependency graph')
  .argument('[dir]', 'Project directory', '.')
  .option('--vue-root <path>', 'Vue project root')
  .option('--spring-root <path>', 'Spring Boot project root')
  .option('--config <path>', 'Config file path', '.vdarc.json')
  .option('-f, --format <format>', 'Output format (json|dot|mermaid|plantuml)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .action(exportCommand);

program
  .command('impact')
  .description('Analyze change impact from git diff or file list')
  .argument('[dir]', 'Project directory', '.')
  .option('--config <path>', 'Config file path', '.vdarc.json')
  .option('--diff <spec>', 'Git diff spec (e.g., HEAD~1..HEAD)')
  .option('--files <list>', 'Comma-separated file paths')
  .option('--json', 'Output as JSON')
  .option('--format <fmt>', 'Output format: text | github-pr', 'text')
  .option('--breaking', 'Detect B1-B4 breaking changes against the baseline snapshot')
  .option('--baseline <label>', 'Baseline snapshot label (default: main)', 'main')
  .option('--no-cache', 'Disable parse cache')
  .action(impactCommand);

program
  .command('lint')
  .description('Check architecture rule violations')
  .argument('[dir]', 'Project directory', '.')
  .option('--config <path>', 'Config file path', '.vdarc.json')
  .option('--json', 'Output as JSON')
  .option('--no-cache', 'Disable parse cache')
  .action(lintCommand);

program
  .command('init')
  .description('Auto-detect project structure and generate .vdarc.json')
  .argument('[dir]', 'Project directory', '.')
  .action(initCommand);

// Phase 7b-2 — F2 decommission helper.
program
  .command('decommission')
  .description('List files that become safe to delete alongside the target')
  .argument('<file>', 'Target file (relative to project root or absolute)')
  .option('--dir <path>', 'Project directory', '.')
  .option('--config <path>', 'Config file path', '.vdarc.json')
  .option('--no-cache', 'Disable parse cache')
  .action(decommissionCommand);

program.parse();
