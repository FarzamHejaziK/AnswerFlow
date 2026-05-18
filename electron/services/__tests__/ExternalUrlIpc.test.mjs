import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('open-external IPC only allows known external destinations', () => {
  const source = read('electron/ipcHandlers.ts');
  const start = source.indexOf('safeHandle("open-external"');
  const end = source.indexOf('// ==========================================', start);
  const handler = source.slice(start, end);

  assert.ok(start >= 0, 'open-external handler should exist');
  assert.match(handler, /parsed\.protocol === 'https:' && parsed\.hostname === 'mail\.google\.com' && parsed\.pathname === '\/mail\/'/);
  assert.match(handler, /parsed\.protocol === 'x-apple\.systempreferences:'/);
  assert.doesNotMatch(handler, /\['http:', 'https:', 'mailto:'\]\.includes\(parsed\.protocol\)/);
  assert.doesNotMatch(handler, /url\.startsWith\('x-apple\.systempreferences:'\)/);
});

test('open-external IPC does not log attacker-controlled URLs', () => {
  const source = read('electron/ipcHandlers.ts');
  const start = source.indexOf('safeHandle("open-external"');
  const end = source.indexOf('// ==========================================', start);
  const handler = source.slice(start, end);

  assert.doesNotMatch(handler, /console\.warn\(`[^`]*\$\{url\}/);
  assert.doesNotMatch(handler, /console\.warn\([^\n]*,\s*url\s*[),]/);
  assert.match(handler, /Blocked open-external request', \{ protocol: parsed\.protocol, hostname: parsed\.hostname \}/);
  assert.match(handler, /Invalid URL in open-external'/);
});
