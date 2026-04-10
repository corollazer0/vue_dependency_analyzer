#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { serveCommand } from './commands/serve.js';
import { exportCommand } from './commands/export.js';
import { initCommand } from './commands/init.js';
import { lintCommand } from './commands/lint.js';

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

program.parse();
