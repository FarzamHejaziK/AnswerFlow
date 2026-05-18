# Current Screen-Analysis Behavior

**Audit date:** 2026-05-15
**Commit:** `43ae233d7148`
**Method:** read the entire chain end-to-end; supplemented by a runtime probe
of `validateImagePath` (output captured in
[`SCREENSHOT_ANALYSIS_SECURITY_AUDIT.md`](./SCREENSHOT_ANALYSIS_SECURITY_AUDIT.md)).

---

## 1. Is traditional OCR used?

**Answer: yes — but only on one path.**

Evidence:
- `electron/services/screen/ScreenContextService.ts:117-134` —
  ```
  private async runOCR(imagePath: string): Promise<string> {
      const Tesseract = await import('tesseract.js');
      …
      const result = await Tesseract.recognize(imagePath, 'eng', { logger: … });
      return result.data.text.trim();
  }
  ```
- `package.json:242` declares `"tesseract.js": "^5.0.5"`.
- It is invoked from exactly one runtime site:
  `electron/ipcHandlers.ts:2553-2557` — inside the `generate-what-to-say`
  handler, only when the renderer passes `imagePaths`.
- Tests `electron/services/__tests__/ScreenContextService.test.mjs` (6 tests)
  cover cache behavior, but **stub out `runOCR`**, so real Tesseract correctness
  is never exercised in CI.
- `electron/services/__tests__/IntelligenceEngineScreenContext.test.mjs:39-73`
  proves the `runWhatShouldISay → WhatToAnswerLLM → PromptAssembler` chain
  preserves `screenContext` and `imagePaths` together.

Runtime path: 4 (screenshot → vision OCR extraction → structured context →
final LLM) — but only when `imagePaths` is supplied to `generate-what-to-say`,
which is gated by the validation bug below.

## 2. Is vision LLM used to extract OCR?

**Answer: no.**

Evidence:
- The only OCR engine called by name in production code is `tesseract.js`
  (`ScreenContextService.ts:118`).
- `LLMHelper.extractProblemFromImages` (`LLMHelper.ts:782-794`) and
  `LLMHelper.analyzeImageFiles` (`LLMHelper.ts:945-952`) call
  `generateWithVisionFallback` with the raw image and a generic
  "describe this image" prompt; **they do not return structured OCR text** —
  they return the model's free-form answer.
- `generateRollingScript` (`LLMHelper.ts:820-858`) emits a structured JSON
  "interview script" from a screenshot but is **referenced by zero IPC
  handlers** — orphaned code path.

## 3. Is the screenshot sent directly to the answer model?

**Answer: yes.**

Evidence:
- `IntelligenceEngine.runWhatShouldISay` forwards `imagePaths` into
  `whatToAnswerLLM.generateStream(..., imagePaths, screenContext, …)`
  (`IntelligenceEngine.ts:614`).
- `WhatToAnswerLLM.generateStream` forwards them into
  `llmHelper.streamChat(packet.userMessage, imagePaths, ...)`
  (`WhatToAnswerLLM.ts:163`).
- `LLMHelper.streamChat` dispatches to provider-specific multimodal builders
  (e.g. `streamWithOpenaiMultimodal` `LLMHelper.ts:2519`,
  `streamWithClaudeMultimodal` `:2526`, `streamWithNatively` `:2513`,
  `callOllama` with `imagePaths?.[0]` `:2484`).
- For `runCodeHint` and `runBrainstorm`, `imagePaths` are forwarded the same
  way **but without** a `screenContext` — so it is image-only, not
  image-plus-OCR.

## 4. Is structured screen context generated?

**Answer: partial.**

Evidence:
- The `ScreenContext` shape (`ScreenContextService.ts:7-13`):
  ```ts
  interface ScreenContext {
    ocrText: string;
    imagePath: string;
    activeWindowTitle?: string;   // declared but never populated
    timestamp: number;
    hash: string;
  }
  ```
- There is **no structured extraction** of code blocks, error messages,
  tables, or the active window title. The OCR result is a single
  unstructured string.
- `activeWindowTitle` is declared as optional but **never set anywhere** in
  the codebase (grep yields zero assignments).
- `PromptAssembler.buildScreenContextBlock` (`PromptAssembler.ts:263-287`)
  wraps the OCR string in an XML envelope; it does not parse code/tables.

## 5. What is the real pipeline today?

The product is **option 5: partial — multiple paths**.

| Trigger | Pipeline | Status |
|---|---|---|
| "What should I say" with attachment | Screenshot → Tesseract OCR (cached) → `<screen_context>` block + raw image to LLM | **wired but blocked by validateImagePath bug on macOS** |
| "Code hint" / "Brainstorm" with attachment or queue | Screenshot → raw image to LLM (no OCR, no screen-context block) | works on queue fallback; renderer-supplied paths blocked by same validation bug |
| `general:capture-and-process` shortcut | Screenshot → Gemini chat with "analyze this image" prompt | works; uses the standalone `gemini-chat-stream` IPC, **does not touch `ScreenContextService`** |
| Dynamic action "Answer from screen" | Adds promptInstruction text only; **no screenshot, no OCR** | label is misleading; chip claims to read the screen but no screen capture happens |

**Bottom line:** Tesseract OCR + structured screen-context block exists and is
wired into the highest-trust answer path, but a `/Users/` prefix bug in
`validateImagePath` (see Phase 3 audit) silently breaks it on macOS whenever
the user attaches a screenshot from the renderer. The fallback paths (Code
Hint / Brainstorm via the screenshot queue) skip OCR entirely and send the raw
image to a vision LLM, which is a strictly weaker pipeline.
