# Screenshot / Screen Analysis Call Graph

**Audit date:** 2026-05-15
**Commit:** `43ae233d7148` (HEAD on `main`)
**Build status:** `npm run build:electron` → green (1145 ms)
**Test status:** `npm test` → 453/453 pass (45.4 s)

This document traces every runtime path from a UI click / keyboard shortcut
through the Electron main process, into the LLM provider, and back to the UI.
File paths and **line numbers** below are absolute references in the committed
tree; every claim is grounded in code, not inference.

---

## Module surface

| File | Role |
|---|---|
| `electron/ScreenshotHelper.ts:400-811` | Owns the on-disk screenshot queues, takes screenshots via `desktopCapturer`, validates TCC permission |
| `electron/CropperWindowHelper.ts:1-634` | Borderless transparent BrowserWindow that lets the user select an `Electron.Rectangle` for cropping |
| `electron/services/screen/ScreenContextService.ts:1-164` | Wraps `ScreenshotHelper` and runs **Tesseract.js** OCR; computes perceptual + quick image hash; caches OCR text for 5 min |
| `electron/services/screen/ImageHashService.ts:1-71` | `sharp` 16×16 grayscale → average-hash; MD5 of first 8 KB as fallback |
| `electron/services/context/PromptAssembler.ts:263-287` | Wraps OCR text in `<screen_context trust_level="untrusted_visual_evidence">` block |
| `electron/services/context/TrustLevels.ts:28` | Declares `UNTRUSTED_SCREEN` trust level |
| `electron/llm/WhatToAnswerLLM.ts:40-205` | `generateStream(transcript, temporal, intent, imagePaths, screenContext, promptInstruction)` |
| `electron/LLMHelper.ts:1198-2526` | Per-provider multimodal dispatch (Gemini, OpenAI, Claude, Groq, Ollama, Codex CLI, AnswerFlow, custom cURL) |
| `electron/llm/ProviderRouter.ts:87-162` | `routeLLMProviders({capability:'vision', multimodal:true, …})` — six providers declared vision-capable |
| `electron/llm/modelCapabilities.ts:75-108` | `supportsImages` lookup (Ollama family regex; cloud whitelist) |
| `electron/IntelligenceEngine.ts:506-1081` | Orchestrates `runWhatShouldISay`, `runCodeHint`, `runBrainstorm` |
| `electron/ipcHandlers.ts:255-2680` | All renderer-exposed IPC channels (`take-screenshot`, `delete-screenshot`, `generate-what-to-say`, …) |
| `electron/utils/curlUtils.ts:253-302` | `validateImagePath(imagePath, userDataPath)` — **see Phase 3 for a real bug here** |

---

## Path A — Manual screenshot, then attach to the chat

```
src/hooks/useShortcuts.ts:65 ⌘+H
  → src/components/AnswerFlowInterface.tsx:2575 isShortcutPressed('takeScreenshot')
    → handlers.takeScreenshot()  (AnswerFlowInterface.tsx:2493)
      → window.electronAPI.takeScreenshot()       (preload.ts:397)
        → ipcMain.invoke "take-screenshot"        (ipcHandlers.ts:266)
          → appState.takeScreenshot()              (main.ts:3346)
            → screenshotHelper.takeScreenshot(display)   (ScreenshotHelper.ts:604)
              → captureWithDesktopCapturer(outputPath, undefined, preferred)
                                                   (ScreenshotHelper.ts:437)
                ├── assertScreenRecordingPermission()   (ScreenshotHelper.ts:31)
                ├── desktopCapturer.getSources({types:['screen']})
                └── fs.writeFile(outputPath, image.toPNG())
              → screenshotQueue.push(path) [FIFO cap MAX_SCREENSHOTS=5]
          → appState.getImagePreview(path)         (main.ts:3368 → ScreenshotHelper.ts:766)
            └── data:image/png;base64,<…>
          ← { path, preview }
        ← { path, preview }
      → setAttachedContext([...prev, {path, preview}])  (AnswerFlowInterface.tsx:1001)
```

Tray menu accelerator does the same via `globalShortcut.register` registered
in `main.ts:3492`.

Storage: `app.getPath('userData')/screenshots/<uuid>.png` (queue dir) or
`app.getPath('userData')/extra_screenshots/` (solutions view).

The path is then surfaced to the user as `attachedContext`, but **no OCR is
performed yet**.

---

## Path B — Selective screenshot via cropper

```
src/hooks/useShortcuts.ts                          ⌘+Shift+H
  → handlers.takeSelectiveScreenshot()             (AnswerFlowInterface.tsx:2505)
    → window.electronAPI.takeSelectiveScreenshot() (preload.ts:398)
      → ipcMain.invoke "take-selective-screenshot" (ipcHandlers.ts:277)
        → appState.takeSelectiveScreenshot()       (main.ts:3352)
          → cropperWindowHelper.captureSelection() (CropperWindowHelper.ts)
            └── waits for ipc 'cropper:confirmed' with Electron.Rectangle
          → screenshotHelper.takeSelectiveScreenshot(rect)
                                                   (ScreenshotHelper.ts:666)
            ├── isMultiDisplaySelection(rect)      (ScreenshotHelper.ts:277)
            │     ├─ no → captureWithDesktopCapturer(outputPath, rect)
            │     └─ yes → captureStitchedDesktopArea(outputPath, rect)
            │            └── getDisplaysIntersectingSelection → stitchImages
            └── screenshotQueue.push(selective-<uuid>.png)
        ← { path, preview }
      ← attachment to chat
```

---

## Path C — Capture-and-process (one-shot global shortcut)

This is the **only** path today that does an automatic OCR + LLM round-trip in
one user action.

```
global shortcut 'general:capture-and-process'      (main.ts:428)
  → mainWindow.webContents.send('capture-and-process', { path, preview })
                                                   (main.ts:441)
  → preload subscription onCaptureAndProcess       (preload.ts:424)
  → AnswerFlowInterface handler [implicit via attachment + manual submit flow]
    ... still uses the same Path E to actually run OCR+LLM.
```

The handler logic in `AnswerFlowInterface.tsx` lines 2003 and 2037 sends the
attachment to a Gemini chat with a hard-coded "analyze this screenshot in
context of what the user said" prompt — this goes through the
`streamGeminiChat` IPC, *not* through the OCR pipeline.

---

## Path D — "What should I say" with attached screenshot (OCR pipeline)

This is the **only** path that uses `ScreenContextService` + Tesseract OCR.

```
AnswerFlowInterface.tsx:1499  handleWhatToSay()
  └── currentAttachments = attachedContext + pendingCaptureRef
  └── window.electronAPI.generateWhatToSay(question, paths, options)
        (preload.ts:781)
    → ipcMain.invoke "generate-what-to-say"        (ipcHandlers.ts:2528)
      ├── if imagePaths?
      │     validateImagePath(p, userData)         (curlUtils.ts:253)  *** see Phase 3
      │     screenContextService.captureScreenFromPath(latestImagePath)
      │       (ipcHandlers.ts:2553-2557)
      │       → ImageHashService.computeHash(sharp 16×16 → avg-hash)
      │       → ocrCache.get(hash) [TTL 5 min] → hit/miss
      │       → Tesseract.recognize(path, 'eng')   (ScreenContextService.ts:122)
      │       → return { ocrText, imagePath, timestamp, hash }
      │     screenContextStatus = ocrText ? 'available' : 'not_available'
      │
      └── intelligenceManager.runWhatShouldISay(q, 0.8, imagePaths,
            { screenContext, promptInstruction, skipCooldown })
            (IntelligenceManager.ts:149)
        → engine.runWhatShouldISay(...)            (IntelligenceEngine.ts:506)
          ├── classifyIntent(...)
          ├── buildTemporalContext(...)
          └── whatToAnswerLLM.generateStream(
                preparedTranscript, temporal, intent,
                imagePaths,    ← raw screenshot paths
                screenContext, ← {ocrText, hash, imagePath, ts}
                promptInstruction)
              (WhatToAnswerLLM.ts:40-205)
            ├── PromptAssembler.assemble({ screenContext, transcript, … })
            │   → buildScreenContextBlock                 (PromptAssembler.ts:263)
            │     wraps OCR text in <screen_context trust_level="untrusted_visual_evidence">
            └── llmHelper.streamChat(packet.userMessage,
                                    imagePaths, ...)
                (LLMHelper.ts:streamChat → streamChatWithGemini etc.)
              → per-provider: see Path F
    ← { answer, question, screenContextStatus, ocrTextLength }
  → setScreenContextStatus(result.screenContextStatus)
       (AnswerFlowInterface.tsx:1537)
```

Net effect: **OCR text + raw image bytes are both sent** to the model. OCR text
goes in the prompt as untrusted screen evidence; image goes in the multimodal
payload (for providers that support it). For non-vision providers, only the
OCR text reaches the model.

---

## Path E — Code hint / Brainstorm (image-only, no OCR)

```
AnswerFlowInterface.tsx:1644  handleCodeHint()
  └── window.electronAPI.generateCodeHint(paths, problemStatement)
                                                   (preload.ts:783)
    → ipcMain.invoke "generate-code-hint"          (ipcHandlers.ts:2605)
      ├── resolvedImagePaths = imagePaths.length>0 ? imagePaths : screenshotQueue
      ├── if explicit imagePaths → validateImagePath(p, userData)  *** see Phase 3
      │   (queue-derived paths bypass validation — they're already trusted)
      └── intelligenceManager.runCodeHint(resolvedImagePaths, problemStatement)
        → engine.runCodeHint(imagePaths, ?)        (IntelligenceEngine.ts:1005)
          ├── question source priority:
          │    1. explicit problemStatement
          │    2. session.getDetectedCodingQuestion()
          │    3. last 180 s of transcript
          └── codeHintLLM.generateStream(imagePaths, question, source, transcript)
              → LLMHelper-based provider call (see Path F)
                **No ScreenContextService call. No OCR. Pure image-to-model.**
```

`generate-brainstorm` is identical apart from `brainstormLLM` (`ipcHandlers.ts:2643`,
`IntelligenceEngine.ts:1087`).

`Queue.tsx:289-297` also calls `generateCodeHint()` / `generateBrainstorm()`
with `undefined` so the IPC handler uses the server-side queue directly.

---

## Path F — LLM dispatch (multimodal payload)

`LLMHelper.streamChat(...)` chooses based on:
- `MULTIMODAL_REQUEST_OVERRIDE` (`process.env`)
- active provider + model id
- `ProviderRouter.routeLLMProviders({ capability:'vision', multimodal:true, …})`
- `assertProviderDataScopes(provider, ['transcript','screenshots'], policy)`
  — the scope policy gate (see `LLMHelper.ts:112-122`)

The full multimodal dispatch table is in
`SCREENSHOT_ANALYSIS_PROVIDER_MATRIX.md`. Common shape:

```
streamWithAnswerFlow       → multipart with base64-PNG (Sharp resized to ≤768px)
streamWithGeminiModel    → inline_data { mime_type, data: base64 } via google-genai
streamWithOpenaiMultimodal → message.content[].type='image_url' with data: URI
streamWithClaudeMultimodal → message.content[].type='image', source=base64
generateWithGroqMultimodal → image_url part, llama-4-scout-17b model
callOllama(prompt, path)   → messages[].images: [base64] (single image)
chatWithCurl(message, sys, imagePath?) → custom cURL body; image appended only
                                          when `multimodal=true` is configured
generateWithCodexCli     → Codex CLI via OpenAI compatibility layer
```

---

## Path G — Dynamic screen action (declared but not wired to OCR)

```
SessionTracker emits transcript turn
  → IntelligenceEngine.processTranscriptForDynamicActions()
    → DynamicActionDetector.detectTriggers({ transcript, mode })
      → trigger.type='screen_coding_problem'       (DynamicActionDetector.ts:273)
        patterns: /screen|visible|shown|popup|error message|output|on screen/i
        label: 'Answer from screen'
        promptInstruction:
          'A coding problem is visible on the screen. Read the visible
           problem carefully and provide a solution.'
  → 'dynamic-action-detected' IPC → renderer chip
  → user accepts the chip
    → window.electronAPI.acceptDynamicAction(...)
      → 'dynamic-action-accepted' IPC
        → handleWhatToSay(promptInstruction)       (AnswerFlowInterface.tsx:1499)
          → generateWhatToSay(question=undefined, paths=undefined, {promptInstruction})
```

**Critical gap:** when the user accepts an "Answer from screen" chip,
`handleWhatToSay` is called with `paths=undefined`. The IPC handler then takes
the no-imagePaths branch (`ipcHandlers.ts:2534`) and **never invokes
`ScreenContextService`**. The dynamic action whispers "the user said
'on screen'" but the model receives no screen evidence. Half-built.

---

## Storage & lifecycle of screenshot files

| File | Birthplace | Lifetime | Cleanup |
|---|---|---|---|
| `userData/screenshots/<uuid>.png` | `ScreenshotHelper.takeScreenshot` | FIFO queue cap = 5 | Auto-shift on overflow (`ScreenshotHelper.ts:622`); manual `delete-screenshot` (IPC `ipcHandlers.ts:255`); `clearQueues()` on session reset |
| `userData/screenshots/selective-<uuid>.png` | `takeSelectiveScreenshot` | Same FIFO | Same |
| `userData/extra_screenshots/<uuid>.png` | `takeScreenshot` when `view='solutions'` | FIFO cap = 5 | Same |

`delete-screenshot` IPC handler (`ipcHandlers.ts:255`) enforces
`resolved.startsWith(userDataDir + path.sep)` and rejects anything outside.

---

## Summary of trigger surfaces

| Surface | Trigger | Path | OCR? | Vision? |
|---|---|---|---|---|
| Tray menu "Take Screenshot" | mouse | A | no | no (attach only) |
| ⌘+H global shortcut | key | A | no | no |
| ⌘+Shift+H (selective) | key | B | no | no |
| `general:capture-and-process` global shortcut | key | C | no | yes (manual Gemini chat) |
| "What should I say" button (with attachment) | mouse | D | **yes (Tesseract)** | yes (if provider supports) |
| "Code hint" button | mouse | E | no | yes (raw image) |
| "Brainstorm" button | mouse | E | no | yes (raw image) |
| Dynamic action chip "Answer from screen" | mouse | G | **no — half-built** | no |
| Queue page "Solve" button (`Queue.tsx:289`) | mouse | E | no | yes (raw image, queue fallback) |
