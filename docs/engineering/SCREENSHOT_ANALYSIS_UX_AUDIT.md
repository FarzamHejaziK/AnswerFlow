# Screen-Analysis UI / UX Audit

**Audit date:** 2026-05-15
**Commit:** `43ae233d7148`
**Surface inspected:** `src/components/NativelyInterface.tsx`,
`src/components/Queue/`, `src/_pages/`, `src/hooks/useShortcuts.ts`,
`src/components/SettingsOverlay.tsx`, `src/components/SettingsPopup.tsx`.

---

## 1. Is there a visible "Use current screen" button?

**No.** Grep across `src/` returns zero matches for "Use current screen",
"Use Screen", `useScreen`, `UseScreen`, `currentScreen`. The user can:

- Take a screenshot manually (`⌘+H` / tray menu) and *then* press an action
  button — that screenshot becomes the attachment.
- Take a selective screenshot via the cropper (`⌘+Shift+H`).
- Trigger `general:capture-and-process` (global shortcut, configurable) which
  is a one-shot capture-then-ask flow but **routes through Gemini chat**, not
  the OCR-aware `What should I say` path.

There is **no UI affordance** that says "look at my current screen and answer
the live question" without a prior screenshot step.

## 2. Is there a screen status chip?

**Yes — partial.**

`NativelyInterface.tsx:3101-3104` renders a `Monitor`-icon pill with four states:

| `screenContextStatus` | Visible label | Color tone |
|---|---|---|
| `not_available` (default) | "No screen context" | neutral |
| `available` | "OCR attached" | ok (green) |
| `failed` | "OCR unavailable" | warn (yellow) |
| `attachedContext.length > 0` | "N screen context" | neutral |

Tooltip text explains the state ("Attached screenshots will be OCR processed
and sent as untrusted screen context when you send this turn"). Good. But
**`screenContextStatus` is only set when `What should I say` returns** —
Code Hint / Brainstorm don't update it, so a code-hint flow with an
attachment always shows "No screen context" after firing.

## 3. Does the user know whether OCR/vision ran?

**Partial.**

- The chip tells the user OCR ran for "What should I say". `Code Hint` and
  `Brainstorm` do **not** report OCR (because they don't run it).
- There is no visible indicator that the model is processing the **image
  bytes** (multimodal) versus text-only. If the active provider is Groq
  llama-3.3-70b (text only) the image is silently dropped — no warning to
  the user.

## 4. Does the user know whether screen context was used in an answer?

**No.** The chip shows "OCR attached" if OCR succeeded, but the answer body
itself contains no provenance markers ("based on what's on your screen…").
The `<screen_context>` block is purely backend evidence.

## 5. Does the user get permission help if screen capture fails?

**Yes — for one error class.**

`NativelyInterface.tsx:3111-3143` shows a Screen Recording warning banner
with an "Open Settings" button that deep-links to
`x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture`.

But this banner is fed from the **audio** warning state (`systemAudioWarning`)
— the warning label reads "Screen Recording Permission Denied" yet the
trigger is wired to a system-audio failure pathway. There is **no dedicated
banner** for screenshot-permission failures emitted by
`assertScreenRecordingPermission` (`ScreenshotHelper.ts:31`). Those errors
bubble up as console errors and a generic system message in chat.

## 6. Does the user get fallback behavior if model has no vision?

**Partial.**

- `LLMHelper.streamChat` falls back through the multimodal provider list
  defined in `ProviderRouter.routeLLMProviders({ multimodal: true })` and the
  outer text-only list when image-aware providers fail. The image is included
  in the request to whichever provider runs.
- For Ollama with a text-only model, `callOllama` silently sets
  `images: undefined` and drops the screenshot. **No banner, no chip
  warning** — the user has no idea their attached screenshot was ignored.

## 7. Does dynamic action suggest "solve visible problem"?

**Yes — but it does nothing screen-related.**

`DynamicActionDetector.ts:273-278` declares a trigger:
```ts
{
  type: 'screen_coding_problem',
  patterns: [/\b(screen|visible|shown|popup|error message|output|on screen)\b/i],
  label: 'Answer from screen',
  promptInstruction:
    'You are in Technical Interview mode. A coding problem is visible on
     the screen. Read the visible problem carefully and provide a solution.',
}
```

When this chip surfaces in `DynamicActionBar` and the user accepts it:
- `NativelyInterface.tsx:3185` calls
  `handleWhatToSay(action.promptInstruction)`.
- `handleWhatToSay` runs **without any attached screenshot** (it consults
  `attachedContext`, which is empty unless the user already took one).
- The IPC handler `generate-what-to-say` takes the no-imagePaths branch and
  never calls `ScreenContextService`.
- The prompt now contains "a coding problem is visible on the screen" but
  the model has no screen evidence — pure hallucination bait.

This is the highest-impact UX gap: the chip claims a capability the system
does not provide.

## 8. Is screen context stale / available / unavailable shown?

**Partial.**

- `available` / `failed` / `not_available` are surfaced (see #2).
- `stale` is **not** distinguished. A screenshot taken 30 minutes ago looks
  identical in the UI to one taken 3 seconds ago. The
  `ScreenContext.timestamp` field is computed but never compared against
  "now" in the renderer.

## 9. Is this understandable to non-technical users?

**Mixed.**

- The chip wording "OCR attached" / "OCR unavailable" assumes the user
  knows what OCR is. Cluely uses "Reading your screen" / "Couldn't read
  screen" — friendlier.
- The action verbs are abstract: "What should I say", "Code Hint",
  "Brainstorm". None of them say "look at the screen". The cluely-style
  prompt "Solve what I'm looking at" doesn't exist.
- The screenshot preview in the attachment area
  (`NativelyInterface.tsx:3311-3329`) does communicate "yes, the AI will
  see this", but only once you have already taken a screenshot manually.

---

## UI gap list

| # | Severity | Gap | Suggested fix |
|---|---|---|---|
| 1 | **P0** | "Answer from screen" dynamic chip does not capture the screen | When the chip is accepted, call `take-screenshot` first, then pass that path into `generateWhatToSay` |
| 2 | **P0** | No visible "Use current screen" button | Add a top-level pill or icon button (icon: `Monitor`) that runs `take-screenshot` then `generateWhatToSay` with the resulting path |
| 3 | P1 | Code Hint / Brainstorm don't update `screenContextStatus` | Surface OCR status (even when skipped) so the user understands which features used OCR |
| 4 | P1 | Wrong-display capture is invisible (silently uses primary) | When `display_id` lookup falls back, emit a "Captured: <display name>" toast |
| 5 | P1 | Provider has no vision → image dropped silently | Disable / dim the screenshot attach button + show "Active model doesn't support images — switch model" toast when a vision-incapable provider is active |
| 6 | P1 | Screen-permission denied has no dedicated banner | Wire `assertScreenRecordingPermission` errors to a dedicated `screen-permission-denied` IPC event with its own banner |
| 7 | P2 | "OCR attached" is jargon | Replace with "Screen text read ✓" / "Couldn't read screen" |
| 8 | P2 | No staleness indicator | Show `${ageMinutes}m ago` under the attachment preview, color it amber if > 5 minutes |
| 9 | P2 | No provenance in the answer body | When `screenContextStatus === 'available'`, prepend or annotate the AI message with a tiny "Saw your screen" badge |
| 10 | P3 | Capture-and-process shortcut uses Gemini chat, not the OCR-aware pipeline | Re-route it through `generate-what-to-say` so it reuses the same `<screen_context>` block |
