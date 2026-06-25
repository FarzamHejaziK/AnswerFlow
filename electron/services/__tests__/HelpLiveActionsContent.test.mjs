import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('Help settings explains live interview actions in detail', () => {
  const helpSettings = read('src/components/settings/HelpSettings.tsx');

  assert.match(helpSettings, /Live Interview Actions In Detail/);
  assert.match(helpSettings, /What to answer\?/);
  assert.match(helpSettings, /Solve Code/);
  assert.match(helpSettings, /Screenshot \+ answer immediately/);
  assert.match(helpSettings, /Screenshot \+ code immediately/);
  assert.match(helpSettings, /uses prep notes, selected documents, transcript so far, prior AI responses/);
  assert.match(helpSettings, /Produces a full coding answer, not only a hint/);
});

test('Help Assistant guide teaches live action purpose and expected output', () => {
  const guide = read('src/content/answercue-help-guide.md');
  const helpAssistant = read('src/components/help/HelpAssistant.tsx');

  assert.match(guide, /## Live Interview Actions/);
  assert.match(guide, /### What to answer\?/);
  assert.match(guide, /### Solve Code/);
  assert.match(guide, /### Screenshot \+ answer immediately/);
  assert.match(guide, /### Screenshot \+ code immediately/);
  assert.match(guide, /Expected output: a full coding answer, not only a hint/);
  assert.match(guide, /This action captures the screen, attaches the screenshot, and immediately runs \*\*Solve Code\*\*/);
  assert.match(helpAssistant, /live interview actions, shortcuts/);
  assert.match(helpAssistant, /Ask about live actions, shortcuts, audio, models/);
});
