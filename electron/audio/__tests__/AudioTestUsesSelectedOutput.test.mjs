import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

const main = read('electron/main.ts');
const ipcHandlers = read('electron/ipcHandlers.ts');
const preload = read('electron/preload.ts');
const settingsOverlay = read('src/components/SettingsOverlay.tsx');
const electronTypes = read('src/types/electron.d.ts');

test('Settings audio test probes the same selected output route used by meetings', () => {
  assert.match(
    main,
    /public async startAudioTest\(deviceId\?: string, outputDeviceId\?: string\)/,
    'main startAudioTest should accept the selected output device id',
  );
  assert.match(
    main,
    /private async _startAudioTestImpl\(deviceId\?: string, outputDeviceId\?: string\)/,
    'audio test implementation should receive the selected output device id',
  );
  assert.match(
    main,
    /const wantedOutputDeviceId = this\.normalizeDeviceId\(outputDeviceId\);/,
    'audio test should normalize the selected output just like meeting startup',
  );
  assert.match(
    main,
    /new SystemAudioCapture\(wantedOutputDeviceId\)/,
    'system-audio test probe should bind to the selected output route',
  );
  assert.match(
    ipcHandlers,
    /start-audio-test'[\s\S]*deviceId\?: string, outputDeviceId\?: string[\s\S]*appState\.startAudioTest\(deviceId, outputDeviceId\)/,
    'IPC handler should forward selected output to main',
  );
  assert.match(
    preload,
    /startAudioTest: \(deviceId\?: string, outputDeviceId\?: string\)/,
    'preload type should expose the output argument',
  );
  assert.match(
    preload,
    /ipcRenderer\.invoke\('start-audio-test', deviceId, outputDeviceId\)/,
    'preload implementation should send the output argument over IPC',
  );
  assert.match(
    electronTypes,
    /startAudioTest: \(deviceId\?: string, outputDeviceId\?: string\)/,
    'renderer type declaration should include the output argument',
  );
  assert.match(
    settingsOverlay,
    /startAudioTest\(\s*selectedInput \|\| undefined,\s*selectedOutput \|\| undefined,\s*\)/,
    'Settings UI should pass selectedOutput into the audio test',
  );
});
