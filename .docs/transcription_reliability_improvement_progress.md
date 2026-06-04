# Transcription Reliability Improvement Progress

## 2026-06-04 - Setup And Model-Side Reliability Baseline

- Branch: `main`
- Commit: `c6b904b`
- Files changed:
  - `.docs/transcription_reliability_improvement_plan.md`
  - `electron/LLMHelper.ts`
  - `electron/IntelligenceEngine.ts`
  - `electron/llm/WhatToAnswerLLM.ts`
  - `electron/llm/__tests__/ModelDefaults.test.mjs`
  - model dropdown/runtime files
- What changed:
  - Added the plan document requested by the user.
  - Added GPT 5.5 and GPT 5.5 Thinking dropdown/runtime handling.
  - Added OpenAI streaming first-token timeout, same-model retry, fallback to `gpt-5.4`, and Gemini fallback.
  - Wired What-to-Answer streams to an abort signal so meeting stop/reset can cancel a stalled provider stream.
- Why:
  - The log showed a `chat-latest`/GPT 5.5 Instant turn that started but did not produce a response before the meeting ended.
  - The old OpenAI text stream path was one-shot and had no first-token timeout or retry.
- Verification:
  - `npm run build`
  - `npm run build:electron`
  - `node --test electron/llm/__tests__/ModelDefaults.test.mjs`
- Observed impact:
  - Not manually measured yet.
  - Expected behavior is that a stalled OpenAI stream fails fast after 8 seconds, retries once immediately, then falls back.
- Known follow-up:
  - Add provider attempt telemetry to user-visible logs if a failure happens in a live meeting.
  - Continue Phase 1 transcription diagnostics below.

## 2026-06-04 - Phase 1 Started: Local STT Diagnostics

- Branch: `main`
- Commit: pending
- Files changed:
  - `electron/audio/LocalWhisperSTT.ts`
  - `electron/services/__tests__/LocalWhisperDiagnostics.test.mjs`
  - `.docs/transcription_reliability_improvement_progress.md`
- What changed:
  - Added non-sensitive LocalWhisper session diagnostics that log at start, every 10 seconds, finalize, and stop.
  - Added audio-level counters: chunks, input/resampled audio duration, average RMS, peak, and near-silent chunks.
  - Added segmentation/finalization counters: VAD closed segments, gap flushes, soft commits, final dispatches, partial emits, final emits, filtered partials, and filtered finals.
  - Added model/runtime context in the same diagnostic log: model ID, channel, language, sample rates, streaming interval, minimum streaming audio, and LocalAgreement skip mode.
  - Added static regression coverage so future edits preserve the diagnostics contract.
- Why:
  - Bad transcription sessions need to be diagnosable without guessing whether the failure came from capture, audio level, VAD, model inference, or finalization.
- Verification:
  - `node --test electron/services/__tests__/LocalWhisperStopFlush.test.mjs electron/services/__tests__/LocalWhisperDiagnostics.test.mjs`
  - `npm run build:electron`
- Observed impact:
  - Not manually measured yet.
  - Expected log impact is a new `[LocalWhisperSTT/<model>:<channel>] diagnostics` object for each local STT channel.
  - The counters should make it clear whether a bad run had low/near-silent audio, no VAD closures, many filtered transcripts, or finals that were dispatched but did not emit usable text.
- Known follow-up:
  - Add a small rolling segment timeline if the first diagnostic logs show frequent gap flushes or soft commits.
  - Use the diagnostics to tune VAD thresholds and finalization timing before changing transcript text handling.
