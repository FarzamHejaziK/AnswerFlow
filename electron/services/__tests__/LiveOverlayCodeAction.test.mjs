import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const source = fs.readFileSync(
  path.join(root, 'src/components/AnswerCueInterface.tsx'),
  'utf8',
);

function sliceBetween(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `could not locate ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `could not locate ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
}

test('live overlay quick actions expose Solve Code instead of the manual Answer button', () => {
  const quickActions = sliceBetween(
    '{/* Quick Actions - Minimal & Clean */}',
    '{/* Input Area */}',
  );

  assert.match(
    quickActions,
    /onClick=\{handleSolveCode\}[\s\S]*<Code className="w-3 h-3 opacity-70" \/>\s*Solve Code/,
    'the visible replacement button should call the code-solver handler',
  );
  assert.doesNotMatch(
    quickActions,
    /onClick=\{handleAnswerNow\}[\s\S]*>\s*Answer\s*</,
    'the live quick-action row should not expose the old manual Answer button',
  );
});

test('Solve Code streams with a code-answer prompt, not the hint-only prompt', () => {
  assert.match(
    source,
    /const SOLVE_CODE_SYSTEM_PROMPT = `[\s\S]*produce the code answer[\s\S]*complete working solution[\s\S]*fenced code block/,
    'Solve Code should explicitly request a full code answer',
  );
  assert.match(
    source,
    /streamGeminiChat\([\s\S]*systemPrompt: SOLVE_CODE_SYSTEM_PROMPT[\s\S]*ignoreKnowledgeMode: true/,
    'Solve Code should route through generic chat with the code-solver system prompt',
  );
});
