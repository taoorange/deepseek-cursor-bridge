#!/usr/bin/env node
/**
 * Validate user-facing docs: no local paths, no leaked tokens.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const FILES = ['README.md', 'PUBLISH.md', 'CHANGELOG.md', 'AGENTS.md'];

const FORBIDDEN_PATTERNS = [
  { name: 'KXWELL path', regex: /KXWELL/i },
  { name: 'macOS user home path', regex: /\/Users\/[A-Za-z0-9_-]+\// },
  { name: 'Open VSX token literal', regex: /ovsxat_[0-9a-f]{8}-[0-9a-f]{4}-/i },
];

let failed = false;

for (const file of FILES) {
  const path = join(ROOT, file);
  if (!existsSync(path)) {
    continue;
  }
  const content = readFileSync(path, 'utf8');
  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    if (regex.test(content)) {
      console.error(`FAIL ${file}: contains ${name}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('validate:docs OK');
