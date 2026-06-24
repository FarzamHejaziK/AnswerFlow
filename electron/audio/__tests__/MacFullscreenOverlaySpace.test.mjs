import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const helperPath = path.resolve(__dirname, '../../../electron/WindowHelper.ts');
const source = readFileSync(helperPath, 'utf8');

test('macOS launcher is not fullscreenable so live overlay stays on a real desktop Space', () => {
  assert.ok(
    /fullscreenable\s*:\s*!isMac/.test(source),
    'BUG: the launcher must not be macOS-native-fullscreenable. A fullscreen launcher creates a separate Space; opening the live overlay there leaves a dark fullscreen backing surface behind it instead of the meeting/background app.',
  );
});

test('switchToOverlay exits launcher fullscreen before showing the overlay', () => {
  assert.ok(
    /deferOverlayUntilLauncherLeavesFullscreen\s*\(\s*inactive\s*\)/.test(source),
    'BUG: WindowHelper must guard the overlay transition when the launcher is already fullscreen.',
  );
  assert.ok(
    /isFullScreen\s*\(\s*\)/.test(source),
    'BUG: the fullscreen overlay guard must check BrowserWindow.isFullScreen().',
  );
  assert.ok(
    /once\s*\(\s*['"]leave-full-screen['"]/.test(source),
    'BUG: the overlay should wait for macOS to leave the fullscreen Space before showing.',
  );
  assert.ok(
    /setFullScreen\s*\(\s*false\s*\)/.test(source),
    'BUG: the overlay transition must request exit from native fullscreen.',
  );

  const guardIdx = source.indexOf('this.deferOverlayUntilLauncherLeavesFullscreen(inactive)');
  const modeIdx = source.indexOf("this.currentWindowMode = 'overlay'");
  assert.ok(guardIdx >= 0 && modeIdx >= 0 && guardIdx < modeIdx, 'BUG: fullscreen guard must run before switching WindowHelper into overlay mode.');
});
