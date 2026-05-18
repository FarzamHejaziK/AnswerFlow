# Natively → Cluely Parity Roadmap

**Companion to:** `NATIVELY_CLUELY_PARITY_FIX_LOG.md`
**Purpose:** track everything *not* completed in the current pass with concrete
next-step instructions a follow-up engineer can execute without re-reading the
audit.

Phases are ordered for risk-then-value: security blockers first, then product
foundation, then product surface, then enterprise.

---

## Open work by phase

Each item: **owner-style ticket** — file paths, exact next step, test target,
"definition of done", rough effort.

### Phase 1 — Security & privacy

* **1.1 Trial token leak through IPC**
  * Files: `electron/ipcHandlers.ts` (search `trial:get-local`), `electron/preload.ts`, `src/types/electron.d.ts`
  * Next step: locate every IPC channel returning a token; replace token payload with `{ hasToken, expiresAt, expired, trialClaimed, plan }`.
  * Test: `electron/services/__tests__/TrialIpcRedaction.test.mjs` — exists, must pass with sentinel-token assertions.
  * DoD: renderer cannot reconstruct any sk_/jwt-shaped string; secret stays in main only.
  * Effort: 0.5 day.

* **1.2 STT provider key leak through `get-stored-credentials`**
  * Files: `electron/ipcHandlers.ts`, `electron/services/CredentialsManager.ts`, settings UI under `src/components/`.
  * Next step: return `{ hasKey: boolean, mask: 'sk-…abcd' | null, provider }` only. UI should switch to "Configured / Replace / Remove".
  * Test: `electron/services/__tests__/SttApiKeyRedaction.test.mjs`, `CredentialStorage.test.mjs`.
  * DoD: full key never leaves main; renderer mask UI verified.
  * Effort: 0.5–1 day.

* **1.3 Renderer-supplied image/file path allowlist**
  * Files: `electron/ipcHandlers.ts` (every handler taking `imagePaths` / `filePath`), `electron/services/screen/ScreenContextService.ts`.
  * Next step: implement `validateAppOwnedPath(p, kinds[])` — must `path.resolve` then `path.relative` against userData/screenshots/reference dirs and reject `..`, symlinks, off-platform absolute paths.
  * Test: `electron/services/__tests__/ImagePathValidation.test.mjs` — must include `/etc/passwd`, `~/.ssh/id_rsa`, `\\server\share\...`, traversal `../../etc/passwd`, and a symlink case.
  * DoD: every IPC accepting a path validates; tests pass.
  * Effort: 1 day.

* **1.4 Custom cURL provider SSRF + data scope**
  * Files: `electron/utils/curlUtils.ts`, custom-provider IPC, settings UI.
  * Next step: deny localhost / 127/8 / 10/8 / 172.16/12 / 192.168/16 / 169.254/16 / `::1` / `metadata.google.internal` / `169.254.169.254` unless `localProviderMode` is on; require HTTPS by default; add `dataScopes: { transcript, screenshots, references, profile, history }` flags enforced at request build.
  * Test: `electron/services/__tests__/SsrfProtection.test.mjs`, `ExternalUrlIpc.test.mjs`.
  * DoD: unauthorized scope cannot exfiltrate any of the five payloads; SSRF list matches OWASP common metadata IPs.
  * Effort: 1–2 days.

* **1.5 Sensitive log redaction**
  * Files: `electron/utils/verboseLog.ts` (or wherever logging lives), every `console.log`/`console.warn` in providers.
  * Next step: introduce `redactSecrets(value)` and `redactSensitiveMeetingData(value)` helpers; wrap all error/response logs; never log raw transcript, raw response body, raw screenshot path, raw API error body.
  * Test: `electron/services/__tests__/SensitiveLogRedaction.test.mjs` — sentinels: `transcript-secret-7f9c`, `sk-test-DEADBEEF`, `key=AKIA…` should never appear in captured stream.
  * DoD: sentinel values absent from logs across one full meeting flow.
  * Effort: 1 day.

* **1.6 Privacy / retention foundation**
  * Files: `electron/services/SettingsManager.ts`, `electron/MeetingPersistence.ts`, settings UI.
  * Next step: add `retention: 'forever' | '7d' | '30d' | 'never'` setting and a per-meeting `doNotPersist` toggle; honor in `MeetingPersistence`. DB encryption is out of scope for first pass — write design doc only.
  * DoD: meeting flagged "do not persist" is not written to DB; retention purge job stubbed.
  * Effort: 1–2 days for foundation, encryption design doc separate.

### Phase 2 — Mode runtime & mode bleeding

* **2.1 Post-call mode snapshot — DONE 2026-05-15**
  * Files: `electron/MeetingPersistence.ts`, `electron/services/ModesManager.ts`, `electron/services/__tests__/ModeBleeding.test.mjs`, `electron/services/__tests__/ModesManager.test.mjs`.
  * Shipped: `stopMeeting()` snapshots active mode id/name/templateType before session reset and passes it into background post-call processing. Post-call section lookup uses the snapshotted mode, not whichever mode is active later. `encodeModeContextPayload` is exported so snapshotted mode custom context/reference blocks can be safely encoded at runtime.
  * Verification: targeted `npm run build:electron && node --test electron/services/__tests__/ModesManager.test.mjs electron/services/__tests__/ModeBleeding.test.mjs` passes 19/19; full `npm test` passes 370/370 across 36 suites.
  * Remaining: the larger `ModeRuntime/ModePolicy/ModeActionRegistry` decomposition is still architectural cleanup, not required for the current mode-bleeding correctness gate.

* **2.2 Mode bleeding hardening — PARTIAL DONE 2026-05-15**
  * Shipped: `modes:set-active` clears transient session context before switching active mode; `SessionTracker.clearSessionContext()` clears rolling context, assistant history, coding-question state, and interim buffers; `IntelligenceManager.clearSessionContext()` exposes the boundary to IPC.
  * Verification: `ModeBleeding.test.mjs` covers post-call snapshot ordering, `processAndSaveMeeting` snapshot use, `modes:set-active` clearing order, and active-mode suffix dedupe.
  * Remaining: add true stream-cancellation for in-flight LLM streams whose mode snapshot no longer matches the active mode once the stream reaches token-zero.

### Phase 3 — Dynamic actions UI

* **3.1 IPC bridge for action lifecycle**
  * Files: `electron/ipcHandlers.ts` (new channels: `dynamic-actions:on`, `dynamic-actions:accept`, `dynamic-actions:dismiss`, `dynamic-actions:list`), `electron/preload.ts`, `electron/IntelligenceEngine.ts` (call `DynamicActionEngine.detectActions` from transcript-update path), `src/types/electron.d.ts`.
  * DoD: emitting a transcript line containing `expensive` while in sales mode produces a `pricing_objection` action visible to renderer.
  * Test: extend `DynamicActionEngine.test.mjs` with an IPC integration spec; manual verify in dev.
  * Effort: 1–2 days.

* **3.2 UI cards (DynamicActionBar / DynamicActionCard / ActionEvidencePopover)**
  * Files: create `src/components/dynamic-actions/{DynamicActionBar,DynamicActionCard,ActionEvidencePopover}.tsx`; mount above answer area in `NativelyInterface.tsx`.
  * Constraints: max 3 visible, dismiss button, primary card via Tab, evidence popover shows transcript snippet + speaker + timestamp.
  * DoD: cards render, accept triggers `WhatToAnswerLLM` with `promptInstruction`, streamed answer appears in chat.
  * Effort: 2 days.

* **3.3 Trigger pack expansion — DONE 2026-05-15**
  * Files: `electron/services/dynamic-actions/DynamicActionDetector.ts`, `electron/services/__tests__/DynamicActionEngine.test.mjs`.
  * Shipped: `general` and `negotiation` packs plus expanded sales, recruiting, team-meeting, interview, technical-interview, and lecture triggers.
  * Verification: targeted `DynamicActionEngine.test.mjs` passes 15/15; full `npm test` passes 358/358. Tests assert 18 canonical phrases across modes plus negotiation/sales/interview isolation.
  * Remaining follow-up: regex packs are still supervised heuristics, not LLM-classified triggers; keep the roadmap risk note for future classifier work.

### Phase 4 — Screen / OCR context

* **4.1 Pipeline integration — PARTIAL DONE 2026-05-15**
  * Files: `electron/services/screen/ScreenContextService.ts`, `electron/ipcHandlers.ts`, `electron/IntelligenceEngine.ts`, `electron/IntelligenceManager.ts`, `electron/llm/WhatToAnswerLLM.ts`.
  * Shipped: validated attached screenshots in `generate-what-to-say` are OCR-processed via `ScreenContextService.captureScreenFromPath()` and passed to `WhatToAnswerLLM.generateStream(..., screenContext)` as untrusted screen evidence. Existing vision `imagePaths` path remains intact.
  * Verification: `IntelligenceEngineScreenContext.test.mjs` proves `runWhatShouldISay` passes screenContext while preserving imagePaths; `ScreenContextService.test.mjs` still passes; full `npm test` passes 366/366.
  * Remaining: no automatic background screen capture, no OCR progress streaming, no provider-specific non-vision image stripping, and no live Electron click-through yet.

* **4.2 UI indicator**
  * Files: `src/components/NativelyInterface.tsx`.
  * Next step: small chip "Screen context: available / stale / unavailable / permission-missing"; manual "Use current screen" button.
  * Effort: 0.5 day.

### Phase 5 — PromptAssembler on the hot path

* **Answer hot path — DONE 2026-05-15**
  * Files: `electron/llm/WhatToAnswerLLM.ts`, `electron/LLMHelper.ts`, `electron/services/context/PromptAssembler.ts`, `electron/services/__tests__/PromptAssembler.test.mjs`, `electron/llm/__tests__/suggestionPromptAssembly.test.mjs`.
  * Shipped: `WhatToAnswerLLM.generateStream()` now routes runtime intent, prior assistant responses, OCR screen context, retrieved mode context, and transcript through `PromptAssembler.assemble({...})`. The trusted active-mode suffix remains only in the system prompt override; retrieved RAG/reference context remains user-message content; `imagePaths` passthrough is preserved.
  * Hardening: live answer, suggestion, and generic chat mode-injection paths now use retrieval-only active-mode context. When retrieval misses, they pass no reference block instead of falling back to `ModesManager.buildActiveModeContextBlock()` and dumping full raw reference files into prompts.
  * Verification: targeted PromptAssembler migration tests pass 26/26; targeted raw-fallback hardening tests pass 19/19 via `npm run build:electron && node --test electron/llm/__tests__/suggestionPromptAssembly.test.mjs electron/services/__tests__/ModesManager.test.mjs`; full `npm test` passes 371/371 across 36 suites.
  * Remaining: migrate other prompt-construction call sites (`IntentClassifier`, summarizers/planners where applicable) behind the same trust-boundary model. `buildActiveModeContextBlock()` remains as a legacy/supporting API, but not as a live answer/suggestion fallback.

### Phase 6 — Hybrid RAG for mode files

* **6.1 Schema migration**
  * Files: `electron/db/DatabaseManager.ts` migrations.
  * Tables: `mode_reference_chunks`, `mode_reference_embeddings` (vec0), `mode_reference_chunk_fts` (FTS5), `mode_reference_index_state` (file_id, file_hash, indexed_at, chunk_count).
  * DoD: schema present + migrated on startup.
  * Effort: 0.5 day.

* **6.2 Index lifecycle**
  * Files: `electron/services/modes/ModeHybridRetriever.ts` (already drafted), wire into `ModesManager.addReferenceFile / updateReferenceFile / deleteReferenceFile`.
  * DoD: file added → chunks/embeddings indexed; file updated → stale index invalidated; file deleted → all chunks gone.
  * Test: `ModeHybridRetriever.test.mjs` (exists) — add `update invalidates stale chunks` and `delete prunes` tests.
  * Effort: 1 day.

* **6.3 Replace `ModeContextRetriever.retrieve()` callers with `retrieveHybrid()`**
  * Files: `electron/services/ModesManager.ts:buildActiveModeContextBlock`, anywhere else lexical retrieval is used.
  * DoD: hybrid is default; lexical falls back only when embedding provider unavailable; flag in telemetry distinguishes `rag_hit_hybrid` vs `rag_hit_lexical`.
  * Effort: 1 day.

### Phase 7 — Provider routing & rate-limit hardening

* Files: `electron/llm/ProviderRouter.ts` (exists), `electron/services/RateLimiter.ts`, every provider call site (`LLMHelper`, `WhatToAnswerLLM`, `IntelligenceEngine`, `MeetingPersistence`, `ConversationSummarizer`, `IntentClassifier`, `PlannerDecision`).
* Next step: wrap every provider request in `ProviderGateway.execute(req, { mode, action, dataScopes, latencyClass })` that enforces rate limit + retry + telemetry + redacted error path. Local-only mode must short-circuit before any cloud SDK is called.
* Test: `ProviderRouting.test.mjs` (exists, 293 LOC) — verify it covers fallback, rate-limit acquire, local-only block.
* DoD: grep for direct `gemini.invoke / openai.chat / anthropic.messages` anywhere outside provider modules → 0 results.
* Effort: 2–3 days.

### Phase 8 — Telemetry

* Files: `electron/services/telemetry/TelemetryService.ts` (exists), every lifecycle site (meeting start/stop, mode select, action lifecycle, LLM start/first-token/complete, provider fallback, STT lifecycle, RAG hit/miss, screen capture, post-call summary).
* Next step: emit events at all sites listed in §promptfix Phase 8; add diagnostics panel under Settings → Diagnostics with provider/STT health, average answer latency, RAG hit rate, screen permission status.
* Test: `TelemetryService.test.mjs` (exists) — extend with "no sentinel transcript / API key in any emitted event".
* DoD: a 5-minute synthetic meeting produces a JSONL trail with all expected event types and zero sensitive payload.
* Effort: 2 days.

### Phase 9 — Post-call workflow & coaching

* Files: `electron/services/post-call/PostCallWorkflow.ts` (exists), `electron/MeetingPersistence.ts`, post-call UI under `src/components/`.
* Next step: notes schema with stable section IDs (not titles), action items with owner/deadline parsed from transcript, follow-up email template per mode, coaching insights per mode (sales: missed discovery; recruiting: missing follow-up; interview: vague answer; team: action item missing owner).
* Test: `PostCallWorkflow.test.mjs` (exists, 128 LOC) — extend with "stop in sales mode, switch to lecture, summary still uses sales schema" and "action item owner extracted".
* Effort: 2–3 days.

### Phase 10 — UX polish

* Active mode badge during meeting, dynamic action bar, screen/STT/provider/privacy chips, masked-key settings, custom-provider data-scope UI, retention controls, onboarding wizard improvements (mic test, system audio test, AI provider test, first reference file).
* Effort: 3–4 days.

### Phase 11 — Test suite & E2E

* See `promptfix.md` Phase 11 for the 68 numbered scenarios. Most have a unit test stub already; the missing ones are the long-session and full E2E flows (Playwright). Build a `node --test` quality gate plus a Playwright `e2e/` directory.
* Effort: 3–4 days.

---

## Cross-cutting pre-existing TS errors to clean up

Listed for triage — none block the test runner today but should be cleared before
declaring Phase 11 done.

| File | Error | Fix |
|---|---|---|
| `electron/ipcHandlers.ts:3557` | `dialog.showOpenDialog` typed as `string[]` | most likely a stale `@types/electron` resolution; cast result to `Electron.OpenDialogReturnValue` or import `dialog` directly from `electron` typings. |
| `electron/MeetingPersistence.ts:154-166` | implicit `any` on `m` | annotate `m: Mode` from `ModesManager`. |
| `electron/test/erp-1hour-real.test.ts:274` | `PromptTier` vs literal `'error'` | update enum or remove dead branch. |
| `electron/test/erp-3hour-stress.test.ts` | `boolean` vs `string\|number`, missing `description` field | update test fixtures. |
| `electron/test/input-fuzzing.test.ts:222` | missing `sqlInjection` | extend object literal. |
| `electron/test/modes-live-response-eval.ts:701` | `PromptModule` cast | tighten the interface or use `unknown` step. |

---

## Risks called out

* **Submodules `natively-api` and `premium`:** modified on entry, untouched here.
  Any parity work that touches the hosted API contract will need a coordinated
  submodule bump.
* **macOS-only assumptions** in screen/audio paths — Windows parity will need
  separate verification before declaring Phase 4 / 10 done.
* **DB encryption** deferred to a design doc; do not declare full Phase 1 done
  until that doc exists and is reviewed.
* **Trigger packs** are partially-supervised regex; LLM-classified triggers
  (Cluely-style) remain a follow-up.
