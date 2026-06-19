# Screen OCR Test Results

Last updated: 2026-05-16.

## Status: real Tesseract OCR is now in the service-test suite

Service-level OCR is now proven against **real PNG fixtures** by
`electron/services/__tests__/OcrRealFixtures.test.mjs`. The renderer-layer
UI affordances called out below remain unfinished.

## What runs today (passing in this pass)

| Test | What it proves | Result |
|------|----------------|--------|
| `OcrRealFixtures.test.mjs` (6 tests) | `OcrProviderManager.recognize()` runs the live `tesseract.js` engine; recovered text contains expected words; timeout path rejects; missing-file path rejects. | PASS (latencies p50 ~180–290 ms / fixture) |
| `ScreenUnderstandingMode.test.mjs` (13 tests) | Routing for `auto / vision_only / ocr_only / private`. OCR is never called in `vision_only`; vision is never requested in `ocr_only`; cloud vision is never requested in `private`; `allowScreenshots:false` blocks every path. | PASS |
| `ScreenUnderstandingService.test.mjs` (4 tests) | Hash cache reuse, invalid-path rejection, table/error extraction, technical direct-vision routing. | PASS |
| `ScreenContextService.test.mjs` (7 tests) | Provider-manager interface, cache isolation, cache-hit path safety. | PASS |
| `ImagePathValidation.test.mjs` (6 tests) | IPC answer / code-hint / brainstorm image-path validation, malformed payload rejection. | PASS |
| `suggestionPromptAssembly.test.mjs` (12 tests) | Direct image-input instruction, non-vision model refusal, prompt trust boundary. | PASS |

## What is not proven

- **Live Electron capture → OCR.** No Playwright spec captures via
  `ScreenshotHelper`, validates the path, and runs OCR.
- **Real provider-backed answer chain.** `generate-what-to-say` and
  `generate-code-hint` still call `ScreenContextService` directly, not
  `ScreenUnderstandingService` — so `screenUnderstandingMode` does not
  influence the live answer pipeline yet.
- **Native OCR adapters.** Apple Vision and Windows OCR are stubs; all macOS
  OCR currently lands on Tesseract.
- **`npm run test:e2e:screen-understanding`.** The script exists but runs a
  Node-only harness against the AnswerCue API, not the Electron app.

## How to reproduce

```bash
npm run build:electron
node --test electron/services/__tests__/OcrRealFixtures.test.mjs
node --test electron/services/__tests__/ScreenUnderstandingMode.test.mjs
```

Fixtures are generated on first run by
`tests/fixtures/screen/generateOcrFixtures.mjs` and live in
`tests/fixtures/screen/` — they are **not** committed as binaries.

## Verdict

Screen / OCR is **proven at the service layer with real Tesseract**. The
live in-app integration into `IntelligenceEngine` / IPC handlers and the
renderer-side status affordances are still **pending**. See the addendum
in `docs/engineering/SCREEN_UNDERSTANDING_IMPLEMENTATION_REPORT.md` for the
honest delta between what's shipped and what's still aspirational.
