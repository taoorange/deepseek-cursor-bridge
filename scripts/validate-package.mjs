#!/usr/bin/env node
/**
 * Pre-publish package checks.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

if (pkg.publisher !== 'taotao') {
  fail(`package.json publisher should be "taotao" (got "${pkg.publisher}")`);
}

if (!pkg.icon) {
  fail('package.json missing root "icon" field');
} else if (!existsSync(join(ROOT, pkg.icon))) {
  fail(`icon file missing: ${pkg.icon}`);
}

if (!existsSync(join(ROOT, 'dist/extension.js'))) {
  fail('dist/extension.js missing — run npm run compile');
}

if (existsSync(join(ROOT, 'package.json.bak'))) {
  fail('package.json.bak exists — remove before commit/publish');
}

if (!pkg.license) {
  fail('package.json missing "license" field');
}

if (!existsSync(join(ROOT, 'LICENSE'))) {
  fail('LICENSE file missing');
}

if (failed) {
  process.exit(1);
}

console.log(`validate:package OK (v${pkg.version}, publisher=${pkg.publisher})`);
