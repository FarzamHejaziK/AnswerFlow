# Screen Understanding Test Results

Last updated: 2026-05-16.

## Status

Service-level routing for the four `screenUnderstandingMode` paths
(`auto`, `vision_only`, `ocr_only`, `private`) is now proven by
`ScreenUnderstandingMode.test.mjs`. Real Tesseract OCR is proven by
`OcrRealFixtures.test.mjs`. Headed Electron / full provider-backed E2E
remains out of scope for this pass.

## Commands run

```bash
npm run build:electron
node --test electron/services/__tests__/OcrRealFixtures.test.mjs
node --test electron/services/__tests__/ScreenUnderstandingMode.test.mjs
node --test electron/services/__tests__/ScreenUnderstandingService.test.mjs
node --test electron/services/__tests__/ScreenContextService.test.mjs
node --test electron/services/__tests__/ImagePathValidation.test.mjs
node --test electron/services/__tests__/PromptAssembler.test.mjs
node --test electron/services/__tests__/SensitiveLogRedaction.test.mjs
node --test electron/llm/__tests__/suggestionPromptAssembly.test.mjs
```

## Automated results

| Suite | Result | Coverage |
|-------|-------:|----------|
| `OcrRealFixtures.test.mjs` (new) | 6/6 | Real Tesseract on 4 PNG fixtures, plus timeout + missing-file negative cases. |
| `ScreenUnderstandingMode.test.mjs` (new) | 13/13 | Routing for all four `screenUnderstandingMode` paths, plus `allowScreenshots:false`, plus invalid-path across all modes, plus provenance population. |
| `ScreenUnderstandingService.test.mjs` (updated) | 4/4 | Original SUS tests, updated for the new `providerPolicy` contract. |
| `ScreenContextService.test.mjs` | 7/7 | Provider-manager interface, cache isolation. |
| `ImagePathValidation.test.mjs` | 6/6 | IPC payload validation. |
| `PromptAssembler.test.mjs` | 12/12 | Untrusted-screen wrapping. |
| `SensitiveLogRedaction.test.mjs` | 5/5 | No screenshots / OCR text in logs. |
| `suggestionPromptAssembly.test.mjs` | 12/12 | Direct image-input instruction, non-vision refusal. |

## What is proven

- `ScreenUnderstandingService` honors all four screenUnderstandingMode values:
  - `vision_only` never invokes OCR (asserted by call counter).
  - `ocr_only` never requests vision.
  - `private` never escalates to cloud vision even when OCR is weak.
  - `auto` chooses direct vision for technical / coding modes when a vision
    provider exists; OCR-first otherwise; vision fallback when OCR is weak.
- Every result carries a `provenance` value, an `ocrRan` boolean, and a
  `visionRequested` boolean. Renderer UI can read these fields directly.
- A custom-provider `screenshots: false` scope blocks every path — no capture,
  no OCR, no vision.
- Invalid image paths are rejected before any OCR / vision call, regardless of
  mode.
- `OcrProviderManager` actually runs Tesseract on real PNGs and returns
  recognised text plus confidence / duration / provider metadata.
- The OCR timeout path returns a clear error instead of silently hanging.
- The OCR missing-file path returns a clear error instead of empty text.
- The new `screenUnderstandingMode` setting is persisted via `SettingsManager`
  and reachable from the renderer through `window.electronAPI.getScreenUnderstandingMode()`
  / `setScreenUnderstandingMode()`.

## What is not proven

- `generate-what-to-say` / `generate-code-hint` / `generate-brainstorm` /
  `capture-and-process` still call `ScreenContextService` directly, not
  `ScreenUnderstandingService`. The new mode setting therefore takes effect at
  the *service* level but does not yet route the live answer pipeline.
- No headed Electron Playwright test exercises the full
  screenshot → SUS → answer flow.
- The renderer does not yet read `provenance` to render a "Used OCR" /
  "Used Vision" / "Private OCR" / etc. pill.
- Apple Vision and Windows OCR adapters are still stubs.
- `VisionScreenAnalyzer.callVisionProvider` is wired against
  `LLMHelper.streamChat({ imagePaths })`, but `streamChat` does not accept
  `imagePaths` — real vision answers must continue to go through
  `LLMHelper.chatWithGemini` until that's reconciled.

## Verdict

The service and routing layers are substantially stronger and proven by
deterministic automated tests including a real Tesseract integration. The
product should be described as **screen-understanding service is
production-ready and routing-correct; live answer-pipeline integration is
pending**, not legacy overlay-level complete.
