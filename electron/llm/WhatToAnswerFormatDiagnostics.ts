const STRUCTURED_WHAT_TO_ANSWER_RE =
    /^\s*(?:\*\*)?(?:Interview\s+)?Question(?:\s*\*\*)?\s*:?\s*(?:\*\*)?\s*([\s\S]*?)\r?\n+\s*(?:\*\*)?Answer(?:\s*\*\*)?\s*:?\s*(?:\*\*)?\s*([\s\S]*)$/i;

const PLACEHOLDER_QUESTIONS = new Set([
    'what to answer',
    'inferred',
    'code hint',
    'brainstorming approaches',
]);

export type WhatToAnswerFormatSource = 'model' | 'ipc-question-fallback' | 'plain';

export interface WhatToAnswerFormatDiagnostics {
    structured: boolean;
    source: WhatToAnswerFormatSource;
    fallbackAvailable: boolean;
    answerLength: number;
    questionLength: number;
}

function hasStructuredQuestionAnswer(answer: string): boolean {
    const match = answer.match(STRUCTURED_WHAT_TO_ANSWER_RE);
    if (!match) return false;
    return match[1].trim().length > 0 && match[2].trim().length > 0;
}

function hasUsableFallbackQuestion(question: string): boolean {
    const cleanQuestion = question.trim();
    return cleanQuestion.length > 0 && !PLACEHOLDER_QUESTIONS.has(cleanQuestion.toLowerCase());
}

export function inspectWhatToAnswerFormat(answer: unknown, question: unknown): WhatToAnswerFormatDiagnostics {
    const cleanAnswer = typeof answer === 'string' ? answer.trim() : '';
    const cleanQuestion = typeof question === 'string' ? question.trim() : '';
    const structured = hasStructuredQuestionAnswer(cleanAnswer);
    const fallbackAvailable = hasUsableFallbackQuestion(cleanQuestion);

    return {
        structured,
        source: structured ? 'model' : fallbackAvailable ? 'ipc-question-fallback' : 'plain',
        fallbackAvailable,
        answerLength: cleanAnswer.length,
        questionLength: cleanQuestion.length,
    };
}

export function logWhatToAnswerFormatDiagnostics(
    answer: unknown,
    question: unknown,
    metadata: Record<string, unknown> = {},
): void {
    console.log('[WhatToAnswerFormat] compliance', {
        ...metadata,
        ...inspectWhatToAnswerFormat(answer, question),
    });
}
