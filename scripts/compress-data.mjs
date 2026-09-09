#!/usr/bin/env node
/**
 * scripts/compress-data.mjs — build sibling .json.gz files for every data
 * JSON (v5.3.0, compressed downloads). Release/packaging tool, never
 * shipped: the app fetches `url + '.gz'` when settings.compressedDownloads
 * is on and gunzips transparently (see app/net.js).
 *
 * Usage: npm run compress-data   (runs at packaging, after data/ is staged)
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

export function compressDir(rootDir) {
  let files = 0;
  let raw = 0;
  let gz = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.json')) {
        const bytes = readFileSync(p);
        const out = gzipSync(bytes, { level: 9 });
        writeFileSync(`${p}.gz`, out);
        files += 1;
        raw += bytes.length;
        gz += out.length;
      }
    }
  };
  walk(rootDir);
  return { files, raw, gz };
}

const isMain = process.argv[1]?.endsWith('compress-data.mjs');
if (isMain) {
  const root = process.argv[2] || new URL('../data/', import.meta.url).pathname;
  try {
    statSync(root);
  } catch {
    console.error(`data dir not found: ${root}`);
    process.exit(1);
  }
  const { files, raw, gz } = compressDir(root);
  const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
  console.log(`compressed ${files} files: ${mb(raw)} -> ${mb(gz)}`);
}
