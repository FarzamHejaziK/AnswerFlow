# Screen-Analysis Provider Capability Matrix

**Audit date:** 2026-05-15
**Commit:** `43ae233d7148`
**Sources:** `electron/LLMHelper.ts`, `electron/llm/ProviderRouter.ts`,
`electron/llm/modelCapabilities.ts`, `electron/utils/curlUtils.ts`.

---

## Capability Matrix

| Provider | Vision supported? | How image is sent | OCR extraction supported? | Final answer with image? | Fallback if no vision | Privacy risk | Code path |
|---|---|---|---|---|---|---|---|
| **AnswerCue API** | yes | multipart/form-data; image first resized with Sharp to ≤768 px on long edge, base64 encoded | no — only forwards | yes (AnswerCue backend treats as multimodal) | server-side fallback | medium (cloud) | `generateWithAnswerCue` `LLMHelper.ts:1698`; `streamWithAnswerCue` |
| **OpenAI (GPT-4o / 4.1 / 5.x)** | yes | OpenAI Vision API: `content[]` array with `{type:'image_url', image_url:{url:'data:image/png;base64,…'}}` | no — only forwards | yes | downgrades to text-only when `isMultimodal=false` | medium (cloud) | `generateWithOpenai` `LLMHelper.ts:1786`; `streamWithOpenaiMultimodal` |
| **Anthropic Claude** | yes | Claude Vision: `content[]` with `{type:'image', source:{type:'base64', media_type, data}}` | no — only forwards | yes | downgrades to text-only | medium (cloud) | `generateWithClaude` `LLMHelper.ts:1907`; `streamWithClaudeMultimodal` |
| **Google Gemini Flash / Pro** | yes | `google-genai` `inlineData: { mimeType, data:base64 }` per image | no — only forwards | yes | downgrades to text-only | medium (cloud) | `streamWithGeminiModel` `LLMHelper.ts:2523, 2530`; non-stream via `generateContent` |
| **Groq** | yes (vision only via `meta-llama/llama-4-scout-17b-16e-instruct`) | `image_url` part on OpenAI-compat endpoint | no | yes | text models (`llama-3.3-70b`, etc.) cannot accept images — handler hard-codes Scout for multimodal | medium (cloud) | `generateWithGroqMultimodal` `LLMHelper.ts:2160-2190` |
| **Ollama (local)** | family-dependent: `llava`, `bakllava`, `moondream`, `llama3.2-vision`, `gemma3`, `minicpm-v`, `qwen2.5-vl`, `pixtral` | `messages[].images: [base64]` (only first image used) | no | yes, on vision-capable model | text-only Ollama models ignore the image silently | low (local) | `callOllama` `LLMHelper.ts:480-543`; capability detection `modelCapabilities.ts:75-78` |
| **Codex CLI** | declared `vision` (`ProviderRouter.ts:114`) | forwards `imagePaths` to Codex CLI binary | unclear | claimed yes via `generateWithCodexCli` `LLMHelper.ts:413` | falls back to text mode | low (local CLI) | `generateWithCodexCli`, `streamWithCodexCli` |
| **Custom cURL** | only if user sets `multimodal=true` in the curl config | `injectImageIntoBody` (`curlUtils.ts:98-138`) auto-upgrades the last user message to multimodal `content[]` with `image_url` | no | yes if user-configured | strips image from body when `multimodal=false` | depends on user URL (high if proxy → cloud) | `chatWithCurl` `LLMHelper.ts:1830-1900` |
| **OpenAI-compat custom provider** | yes if multimodal | `executeCustomProvider(..., imagePaths[0])` | no | yes | same as cURL | depends on URL | `executeCustomProvider` `LLMHelper.ts:2316-2336` |

Provider order (multimodal request):
```
answercue → codex → openai → gemini_flash → claude → gemini_pro → groq
```
(`ProviderRouter.ts:149-151`).

Provider order (text-only request):
```
answercue → groq → codex → gemini_flash → gemini_pro → openai → claude
```

---

## Per-provider notes

### AnswerCue API
- Image preprocessing: `Sharp` resize to ≤768 px on the long edge and JPEG
  re-encode (`LLMHelper.ts:900-905`).
- Body cap commented at "4 screenshots × ~278 KB base64 = ~1.1 MB" — fine.
- Scope policy: `assertOutboundScopes('answercue', text, imagePaths)` runs at
  `LLMHelper.ts:1699`. Users can disable `screenshots` for this provider.

### OpenAI / Claude
- No pre-resize. A Retina 5 MB PNG → ~7 MB base64; Claude rejects >5 MB
  inline images. Worth wiring the same Sharp resize.
- `image_url` is a `data:` URI (not an HTTPS URL) so nothing leaks to public
  buckets, but the cloud provider receives the full uncropped image.

### Gemini
- `inlineData` payload uses `model_capabilities.ts:107` heuristics: `lower.startsWith('gemini-')`
  is enough to trigger `supportsImages = true`.
- Gemini Pro is in the multimodal list but listed *after* Flash, so latency
  preference wins by default.

### Groq
- Only `meta-llama/llama-4-scout-17b-16e-instruct` is wired for vision; that
  model id is **hard-coded** at `LLMHelper.ts:2180`. If the user's `groq`
  text model is `llama-3.3-70b-versatile` (which has no vision), the handler
  silently switches model for multimodal calls.
- `modelCapabilities.ts:130` sets `supportsImages: false` for "large Groq
  models" — the wiring contradicts the capability table; only the wiring
  matters at runtime.

### Ollama
- `callOllama` accepts a single image (`imagePaths?.[0]` at every call site).
  Multi-image requests silently drop everything after the first.
- Vision-family detection in `modelCapabilities.ts:75-78` is a regex; missing
  families (e.g. new releases) fall through as text-only and the image is
  dropped silently.

### Codex CLI
- Vision support is declared in `ProviderRouter.ts:114` but
  `generateWithCodexCli` (LLMHelper.ts:413-430) just forwards `imagePaths` —
  whether the local Codex CLI accepts images depends on the user's installed
  version. **No integration test exercises this** (the only test under
  `electron/services/__tests__/CodexCliService.test.mjs` tests presence
  detection, not image upload).

### Custom cURL provider
- The user supplies a cURL recipe. `injectImageIntoBody`
  (`curlUtils.ts:98-138`) walks the JSON body and converts the last user
  message into a multimodal array if a base64 image is present.
- **No data-scope assertion** runs for this path
  (compare to `LLMHelper.ts:1699` for AnswerCue). A screenshot can leave the
  machine via a user-defined URL even if the user has disabled
  `screenshots` for the named providers.

---

## Q&A

**Q: Which provider is best for screen analysis today?**
A: **Gemini Flash** for the streaming "What should I say" path: it's already
the default in the multimodal stream list (after AnswerCue/Codex/OpenAI),
handles `inlineData` cleanly, has the largest free-tier vision quota, and is
the only one paired with the OCR text block today. **Claude** is technically
better at reading complex UI screenshots but is later in the failover order.

**Q: Which provider is fastest?**
A: **Groq Llama-4-Scout** vision (`LLMHelper.ts:2180`). The router lists Groq
last in the multimodal preference order (`ProviderRouter.ts:151`) because
Scout's free-tier rate limit is tight — but per-call latency is the lowest of
the cloud options.

**Q: Which provider is safest / local?**
A: **Ollama with a vision family** (`llava:13b`, `qwen2.5-vl`, etc.). The
image bytes never leave the machine; the Sharp pre-resize at the request
layer still applies because the AnswerCue path is short-circuited for
local-only mode (`ProviderRouter.ts:280-286`).

**Q: Which provider path is currently broken or untested?**
A:
- **Custom cURL multimodal** — no scope-policy gate (see security audit
  finding #4) and zero automated tests (`grep -r "chatWithCurl" electron/services/__tests__/`
  returns nothing).
- **Codex CLI vision** — declared capability but no end-to-end test confirms
  the CLI actually accepts image arguments; only `CodexCliService.test.mjs`
  checks for binary presence.
- **Renderer-supplied imagePaths on macOS** — the `validateImagePath`
  bug (security audit finding #1) silently rejects every legitimate userData
  path. Every provider here is unreachable via the "user attaches a
  screenshot → click ask" UX on macOS until the validator is fixed.
- **Groq vision capability flag** — `modelCapabilities.ts:130` claims
  `supportsImages: false` for large Groq models, but the wiring at
  `LLMHelper.ts:2180` hard-codes Scout. The capability table is unused for
  routing decisions in practice.
