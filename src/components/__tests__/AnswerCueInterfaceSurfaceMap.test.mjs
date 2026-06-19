import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const source = readFileSync(join(repoRoot, 'src/components/AnswerCueInterface.tsx'), 'utf8');

test('AnswerCueInterface labels the visible live overlay surfaces', () => {
  assert.match(source, /LIVE OVERLAY SHELL/);
  assert.match(source, /AI RESPONSE PANEL/);
  assert.match(source, /MessageRow renders typed\/manual user messages and AI answer/);
});

test('live transcription stays in the rolling transcript strip, not message rows', () => {
  assert.doesNotMatch(source, /LiveTranscriptTurn/);
  assert.doesNotMatch(source, /displayLiveTranscriptMessages/);
  assert.doesNotMatch(source, /liveTranscriptTurns/);

  assert.match(
    source,
    /const showAiResponsePanel = messages\.length > 0 \|\| isManualRecording \|\| isProcessing \|\| answerPanelPinned;/,
  );
  assert.match(
    source,
    /const shouldShowRollingTranscript =[\s\S]{0,180}\(showTranscript && rollingTranscript\)/,
  );

  const aiRowsIndex = source.indexOf('{displayMessages.map');
  const rollingIndex = source.indexOf('<RollingTranscript');

  assert.ok(rollingIndex > -1, 'rolling transcript strip must be rendered in AnswerCueInterface');
  assert.ok(aiRowsIndex > -1, 'AI answer rows must be rendered in AnswerCueInterface');
  assert.ok(
    rollingIndex < aiRowsIndex,
    'rolling transcript should remain outside and before the AI response panel',
  );
});
