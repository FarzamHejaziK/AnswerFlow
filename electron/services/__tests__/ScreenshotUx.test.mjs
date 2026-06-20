import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const answerCueSource = fs.readFileSync(
  path.join(root, 'src/components/AnswerCueInterface.tsx'),
  'utf8',
);
const helpSource = fs.readFileSync(
  path.join(root, 'src/components/settings/HelpSettings.tsx'),
  'utf8',
);

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `could not locate ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `could not locate ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
}

test('screenshot attachment creates a visible, deduped chat-history row with a preview', () => {
  const attachBody = sliceBetween(
    answerCueSource,
    'const handleScreenshotAttach = (data: { path: string; preview: string }) => {',
    '  // STT Status listener',
  );

  assert.match(
    attachBody,
    /setMessages\(\(prev\)\s*=>\s*{\s*if\s*\(prev\.some\(\(m\)\s*=>\s*m\.screenshotPath\s*===\s*data\.path\)\)\s*return prev;/,
    'screenshot attach should dedupe history rows by screenshot path',
  );
  assert.match(
    attachBody,
    /hasScreenshot:\s*true,[\s\S]*screenshotPreview:\s*data\.preview,[\s\S]*screenshotPath:\s*data\.path,/,
    'screenshot attach should append a user history row carrying preview and path',
  );
  assert.match(
    answerCueSource,
    /src={msg\.screenshotPreview}[\s\S]*alt="Screenshot preview"/,
    'message rows should render the screenshot thumbnail, not only a text label',
  );
});

test('normal screenshot UX points to full-screen capture, while selective capture remains explicit', () => {
  const placeholderStart = answerCueSource.indexOf(
    '<span>Ask anything on screen or conversation, or</span>',
  );
  assert.notEqual(placeholderStart, -1, 'could not locate chat input placeholder');
  const placeholder = answerCueSource.slice(placeholderStart, placeholderStart + 1200);

  assert.match(
    placeholder,
    /shortcuts\.takeScreenshot\s*\|\|\s*\[getModifierSymbol\('cmd'\),\s*'H'\]/,
    'chat placeholder should advertise the full-screen screenshot shortcut',
  );
  assert.doesNotMatch(
    placeholder,
    /shortcuts\.selectiveScreenshot|for selective screenshot/,
    'chat placeholder must not route users to the cropper shortcut for normal screenshots',
  );
  assert.match(helpSource, /\{ label: 'Screenshot', kbd: `\$\{cmd\}H` \},/);
  assert.doesNotMatch(helpSource, /for selective screenshot|Screenshot & Ask/);
  assert.match(
    helpSource,
    /title: 'Screenshot'[\s\S]*kbd: \['⌘', 'H'\][\s\S]*Captures the whole screen/,
    'help quick-action card should describe Cmd/Ctrl+H as whole-screen capture',
  );
});
