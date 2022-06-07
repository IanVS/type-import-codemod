#!/usr/bin/env node --loader tsx --no-warnings

import { resolve } from 'path';
import chalk from 'chalk';
import { program, Option } from 'commander';
import transform from '../src/transform.js';
import packageConfig from '../package.json' assert { type: 'json' };

const sourceGlobs = [];
const version = packageConfig.version;

program
  .version(version)
  .arguments('<globs...>')
  .action((args) => {
    sourceGlobs.push(...args.filter((arg) => arg && typeof arg === 'string'));
  })
  .option('-d, --dry-run', 'write output to stdout instead of overwriting files')
  .addOption(new Option('-p, --project <path>', 'path to tsconfig.json').default('./tsconfig.json'))
  .parse(process.argv);

const options = program.opts();
const dryRun = options.dryRun === true;
const project = options.project;
const globs = program.args;
const tsconfigPath = resolve(process.cwd(), project);

try {
  await import(tsconfigPath);
} catch (err) {
  const message = `type-import-codemod --project ${tsconfigPath} is not a valid tsconfig.json file`;
  console.error(chalk.red(message));
  process.exit(1);
}

try {
  transform({
    dryRun,
    globs,
    tsconfigPath,
  });
} catch (err) {
  console.error(chalk.red('type-import-codemod: '), err.message);
  console.error(err);
  process.exit(1);
}
