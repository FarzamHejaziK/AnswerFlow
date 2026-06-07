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
