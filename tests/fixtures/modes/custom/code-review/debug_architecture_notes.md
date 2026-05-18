# Natively answer-path architecture notes

## High-level flow
1. `IntelligenceEngine` receives a transcript chunk.
2. `IntentClassifier` decides whether the turn warrants an answer.
3. `WhatToAnswerLLM` owns runtime intent classification and prompt assembly for live answers.
4. `PromptAssembler` builds the final user message with retrieved snippets, screen OCR context, and prior responses.
5. `LLMHelper.streamChat` routes to the active provider (Claude / Gemini / OpenAI / Natively / Ollama).

## Ownership
- Modes Manager owns the mode catalog, reference files, and the active mode prompt suffix.
- ModeContextRetriever owns lexical retrieval; ModeHybridRetriever owns hybrid lexical + vector retrieval with telemetry on fallback.
- WhatToAnswerLLM owns runtime intent classification and prompt assembly. It must read the active mode suffix freshly per call because the active mode can be switched mid-session.

## Known sharp edges
- Mode hot-swap during a live call: the modes manager guarantees that `getActiveModeSystemPromptSuffix` returns a string, never undefined, but tests have caught regressions where a refactor introduced the undefined return path.
- Prompt-suffix caching: do not cache the suffix on the WhatToAnswerLLM instance; the cache is owned by ModesManager itself.

## Test surfaces
- electron/services/__tests__/ModesManager.test.mjs covers the prompt-suffix invariant.
- electron/services/__tests__/PromptAssembler.test.mjs covers the assembly contract.
