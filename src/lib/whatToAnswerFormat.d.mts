export interface ParsedWhatToAnswerFormat {
  question: string;
  answer: string;
}

export function parseWhatToAnswerFormat(text: string): ParsedWhatToAnswerFormat | null;
