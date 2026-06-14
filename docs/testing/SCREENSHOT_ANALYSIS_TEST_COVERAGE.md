# Screenshot / Screen-Context / OCR / Vision Pipeline — Test Coverage Audit

Date: 2026-05-15
Commit on disk: `43ae233d7148` (HEAD on `main`)
Auditor scope: read-only; no source or test files modified.

This document audits what is actually proven by the test suite for the
"screen capture → OCR → screen context → vision LLM" pipeline. It is
deliberately brutal about *what every test does NOT prove*, because a
green CI on this pipeline today does **not** mean the path works end to
end on a real user machine.

---

## 1. Coverage Table

Legend:
- Covered: real behaviour exercised against compiled code
- Source-grep only: test only `fs.readFileSync` + regex over source strings
- Stubbed only: real module is loaded but a critical dependency (LLM, OCR, hash) is replaced by an in-test fake
- Not covered: no test touches this behaviour

| # | Behavior | Covered? | Test file | What it proves | What it does NOT prove |
|---|---|---|---|---|---|
| 1 | safe screenshot path accepted by validator | Not covered (no unit test calls `validateImagePath` directly) | `electron/services/__tests__/ImagePathValidation.test.mjs` | (grep test only — see #3) | That a path like `<userData>/screenshots/abc.png` returns `{ isValid: true }`. No test ever invokes `validateImagePath()` with a real macOS userData path. |
| 2 | unsafe path rejected (traversal, /etc/passwd, Windows drive) | Source-grep only | `ImagePathValidation.test.mjs:112` | That the string `validateImagePath` (or one of several alternatives) appears in `electron/ipcHandlers.ts`. | That `validateImagePath('/etc/passwd', 'X')` actually returns `{ isValid: false }`. No call is ever made. |
| 3 | macOS userData path (`/Users/<u>/Library/Application Support/AnswerFlow/screenshots/<uuid>.png`) is accepted | **Not covered** | — | — | This is the live bug: `validateImagePath` (curlUtils.ts:272-278) returns `{ isValid: false, reason: 'Paths outside app directory are not allowed' }` for **every** macOS userData path because the `/Users/` deny check runs **before** the `startsWith(userDataPath)` allow check at line 285 — and once the deny branch returns, the screenshot allow-list at lines 291-298 is unreachable. Runtime probe (`node -e "console.log(validateImagePath('/Users/evin/Library/Application Support/AnswerFlow/screenshots/abc.png', '/Users/evin/Library/Application Support/AnswerFlow'))"`) returns `{isValid:false, reason:'Paths outside app directory are not allowed'}` — including for the canonical screenshot subfolder. **No test catches this ordering bug.** Source-grep tests can never catch it. |
| 4 | OCR text forwarded `ScreenContextService.captureScreenFromPath` → `WhatToAnswerLLM.generateStream` | Stubbed only | `IntelligenceEngineScreenContext.test.mjs:39-73` | That `runWhatShouldISay` calls `whatToAnswerLLM.generateStream(_, _, _, imagePaths, screenContext, _)` with the screen context the caller passed in. | That real Tesseract output reaches a real LLM. The `whatToAnswerLLM` is a `{ generateStream: async*() {} }` stub that yields a hardcoded string. |
| 5 | `imagePaths` preserved alongside `screenContext` | Stubbed only | `IntelligenceEngineScreenContext.test.mjs:71` | `calls[0].receivedImagePaths === imagePaths` deepEqual. | Real provider gets the bytes — `streamChat` is never called. |
| 6 | `PromptAssembler` includes screen as UNTRUSTED_SCREEN block | Covered | `PromptAssembler.test.mjs:147-163` | The compiled assembler emits a `screen_context` block tagged `TrustLevel.UNTRUSTED_SCREEN` with the wrapper string `untrusted_visual_evidence`. | That the assembled prompt is actually shipped to the LLM. The LLM call site is at `WhatToAnswerLLM.ts:163` and is not exercised. |
| 7 | non-screen path (no `imagePaths`) still produces an answer | Stubbed only | `IntelligenceEngineScreenContext.test.mjs:103-125` | That when `runWhatShouldISay` is called without `screenContext`, `generateStream` receives `undefined` and the engine still returns a string. | That a real provider answers without a vision payload. |
| 8 | vision-capable provider gets the image bytes (Gemini / OpenAI / Claude / Groq / AnswerFlow / Codex / Ollama / cURL) | **Not covered** | — | — | No test ever inspects the actual request payload to confirm Gemini gets `inlineData`, Claude gets `image.source.base64`, OpenAI gets `image_url.url=data:image/png;base64,…`, Groq gets the right multipart, etc. All such code in `LLMHelper.streamChat` is replaced by stubs in every passing test. |
| 9 | non-vision provider gracefully drops the image (Ollama text family, Groq llama-3.3-70b) | Partial — source-only | `electron/llm/CodeHintLLM.ts:20-26` yields a hard-coded "switch to a vision-capable model" message. No test verifies this branch. The `ProviderRouter.test.mjs` checks capability flags but not payload mutation. | That the path produces the documented user message. The CodeHint vision-fallback yield is not asserted by any test. |
| 10 | missing screen-recording permission produces user-actionable error | **Not covered** | — | — | `ScreenshotHelper.assertScreenRecordingPermission()` (lines 31-60) has four distinct branches (`granted` / `denied` / `restricted` / `not-determined`) with different user-facing messages. No test mocks `systemPreferences.getMediaAccessStatus` or asserts the thrown messages. |
| 11 | stale screen context (timestamp delta) handled | Partial — only cache hit | `ScreenContextService.test.mjs:99-121` | When the same hash is requested again, the timestamp is updated and OCR is not re-run. | That there is **any** "stale-context" logic at the consumer side — i.e., that an OCR result older than N seconds is suppressed before being sent to the LLM. Grep confirms no such guard exists. The cache TTL is internal (5 min) and only governs re-OCR, not whether stale OCR is forwarded. |
| 12 | `screenshot-taken` IPC event → renderer state update → attached preview | **Not covered** by Playwright | `tests/e2e/basic-smoke.spec.ts` only asserts the window loads, has a preload bridge, and renders mode names. It auto-skips in CI and when `ELECTRON_APP_PORT` is unset. No spec invokes `takeScreenshot()` or asserts the renderer receives `screenshot-taken`. | Real renderer wiring of `onScreenshotTaken` → `attachedContext` state → message preview. |
| 13 | dynamic "Answer from screen" action wires to actual screen capture | **Not covered** — bug confirmed | `IntelligenceEngineDynamicActions.test.mjs`, `DynamicActionEngine.test.mjs`, `DynamicActionPromptInstructionWiring.test.mjs` | Detection of the trigger, plumbing of `promptInstruction` from action → IPC → engine. | That accepting the action **captures the screen**. `AnswerFlowInterface.tsx:3185` calls `void handleWhatToSay(action.promptInstruction)` with **no `imagePaths` argument**. `handleWhatToSay` (line 1499-1536) only attaches images from `attachedContext` — which is empty unless the user already pressed Cmd+H. So a legacy overlay-style "Answer from screen" accept produces an answer with `screenContextStatus = 'not_available'`. **No test catches this regression.** Source-grep tests in `DynamicActionPromptInstructionWiring.test.mjs:17` even assert the broken behaviour (`handleWhatToSay(action.promptInstruction)` without imagePaths) is the expected wiring. |
| 14 | E2E click-through with a real Electron window | **Not covered** for screen path | `tests/e2e/basic-smoke.spec.ts`, `tests/e2e/parity-gaps-evidence.spec.ts` | The two Playwright specs cover: window load, preload bridge ping, modes panel render, providerDataScopes round-trip, meetingRetention round-trip, preload API surface. | Nothing exercises take-screenshot, OCR, screen-context status, dynamic-action accept, or vision-provider call. Zero E2E tests touch the screen pipeline. Both specs auto-skip unless `ELECTRON_APP_PORT` / `ELECTRON_E2E` are set, so they don't even run in CI. |
| 15 | selective screenshot via Cropper window | **Not covered** | — | — | `ScreenContextService.captureCropper` (line 55-58) and `ScreenshotHelper.takeSelectiveScreenshot` (called at line 56) are referenced only structurally (the method-exists assertion at `ScreenContextService.test.mjs:39`). No test invokes them with a rectangle or asserts the buffer. |
| 16 | multi-display selection stitched correctly | **Not covered** | — | — | `ScreenshotHelper.ts:114-` (`getDisplaysIntersectingSelection`) and the stitching logic that follows are completely untested. No test mocks `screen.getAllDisplays()` or asserts the cropped/composited output. |
| 17 | screenshot dedupe via perceptual hash cache hit | Covered (stubbed hash) | `ScreenContextService.test.mjs:79-121` | When `service.imageHashService.computeHash` is overridden to return the same hash twice, OCR runs exactly once and the second call returns the cached `imagePath`/`ocrText`. | That the real `sharp` 16x16 grayscale → average-hash implementation produces identical hashes for visually-identical screenshots. The test stubs `computeHash` itself, so the hashing code path is not exercised. |

### Additional behaviours observed but not in the original list

| # | Behavior | Covered? | Test file | What it proves |
|---|---|---|---|---|
| 18 | OCR failure inside `captureScreenFromPath` returns empty `ocrText` instead of throwing | Covered (stubbed) | `ScreenContextService.test.mjs:59-77` | When the file doesn't exist, the hash computation throws and the function either degrades or throws with `Failed to compute…`. Either branch is acceptable per the assertion. The actual Tesseract failure path (file exists, OCR throws) is never exercised. |
| 19 | Cache TTL cleanup after 5 minutes | Not covered | — | The `CACHE_TTL_MS = 5 * 60 * 1000` and `cleanupCache()` (line 139-146) are never invoked under fake timers. |
| 20 | `screenContextAvailable` metadata flag in assembled packet | Covered | `PromptAssembler.test.mjs:385-403` | The `metadata.screenContextAvailable === true` flag is set when `screenContext` is passed. Useful for analytics but does not prove the screen content reaches the LLM. |
| 21 | telemetry redacts screenshot path | Covered | `TelemetryService.test.mjs:63-75`, `RedactForLog.test.mjs:45-` | `screenshotPath` field is replaced with `[REMOVED]` in telemetry payloads. |
| 22 | screenshot queue cap = 5 (FIFO) | Source-only | — | The cap is implemented in `ScreenshotHelper` but no `.test.mjs` exercises the queue eviction. Documented in graph observations only. |
| 23 | `runCodeHint` accepts imagePaths and streams a hint | Stubbed only | `IntelligenceEngineCodeHint.test.mjs:51` | Engine plumbing and supersession behaviour. The `codeHintLLM.generateStream` is a fake that yields hardcoded strings. The vision payload is never built. |
| 24 | `runBrainstorm` accepts imagePaths fallback to screenshot queue | **Not covered** | — | The fallback at `ipcHandlers.ts:2647-2651` (use `screenshotQueue` when no explicit paths) is logic that has no dedicated test. |

---

## 2. Honest Assessment by Test Class

### 2a. Source-grep tests (string-search masquerading as coverage)

These tests **never call the functions they claim to test**. They open
the source file with `fs.readFileSync` and run a regex over the bytes.
They will keep passing if the implementation is deleted and replaced by
a comment with the right string.

| File | Why it's source-grep |
|---|---|
| `electron/services/__tests__/ImagePathValidation.test.mjs` | All 5 tests use `read('electron/ipcHandlers.ts')` and `read('electron/IntelligenceEngine.ts')` then `regex.test(handlerSource)`. **It never imports `validateImagePath`. It never calls it. It never asserts that `/etc/passwd` is rejected or that a real userData path is accepted.** The bug at `curlUtils.ts:272-278` (deny `/Users/` before allow `startsWith(userDataPath)`) is invisible to this test class. |
| `electron/services/__tests__/DynamicActionPromptInstructionWiring.test.mjs` | All 3 tests `readFileSync` `AnswerFlowInterface.tsx`, `ipcHandlers.ts`, `preload.ts`, `electron.d.ts` and check that the literal string `handleWhatToSay(action.promptInstruction)` is present. **This test enforces the bug at AnswerFlowInterface.tsx:3185 — it explicitly asserts that the renderer calls `handleWhatToSay(action.promptInstruction)` with no `imagePaths`, which is what makes "Answer from screen" fail to capture the screen.** |
| `electron/services/__tests__/IntelligenceEngineSentinel.test.mjs` | (Pattern repeats — sentinel-string checks, not behavioural.) |

If you want to prove `validateImagePath` works, you must do
`const { validateImagePath } = await import('.../curlUtils.js')` and
call it with actual paths. **No such test exists.**

### 2b. Service-level unit tests (load compiled JS, exercise function)

These tests `import(pathToFileURL(path.join(root, 'dist-electron/…')))`
and call the methods. They are real, but they **depend on
`dist-electron/` being up to date**. The repo's `npm test` runs the
build first so this is reliable in CI. They cover:

- `electron/services/__tests__/ScreenContextService.test.mjs` (6 tests)
  - method-exists shape checks
  - cache hit / miss with stubbed `imageHashService` and stubbed `runOCR`
  - non-existent path graceful failure (acceptable to throw `Failed to compute`)
- `electron/services/__tests__/PromptAssembler.test.mjs` (24 tests covering full prompt assembly including `untrusted_visual_evidence` screen block, trust-level ordering, escape semantics, metadata.screenContextAvailable)
- `electron/services/__tests__/DynamicActionEngine.test.mjs` (16 tests covering trigger detection per mode, including the `screen_coding_problem` trigger phrase set, but only detection — not capture)

These prove the **service is structurally correct in isolation**. They
do not prove the **integration with Electron, Tesseract, or any LLM
provider** works.

### 2c. Stubbed integration tests

These load real compiled `IntelligenceEngine` but replace one or more
critical collaborators with in-test fakes.

| File | What is stubbed |
|---|---|
| `IntelligenceEngineScreenContext.test.mjs` | `engine.whatToAnswerLLM = { async *generateStream() { yield 'hardcoded' } }`. The real `WhatToAnswerLLM`, `PromptAssembler`, `LLMHelper.streamChat`, and every provider client are bypassed. |
| `IntelligenceEngineCodeHint.test.mjs` | `engine.codeHintLLM = { generateStream(): { [Symbol.asyncIterator]() { yield 'partial hint' } } }`. Same pattern. |
| `IntelligenceEngineDynamicActions.test.mjs` | `StubLLMHelper` with no client methods returning real instances. Tests cover *detection and event emission*, never the eventual LLM call. |

What these test class **proves**: the engine's contract with its
neighbour — arguments are forwarded in the right shape, the cooldown is
skipped in test mode, the cleanup paths run.

What they **don't prove**:
- That `LLMHelper.streamChat(packet.userMessage, imagePaths, …)` at `WhatToAnswerLLM.ts:163` produces a payload Gemini/OpenAI/Claude/Groq/Ollama/cURL will accept.
- That OCR text is actually visible to the model (no test reads the assembled `userMessage` and verifies the `<screen_context trust_level="untrusted_visual_evidence">` block is included with the OCR string).
- That image-bytes inlining vs HTTPS-URL handling vs path-on-disk is correct per provider.

### 2d. Real E2E tests (Playwright, real Electron)

| File | Coverage of the screen path |
|---|---|
| `tests/e2e/basic-smoke.spec.ts` | **Zero.** Tests: window-load, preload `ping`, modes panel render, settings overlay open/close. Auto-skips in CI and when `ELECTRON_APP_PORT` env var is unset. |
| `tests/e2e/parity-gaps-evidence.spec.ts` | **Zero.** Tests: `providerDataScopes` IPC round-trip, `meetingRetention` IPC round-trip, preload API surface (asserts `generateWhatToSay` is a function — does not invoke it). Auto-skips unless `ELECTRON_E2E=1`. |

**Number of Playwright tests that exercise screenshot → OCR → LLM
answer end to end: 0.**

The author of the existing E2E docs noted this explicitly in
`docs/testing/SCREEN_OCR_E2E_RESULTS.md` (lines 5-23): the UI affordance
work and manual scenarios were deferred to a follow-up session that has
not happened.

---

## 3. Gap List (with severity)

### P0 — would let a user-visible regression ship

1. **`validateImagePath` rejects every macOS userData path that is not a "screenshots" subfolder.** `electron/utils/curlUtils.ts:272-278` blocks `/Users/` *before* the allow at line 285 checks `startsWith(userDataPath)`. The screenshot subfolder is rescued accidentally by the "screenshots" string-match at line 291-298, but any other userData asset (manually attached image, user-uploaded reference image) cannot pass the validator. **No test calls `validateImagePath` with a real path. All five `ImagePathValidation.test.mjs` cases are source-grep.** A simple unit test importing the compiled util and calling it with `validateImagePath('/Users/u/Library/Application Support/AnswerFlow/screenshots/abc.png', '/Users/u/Library/Application Support/AnswerFlow')` would catch this. There is no such test.

2. **Dynamic action "Answer from screen" does not capture the screen.** `src/components/AnswerFlowInterface.tsx:3185` calls `void handleWhatToSay(action.promptInstruction)`. `handleWhatToSay` (line 1499-1536) uses `attachedContext` (which is empty unless Cmd+H was pressed first) and passes `dynamicPromptInstruction` but no fresh imagePaths. So the user sees an answer with `screenContextStatus = 'not_available'` even though the action label is "Answer from screen". **`DynamicActionPromptInstructionWiring.test.mjs:17` actually asserts the broken behaviour** (`assert.match(mountSource, /handleWhatToSay\(action\.promptInstruction\)/)`), so fixing the bug would require updating the test in lockstep.

3. **No E2E test exercises the real Tesseract → LLM round-trip.** The two Playwright specs skip the screen path entirely and auto-skip in CI. A single happy-path spec that:
    a. takes a screenshot via the IPC,
    b. confirms `screenshot-taken` reaches the renderer,
    c. clicks the "What should I say" action,
    d. asserts `screenContextStatus === 'available'` is reported back,
   would catch (1) and (2) above and a dozen integration regressions besides. It does not exist.

4. **Screen-recording permission denial is never tested.** `ScreenshotHelper.assertScreenRecordingPermission` has four distinct error messages (denied / restricted / not-determined / non-darwin). None are exercised by any test. A user with denied permission today receives one of these messages, but a regression in the message text or the throw point would ship unnoticed.

### P1 — provider correctness, image fidelity

5. **No test inspects any provider's actual image payload.** Gemini's `inlineData.{mimeType,data}`, Claude's `image.source.{type,media_type,data}`, OpenAI's `image_url.url=data:image/png;base64,…`, Groq's multipart form, Ollama's `images: [base64]`, the cURL/custom provider path — none are covered. A provider regression (wrong field name, wrong base64 encoding, missing MIME type) would pass every existing test.

6. **No test verifies the OCR text actually lands in the assembled `userMessage` that ships to the LLM.** `PromptAssembler.test.mjs` asserts the `screen_context` *block* exists with the right trust level. It does not assert the final `packet.userMessage` (the actual string passed to `llmHelper.streamChat`) contains the OCR text in a form the LLM will read. A future refactor that swaps the block order or strips low-trust blocks under token pressure could silently delete the screen context.

7. **Non-vision provider fallback is asserted only in CodeHintLLM source.** `CodeHintLLM.ts:20-26` yields a hardcoded "switch to a vision-capable model" sentence when `imagePaths` is set on a non-vision model. No test verifies this string is emitted, or that the equivalent fallback exists in `WhatToAnswerLLM` (it does not — `WhatToAnswerLLM` passes `imagePaths` through to `streamChat` unconditionally at line 163, so a non-vision provider may receive a payload it cannot parse).

8. **`screenContextStatus` IPC return value is never asserted end to end.** The IPC handler returns `{ answer, question, screenContextStatus, ocrTextLength }`. The renderer at `AnswerFlowInterface.tsx:1537` writes `result.screenContextStatus` to state. No test asserts the value flows correctly through the IPC boundary.

### P2 — robustness, edge cases

9. **Cropper / selective-screenshot path is untested.** `ScreenContextService.captureCropper` and `ScreenshotHelper.takeSelectiveScreenshot` have method-exists assertions only.

10. **Multi-display stitching is untested.** `getDisplaysIntersectingSelection` and the buffer composition logic in `ScreenshotHelper.ts:114-` are not exercised.

11. **Real perceptual-hash dedupe is untested.** The hash service is stubbed in every test; the real `sharp` 16x16 grayscale → average-hash path is not exercised against fixture images.

12. **OCR throw path is untested.** `captureScreenFromPath` swallows Tesseract errors at line 89-93 with `ocrText = ''`. No test injects a throwing `runOCR` and verifies the fallback runs without dropping the cache entry.

13. **5-minute cache TTL cleanup is untested.** `cleanupCache()` at line 139-146 runs but no test uses fake timers to assert eviction at `now + 5min + 1ms`.

14. **`screenshot-taken` IPC event delivery is untested.** No test (unit or E2E) asserts the renderer receives the event and updates `attachedContext`. Both Playwright specs skip this entirely.

15. **`generate-brainstorm` / `generate-code-hint` screenshot-queue fallback is untested.** The "no explicit imagePaths, use the queue" branch at `ipcHandlers.ts:2611-2613` and `2649-2651` has no dedicated test.

---

## Bottom line

The screen-capture / OCR / vision pipeline is a multi-layer feature
(Electron native → Sharp → Tesseract → PromptAssembler → LLMHelper →
provider HTTP) and the test suite is **deepest where it matters least**
(PromptAssembler trust-level ordering: 24 tests) and **shallowest where
the user-visible bugs actually live** (IPC validation, dynamic-action
wiring, provider payloads, real E2E: 0 tests of consequence).

Three of the most consequential behaviours have **negative coverage**:
the source-grep tests in `ImagePathValidation.test.mjs` give the
appearance that path validation is well-covered (and ship as 5 passing
tests in a suite of 453), while not calling the function once.
`DynamicActionPromptInstructionWiring.test.mjs:17` actively codifies
the broken "Answer from screen" wiring. Both will keep passing as
those bugs sit in production.

The 453 / 453 green CI on this commit does not contradict any of the
above; it only proves that nothing the existing tests *do* check has
regressed. It does not prove that a real user, on a real macOS box,
clicking the "Answer from screen" button, will get an answer that
actually saw their screen.
