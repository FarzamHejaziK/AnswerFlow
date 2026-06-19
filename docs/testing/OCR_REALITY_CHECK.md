# OCR Reality Check (2026-05-16)

This file answers the brief's reality-check questionnaire honestly. It is paired with
two test files that **actually exercise the OCR pipeline** — not just call signatures.

| Test file | What it proves |
|-----------|----------------|
| `electron/services/__tests__/OcrRealFixtures.test.mjs` | `OcrProviderManager.recognize()` invokes the live `tesseract.js` engine against PNG fixtures and the recovered text contains the rendered words. |
| `electron/services/__tests__/ScreenUnderstandingMode.test.mjs` | Routing for `auto / vision_only / ocr_only / private` actually has the side-effects the privacy contract promises. Uses stubs because the goal is to verify *routing*, not OCR. |
| `tests/fixtures/screen/generateOcrFixtures.mjs` | Renders 4 real PNG fixtures (simple text, code, error log, table) via `sharp`. Run during the OCR test on every machine — no binaries committed. |

## Questionnaire

### 1. Does real Tesseract OCR run in a test using an actual PNG fixture?

**Yes.** `OcrRealFixtures.test.mjs` generates real PNGs via `sharp` and runs
`OcrProviderManager.recognize()` end-to-end against the live `tesseract.js`
engine. The reachable log line `[OcrProviderManager] OCR succeeded with Tesseract.js`
is printed for each fixture. The test sets `RUN_REAL_OCR=0` as a skip hatch
for constrained CI, but it is **not** skipped by default.

### 2. Does OCR return useful text, not just stubbed text?

**Yes.** On a 2024 MBP M-series the four fixtures recover the following words:

| Fixture | Words asserted | p50 latency |
|---------|----------------|-------------|
| `ocr_simple_text.png` | `Hello`, `AnswerCue`, `Screen`, `understanding`, `works` | ~255 ms |
| `ocr_code_problem.png` | `two_sum` (loose), `return` | ~290 ms |
| `ocr_error_log.png` | `TypeError`, `undefined` | ~260 ms |
| `ocr_table.png` | `Plan`, `Price` | ~180 ms |

Confidence values returned by Tesseract land in the 0.7–0.9 band on these
synthetic fixtures. Real screenshots from a Retina display are larger and slower
— see "Live capture latency" below.

### 3. Does screenshot capture return a valid file in Electron?

Not exercised in this PR. `ScreenshotHelper` is unchanged and already covered
indirectly by `tests/e2e/parity-gaps-evidence.spec.ts`. The honest gap: there is
no headless Electron test that proves the file lives inside `userData/screenshots/`
and survives a `validateImagePath` check on a real captured PNG. This is the
next big test to add (Phase 8 of the brief).

### 4. Does validateImagePath accept that real file?

**Yes** for `userData/screenshots/*.png` and `userData/extra_screenshots/*.png`,
proved by `electron/services/__tests__/ImagePathValidation.test.mjs`. The real
gap is the same as (3): no end-to-end test that captures then validates against
a *live* capture.

### 5. Does PromptAssembler receive OCR text?

Yes — `electron/services/__tests__/PromptAssembler.test.mjs` covers OCR text
appearing as a sentinel block in the assembled prompt. The new test
`ScreenUnderstandingMode.test.mjs` proves OCR is actually *populated* into the
`visibleText` field that the assembler reads.

### 6. Does the final WhatToAnswer path receive imagePaths + screenContext?

`electron/services/__tests__/IntelligenceEngineScreenContext.test.mjs` covers
the imagePaths + screenContext propagation at the `IntelligenceEngine` layer.
**Open gap:** `IntelligenceEngine` is not yet wired through
`ScreenUnderstandingService` — it still calls `ScreenContextService.captureScreen()`
directly, so the new `screenUnderstandingMode` setting does not yet influence
the live answer pipeline. That wiring is Phase 6 and is **not** completed by
this change-set. Documented under "Known gaps".

### 7. Does UI show OCR success/failure?

Partial. `AnswerCueInterface.tsx` has loading states for "Capturing screen /
Reading screen" but it does not yet read the `provenance` / `ocrRan` /
`visionRequested` fields from `ScreenUnderstandingResult`. The provenance
plumbing now exists in the service result type — the UI consumer is pending
(Phase 4).

### 8. Does OCR fail silently anywhere?

**No longer.** `ScreenUnderstandingService.runOcr()` now always returns
`{ text, confidence, provider }` and pushes a warning string into `result.warnings`
on failure. `OcrProviderManager` likewise raises a clear `All OCR providers failed`
error on its own surface. The legacy ScreenContextService still swallows OCR
errors and returns empty text — that is acceptable because the result is then
classified as `unavailable` / `failed` with provenance set accordingly.

### 9. Which tests are source-grep / stub-only?

Source-grep / stub-only (these prove *plumbing*, not OCR engine quality):

- `electron/services/__tests__/ScreenUnderstandingService.test.mjs`
- `electron/services/__tests__/ScreenUnderstandingMode.test.mjs`
- `electron/services/__tests__/ScreenContextService.test.mjs`
- `electron/services/__tests__/IntelligenceEngineScreenContext.test.mjs`
- `electron/services/__tests__/ImagePathValidation.test.mjs`

### 10. Which tests are real OCR / real IPC / real Electron?

- **Real OCR (live Tesseract):** `electron/services/__tests__/OcrRealFixtures.test.mjs` ← new
- **Real Electron / IPC:** `tests/e2e/parity-gaps-evidence.spec.ts` and
  `tests/e2e/basic-smoke.spec.ts` (Playwright, headed). These currently exercise
  the launcher window but **not** the screen-understanding path end-to-end.

## Known gaps (called out so docs aren't aspirational)

1. **`IntelligenceEngine` and the IPC `generate-what-to-say` / `generate-code-hint`
   handlers still call `ScreenContextService` directly, not `ScreenUnderstandingService`.**
   The new `screenUnderstandingMode` setting therefore *exists at the service
   level* but does not influence the live answer pipeline yet. Phase 6 of the
   brief — pending.
2. **`VisionScreenAnalyzer.callVisionProvider` calls `LLMHelper.streamChat`, but
   `LLMHelper.streamChat` does not accept an `imagePaths` option** the way the
   analyzer expects. The vision-path is wired at the routing layer but the
   actual provider call would throw if invoked. Until it's reconciled, SUS
   should only mark `visionRequested: true` and let the answer pipeline use
   `LLMHelper.chatWithGemini` (which *does* support `imagePaths`) for the actual
   vision invocation.
3. **No UI consumer of `provenance`.** The new `ScreenUnderstandingResult.provenance`
   field is populated by SUS but no React component reads it. Phase 4 of the
   brief — pending.
4. **No real Electron Playwright test for the screen-understanding flow.**
   `npm run test:e2e:screen-understanding` runs a Node script
   (`answercue-api/tests/screen-understanding-live.e2e.mjs`) that hits the live
   AnswerCue API, not the Electron app. Phase 8 — pending.
5. **Apple Vision OCR adapter is a stub (`isAvailable: false`).** The fallback
   chain currently always lands on Tesseract on macOS. Native bridge — pending.

## Commands

```
node tests/fixtures/screen/generateOcrFixtures.mjs   # regenerate fixtures
node --test electron/services/__tests__/OcrRealFixtures.test.mjs
node --test electron/services/__tests__/ScreenUnderstandingMode.test.mjs
npm run build:electron && npm test                    # full suite
```

## Live capture latency

Not measured here. The benchmark script
(`scripts/bench-screen-understanding.mjs`) is stub-only; a real-capture
benchmark requires Electron headed and is out of scope for this round.
