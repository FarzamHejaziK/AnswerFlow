# Technical Interview Direct Vision Results

Last updated: 2026-05-16.

## Status

The routing decision is proven; the live in-app answer pipeline is **not yet
routed** through `ScreenUnderstandingService`. The brief calls this out
explicitly and so does this report — no overclaiming.

## Automated coverage

| Test file | Tests |
|-----------|-------|
| `electron/services/__tests__/ScreenUnderstandingService.test.mjs` | "marks technical interview screenshots for direct vision" (4/4 pass) |
| `electron/services/__tests__/ScreenUnderstandingMode.test.mjs` | "auto + technical interview + vision provider → vision_direct"; "auto + technical interview + no vision provider → OCR fallback with a warning" (13/13 pass) |
| `electron/llm/__tests__/suggestionPromptAssembly.test.mjs` | Direct image-input instruction; non-vision-model refusal (12/12 pass) |

### Assertions covered

- `result.status === 'available'`
- `result.source === 'vision_direct'`
- `result.provenance === 'vision_used'`
- `result.visionRequested === true`
- `result.screenType === 'code'`
- `result.taskDetected === 'coding_interview'`
- OCR fallback `visibleText` still includes the coding-prompt evidence.
- When `providerPolicy.visionAvailable === false`, SUS falls back to OCR
  *with a warning* (`provenance === 'screenshot_ignored_no_vision'`) — it
  does **not** silently lie about vision having run.
- The live What-to-Say prompt includes `screen_direct_vision_instruction`.
- Attached image paths are preserved into `streamChat`.
- Local / text-only non-vision models refuse image input without calling
  `streamChat`.

## What is not yet proven

- No real multimodal provider was called by the deterministic tests.
- No real LeetCode / IDE screenshot was captured in Electron in this pass.
- The opt-in live Electron E2E harness exists but is gated by
  `ELECTRON_E2E_SCREEN=1` and was not run here.
- `IntelligenceEngine` and the IPC handlers (`generate-what-to-say`,
  `generate-code-hint`) still bypass `ScreenUnderstandingService` — so the
  Technical Interview direct-vision routing decision exists at the service
  level but does not yet drive the live answer pipeline.
- `VisionScreenAnalyzer.callVisionProvider` calls
  `LLMHelper.streamChat({ imagePaths })`, but `LLMHelper.streamChat` does
  not accept `imagePaths`. Real vision answers must continue to flow through
  `LLMHelper.chatWithGemini` / `extractProblemFromImages` until that's
  reconciled.

## Verdict

Routing decision and prompt-assembly path are implemented and tested. The
product should **not** yet claim live Technical Interview direct-vision
parity in production until the IntelligenceEngine wiring and the Provider
integration are complete.
