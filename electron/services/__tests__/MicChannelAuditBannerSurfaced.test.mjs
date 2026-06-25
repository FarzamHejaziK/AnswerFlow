// Regression test for mic-channel capture diagnostics.
//
// The live overlay intentionally suppresses audio warning banners now, but it
// must still subscribe to both system and mic capture failures so diagnostics
// are visible in logs. This guards against reintroducing the old
// `payload.channel !== 'system'` early return, which hid mic zero-fill failures.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const tsxPath = path.join(root, 'src/components/AnswerCueInterface.tsx');
const source = fs.readFileSync(tsxPath, 'utf8');

const HANDLER_RE =
  /onAudioCaptureFailed\?\.\(\((?:payload|[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\)\s*;/g;

describe('B1: mic-channel audio-capture-failed remains logged by the renderer', () => {
  it('contains exactly one onAudioCaptureFailed subscription', () => {
    const subscriptions = source.match(/onAudioCaptureFailed/g) || [];
    assert.equal(
      subscriptions.length,
      1,
      `expected exactly 1 onAudioCaptureFailed subscription in AnswerCueInterface.tsx, found ${subscriptions.length}`,
    );
  });

  it('handler body does not filter out mic-channel failures', () => {
    const matches = source.match(HANDLER_RE);
    assert.ok(matches && matches.length === 1, 'could not locate onAudioCaptureFailed handler');
    const body = matches[0];

    assert.doesNotMatch(body, /payload\.channel\s*!==\s*['"]system['"]/);
    assert.doesNotMatch(body, /channel\s*!==\s*['"]system['"]/);
    assert.doesNotMatch(body, /['"]system['"]\s*!==\s*[\w.]*channel/);
  });

  it('handler gates logs on terminal or stuck failures to avoid log spam', () => {
    const matches = source.match(HANDLER_RE);
    assert.ok(matches && matches.length === 1, 'could not locate onAudioCaptureFailed handler');
    assert.match(
      matches[0],
      /payload\.terminal\s*\|\|\s*payload\.stuck|payload\.stuck\s*\|\|\s*payload\.terminal/,
    );
  });

  it('handler logs the channel and message without rendering a live banner', () => {
    const matches = source.match(HANDLER_RE);
    assert.ok(matches && matches.length === 1, 'could not locate onAudioCaptureFailed handler');
    const body = matches[0];

    assert.match(body, /Suppressed live audio warning/);
    assert.match(body, /kind:\s*['"]audio-capture-failure['"]/);
    assert.match(body, /channel:\s*payload\.channel/);
    assert.match(body, /message:\s*payload\.message/);
    assert.doesNotMatch(body, /setSystemAudioWarning/);
    assert.doesNotMatch(body, /setIsExpanded\s*\(\s*true\s*\)/);
  });
});
