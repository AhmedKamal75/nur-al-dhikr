#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  buildDataManifest,
  checkDataManifest,
  projectVersion,
  resolveDataRoot,
  writeDataManifest,
} from '../tests/helpers/data-manifest.mjs';

const args = process.argv.slice(2);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (name) => args.includes(name);

if (has('--help') || has('-h')) {
  console.log(
    'Usage: node scripts/data-manifest.mjs [--write|--check] [--root PATH] [--mode full|seed] [--version VERSION]'
  );
  process.exit(0);
}

if (has('--write') === has('--check')) {
  console.error('data-manifest: choose exactly one of --write or --check');
  process.exit(2);
}

const root = resolve(valueOf('--root') || process.cwd());
const dataRoot = resolveDataRoot(root);
const requestedMode = valueOf('--mode') || 'full';
const mode =
  requestedMode === 'auto'
    ? existsSync(join(dataRoot, 'seed.json'))
      ? 'seed'
      : 'full'
    : requestedMode;
if (mode !== 'full' && mode !== 'seed') {
  console.error('data-manifest: --mode must be full, seed, or auto');
  process.exit(2);
}

let version = valueOf('--version');
if (!version) {
  try {
    version = projectVersion(root);
  } catch (error) {
    console.error(`data-manifest: cannot determine version (${error.message})`);
    process.exit(2);
  }
}

if (has('--write')) {
  try {
    const manifest = buildDataManifest(dataRoot, { mode, version });
    writeDataManifest(dataRoot, manifest);
    console.log(`data manifest: wrote ${manifest.files.length} files (${mode}, v${version})`);
  } catch (error) {
    console.error(`data-manifest: ${error.message}`);
    process.exit(1);
  }
}

const result = checkDataManifest(dataRoot, { mode, version });
if (!result.valid) {
  for (const error of result.errors) console.error(`data-manifest: ${error}`);
  process.exit(1);
}
console.log(`data manifest: valid (${result.current.files.length} files, ${mode}, v${version})`);
