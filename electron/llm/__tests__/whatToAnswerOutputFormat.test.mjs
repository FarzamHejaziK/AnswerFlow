import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsPath = path.resolve(__dirname, '../../../dist-electron/electron/llm/prompts.js');
const tinyPromptsPath = path.resolve(__dirname, '../../../dist-electron/electron/llm/tinyPrompts.js');
const prompts = await import(pathToFileURL(promptsPath).href);
const tinyPrompts = await import(pathToFileURL(tinyPromptsPath).href);

test('what-to-answer prompts request Question and Answer sections', () => {
  assert.match(prompts.UNIVERSAL_WHAT_TO_ANSWER_PROMPT, /Question: brief clarification/i);
  assert.match(prompts.UNIVERSAL_WHAT_TO_ANSWER_PROMPT, /Answer:\s*\nthe exact response/i);
  assert.doesNotMatch(prompts.UNIVERSAL_WHAT_TO_ANSWER_PROMPT, /Output ONLY the answer\. Nothing else\./);
  assert.doesNotMatch(prompts.UNIVERSAL_WHAT_TO_ANSWER_PROMPT, /under 14 words/i);

  assert.match(tinyPrompts.TINY_WHAT_TO_ANSWER_PROMPT, /Question: brief clarification/i);
  assert.match(tinyPrompts.TINY_WHAT_TO_ANSWER_PROMPT, /Answer:\s*\nthe spoken answer/i);
  assert.doesNotMatch(tinyPrompts.TINY_WHAT_TO_ANSWER_PROMPT, /Just give the spoken answer/i);
  assert.doesNotMatch(tinyPrompts.TINY_WHAT_TO_ANSWER_PROMPT, /under 14 words/i);
});
