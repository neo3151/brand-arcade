#!/usr/bin/env node
/**
 * Fail when the developer unlock is still on.
 * Run before a release build: node scripts/check-dev-unlock.js
 *
 * ARCADE_DEV_UNLOCK_ALL must be false in both store config copies.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FILES = [
  'assets/arcade-store-config.js',
  'www/assets/arcade-store-config.js'
];

function flagFrom(source) {
  const match = String(source || '').match(/ARCADE_DEV_UNLOCK_ALL\s*=\s*(true|false)\b/);
  if (!match) return null;
  return match[1] === 'true';
}

function checkSource(source, label) {
  const flag = flagFrom(source);
  if (flag === false) return { ok: true, flag: flag, label: label };
  const found = flag === null ? 'missing' : 'true';
  return {
    ok: false,
    flag: flag,
    label: label,
    message: (label || 'config') + ': ARCADE_DEV_UNLOCK_ALL must be false before release (found ' + found + ')'
  };
}

function checkFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  return checkSource(source, file);
}

function main() {
  const root = path.join(__dirname, '..');
  let failed = false;
  FILES.forEach(rel => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {
      console.error(rel + ': missing store config');
      failed = true;
      return;
    }
    const result = checkFile(file);
    if (!result.ok) {
      console.error(result.message);
      failed = true;
    }
  });
  if (failed) {
    console.error('Set ARCADE_DEV_UNLOCK_ALL = false in assets/arcade-store-config.js, then run node sync-hub.js.');
    process.exit(1);
  }
  console.log('ARCADE_DEV_UNLOCK_ALL is false');
}

if (require.main === module) main();

module.exports = { flagFrom, checkSource, checkFile, FILES };
