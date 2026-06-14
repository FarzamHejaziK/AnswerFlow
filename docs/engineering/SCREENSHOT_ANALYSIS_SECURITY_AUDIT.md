# Screenshot Path Security & Privacy Audit

**Audit date:** 2026-05-15
**Commit:** `43ae233d7148`
**Method:** static review + targeted runtime probe of `validateImagePath`.

Legend for **status**: `safe` = enforced and correct; `risky` = enforced but
with a real failure mode; `broken` = the enforcement is wrong; `unclear` =
needs follow-up.

---

## 1. Can the renderer pass arbitrary image paths?

**Status: risky.**

- IPC handlers `generate-what-to-say`, `generate-code-hint`,
  `generate-brainstorm` accept `imagePaths?: string[]` from the renderer
  (`ipcHandlers.ts:2528, 2605, 2643`).
- They invoke `validateImagePath` from `electron/utils/curlUtils.ts:253` for
  every supplied path before reading from disk.

## 2. Are paths validated everywhere?

**Status: broken — and the validator itself is broken on macOS.**

I built `dist-electron` and called the validator with a typical macOS
userData path:

```
node -e "
const { validateImagePath } = require('./dist-electron/electron/utils/curlUtils.js');
const userData = '/Users/evin/Library/Application Support/AnswerFlow';
[
  '/Users/evin/Library/Application Support/AnswerFlow/screenshots/abc.png',
  '/Users/evin/Library/Application Support/AnswerFlow/extra_screenshots/sel.png',
  '/Users/evin/Desktop/screenshots/img.png',
  '/etc/passwd',
  'C:\\Users\\v\\evil.png',
].forEach(p => console.log(p, validateImagePath(p, userData)));
"
```

Output:

```
/Users/evin/Library/Application Support/AnswerFlow/screenshots/abc.png
  → { isValid: false, reason: 'Paths outside app directory are not allowed' }
/Users/evin/Library/Application Support/AnswerFlow/extra_screenshots/sel.png
  → { isValid: false, reason: 'Paths outside app directory are not allowed' }
/Users/evin/Desktop/screenshots/img.png
  → { isValid: false, reason: 'Paths outside app directory are not allowed' }
/etc/passwd
  → { isValid: false, reason: 'Paths outside app directory are not allowed' }
C:\Users\v\evil.png
  → { isValid: false, reason: 'Windows absolute paths are not allowed' }
```

The macOS-legitimate userData path is rejected.

Root cause: `curlUtils.ts:272-278`
```ts
if (normalizedPath.startsWith('/etc/') ||
    normalizedPath.startsWith('/home/') ||
    normalizedPath.startsWith('/Users/') ||
    normalizedPath.startsWith('/var/') ||
    normalizedPath.startsWith('/tmp/') && !normalizedPath.includes(userDataPath)) {
  return { isValid: false, reason: 'Paths outside app directory are not allowed' };
}
```

`/Users/` is rejected **unconditionally** — before the function reaches the
`startsWith(userDataPath)` allow-list at line 285. macOS `userData` is
`/Users/<user>/Library/Application Support/AnswerFlow`, which always starts with
`/Users/`. The allow-list is unreachable on macOS for this prefix.

The downstream user-visible effect:
- When the user takes a screenshot, attaches it, and clicks "What should I say"
  with that attachment, the IPC handler rejects the path with
  `Invalid image path: Paths outside app directory are not allowed`.
- The IPC returns `{ answer: null, screenContextStatus: 'not_available', error }`.
- The OCR pipeline never runs; the model never sees the screenshot.
- Same for explicit-path code-hint / brainstorm calls.

The fallback paths still work because they skip validation:
- `generate-code-hint` and `generate-brainstorm` fall back to
  `appState.getScreenshotQueue()` (server-side state, no renderer input) and
  call the engine without revalidating (`ipcHandlers.ts:2610-2613, 2648-2651`).

**Fix needed:**
1. Allow paths that `path.resolve(p).startsWith(path.resolve(userDataPath) + sep)`.
   This single check supersedes the brittle `/etc/`-`/home/`-`/Users/`-`/var/`
   denylist.
2. After resolution, also check for symlink escape via `fs.realpath`.
3. Reject any caller-supplied path that resolves outside `userData`; do **not**
   accept paths that happen to contain the literal "screenshots" substring
   (`curlUtils.ts:290-298`), which is a separate denylist-bypass.

## 3. Are symlinks rejected?

**Status: fixed (2026-05-15)**

- `validateImagePath` now uses `fs.realpathSync` to resolve symlinks before validation
- Symlink escape detection: if resolved path differs from original and doesn't match allowed roots, it's blocked
- Allowed roots are explicitly defined: userData, userData/screenshots, userData/extra_screenshots
- Test coverage added: symlink escape, /etc/passwd, Unix home paths, /tmp paths

## 4. Are screenshots stored only in app-owned userData?

**Status: safe.**

`ScreenshotHelper` constructs every output path via `path.join(app.getPath('userData'), 'screenshots' | 'extra_screenshots', uuidv4() + '.png')`
(`ScreenshotHelper.ts:414, 611, 634, 671`). No external paths are written.

## 5. Are screenshot files cleaned up?

**Status: safe (as of 2026-05-15)**

- A FIFO cap of `MAX_SCREENSHOTS = 5` per queue (`ScreenshotHelper.ts:403`) removes old files on overflow.
- `clearQueues()` is called on session reset (`ScreenshotHelper.ts:741`).
- **"Delete on app exit" added (2026-05-15)**: `main.ts` `before-quit` handler now calls `screenshotHelper.clearQueues()` to delete all queued screenshot files when the app quits. PNG files no longer persist indefinitely.

## 6. Are screenshots logged?

**Status: safe.**

No code path writes screenshot **bytes** to a log. `console.log` lines log
the file path only (`ScreenshotHelper.ts:564, 658, 703`).

## 7. Are screenshot paths logged?

**Status: risky.**

- Paths are logged at INFO level (`ScreenshotHelper.ts:158, 461, 510, 524,
  564, 612, 635, 658, 703, 781`).
- Paths contain `<uuid>.png` only — no PII. But the path also encodes the
  macOS user account name (`/Users/<user>/Library/…`), which is
  pseudo-identifying.
- The redaction harness at `electron/services/__tests__/SensitiveLogRedaction.test.mjs`
  scrubs API keys but does not redact file paths. Sufficient for production
  unless we ship user logs externally.

## 8. Are screenshots sent to cloud providers?

**Status: safe (gated by scope policy), but with one bypass.**

- `LLMHelper.assertOutboundScopes(provider, text, imagePaths)` is called
  before every provider attempt (`LLMHelper.ts:119-122`).
- The scope `'screenshots'` is added to the per-call scope set whenever
  `imagePaths?.length` is truthy (`LLMHelper.ts:115`).
- `getProviderDataScopes` IPC (`ipcHandlers.ts:340`) lets the user disable
  cloud screenshot upload per provider; `setProviderDataScopes`
  (`ipcHandlers.ts:763`) persists the policy.
- **Bypass:** `LLMHelper.streamChat → streamChatWithGemini` calls
  `streamWithAnswerFlow`, `streamWithCodexCli`, `streamWithOpenaiMultimodal`,
  etc. with `imagePaths` directly. For Ollama the only path
  (`LLMHelper.ts:2484`) passes `imagePaths?.[0]` without any per-image scope
  check; this is safe because Ollama is local, but verify if the user
  configures a remote Ollama host.

## 9. Does local-only mode block cloud vision?

**Status: safe.**

`ProviderRouter.selectProvider({ privacySetting: 'local-only' })` returns
`{ provider: 'ollama', model: 'local', reason: 'local-only mode: using local
provider' }` (`ProviderRouter.ts:280-286`). The router never hands a vision
request to a cloud provider in this mode.

## 10. Does the custom (cURL) provider receive screenshots only if allowed?

**Status: safe (as of 2026-05-15)**

`chatWithCurl` at `LLMHelper.ts:1832` calls `assertOutboundScopes('custom_curl', userMessage, imagePath ? [imagePath] : undefined)` before sending any image. The `screenshots` scope is enforced for custom cURL providers just like named providers. If the user has disabled screenshot upload for the custom cURL provider via `setProviderDataScopes`, the image will not be sent.

## 11. Are screen contents marked untrusted?

**Status: safe.**

`PromptAssembler.buildScreenContextBlock` assigns
`trustLevel: TrustLevel.UNTRUSTED_SCREEN` (`PromptAssembler.ts:272`). System
and mode policies sit above the screen block in `TRUST_LEVEL_ORDER`
(`TrustLevels.ts:60-71`), so OCR text cannot override the system prompt by
construction. Test
`electron/services/__tests__/PromptAssembler.test.mjs` "screen context block
has UNTRUSTED_SCREEN trust level" enforces this.

## 12. Can OCR prompt injection override instructions?

**Status: safe (defense in depth).**

- The `<screen_context trust_level="untrusted_visual_evidence">` tag is XML
  and the OCR text is escaped via `escapeUserContent`
  (`PromptAssembler.ts:135-142`, applied at `:278`).
- The block sits below `SYSTEM_POLICY` and `MODE_POLICY` in the assembly
  order, so even a perfectly executed jailbreak in OCR text would have to
  also defeat the trust-level prompt — which an attacker has no direct way
  to do without a separate vulnerability.
- The XML-escape covers `<>&"'`; `escapePromptInjection`
  (`PromptAssembler.ts:149-163`) is **not** applied to screen text. Anyone
  with a printed "ignore previous instructions" sign in front of the camera
  will have those phrases reach the model verbatim. Worth adding
  `escapePromptInjection` symmetrically.

## 13. Is screen permission missing handled gracefully?

**Status: safe.**

`assertScreenRecordingPermission` (`ScreenshotHelper.ts:31-60`) throws
descriptive errors for `denied` / `restricted` / `not-determined`, each
referencing the System Settings path. `desktopCapturer.getSources` errors
(`NotAllowedError`, `NotFoundError`) are re-thrown with friendly messages
(`ScreenshotHelper.ts:485-501`). Dev-mode bypasses the check
(`ScreenshotHelper.ts:35`) — fine for local dev.

## 14. What happens if screenshot capture fails?

**Status: risky on display reconfigure.**

- Capture errors bubble to the IPC layer, which returns
  `{ error: '...' }` or rejects the invoke promise; the renderer surfaces a
  toast/system message.
- On display-id mismatch, `ScreenshotHelper.ts:519-521` silently falls back
  to `sources[0]`, which on a multi-monitor system can capture the **wrong
  screen** without telling the user. Worth a UI signal.

## 15. Are large image files size-limited?

**Status: risky.**

- For AnswerFlow API uploads, images are downscaled with Sharp to ≤768 px on
  the long edge (`LLMHelper.ts:900-905`, "Compress before sending"). Good.
- For OpenAI / Claude / Gemini / Ollama / cURL, the image bytes go straight
  in. No client-side size cap. A 5 MB Retina PNG triples in base64 and can
  push a single multimodal request past Claude's 5 MB inline-image limit,
  returning an opaque 400 from the SDK.

## 16. Are file extensions / content types checked?

**Status: risky.**

- `validateImagePath` does not check extension or magic bytes. A user-pasted
  `.txt` or `.exe` whose name contains the substring "screenshot" would pass
  the (also-broken) allow-list at `curlUtils.ts:290-298`.
- `Tesseract.recognize` would reject such a file at runtime with a parse
  error; provider SDKs accept anything you base64-encode and let the server
  decide. Add a magic-byte check at the IPC boundary.

---

## Priority fix list

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | **P0** | `validateImagePath` rejects every macOS userData path because `/Users/` is in the prefix denylist | Replace prefix denylist with positive `path.resolve(p).startsWith(path.resolve(userDataPath)+sep)` check |
| 2 | P0 | The "filename contains 'screenshot'" allow-list (`curlUtils.ts:290-298`) is a denylist bypass for any externally-named path | Delete the substring fallback entirely once #1 is fixed |
| 3 | P1 | No symlink resolution — any symlink under `userData/screenshots/` is followed | Add `fs.realpath` and reject if `realpath` escapes `userData` |
| 4 | P1 | Custom cURL provider receives screenshots without scope-policy gate | Run `assertOutboundScopes('custom', ...)` in `chatWithCurl` |
| 5 | P2 | OCR text is XML-escaped but not run through `escapePromptInjection` | Apply the same escape used for reference files in `buildScreenContextBlock` |
| 6 | P2 | Wrong-display capture falls back silently to `sources[0]` | Emit a UI warning when display_id lookup falls back |
| 7 | P2 | No image-size cap before sending to Claude/OpenAI/Gemini | Reuse the Sharp resize already used for AnswerFlow for every cloud path |
| 8 | P3 | Screenshots persist on disk if app exits without `clearQueues()` | Schedule a startup sweep of `userData/screenshots/` older than N days |
