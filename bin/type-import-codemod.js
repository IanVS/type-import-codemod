#!/usr/bin/env node

const path = require('path');
const jscodeshift = require.resolve('.bin/jscodeshift');
const execa = require('execa');
const { exit } = require('process');

const transformerPath = path.join(__dirname, '..', 'src', 'transform.ts');

const inputArgs = process.argv.slice(2);

if (!inputArgs.length) {
  console.error('Must specify files/directories to run against. See https://github.com/facebook/jscodeshift#usage-cli');
  exit(1);
}

const args = ['--transform', transformerPath, ...inputArgs];

console.log(`Executing command: jscodeshift ${args.join(' ')}`);

execa.sync(jscodeshift, args, {
  stdio: 'inherit',
  stripEof: false,
});
