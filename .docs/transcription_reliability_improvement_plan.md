# Transcription Reliability Improvement Plan

This document corrects the requested filename spelling from `transcritopn_reliablity_improvement_plan.md` to `transcription_reliability_improvement_plan.md`.

## Purpose

Improve local transcription reliability for live interviews, especially when capturing the interviewer through Zoom/system audio. The current local STT path can transcribe, but reliability can suffer from model instability, simple VAD, aggressive partial emission, and finalization behavior.

The goal is not only to pick a better local model. The goal is to make the full transcription pipeline more trustworthy: audio capture, VAD, chunking, partial stability, final transcript correction, and the timing of when transcript text is sent to the assistant.

## Current Understanding

- The app can use local models including Moonshine, Distil-Whisper, and Whisper variants.
- Moonshine Base is very low latency and streaming-native, but the current implementation skips the LocalAgreement stability step for Moonshine partials.
- Distil-Whisper models are slower than Moonshine but use the more stable Whisper/Distil path.
- The current VAD is energy-based and simple. It may cut speech too early, miss speech edges, or split sentences awkwardly.
- The app may inject interim transcript text into the assistant before the transcript is stable.
- The existing resampling path is functional but basic, and there is limited audio-quality telemetry for diagnosing bad transcript sessions.

## Recommended Local Model Direction

Use model routing as the first practical quality improvement:

- Default balanced local model for interviewer/system audio: `distil-whisper/distil-medium.en`
- Default fast local model for user/mic audio: `distil-whisper/distil-small.en` or `onnx-community/moonshine-base-ONNX`
- Keep Moonshine as the lowest-latency option.
- Consider Whisper Large v3 Turbo only for high-accuracy or multilingual mode, because it may be too heavy for live responsiveness on many Windows machines.

The interviewer/system channel matters most for answer generation, so the higher-quality model should be used there first.

## Implementation Progress Requirement

Before implementation starts, create:

`.docs/transcription_reliability_improvement_progress.md`

That progress document should be updated step by step during implementation. Each entry should include:

- Date and branch or commit reference
- Files changed
- What was changed
- Why it was changed
- Test command or manual test performed
- Observed latency and quality impact when measurable
- Known issues or follow-up work

The progress document should act as the implementation log, not a final summary written after the fact.

## Phase 1: Add Better Diagnostics

Add structured telemetry and debug logging that does not expose raw transcript text.

Track per channel:

- Active STT provider and model ID
- Input sample rate and resampled target rate
- Chunk count and chunk duration
- RMS/peak audio level
- VAD speech start/end events
- Segment duration
- First partial latency
- Final transcript latency
- Partial-to-final edit distance or replacement size
- Number of empty, filtered, or hallucination-filtered outputs
- Number of zero-fill or near-silent chunks

Acceptance criteria:

- A bad transcription session can be diagnosed from logs without guessing whether the problem is capture, VAD, model, or finalization.
- Logs avoid raw transcript content unless an explicit local debug flag is enabled.

## Phase 2: Define Local STT Quality Profiles

Create local transcription profiles instead of one implicit behavior.

Suggested profiles:

- `fast`: Moonshine Base, aggressive partials, lowest latency
- `balanced`: Distil Medium EN for system audio, Distil Small EN or Moonshine Base for mic
- `accurate`: Distil Large v3 or Whisper Large v3 Turbo where hardware allows

Each profile should set:

- Model per channel
- Partial interval
- Minimum audio before partial
- VAD threshold and hangover
- Whether interim transcript can be sent to the assistant
- Whether a stronger final-pass correction is used

Acceptance criteria:

- Users can select speed versus reliability intentionally.
- The default local profile should favor reliable interviewer transcription, not just lowest latency.

## Phase 3: Improve Interim Transcript Stability

Do not let unstable partial text drive assistant answers too early.

Changes to evaluate:

- Use LocalAgreement or a similar stabilization step for Moonshine partials in balanced mode.
- Gate assistant injection until interim text is stable enough, or until a final segment exists.
- Add a debounce window before sending partial text to the assistant.
- Prefer final text over partial text when both are available for the same segment.
- Track partial replacement churn so unstable models can be detected.

Acceptance criteria:

- The assistant should not answer based on a partial that is immediately replaced with substantially different text.
- Final transcript text should replace or reconcile earlier interim text cleanly.

## Phase 4: Improve VAD And Segmentation

The current energy VAD should be improved because segmentation directly affects transcript quality.

Changes to evaluate:

- Add an adaptive noise floor instead of a fixed RMS threshold only.
- Use separate VAD profiles for mic and system audio.
- Add pre-roll buffering so the beginning of speech is not clipped.
- Add post-roll buffering so final words are not cut off.
- Increase system-audio hangover in balanced/accurate modes.
- Avoid finalizing after very short silence when speech likely continues.
- Evaluate a stronger VAD option such as WebRTC VAD or Silero VAD if packaging is practical.

Acceptance criteria:

- Fewer missing first/last words.
- Fewer unnatural segment splits in normal interview speech.
- Better handling of Zoom pauses and variable speaker volume.

## Phase 5: Improve Audio Preprocessing

Improve the audio before it reaches STT.

Changes to evaluate:

- Replace or supplement linear resampling with a higher-quality resampler.
- Normalize channel volume before STT.
- Add optional AGC for low-volume system audio.
- Add optional noise suppression where it does not create artifacts.
- Detect and warn when captured audio is too quiet or clipped.

Acceptance criteria:

- Low-volume Zoom speech is more consistently recognized.
- Sample-rate changes and channel differences do not cause large quality swings.

## Phase 6: Add Hybrid Local Final Correction

Use fast partial transcription and stronger final correction together.

Possible design:

- Moonshine emits fast partials for UI responsiveness.
- Distil Medium EN or Distil Large v3 re-transcribes finalized segments.
- The final corrected transcript replaces the fast partial text.
- The assistant only uses fast partials when latency is critical, and uses corrected finals for durable context.

Acceptance criteria:

- Live UI remains responsive.
- Final transcript quality improves over Moonshine-only.
- The assistant context becomes more reliable after final correction.

## Phase 7: Improve Hallucination And Duplicate Filtering

The current hallucination filter should be expanded beyond simple exact phrase filtering.

Changes to evaluate:

- Filter repeated low-information phrases.
- Detect repeated identical finals from overlapping windows.
- Drop extremely low-confidence single-word outputs when audio level is weak.
- Add segment-level duplicate detection.
- Preserve short but meaningful answers such as "yes", "no", and technical terms when confidence/audio evidence is strong.

Acceptance criteria:

- Fewer filler or hallucinated transcript segments.
- Short real utterances are not accidentally removed.

## Phase 8: Test Harness And Manual Test Script

Create a repeatable reliability test flow.

Automated or semi-automated fixtures:

- Clean English interview audio
- Zoom-like compressed system audio
- Low-volume speaker audio
- Accented English
- Technical interview vocabulary
- Short answers and interruptions
- Overlapping mic/system speech

Manual local test:

1. Select local STT balanced profile.
2. Set system/interviewer model to Distil Medium EN.
3. Join a Zoom test call or play a known interview audio clip through Zoom output.
4. Speak short responses into the mic.
5. Compare saved transcript against expected text.
6. Save logs and record model, profile, hardware, and observed issues in the progress document.

Acceptance criteria:

- The same test can compare Moonshine Base, Distil Small EN, Distil Medium EN, and hybrid mode.
- Quality and latency tradeoffs are visible from logs and manual notes.

## Suggested Implementation Order

1. Create the progress document.
2. Add diagnostics and non-sensitive telemetry.
3. Add local STT profiles.
4. Set balanced defaults for local interview use.
5. Stabilize interim transcript injection.
6. Tune VAD separately for mic and system audio.
7. Add hybrid final correction if latency remains acceptable.
8. Expand hallucination and duplicate filtering.
9. Run manual and fixture-based comparisons.

## Success Criteria

The improvement is successful when:

- Interviewer/system audio transcript is visibly more reliable than Moonshine-only mode.
- Assistant answers are less likely to be based on unstable interim transcript text.
- Missing first/last words are reduced.
- Weird duplicate or hallucinated transcript segments are reduced.
- Users can choose between fast, balanced, and accurate local modes.
- Logs clearly explain whether a failure came from audio capture, VAD, model quality, or finalization.
