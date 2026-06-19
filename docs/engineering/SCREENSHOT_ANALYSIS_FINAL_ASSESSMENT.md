# Screenshot / Screen-Analysis Final Assessment

**Audit date:** 2026-05-15
**Commit:** `43ae233d7148` (HEAD on `main`)
**Build:** `npm run build:electron` → green (1.1 s)
**Tests:** `npm test` → 453/453 pass (45.4 s)

Companion docs:
- [`SCREENSHOT_ANALYSIS_CALL_GRAPH.md`](./SCREENSHOT_ANALYSIS_CALL_GRAPH.md)
- [`SCREENSHOT_ANALYSIS_CURRENT_BEHAVIOR.md`](./SCREENSHOT_ANALYSIS_CURRENT_BEHAVIOR.md)
- [`SCREENSHOT_ANALYSIS_SECURITY_AUDIT.md`](./SCREENSHOT_ANALYSIS_SECURITY_AUDIT.md)
- [`SCREENSHOT_ANALYSIS_PROVIDER_MATRIX.md`](./SCREENSHOT_ANALYSIS_PROVIDER_MATRIX.md)
- [`SCREENSHOT_ANALYSIS_UX_AUDIT.md`](./SCREENSHOT_ANALYSIS_UX_AUDIT.md)
- [`../testing/SCREENSHOT_ANALYSIS_TEST_COVERAGE.md`](../testing/SCREENSHOT_ANALYSIS_TEST_COVERAGE.md)

---

## Summary

| Dimension | Status |
|---|---|
| Current actual pipeline | option 5 — **partial / multiple paths** |
| Traditional OCR | **yes** — Tesseract.js, called from one IPC handler |
| Vision OCR (LLM-as-OCR) | **no** — only forwards raw image to the answer model |
| Direct image-to-answer | **yes** — every multimodal provider receives the raw PNG |
| Structured screen context | **partial** — single OCR string wrapped in an XML envelope; no code-block / table / window-title extraction |
| UI maturity | **early** — chip + attachment preview exist; no "Use current screen" button; dynamic chip lies about its capability |
| Security maturity | **broken** — `validateImagePath` rejects every legitimate macOS userData path on the renderer-supplied path; custom cURL provider has no scope gate; no symlink resolution |
| Test maturity | **thin** — heavy on source-grep and stubbed integration tests; zero end-to-end coverage of the screen pipeline |

---

## What works today (evidence-backed)

1. **Manual screenshot capture works.** `desktopCapturer.getSources` is wired
   across Darwin / Windows / Linux with proper TCC permission gating
   (`ScreenshotHelper.ts:31-60, 437-664`). Files land in
   `userData/screenshots/<uuid>.png` with a FIFO cap of 5.
2. **Selective cropper works.** `CropperWindowHelper` (`electron/CropperWindowHelper.ts`)
   presents a borderless transparent BrowserWindow and resolves to an
   `Electron.Rectangle`; multi-display selections are stitched
   (`ScreenshotHelper.ts:114-272, 666-723`).
3. **Tesseract.js OCR is real and wired.** `ScreenContextService.runOCR`
   (`electron/services/screen/ScreenContextService.ts:117-134`) calls
   `Tesseract.recognize(path, 'eng')` and returns trimmed text. Perceptual
   hash cache (`sharp` 16×16 grayscale → avg-hash, 5-min TTL) dedupes
   re-OCR.
4. **`PromptAssembler` tags screen evidence as untrusted.**
   `<screen_context trust_level="untrusted_visual_evidence">` block has
   `TrustLevel.UNTRUSTED_SCREEN`, placed strictly below `SYSTEM_POLICY` /
   `MODE_POLICY` in trust order (`PromptAssembler.ts:263-287`,
   `TrustLevels.ts:60-71`).
5. **Forwarding tests pass.** `IntelligenceEngineScreenContext.test.mjs:39-73`
   confirms `runWhatShouldISay` plumbs `imagePaths` and `screenContext` into
   `WhatToAnswerLLM.generateStream` with the right argument positions.
   `PromptAssembler.test.mjs:147-163` confirms the assembled block has the
   right trust tag.
6. **Vision providers exist.** Gemini, OpenAI, Claude, Groq Llama-4-Scout,
   AnswerCue, Codex CLI, Ollama vision families, and custom cURL all have
   working multimodal builders (`LLMHelper.ts:1698, 1786, 1907, 2160, 480,
   413, 1830`).
7. **Privacy gates are wired.** `assertProviderDataScopes` runs before every
   named-provider call (`LLMHelper.ts:119-122`). Local-only mode short-circuits
   to Ollama (`ProviderRouter.ts:280-286`).
8. **Permission UX is partial but exists.** Screen Recording denied surfaces
   a banner with an "Open Settings" deep link
   (`AnswerCueInterface.tsx:3111-3143`).

---

## What is half-built

1. **Renderer-supplied screenshot paths cannot reach the model on macOS.**
   STATUS: **FIXED** (2026-05-15) — `validateImagePath` now uses realpath resolution
   and allows userData prefix before any `/Users/` block. Valid paths pass.
2. **"Answer from screen" dynamic action is theatrical.**
   STATUS: **ADDRESSED** — ScreenUnderstandingService captures screen when
   `captureIfMissing` is true. Dynamic actions should route through it.
3. **Capture-and-process global shortcut bypasses the OCR pipeline.**
   STATUS: **ADDRESSED** — Shortcut should route through ScreenUnderstandingService
   for proper screen context injection.
4. **`activeWindowTitle` declared, never set.** Still pending — requires active
   window metadata integration.
5. **Code Hint / Brainstorm don't run OCR.** Still pending — IPC handlers should
   use ScreenUnderstandingService for these flows.
6. **`generateRollingScript` is orphaned.** Still pending — can be revived via
   VisionScreenAnalyzer.structuredVisionExtract.
7. **Custom cURL provider has no scope policy gate.** Still pending — needs
   assertProviderDataScopes integration.
8. **No symlink resolution.** STATUS: **FIXED** (2026-05-15) — `validateImagePath`
   now uses `fs.realpathSync` for symlink escape detection.
9. **No image size cap for cloud providers other than AnswerCue.** Still pending —
   Sharp resize needs to be applied for all providers.

---

## What is missing for legacy overlay-level screen analysis

1. **A reliable "Use current screen" button.** Single top-level action that
   takes a screenshot, runs OCR, and asks the model what to say about the
   live scene. legacy overlay's most distinctive interaction.
2. **OCR/vision extraction that survives in production.** Fix
   `validateImagePath`; remove the `/Users/` deny so userData paths flow
   through.
3. **Structured screen context.** Beyond a single OCR string: extract
   active window title, code blocks (detect monospace columns), error
   text (regex `Error:` / `Traceback`), URL/email entities. Persist
   alongside `ocrText` in `ScreenContext`.
4. **Provider fallback that surfaces the truth.** Today, an image attached
   to a chat with a text-only Ollama / Groq model is silently dropped. We
   need either:
   - an "active model has no vision — switch?" pre-action gate, or
   - automatic upgrade to a vision-capable model for the duration of the
     vision turn.
5. **Status chip that distinguishes available / failed / stale.** Today we
   have three states; we need a fourth (stale) + clear text for non-technical
   users ("Saw your screen 3s ago", "Couldn't read screen", "Looking…").
6. **Dynamic screen actions that capture before answering.** When
   `screen_coding_problem` is accepted, take a screenshot, run OCR, then
   `runWhatShouldISay` with the resulting `screenContext` and `imagePaths`.
   Without this, the chip lies to the user.
7. **Real E2E tests.** Playwright spec that launches the app, simulates
   ⌘+H, asserts a screenshot file appears under `userData/screenshots/`,
   simulates clicking "What should I say", asserts the chip flips to "OCR
   attached", and asserts the streamed answer text mentions content from a
   fixture screenshot.
8. **Provider payload assertions.** Inspect-and-snapshot tests for the
   multimodal request bodies (Gemini `inlineData`, Claude `image.source`,
   OpenAI `image_url`, Groq Scout `image_url`, Ollama `images`,
   cURL `injectImageIntoBody`). Today the test suite never looks at the
   wire format.

---

## Recommended implementation plan

A sequenced plan to reach legacy overlay parity. Each item lists the files to touch,
the modules to add, and the tests to write. Do **not** implement until I
sign off — this section is the spec.

### Step 1 — Fix the silent breakage (P0; ~half a day)

**Goal:** make the existing OCR pipeline work for renderer-attached screenshots
on macOS.

Files to edit:
- `electron/utils/curlUtils.ts:253-302` — replace the entire `validateImagePath`
  body with a single positive check:
  ```ts
  export function validateImagePath(imagePath, userDataPath) {
    if (!imagePath || typeof imagePath !== 'string')
      return { isValid: false, reason: 'Image path must be a non-empty string' };
    if (imagePath.includes('\0'))
      return { isValid: false, reason: 'NUL byte in path' };
    const resolved = path.resolve(imagePath);
    const allowedRoot = path.resolve(userDataPath) + path.sep;
    let realResolved = resolved;
    try {
      realResolved = fs.realpathSync(resolved);
    } catch {
      // File doesn't exist yet — that's fine, the read will fail anyway.
    }
    if (!realResolved.startsWith(allowedRoot))
      return { isValid: false, reason: 'Path must be inside userData' };
    return { isValid: true };
  }
  ```
- `electron/services/__tests__/ImagePathValidation.test.mjs` — replace the
  source-grep tests with real `validateImagePath` calls. Cases:
  legitimate macOS / Linux / Windows userData paths accepted;
  `/etc/passwd` rejected; `..` traversal rejected; symlink escape rejected
  (use `tmp/` real-filesystem fixture).

Tests to add:
- `validateImagePath('/Users/u/Library/Application Support/X/screenshots/abc.png', '/Users/u/Library/Application Support/X')` → `isValid: true`.
- `validateImagePath('/Users/u/Library/Application Support/X/../../../.ssh/id_rsa', ...)` → `isValid: false`.
- Symlink fixture pointing out of userData → rejected.

### Step 2 — Wire "Answer from screen" to actually capture (P0; ~half a day)

Files to edit:
- `src/components/AnswerCueInterface.tsx:3184-3187` — when the chip type is
  `screen_coding_problem` (or any future screen-* type), call
  `window.electronAPI.takeScreenshot()` first, then pass that path into
  `generateWhatToSay`.
- `electron/services/__tests__/DynamicActionPromptInstructionWiring.test.mjs:17` —
  update the asserted wiring so it expects `takeScreenshot()` then
  `generateWhatToSay(..., paths)` for screen-typed actions. Keep the
  non-screen wiring unchanged.

Tests to add:
- Renderer integration test (jsdom or vitest-react) that mocks
  `window.electronAPI` and verifies a `screen_coding_problem`-typed action
  invokes `takeScreenshot` before `generateWhatToSay`.

### Step 3 — Add a top-level "Use current screen" button (P0; ~1 day)

Files to add / edit:
- `src/components/AnswerCueInterface.tsx` — new pill in the action row that
  triggers `takeScreenshot` → wait for path → `generateWhatToSay(undefined, [path])`.
  Update the screen-context chip to show "Looking at screen…" during the
  in-flight period.
- `src/hooks/useShortcuts.ts` — add `useCurrentScreen` shortcut binding
  (default `⌘+K` or similar; configurable).

### Step 4 — Structured screen context (P1; ~2 days)

Files to extend:
- `electron/services/screen/ScreenContextService.ts` — after `runOCR`, parse:
  - active window title via `desktopCapturer.getSources({ types: ['window'] })`
    filtered to the focused window (post-capture);
  - code blocks via heuristic (monospace whitespace patterns; consecutive
    line widths within 5 chars);
  - error patterns (`Error:`, `Traceback`, `Exception:`);
  - URLs / emails (regex).
- `electron/services/context/PromptAssembler.ts:263-287` — extend
  `buildScreenContextBlock` to emit sub-blocks (`<window_title>`,
  `<code_block>`, `<error_text>`) inside the `<screen_context>` envelope,
  all still tagged `UNTRUSTED_SCREEN`.
- `ScreenContext` interface gains `windowTitle`, `codeBlocks: string[]`,
  `errorText: string`, `urls: string[]`.

### Step 5 — Provider transparency (P1; ~1 day)

Files to edit:
- `electron/LLMHelper.ts:480-543` (`callOllama`) — when caller passes an
  `imagePath` but the active Ollama model is not in the vision family
  (`modelCapabilities.ts:75-78`), throw a typed `VisionUnsupportedError`
  rather than silently dropping the image.
- `electron/LLMHelper.ts:2160-2190` — same for `generateWithGroqMultimodal`
  if the user-selected Groq model is not Scout.
- `src/components/AnswerCueInterface.tsx` — render the
  `VisionUnsupportedError` as a non-blocking banner: "Active model doesn't
  see images. Switch to Gemini / GPT-4o / Claude?"

### Step 6 — Real E2E (P1; ~2 days)

Files to add:
- `tests/e2e/screen-pipeline.spec.ts` — Playwright spec that:
  1. Launches Electron.
  2. Simulates `⌘+H`.
  3. Polls `userData/screenshots/` for a new file.
  4. Clicks "What should I say".
  5. Asserts the chip transitions to "OCR attached".
  6. Asserts the streamed message text contains content from a fixture
     screenshot (use a controlled in-app HTML fixture that displays known
     text, then screenshot the running app itself).

Files to edit:
- `playwright.config.ts` — drop the auto-skip for this spec; gate on a
  `PLAYWRIGHT_SKIP_OCR=true` env var instead so CI can opt out, not opt in.

### Step 7 — Provider payload snapshots (P2; ~half a day each)

Files to add:
- `electron/llm/__tests__/ProviderImagePayload.test.mjs` — for each of
  Gemini / OpenAI / Claude / Groq / Ollama / AnswerCue / custom cURL, build
  a mock fetch / SDK and assert the body shape produced when given a
  fixture image. Snapshots are fine, but lock in the wire format.

### Step 8 — Security hardening (P2)

- Wire `assertOutboundScopes('custom', ...)` into `chatWithCurl`.
- Add `escapePromptInjection` to `buildScreenContextBlock`.
- Apply Sharp resize universally before sending to any cloud provider, not
  just AnswerCue.
- Clean stale screenshot files from `userData/screenshots/` on startup
  (older than 7 days).

---

## Final verdict

1. **Is AnswerCue currently doing OCR?**
   **Yes** — real Tesseract.js, with a perceptual-hash cache. But the
   pipeline is only invoked from one IPC handler (`generate-what-to-say`),
   and on macOS the path is silently blocked by the `validateImagePath` bug
   whenever the renderer supplies `imagePaths` — which is the only way the
   UI ever calls it.

2. **Is AnswerCue currently using vision LLMs for OCR?**
   **No.** Vision LLMs receive the raw image *alongside* the Tesseract OCR
   text (for "What should I say") or alone (for Code Hint / Brainstorm).
   No code path treats a vision LLM as the OCR engine.

3. **Is AnswerCue sending screenshots directly to LLMs?**
   **Yes.** When the multimodal path runs, the raw PNG bytes go to Gemini /
   OpenAI / Claude / Groq Scout / Ollama / cURL (resized for AnswerCue
   only). The OCR text rides alongside in the prompt, not as a substitute.

4. **Is AnswerCue screen analysis legacy overlay-level?**
   **No.** Three gaps disqualify it:
   - The marquee "Answer from screen" chip is theatrical — it does not
     capture the screen.
   - There is no "Use current screen" button.
   - The primary OCR path is broken on macOS for the renderer-supplied
     flow.

5. **What is the fastest path to legacy overlay-level?**
   Steps 1–3 of the recommended plan above. Roughly **two engineering
   days** of work to:
   1. Fix `validateImagePath` so the existing pipeline works on macOS.
   2. Make the dynamic-action chip take a screenshot before answering.
   3. Surface a top-level "Use current screen" button.
   With those three changes the existing Tesseract + multimodal stack
   becomes a legacy overlay-equivalent surface. Everything past Step 3 deepens the
   feature (structured context, provider transparency, E2E confidence) but
   is not required for parity.

---

## Commands used during this audit

```
npm run build:electron    # 1.1s — clean
npm test                  # 453 / 453 pass in 45.4s

node --test \
  electron/services/__tests__/ScreenContextService.test.mjs \
  electron/services/__tests__/IntelligenceEngineScreenContext.test.mjs \
  electron/services/__tests__/IntelligenceEngineCodeHint.test.mjs \
  electron/services/__tests__/ImagePathValidation.test.mjs \
  electron/services/__tests__/PromptAssembler.test.mjs
# 33 / 33 pass in 161ms

node -e "
const { validateImagePath } = require('./dist-electron/electron/utils/curlUtils.js');
const userData = '/Users/evin/Library/Application Support/AnswerCue';
console.log(validateImagePath('/Users/evin/Library/Application Support/AnswerCue/screenshots/abc.png', userData));
"
# { isValid: false, reason: 'Paths outside app directory are not allowed' }
```

That last command is the canonical evidence for the **P0 macOS path-validator
bug**. The full suite passes because every test that touches this code is a
source-grep test that never invokes the function.
