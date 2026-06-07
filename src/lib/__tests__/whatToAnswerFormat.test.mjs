import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWhatToAnswerFormat } from '../whatToAnswerFormat.mjs';

test('parseWhatToAnswerFormat splits Question and Answer labels', () => {
  const parsed = parseWhatToAnswerFormat(`Question: explaining how I handle ambiguity

Answer:
I would clarify the outcome first, then confirm the constraints.`);

  assert.deepEqual(parsed, {
    question: 'explaining how I handle ambiguity',
    answer: 'I would clarify the outcome first, then confirm the constraints.',
  });
});

test('parseWhatToAnswerFormat accepts bold labels and interview question label', () => {
  const parsed = parseWhatToAnswerFormat(`**Interview Question:** how I debug production incidents

**Answer:**
I start by separating user impact from root cause, then I narrow the blast radius.`);

  assert.deepEqual(parsed, {
    question: 'how I debug production incidents',
    answer: 'I start by separating user impact from root cause, then I narrow the blast radius.',
  });
});

test('parseWhatToAnswerFormat returns null for plain answers', () => {
  assert.equal(parseWhatToAnswerFormat('I would clarify the outcome first.'), null);
});
