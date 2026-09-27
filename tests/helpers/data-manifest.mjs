import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const MANIFEST_NAME = 'manifest.json';
const SEED_NAME = 'seed.json';
const ALGORITHM = 'sha256';
const SCHEMA_VERSION = 1;

export function resolveDataRoot(root = process.cwd()) {
  const candidate = resolve(root);
  if (basename(candidate) === 'data') return candidate;
  const nested = join(candidate, 'data');
  if (existsSync(nested) && statSync(nested).isDirectory()) return nested;
  return candidate;
}

function validMode(mode) {
  return mode === 'full' || mode === 'seed';
}

function validPath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || isAbsolute(path)) return false;
  const parts = path.split('/');
  return parts.every((part) => part && part !== '.' && part !== '..');
}

function eligible(relativePath) {
  return (
    relativePath.endsWith('.json') &&
    !relativePath.endsWith('.json.gz') &&
    relativePath !== MANIFEST_NAME &&
    relativePath !== SEED_NAME
  );
}

function collectJsonPaths(dataRoot, relativeDirectory = '') {
  const directory = relativeDirectory ? join(dataRoot, relativeDirectory) : dataRoot;
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error(
        `data manifest rejects symlink: ${relativeDirectory ? `${relativeDirectory}/` : ''}${entry.name}`
      );
    }
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      paths.push(...collectJsonPaths(dataRoot, relativePath));
    } else if (entry.isFile() && eligible(relativePath)) {
      paths.push(relativePath);
    }
  }
  return paths;
}

function validateRecord(record, index, errors) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    errors.push(`files[${index}] is not an object`);
    return false;
  }
  if (!validPath(record.path)) {
    errors.push(`files[${index}] has an unsafe path`);
    return false;
  }
  if (!Number.isSafeInteger(record.bytes) || record.bytes < 0) {
    errors.push(`files[${index}] has invalid bytes`);
  }
  if (typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) {
    errors.push(`files[${index}] has invalid sha256`);
  }
  return true;
}

export function validateDataManifest(manifest, { mode, version } = {}) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest is not an object'];
  }
  if (manifest.schemaVersion !== SCHEMA_VERSION) errors.push('schemaVersion is invalid');
  if (manifest.algorithm !== ALGORITHM) errors.push('algorithm is invalid');
  if (!validMode(manifest.mode)) errors.push('mode is invalid');
  if (mode !== undefined && manifest.mode !== mode)
    errors.push('mode does not match expected mode');
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
    errors.push('version is invalid');
  }
  if (version !== undefined && manifest.version !== version) {
    errors.push('version does not match expected version');
  }
  if (!Array.isArray(manifest.files)) {
    errors.push('files is not an array');
    return errors;
  }
  const seen = new Set();
  let previous = '';
  manifest.files.forEach((record, index) => {
    if (!validateRecord(record, index, errors)) return;
    if (seen.has(record.path)) errors.push(`duplicate path: ${record.path}`);
    seen.add(record.path);
    if (record.path < previous) errors.push(`files are not sorted: ${record.path}`);
    previous = record.path;
  });
  return errors;
}

export function buildDataManifest(root, { mode, version } = {}) {
  if (!validMode(mode)) throw new Error('data manifest mode must be full or seed');
  if (typeof version !== 'string' || !version.trim())
    throw new Error('data manifest version is required');
  const dataRoot = resolveDataRoot(root);
  if (!existsSync(dataRoot) || !statSync(dataRoot).isDirectory()) {
    throw new Error(`data directory does not exist: ${dataRoot}`);
  }
  const paths = collectJsonPaths(dataRoot).sort();
  const files = paths.map((path) => {
    const absolutePath = join(dataRoot, path);
    const stat = statSync(absolutePath);
    if (!stat.isFile()) throw new Error(`data manifest path is not a regular file: ${path}`);
    const bytes = readFileSync(absolutePath);
    if (bytes.length !== stat.size)
      throw new Error(`data manifest size changed while reading: ${path}`);
    return {
      path,
      bytes: bytes.length,
      sha256: createHash(ALGORITHM).update(bytes).digest('hex'),
    };
  });
  return { schemaVersion: SCHEMA_VERSION, version, mode, algorithm: ALGORITHM, files };
}

export function canonicalDataManifestJSON(manifest) {
  const errors = validateDataManifest(manifest, {
    mode: manifest?.mode,
    version: manifest?.version,
  });
  if (errors.length) throw new Error(`invalid data manifest: ${errors.join('; ')}`);
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function writeDataManifest(root, manifest) {
  const dataRoot = resolveDataRoot(root);
  const target = join(dataRoot, MANIFEST_NAME);
  const temporary = join(dataRoot, `.${MANIFEST_NAME}.${process.pid}.tmp`);
  try {
    writeFileSync(temporary, canonicalDataManifestJSON(manifest), { flag: 'wx' });
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function readManifest(dataRoot) {
  const path = join(dataRoot, MANIFEST_NAME);
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function checkDataManifest(root, { mode, version } = {}) {
  const dataRoot = resolveDataRoot(root);
  const errors = [];
  let stored;
  let current;
  try {
    stored = readManifest(dataRoot);
  } catch (error) {
    return { valid: false, errors: [`cannot read manifest: ${error.message}`], dataRoot };
  }
  errors.push(...validateDataManifest(stored, { mode, version }));
  try {
    current = buildDataManifest(dataRoot, { mode, version });
  } catch (error) {
    errors.push(`cannot scan data: ${error.message}`);
    return { valid: false, errors, stored, dataRoot };
  }
  const storedFiles = new Map(
    Array.isArray(stored.files)
      ? stored.files.filter((file) => file && validPath(file.path)).map((file) => [file.path, file])
      : []
  );
  const currentFiles = new Map(current.files.map((file) => [file.path, file]));
  for (const path of currentFiles.keys()) {
    if (!storedFiles.has(path)) errors.push(`extra file not listed: ${path}`);
  }
  for (const path of storedFiles.keys()) {
    if (!currentFiles.has(path)) errors.push(`missing file: ${path}`);
  }
  for (const [path, file] of currentFiles) {
    const listed = storedFiles.get(path);
    if (!listed) continue;
    if (listed.bytes !== file.bytes) errors.push(`byte size mismatch: ${path}`);
    if (listed.sha256 !== file.sha256) errors.push(`sha256 mismatch: ${path}`);
  }
  return { valid: errors.length === 0, errors, stored, current, dataRoot };
}

export function projectVersion(root = process.cwd()) {
  const projectRoot = basename(resolve(root)) === 'data' ? dirname(resolve(root)) : resolve(root);
  const packagePath = join(projectRoot, 'package.json');
  return JSON.parse(readFileSync(packagePath, 'utf8')).version;
}

export function relativeManifestPath(root, path) {
  return relative(resolveDataRoot(root), resolve(path)).split(sep).join('/');
}
