import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const source = readFileSync(
  path.join(root, 'src/components/NativelyInterface.tsx'),
  'utf8',
);

test('rolling transcript shows mic transcripts outside Answer mode', () => {
  assert.doesNotMatch(
    source,
    /Ignore user mic transcripts when not recording/,
    'local mic transcripts should not be silently hidden outside Answer mode',
  );
  assert.match(
    source,
    /transcript\.speaker !== 'interviewer' && transcript\.speaker !== 'user'/,
    'rolling transcript should accept interviewer and user channels',
  );
  assert.match(
    source,
    /transcript\.speaker === 'user' \? `You: \$\{transcript\.text\}` : transcript\.text/,
    'mic transcripts should be visibly labeled in the rolling transcript',
  );
  assert.match(
    source,
    /isRecordingRef\.current && transcript\.speaker === 'user'/,
    'Answer mode should still capture user speech into the answer input first',
  );
});
