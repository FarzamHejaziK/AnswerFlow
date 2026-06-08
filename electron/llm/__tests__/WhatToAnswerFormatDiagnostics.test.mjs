import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const diagnosticsPath = path.resolve(
  __dirname,
  '../../../dist-electron/electron/llm/WhatToAnswerFormatDiagnostics.js',
);
const { inspectWhatToAnswerFormat } = await import(pathToFileURL(diagnosticsPath).href);

test('inspectWhatToAnswerFormat reports model source for structured output', () => {
  assert.deepEqual(
    inspectWhatToAnswerFormat(
      `Question: how I handle ambiguity

Answer:
I clarify constraints first.`,
      'How do you handle ambiguity?',
    ),
    {
      structured: true,
      source: 'model',
      fallbackAvailable: true,
      answerLength: 70,
      questionLength: 28,
    },
  );
});

test('inspectWhatToAnswerFormat reports fallback when model output is plain but question is usable', () => {
  const result = inspectWhatToAnswerFormat(
    'I clarify constraints first.',
    'How do you handle ambiguity?',
  );

  assert.equal(result.structured, false);
  assert.equal(result.source, 'ipc-question-fallback');
  assert.equal(result.fallbackAvailable, true);
});

test('inspectWhatToAnswerFormat reports plain when no usable question exists', () => {
  const result = inspectWhatToAnswerFormat(
    'I clarify constraints first.',
    'What to Answer',
  );

  assert.equal(result.structured, false);
  assert.equal(result.source, 'plain');
  assert.equal(result.fallbackAvailable, false);
});
