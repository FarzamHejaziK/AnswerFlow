const STRUCTURED_WHAT_TO_ANSWER_RE =
  /^\s*(?:\*\*)?(?:Interview\s+)?Question(?:\s*\*\*)?\s*:?\s*(?:\*\*)?\s*([\s\S]*?)\r?\n+\s*(?:\*\*)?Answer(?:\s*\*\*)?\s*:?\s*(?:\*\*)?\s*([\s\S]*)$/i;

export function parseWhatToAnswerFormat(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(STRUCTURED_WHAT_TO_ANSWER_RE);
  if (!match) return null;

  const question = match[1].trim();
  const answer = match[2].trim();
  if (!question || !answer) return null;

  return { question, answer };
}

const PLACEHOLDER_QUESTIONS = new Set([
  'what to answer',
  'inferred',
  'code hint',
  'brainstorming approaches',
]);

export function formatWhatToAnswerMessage(answer, question) {
  const cleanAnswer = typeof answer === 'string' ? answer.trim() : '';
  if (!cleanAnswer || parseWhatToAnswerFormat(cleanAnswer)) return cleanAnswer;

  const cleanQuestion = typeof question === 'string' ? question.trim() : '';
  if (!cleanQuestion || PLACEHOLDER_QUESTIONS.has(cleanQuestion.toLowerCase())) {
    return cleanAnswer;
  }

  return `Question: ${cleanQuestion}\n\nAnswer:\n${cleanAnswer}`;
}
