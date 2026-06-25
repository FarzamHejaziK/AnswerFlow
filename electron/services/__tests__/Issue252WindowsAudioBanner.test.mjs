// Regression test for issue #252 after the live-shell simplification:
// audio-capture-failed should no longer render a platform-specific banner or
// fire macOS System Settings URLs from the live overlay. The events remain
// subscribed for logging/diagnostics only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const ui = read('src/components/AnswerCueInterface.tsx');

test('issue #252: audio-capture-failed handler is diagnostic-only in live shell', () => {
  const audioFailedHandler = ui.match(
    /onAudioCaptureFailed[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\);/
  );
  assert.ok(audioFailedHandler, 'audio-capture-failed listener should still exist');
  assert.match(audioFailedHandler[0], /Suppressed live audio warning/);
  assert.match(audioFailedHandler[0], /kind:\s*['"]audio-capture-failure['"]/);
  assert.doesNotMatch(audioFailedHandler[0], /setSystemAudioWarning/);
  assert.doesNotMatch(audioFailedHandler[0], /toggleSettingsWindow|openSettingsTab/);
});

test('issue #252: system-audio-permission-denied handler is diagnostic-only in live shell', () => {
  const permissionHandler = ui.match(
    /onSystemAudioPermissionDenied[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\);/
  );
  assert.ok(permissionHandler, 'system-audio-permission-denied listener should still exist');
  assert.match(permissionHandler[0], /Suppressed live audio warning/);
  assert.match(permissionHandler[0], /kind:\s*['"]screen-recording-permission['"]/);
  assert.doesNotMatch(permissionHandler[0], /setSystemAudioWarning/);
  assert.doesNotMatch(permissionHandler[0], /toggleSettingsWindow|openSettingsTab/);
});

test('issue #252: live overlay has no audio warning banner or macOS settings deep links', () => {
  assert.doesNotMatch(ui, /Screen Recording Permission Denied/);
  assert.doesNotMatch(ui, /Open Mic Settings|Open Screen Settings/);
  assert.doesNotMatch(ui, /x-apple\.systempreferences:/);
  assert.doesNotMatch(ui, /\{systemAudioWarning && \(/);
});
