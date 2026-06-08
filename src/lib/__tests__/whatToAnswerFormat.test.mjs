import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWhatToAnswerMessage, parseWhatToAnswerFormat } from '../whatToAnswerFormat.mjs';

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

test('formatWhatToAnswerMessage wraps a plain answer with the IPC question', () => {
  const formatted = formatWhatToAnswerMessage(
    'I would clarify the outcome first.',
    'How do you handle ambiguity?',
  );

  assert.deepEqual(parseWhatToAnswerFormat(formatted), {
    question: 'How do you handle ambiguity?',
    answer: 'I would clarify the outcome first.',
  });
});

test('formatWhatToAnswerMessage keeps already structured answers unchanged', () => {
  const answer = `Question: how I debug incidents

Answer:
I separate impact from cause.`;

  assert.equal(formatWhatToAnswerMessage(answer, 'ignored question'), answer);
});

test('formatWhatToAnswerMessage does not show placeholder questions', () => {
  assert.equal(
    formatWhatToAnswerMessage('I would ask a clarifying question.', 'What to Answer'),
    'I would ask a clarifying question.',
  );
});
