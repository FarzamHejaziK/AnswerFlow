import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainSource = fs.readFileSync(path.resolve(__dirname, '../../main.ts'), 'utf8');

test('stopAudioTest disables microphone pre-warm before stopping the disposable test capture', () => {
  const start = mainSource.indexOf('public stopAudioTest(): void');
  assert.notEqual(start, -1, 'stopAudioTest should exist');

  const end = mainSource.indexOf('\n  public finalizeMicSTT', start);
  assert.notEqual(end, -1, 'could not find end of stopAudioTest');

  const body = mainSource.slice(start, end);
  const disableIdx = body.indexOf('this.audioTestCapture.disablePreWarm();');
  const stopIdx = body.indexOf('this.audioTestCapture.stop();');

  assert.notEqual(disableIdx, -1, 'audio test capture must disable pre-warm during teardown');
  assert.notEqual(stopIdx, -1, 'audio test capture should still be stopped');
  assert.ok(
    disableIdx < stopIdx,
    'disablePreWarm must run before stop so MicrophoneCapture.stop() cannot schedule a CoreAudio pre-warm',
  );
});
