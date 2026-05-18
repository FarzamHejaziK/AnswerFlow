// electron/llm/WhatToAnswerLLM.ts excerpt (the buggy version that caused the stack trace)

export class WhatToAnswerLLM {
  async *generateStream(transcript: string, temporalContext?: TemporalContext): AsyncIterable<string> {
    // BUG: when this.modesManager has just been hot-swapped, modePromptSuffix
    // can be undefined at this point because the previous mode's suffix was
    // cleared but the new one has not been fetched yet. We then build the
    // override prompt against an undefined value and the downstream streamChat
    // is never reached on the active call.
    const modePromptSuffix = this.modesManager.getActiveModeSystemPromptSuffix();
    const basePrompt = UNIVERSAL_WHAT_TO_ANSWER_PROMPT;
    const finalPromptOverride = modePromptSuffix
      ? `${basePrompt}\n\n## ACTIVE MODE\n${modePromptSuffix}`
      : basePrompt;

    // FIX: defensively coerce undefined to empty string and refresh the
    // modes manager before reading the suffix. Wrapping the read in a
    // try/catch is not enough because the downstream PromptAssembler relies
    // on a string typed field, not an undefined typed one.
    yield* this.llmHelper.streamChat(transcript, undefined, undefined, finalPromptOverride, true);
  }
}
