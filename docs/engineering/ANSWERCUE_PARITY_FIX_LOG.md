# AnswerCue → legacy overlay Parity Fix Log

**Started:** 2026-05-15
**Lead:** Claude (Opus 4.7) acting as senior engineer / architect / QA / reviewer
**Source audit:** `/comparisonreport.md` (AnswerCue vs legacy overlay, 2026-05-15)
**Source QA:** `/QA_REPORT.md` (48/61 = 78.7% baseline pass rate, 2026-05-14)
**Source mission:** `/promptfix.md`

This log is the source of truth for every change made in the parity push.
Each entry is **evidence-grounded**: claims must be backed by tests, files, or
shell output. "Done" only when typecheck/tests/manual scenario all confirm.

---

## Phase 0 — Baseline & safety snapshot ✅

### 0.1 Pre-existing repo state on entry

**Branch:** `main` (commit `43ae233`)
**Submodules:** `answercue-api`, `premium` both modified (untouched here).

**Working tree on entry — uncommitted changes:**

* **Source files modified:** 31 (electron/* core + src/components/AnswerCueInterface.tsx + src/types/electron.d.ts)
* **Source files added (untracked):**
  * `electron/llm/PlannerDecision.ts`, `electron/llm/ProviderRouter.ts`
  * `electron/services/ModeContextRetriever.ts`
  * `electron/services/context/{ContextPacket,PromptAssembler,TrustLevels}.ts`
  * `electron/services/dynamic-actions/{DynamicAction,DynamicActionDetector,DynamicActionEngine,DynamicActionStore}.ts`
  * `electron/services/modes/ModeHybridRetriever.ts`
  * `electron/services/post-call/PostCallWorkflow.ts`
  * `electron/services/screen/{ImageHashService,ScreenContextService}.ts`
  * `electron/services/telemetry/TelemetryService.ts`
* **Test files added (untracked, 25 suites):** see `electron/services/__tests__/`
* **Reports added (untracked):** `QA_REPORT.md`, `comparisonreport.md`, `answercue-market-research.md`,
  `QAautomationprompt.md`, `report.md`
* **Deleted (staged):** `docs/RELEASE.md`, `docs/competitor-matrix.md`,
  `docs/gap-analysis.md`, `docs/improvement-roadmap.md`, `docs/internal-audit.md`

**Implication:** A previous engineering pass already laid down ~5,920 lines of
new module + test code matching the parity audit gaps. **This pass is auditing
and hardening that work — not starting from a blank slate.**

### 0.2 New module inventory (sizes verify these are real, not stubs)

| Module | LOC | Test LOC | Status |
|---|---|---|---|
| `dynamic-actions/DynamicActionEngine.ts` | 103 | 355 | Real impl: detect / dedupe / accept / dismiss / expire |
| `dynamic-actions/DynamicActionDetector.ts` | 188 | (shared) | Real impl: 7 mode trigger packs |
| `dynamic-actions/DynamicActionStore.ts` | 71 | (shared) | Real impl: in-memory store w/ status transitions |
| `dynamic-actions/DynamicAction.ts` | 31 | (shared) | Type defs |
| `modes/ModeHybridRetriever.ts` | 572 | 264 | Real impl: hybrid FTS+vector retrieval |
| `post-call/PostCallWorkflow.ts` | 207 | 128 | Real impl: notes/action items/follow-up/coaching |
| `screen/ScreenContextService.ts` | 163 | 120 | Real impl: capture, hash dedupe, OCR fallback |
| `screen/ImageHashService.ts` | 71 | (shared) | Real impl: perceptual hash for change detection |
| `telemetry/TelemetryService.ts` | 187 | 163 | Real impl: local JSONL, redaction, lifecycle events |
| `context/PromptAssembler.ts` | 389 | 373 | Real impl: trust levels, escaping, token budget |
| `context/TrustLevels.ts` | 90 | (shared) | Trust level enum + escaping helpers |
| `context/ContextPacket.ts` | 14 | (shared) | Packet type def |
| `services/ModeContextRetriever.ts` | 204 | 99 | Real impl: lexical + delegates to hybrid |
| `llm/ProviderRouter.ts` | n/a | 293 | Real impl: routing + circuit breaker + rate-limit wiring |

### 0.3 TypeScript baseline

`npm run typecheck:electron` — **fails** with 27 errors (pre-existing). Categories:

| Category | Count | Severity | Blocks tests? |
|---|---|---|---|
| `ipcHandlers.ts:3557` dialog return-type widening | 3 | low | no — esbuild transpile-only |
| `MeetingPersistence.ts:154-166` implicit `any` on `m` | 3 | low | no |
| `ModeContextRetriever.ts:175` missing `HybridContext` import | 1 | medium | no | **FIXED THIS PASS** |
| `electron/test/erp-*.test.ts` schema drift | 14 | low | no (electron/test is not the unit test path) |
| `modes-live-response-eval.ts:701` PromptModule cast | 1 | low | no |
| Other | misc | low | no |

**Decision:** the test runner (`build:electron` → esbuild → `node --test`) does not
type-check, so these errors do not block our regression suite. They will be
fixed opportunistically. Hard typecheck pass is a Phase 11 deliverable —
documented in `ANSWERCUE_PARITY_ROADMAP.md`.

### 0.4 Test runner baseline (verified)

| Suite | Tests | Passed | Failed | Notes |
|---|---|---|---|---|
| `TrialIpcRedaction` | 2 | 2 | 0 | Phase 1.1 |
| `SttApiKeyRedaction` | 4 | 4 | 0 | Phase 1.2 |
| `CredentialStorage` | 3 | 3 | 0 | Phase 1.2 supporting |
| `ImagePathValidation` | 5 | 5 | 0 | Phase 1.3 |
| `ExternalUrlIpc` | 2 | 2 | 0 | Phase 1.4 supporting |
| `SsrfProtection` | 5 | 5 | 0 | Phase 1.4 |
| `SensitiveLogRedaction` | 5 | 5 | 0 | Phase 1.5 |
| `ModeBleeding` | 12 | 12 | 0 | Phase 2 |
| `ModesManager` | 9 | 9 | 0 | Phase 2 |
| `ModeContextRetriever` | 3 | 3 | 0 | Phase 2/6 |
| `ModeHybridRetriever` | 6 | 6 | 0 | Phase 6 |
| `PromptAssembler` | 16 | 16 | 0 | Phase 5 |
| `PostCallWorkflow` | 9 | 9 | 0 | Phase 9 |
| `DynamicActionEngine` | 13 | 13 | 0 | Phase 3 backend |
| `ScreenContextService` | 6 | 6 | 0 | Phase 4 |
| `TelemetryService` | 8 | 8 | 0 | Phase 8 |
| `ProviderRouting` | 20 | 20 | 0 | Phase 7 — **fixed by §0.6 in this pass** |
| `IntelligenceEngineSentinel` | 8 | 8 | 0 | Other |
| `IntelligenceEnginePlanner` | passes | n | 0 | Other |
| `IntelligenceEngineCodeHint` | passes | n | 0 | Other |
| `LocalWhisperStopFlush` | 2 | 2 | 0 | Other |
| `MainTeardown` | 1 | 1 | 0 | Other |
| `MeetingPersistenceRace` | 2 | 2 | 0 | Other |
| `CodexCliService` | passes | n | 0 | Other |
| `TestDiscovery` | passes | n | 0 | Other |

**Total verified passing:** ≥ 145 tests across 25 suites. **Failing tests:** 0.

### 0.5 Fix made in Phase 0

| File | Change | Why |
|---|---|---|
| `electron/services/ModeContextRetriever.ts` (line 2) | `import { ModeRetrievedChunk }` → `import { ModeRetrievedContext as HybridContext }` | The class declared a return type `Promise<HybridContext>` (line 175) but `HybridContext` was never imported. The actual return shape is `ModeRetrievedContext` from `ModeHybridRetriever`. Real bug that would surface on first call to `retrieveHybrid()`. |

**Verification:** `npm run build:electron` succeeds (`Done in 1211ms`). Typecheck error
`TS2304: Cannot find name 'HybridContext'` is removed.

### 0.6 Critical fix: ProviderRouting test hang → resolved

**Symptom on entry:**
* `node --test electron/services/__tests__/ProviderRouting.test.mjs` **hung indefinitely**
  (>60s with no output even after subtests appeared to complete).
* Same hang reproduced when running the full `npm test` — interrupted at
  `ProviderRouting`/`ScreenContextService`/`SensitiveLogRedaction`/`SsrfProtection`/
  `SttApiKeyRedaction`/`TelemetryService`/`TestDiscovery`/`TrialIpcRedaction`
  with exit code 144 (SIGURG / killed).

**Root cause:**
`electron/services/RateLimiter.ts:37` registers `setInterval(() => this.refill(), 1000)`
in the constructor and only clears it in `destroy()`. The unit tests construct
many `RateLimiter` instances without calling `destroy()`. Node's test runner waits
for the event loop to drain before exiting, and the live `setInterval` keeps it
alive forever.

**Fix:**
```ts
// electron/services/RateLimiter.ts
this.refillTimer = setInterval(() => this.refill(), 1000);
if (this.refillTimer && typeof this.refillTimer.unref === 'function') {
    this.refillTimer.unref();
}
```

Standard Node pattern: `unref()` lets the process exit even when the timer is
still scheduled. Production behavior is unchanged because production processes
(Electron main) hold the loop open via other refs (IPC, BrowserWindow, etc.).

**Verification:**
```
$ node --test --test-timeout=15000 electron/services/__tests__/ProviderRouting.test.mjs
…
ℹ tests 20
ℹ pass 20
ℹ fail 0
ℹ duration_ms 198.548833
```

**Audit severity:** medium-high (silent regression test gap; CI would have hung
forever once these tests were enabled).

**UI changes:** none.

**Backend behavior changes:** none in production; only test environment.

**Security/privacy impact:** none.

**Tests added:** none new — the existing tests now run to completion.

**Manual/E2E scenario tested:** N/A (test-infra fix).

**Result:** ProviderRouting suite passes 20/20 in <200ms.

**Remaining risk:** none. unref() is the canonical Node pattern for service-level intervals.

**Follow-up:** review other long-lived intervals/timers across the codebase for
the same anti-pattern. Quick grep target: `setInterval` outside Electron-only
paths.

### 0.7 Pre-existing failures — NONE

After §0.5 and §0.6 above, **0 tests fail** across all 25 suites under
`electron/services/__tests__/` and `electron/llm/__tests__/`.

The 78.7% pass rate in `QA_REPORT.md` refers to the **prompt/mode quality
evaluation harness** (`electron/test/modes-live-response-eval.ts`), not the
unit test suite. That harness scores live LLM responses against expected
patterns — those failures are real prompt/mode behavior bugs documented in
`QA_REPORT.md` and tracked in the roadmap as Phase-2/Phase-5 follow-ups.

---

## Phase 1 — Security/privacy blockers ✅ (verified shipped)

### 1.1 Trial token leak through IPC — verified

**Test:** `electron/services/__tests__/TrialIpcRedaction.test.mjs` (2/2 pass).
* `trial IPC handlers do not return raw trial tokens to the renderer`
* `renderer trial type definitions exclude token-bearing fields`

**Status:** Implemented and tested by prior pass. **No work needed in this pass.**

### 1.2 STT provider keys leak through `get-stored-credentials` — verified

**Tests:** `SttApiKeyRedaction` (4/4) + `CredentialStorage` (3/3).
* `get-stored-credentials IPC does not return raw STT API keys`
* `error fallback in get-stored-credentials does not return raw STT keys`
* `renderer settings overlay does not rely on raw STT keys from IPC`
* `STT key fields in IPC response follow masked or boolean-only pattern`
* `CredentialsManager does not persist plaintext fallback credentials`
* `CredentialsManager removes plaintext fallback files instead of loading them`
* `SettingsManager does not log full settings JSON`

**Status:** Implemented and tested. **No work needed in this pass.**

### 1.3 Renderer-supplied image/file paths — verified

**Test:** `ImagePathValidation` (5/5).
* `generate-code-hint validates imagePaths before using them`
* `generate-brainstorm validates imagePaths before using them`
* `runWhatShouldISay receives validated imagePaths from IPC handler`
* `image path validation rejects path traversal attempts`
* `image path validation is applied at IPC handler level`

**Status:** Implemented and tested. **No work needed in this pass.**

**Follow-up (roadmap):** verify symlink and Windows UNC path coverage; both are
listed as gaps in §1.3 of the roadmap.

### 1.4 Custom cURL provider SSRF — verified

**Tests:** `SsrfProtection` (5/5) + `ExternalUrlIpc` (2/2).
* `chatWithCurl validates URL against SSRF-protected address ranges`
* `URL validation function exists for SSRF protection`
* `axios call in chatWithCurl uses validated URL`
* `path traversal is blocked in URL variable substitution`
* `blocked SSRF hosts are explicitly rejected`
* `open-external IPC only allows known external destinations`
* `open-external IPC does not log attacker-controlled URLs`

**Status:** Implemented and tested. **No work needed in this pass.**

**Follow-up (roadmap):** verify cloud-metadata IP coverage
(`169.254.169.254`, `metadata.google.internal`) explicitly; add data-scope
controls (transcript/screenshots/references/profile/history flags) — these are
not yet present per the audit.

### 1.5 Sensitive logging — verified

**Test:** `SensitiveLogRedaction` (5/5).
* `SessionTracker logs transcript and assistant message metadata without text snippets`
* `IntelligenceEngine logs interim transcript metadata without text snippets`
* `LLMHelper logs request and custom provider metadata without prompt or response snippets`
* `STT providers log transcript metadata without transcript text`
* `IPC and meeting summary logs avoid answer and LLM response snippets`

**Status:** Implemented and tested. **No work needed in this pass.**

### 1.6 Privacy / retention foundation — NOT shipped

No tests, no setting, no UI. Listed in roadmap §1.6.

---

## Phase 2 — Mode runtime + mode bleeding ✅ (verified shipped, foundation)

**Tests:** `ModeBleeding` (4 sub-suites, 12 tests) + `ModesManager` (9 tests) +
`ModeContextRetriever` (3 tests). All pass.

Highlights:
* `stopMeeting snapshots active mode before session.reset()`
* `stopMeeting passes modeSnapshot to processAndSaveMeeting`
* `processAndSaveMeeting uses snapshotted mode ID for section lookup`
* `modes:set-active IPC clears session context before calling setActiveMode`
* `SessionTracker has clearSessionContext method`
* `IntelligenceManager exposes clearSessionContext to IPC handlers`
* `getActiveModeSystemPromptSuffix strips shared prefix to avoid duplication`
* `switching active mode immediately changes context and prevents stale reference leakage`

**What's still missing (roadmap §2.1):** the formal `ModeDefinition / ModeRuntime
/ ModePolicy / ModeActionRegistry` split. Today the snapshot is captured ad-hoc
in `MeetingPersistence` and `IntelligenceManager`; the right end-state is a
single `ModeRuntime.startMeeting() → MeetingModeContext` that captures all
policies (RAG, provider, retention, output, telemetry labels) atomically.

The current ad-hoc snapshot is **correct enough to pass the bleeding tests**
but does not centralize the per-mode policy attachment legacy overlay-style.

---

## Phase 3 — Dynamic actions ⚠️ backend ✅, UI/wiring ❌

### Backend (verified shipped)

**Tests:** `DynamicActionEngine` (13/13).
* `Pricing objection detected in Sales transcript creates pricing_objection action`
* `Competitor mention (Gong) detected creates competitor_mention action`
* `Action item pattern detected creates action_item action`
* `Behavioral question pattern creates STAR action`
* `Duplicate action suppressed within window`
* `Action expires after maxAgeMs`
* `acceptAction marks status as accepted`
* `dismissAction marks status as dismissed`
* `getTopActions returns max 3 actions ordered by priority`
* `Evidence refs contain transcript snippet and timestamp`
* `dynamic actions are isolated by session and mode to prevent bleeding`
* `completeAction removes accepted action from active top actions`
* `dismissed action can be re-detected after user dismissal`

### Wiring + UI — NOT shipped

`DynamicActionEngine` is **not constructed anywhere in `IntelligenceEngine`,
`IntelligenceManager`, `ipcHandlers`, or `main.ts`** (verified by `grep`).
No event channel exists between engine and renderer. No React component renders
a card. **This is the single most impactful unshipped product feature.**

**Concrete next steps** (full plan in roadmap §3.1–§3.3):
1. Construct `DynamicActionEngine` once per session in `IntelligenceManager`,
   pass to `IntelligenceEngine`. Call `detectActions()` from inside
   `IntelligenceEngine.handleTranscript` (line 226) on every final segment.
   Emit a new `dynamic_action_emitted` event.
2. In `main.ts` (alongside other `intelligenceManager.on(...)` handlers around
   line 2850–2960), forward `dynamic_action_emitted` to renderer via
   `webContents.send('intelligence-dynamic-action', { action })`.
3. Add IPC handlers `dynamic-action:accept`, `dynamic-action:dismiss`,
   `dynamic-action:list` that delegate to `engine.acceptAction(id)` etc.
4. Expose `onDynamicAction(callback)` and `acceptDynamicAction(id)` in
   `electron/preload.ts`.
5. Add type defs in `src/types/electron.d.ts`.
6. Build `src/components/dynamic-actions/{DynamicActionBar,DynamicActionCard,
   ActionEvidencePopover}.tsx`.
7. Mount `DynamicActionBar` above the answer area in
   `src/components/AnswerCueInterface.tsx`. Hook keyboard `Tab` to accept the
   primary card.

Estimated effort: 1.5–2 days for a polished first cut.

---

## Phase 4 — Screen / OCR ⚠️ service ✅, pipeline integration ❌

### Service (verified shipped)

**Tests:** `ScreenContextService` (6/6).
* Handles non-existent file gracefully
* Does not expose cached context across different image hashes
* Cache hit updates timestamp without reusing unsafe path input

### Pipeline integration — NOT shipped

`ScreenContextService.getCurrent()` is not called from `WhatToAnswerLLM` or
`PromptAssembler`. Vision/OCR data therefore does not reach the answer prompt
even when present. No UI indicator. See roadmap §4.

---

## Phase 5 — PromptAssembler ⚠️ module ✅, hot-path migration ❌

### Module (verified shipped)

**Tests:** `PromptAssembler` (16/16). Notably:
* `prompt injection in reference file: content escaped but included`
* `filename with XML injection is escaped in reference block`
* `transcript with prompt injection pattern is not acted upon`
* `assemble adds mode custom instructions block once for active mode`
* `screen context block has UNTRUSTED_SCREEN trust level`
* `token budget enforcement truncates lowest-priority blocks`
* `assemble orders blocks by trust level (highest first)`

### Hot-path migration — NOT shipped

`WhatToAnswerLLM`, `LLMHelper`, `IntentClassifier`, etc. still build prompts via
direct string concatenation. The unsafe full-raw reference fallback in
`MeetingPersistence.ts:170-200` (`MAX_FILE_CHARS=12_000` raw dump) is also
still in place. See roadmap §5.

---

## Phase 6 — Hybrid RAG ⚠️ retriever ✅, integration ❌

### Retriever (verified shipped, including lexical fallback)

**Tests:** `ModeHybridRetriever` (6/6).
* `Semantic match works when keyword absent - vector finds synonym`
* `Prompt injection content is escaped in retrieved chunks`
* `Citation/evidence attached to each chunk`
* `Fallback to lexical when embedding provider unavailable`
* `Combined score combines FTS + vector correctly`
* `Deduplication removes chunks from same file with lower score`

### Integration — NOT shipped

`ModesManager.buildActiveModeContextBlock` still uses the lexical
`ModeContextRetriever.retrieve()`. The new `retrieveHybrid()` exists on
`ModeContextRetriever` (was bug-fixed in §0.5) but no caller invokes it. DB
migrations for `mode_reference_chunks / *_embeddings / *_fts /
*_index_state` may also need to be added — to be confirmed in
`DatabaseManager.ts` migrations. See roadmap §6.

---

## Phase 7 — Provider routing ⚠️ router ✅, gateway ❌

### Router (verified shipped, fixed in this pass)

**Tests:** `ProviderRouting` (20/20). See §0.6 above for the fix that unblocked
this suite.

* RateLimiter: createProvider helpers, acquire, queue cap, destroy semantics
* CircuitBreaker: state machine, open/closed/half-open transitions, half-open call cap
* ProviderRouter: default selection, local-only, vision preference, low-latency preference, summary action, down-provider skip, mode routing, success/failure recording, health snapshot
* Integration: rate limiter acquire is called before provider request

### Gateway — NOT shipped

There is no `ProviderGateway.execute(req, { mode, action, dataScopes,
latencyClass })` wrapping every provider call. Today individual providers
acquire rate limits ad-hoc and the test asserts only the *intent* of the
wiring — not that every call site is covered. A grep of direct
`gemini.invoke / openai.chat / anthropic.messages` outside provider modules is
the gating audit. See roadmap §7.

---

## Phase 8 — Telemetry ⚠️ service ✅, emission sites ❌

### Service (verified shipped, including redaction)

**Tests:** `TelemetryService` (8/8).
* `event append writes JSONL locally when enabled`
* `disabled service does not write`
* `API keys and tokens are redacted from properties`
* `transcript, reference, prompt, and screenshot-like fields are removed or replaced`
* `dynamic action lifecycle event payload contains no evidence text`
* `provider fallback and error events retain safe metadata but no raw body`
* `invalid and unserializable properties do not crash`
* `JSONL records are one event per line`

### Emission sites — NOT shipped

No call sites emit telemetry. The complete event vocabulary
(`meeting_start / mode_switched / dynamic_action_* / llm_request_* /
provider_fallback / stt_* / rag_* / screen_context_* / post_call_summary_*`)
is defined but not invoked from production code. No diagnostics panel exists.
See roadmap §8.

---

## Phase 9 — Post-call workflow ⚠️ workflow ✅, UI surface ❌

### Workflow (verified shipped)

**Tests:** `PostCallWorkflow` (9/9).
* `extractStructuredActionItems captures owner, deadline, and stable ids`
* `extractStructuredActionItems merges summary action items without duplicates`
* `buildFollowUpDraft includes overview and structured next steps`
* `generateCoachingInsights flags sales objection with no captured objection section`
* `generateCoachingInsights uses mode-specific coaching rules`
* `buildPostCallEnhancements returns schema v2 payload`
* `post-call schema remains JSON-safe and excludes raw transcript fields`
* `structured action items cap at eight and keep deterministic ids after dedupe`

### UI surface — NOT shipped

`PostCallWorkflow.buildPostCallEnhancements()` is not called from
`MeetingPersistence` or any post-call screen. The schema-v2 payload exists in
isolation. See roadmap §9.

---

## Phase 3 — Dynamic actions ✅ wiring + UI shipped this pass

### Backend wiring (new this pass)

* **`electron/IntelligenceEngine.ts`** — added `dynamicActionEngine` field,
  `setDynamicActionContext({ sessionId, modeId, modeTemplateType })`,
  `clearDynamicActionContext()`, `acceptDynamicAction(id)`,
  `dismissDynamicAction(id)`, `getActiveDynamicActions()`, and
  `_setDynamicActionEngineForTest()` injection seam. `handleTranscript` now
  calls `detectAndEmitDynamicActions(segment)` on every **final** segment;
  emission is wrapped in a `try/catch` so a regex/store fault never breaks
  the answer pipeline. New event `'dynamic_action_emitted': (action) => void`
  added to `IntelligenceModeEvents`.
* **`electron/IntelligenceManager.ts`** — forwarding of the new event added
  to the `forwardEngineEvents` allow-list. Public delegators
  `setDynamicActionContext`, `clearDynamicActionContext`,
  `acceptDynamicAction`, `dismissDynamicAction`, `getActiveDynamicActions`
  exposed on the facade. Type re-export `DynamicAction` added.
* **`electron/main.ts`** — added a forwarder
  `intelligenceManager.on('dynamic_action_emitted', ...)` that broadcasts
  to launcher + overlay via `webContents.send('intelligence-dynamic-action',
  { action })`. `startMeeting()` now mints a fresh `sessionId` and calls
  `setDynamicActionContext` so the engine knows what to detect against.
* **`electron/ipcHandlers.ts`** — added three IPC handlers:
  `dynamic-action:accept`, `dynamic-action:dismiss`, `dynamic-action:list`.
  `modes:set-active` now re-binds the dynamic-action context with a fresh
  sessionId (flushing the per-session store so old-mode candidates do not
  leak across mode switches).
* **`electron/preload.ts`** — exposed `onIntelligenceDynamicAction`,
  `acceptDynamicAction`, `dismissDynamicAction`, `listDynamicActions` on
  `window.electronAPI`.

### Renderer wiring (new this pass)

* **`src/types/electron.d.ts`** — added `DynamicActionPayload` +
  `DynamicActionEvidenceRef` interfaces and the four new
  `ElectronAPI` methods so the renderer is fully type-safe at the IPC
  boundary.
* **`src/components/dynamic-actions/DynamicActionCard.tsx`** (new, 95 LOC) —
  presentation-only card with confidence pct, evidence snippet, primary-card
  accent, `Tab` shortcut hint, and dismiss button. Framer-motion entry/exit.
* **`src/components/dynamic-actions/DynamicActionBar.tsx`** (new, 105 LOC) —
  subscribes to `onIntelligenceDynamicAction`, dedupes by id,
  prunes stale (>60 s) cards, sorts by priority desc, caps at 3 visible,
  binds global `Tab` keypress to accept the primary card (skipping when
  focus is in an editable element), self-hides when empty.
* **`src/components/AnswerCueInterface.tsx`** — mounted `<DynamicActionBar>`
  between status pills and rolling transcript. `onAcceptAction` populates
  the input with the action label and triggers existing `handleManualSubmit`
  (so the action stream-answers through the normal LLM path).

### Verification (new this pass)

* New test: `electron/services/__tests__/IntelligenceEngineDynamicActions.test.mjs`
  — 8 tests, all pass:
  * final transcript emits action with correct mode/session ids
  * non-final transcript does not emit
  * unbound engine is a safe no-op
  * `clearDynamicActionContext` stops emissions
  * changing sessionId flushes the store (no cross-meeting bleed)
  * detect failure inside engine never breaks the transcript path
  * accept/dismiss delegate correctly
  * accept on unbound engine returns null

### Status table

| Layer | State |
|---|---|
| Backend engine | shipped + 13/13 tests pass |
| Engine wiring (IntelligenceEngine.handleTranscript) | shipped + 8/8 tests pass |
| Manager facade | shipped |
| main.ts → renderer forwarding | shipped |
| IPC accept/dismiss/list | shipped |
| Preload + renderer types | shipped |
| DynamicActionBar / Card components | shipped |
| Mounted in AnswerCueInterface | shipped |
| Tab keyboard shortcut | shipped |
| End-to-end smoke (real Electron meeting) | **not run this pass** — needs manual click-through |
| Telemetry events for action lifecycle | not wired (Phase 8 follow-up) |
| Per-mode trigger pack expansion (general/negotiation/expanded sales) | shipped — 15/15 targeted tests, 358/358 full suite |

---

## Pass 4 — 2026-05-15 (Phase 3.3 trigger pack expansion)

### Dynamic action trigger packs ✅ shipped

* **`electron/services/dynamic-actions/DynamicActionDetector.ts`** — added `GENERAL_TRIGGERS` and `NEGOTIATION_TRIGGERS`; registered both in `MODE_TRIGGERS` so the live transcript path can emit actions in those modes.
* Expanded existing packs:
  * Sales: ROI/business-case and pricing-request actions.
  * Recruiting: candidate experience / motivation probe action.
  * Team meeting: blocker clarification and owner/deadline locking actions.
  * Interview: intro pitch, company motivation, and weakness-question actions.
  * Technical interview: complexity analysis and system-design outline actions.
  * Lecture: broader definition/formula matching and worked-example action.
* **`electron/services/__tests__/DynamicActionEngine.test.mjs`** — added service-level E2E coverage for 18 canonical legacy overlay-style phrases across eight modes and an explicit sales/negotiation/interview mode-isolation guard.

**Verification:**

```
npm run build:electron && node --test electron/services/__tests__/DynamicActionEngine.test.mjs
# 15/15 pass

npm test
# 358 tests / 35 suites / 0 fail / ~1.0s
```

**Manual/live Electron status:** not clicked through in the running app in this pass. The dynamic-action pipeline is already mounted in the live transcript flow from Phase 3, so this pass verifies the detector/engine side that feeds that pipeline; Playwright/live Electron coverage remains Phase 11 follow-up.

---

## Pass 5 — 2026-05-15 (Phase 4 screen/OCR answer-path integration)

### Screen/OCR context reachable from What Should I Say ✅ partial shipped

* **`electron/ipcHandlers.ts`** — `generate-what-to-say` now OCR-processes already-attached, already-validated screenshots through `ScreenContextService.captureScreenFromPath()`. It returns only safe metadata (`screenContextStatus`, `ocrTextLength`) and never returns OCR text to the renderer. Invalid image paths still return before OCR.
* **`electron/IntelligenceManager.ts`** — `runWhatShouldISay` options now accept `screenContext`.
* **`electron/IntelligenceEngine.ts`** — `runWhatShouldISay` forwards `options.screenContext` into `WhatToAnswerLLM.generateStream(..., imagePaths, screenContext)`. Logging contains only OCR availability/length, not OCR body.
* **`src/types/electron.d.ts`** — renderer IPC type now includes screen-context status metadata.
* **`src/components/AnswerCueInterface.tsx`** — the screen-context pill reports `OCR attached` or `OCR unavailable` after a screenshot-backed answer request.

**Verification:**

```
npm run build:electron && node --test \
  electron/services/__tests__/ScreenContextService.test.mjs \
  electron/services/__tests__/IntelligenceEngineScreenContext.test.mjs
# 8/8 pass

npm test
# 366 tests / 36 suites / 0 fail
```

**Honest scope:** this does not add silent/continuous screen observation. OCR is only applied to screenshots the user already attached or capture-and-processed. Live Electron click-through and Playwright coverage remain pending.

---

## Pass 7 — 2026-05-15 (Phase 2 mode snapshot/runtime hardening)

### Snapshotted post-call mode context no longer depends on a private ModesManager helper ✅ shipped

* **`electron/services/ModesManager.ts`** — exported `encodeModeContextPayload` so post-call processing can safely encode snapshotted mode custom context and reference-file payloads at runtime.
* **`electron/MeetingPersistence.ts`** already snapshots active mode id/name/templateType before `session.reset()` and passes it into `processAndSaveMeeting(...)`; this pass verified that implementation and fixed the missing export needed by its snapshotted mode-context branch.
* **`electron/services/__tests__/ModesManager.test.mjs`** — added an explicit exported-encoder contract test with XML delimiter escaping.
* **`electron/services/__tests__/ModeBleeding.test.mjs`** remains the source-level guard for snapshot ordering, post-call snapshot use, transient context clearing on `modes:set-active`, and active-mode suffix dedupe.

**Verification:**

```
npm run build:electron && node --test \
  electron/services/__tests__/ModesManager.test.mjs \
  electron/services/__tests__/ModeBleeding.test.mjs
# 19/19 pass

npm test
# 370 tests / 36 suites / 0 fail / ~45s
```

**Honest scope:** this fixes and verifies the correctness gate for mode bleeding. The larger `ModeRuntime/ModePolicy/ModeActionRegistry` decomposition remains a cleanup/refactor item, and stream-cancellation on mode switch remains a follow-up.

---

## Pass 6 — 2026-05-15 (Phase 5 PromptAssembler answer hot-path migration)

### PromptAssembler now builds the live What Should I Say user message ✅ partial shipped

* **`electron/services/context/PromptAssembler.ts`** — added runtime `intentContext` and `retrievedModeContext` inputs. Intent context is represented as `DEVELOPER_POLICY`; retrieved active-mode/RAG context is represented as `UNTRUSTED_REFERENCE`.
* **`electron/llm/WhatToAnswerLLM.ts`** — replaced manual concatenation of intent, prior responses, OCR screen context, retrieved mode context, and transcript with `PromptAssembler.assemble({...})`. The existing `streamChat(packet.userMessage, imagePaths, undefined, finalPromptOverride, true, true)` contract is preserved.
* Trusted active-mode prompt suffix remains only in `finalPromptOverride`; untrusted retrieved mode/reference content remains in the user message. Screenshot `imagePaths` still pass through to the provider route unchanged.
* **`electron/services/__tests__/PromptAssembler.test.mjs`** — added coverage for runtime intent and retrieved-mode-context blocks.
* **`electron/llm/__tests__/suggestionPromptAssembly.test.mjs`** — added runtime coverage that `WhatToAnswerLLM` assembles intent, prior responses, OCR screen context, and transcript as user content while preserving image paths and keeping OCR/history out of the system prompt.

**Verification:**

```
npm run build:electron && node --test \
  electron/services/__tests__/PromptAssembler.test.mjs \
  electron/llm/__tests__/suggestionPromptAssembly.test.mjs
# 26/26 pass

npm test
# 369 tests / 36 suites / 0 fail / ~45s
```

**Honest scope:** this completes the answer hot-path migration only. Other prompt-construction paths still need migration; the live full-raw reference fallback was removed in Pass 8 below.

---

## Pass 8 — 2026-05-15 (raw active-mode reference fallback hardening)

### Live prompts no longer dump full active-mode reference files when retrieval misses ✅ shipped

* **`electron/llm/WhatToAnswerLLM.ts`** — keeps the async hybrid retrieval preference and sync lexical fallback, but no longer calls `buildActiveModeContextBlock()` if retrieval returns no snippets. A retrieval miss now means no active-mode reference block is sent in the user message.
* **`electron/LLMHelper.ts`** — `generateSuggestion` now uses `buildRetrievedActiveModeContextBlock(lastQuestion, context, 1800) || ''` instead of falling back to a full raw active-mode context dump. Generic `streamChat` active-mode injection likewise uses retrieved context only.
* **`electron/llm/__tests__/suggestionPromptAssembly.test.mjs`** — source and runtime guards assert that `WhatToAnswerLLM` does not call the raw fallback, raw sentinel content does not appear when retrieval misses, retrieved context still travels as user content, and trusted active-mode suffixes remain only in the system prompt.

**Verification:**

```
npm run build:electron && node --test \
  electron/llm/__tests__/suggestionPromptAssembly.test.mjs \
  electron/services/__tests__/ModesManager.test.mjs
# 19/19 pass

npm test
# 371 tests / 36 suites / 0 fail / ~45s
```

**Honest scope:** `ModesManager.buildActiveModeContextBlock()` remains available for legacy/supporting callers and tests. The correctness gate fixed here is narrower: live answer/suggestion/chat prompt paths no longer use it as a retrieval-miss fallback, so large reference files are not silently injected into live prompts outside the RAG boundary.

---

## Phase 10 — UX polish ⚠️ partial (status indicators ✅, dynamic action bar ✅, settings/onboarding ❌)

### Already in place on entry

* Active mode badge during meeting (`AnswerCueInterface.tsx:3084`).
* STT status pill (`:3088`).
* Screen-context indicator pill (`:3092`).
* Privacy / LLM provider pill (`:3096`).
* Permission warning banners (screen-recording denial, STT not configured).
* Custom provider data-scope hooks via curlUtils SSRF guard.

### New this pass

* **DynamicActionBar** mounted into the answer surface — covers the single
  largest visible legacy overlay-parity gap. See Phase 3 above for full spec.

### Still in roadmap

* Masked-key Settings UI (Configured / Replace / Remove).
* Custom-provider data-scope toggles UI (transcript / screenshots /
  references / profile / history).
* Retention controls UI (forever / 7d / 30d / never).
* Onboarding wizard improvements (mic test, system audio test, AI provider
  test, first reference file).
* Diagnostics panel (provider status, STT status, last error, average
  answer latency, RAG hit rate, screen permission status).

---

## Phase 11 — Full test suite + final report ✅ regression clean

### Final regression run (post-pass)

Command run: `npm test`

Result:
```
ℹ tests 312
ℹ suites 28
ℹ pass 312
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1057.834
```

**312 tests across 28 suites, 0 failures, ~1.06 s.** This is a hard regression
contract for everything else built on top.

### What changed in the test surface

* `electron/services/__tests__/IntelligenceEngineDynamicActions.test.mjs` (new, 8 tests)
* `electron/services/RateLimiter.ts` `setInterval(...).unref()` fix
  unblocked the entire suite — pre-pass it would hang on `ProviderRouting`,
  `ScreenContextService`, `SsrfProtection`, `SttApiKeyRedaction`,
  `TelemetryService`, `TestDiscovery`, `TrialIpcRedaction`. Post-pass the
  full `npm test` runs to completion in ~1 s.

### Remaining QA gaps

* `electron/test/modes-live-response-eval.ts` (the **prompt-quality** harness,
  not the unit suite) reports 48/61 (78.7%). Those failures are real
  hallucination/mode-accuracy bugs in `prompts.ts` documented in
  `/QA_REPORT.md` (BUG-001 through BUG-011). Tracked as Phase-2/Phase-5
  follow-ups in the roadmap.
* No Playwright E2E suite yet. No CI gate wired. See roadmap §11.

---

## Pass 3 — 2026-05-15 (telemetry + hybrid RAG + retention + post-call UI)

### Phase 6 — Telemetry emission sites ✅ shipped

* **`electron/services/telemetry/TelemetryService.ts`** — added `configure(config)` for runtime reconfiguration so the singleton can swap from `process.cwd()/logs` to the real `app.getPath('userData')/logs/telemetry.jsonl`. Added `isEnabled()`. (Linter also expanded the redaction key list — `query`, `chunk`, `snippet`, `message`, `content`, etc. — and added `rag_lexical_fallback` to the typed event-name union.)
* **`electron/main.ts`** — at app.whenReady, configures telemetry with `userDataPath` and `telemetryEnabled` setting; emits `app_start`. In `startMeeting()` emits `meeting_start` with sanitized props (mode template, hasMetadata, no PII). In `endMeeting()` emits `meeting_stop` early — before any teardown. The `dynamic_action_emitted` forwarder also tracks `dynamic_action_detected` (id/type/confidence/priority — no transcript, no evidence body).
* **`electron/ipcHandlers.ts`** — `dynamic-action:accept` emits `dynamic_action_accepted`; `dynamic-action:dismiss` emits `dynamic_action_dismissed`; `modes:set-active` emits `mode_switched`.
* **`electron/MeetingPersistence.ts`** — `processAndSaveMeeting()` emits `post_call_summary_started` (counts/durations only), `post_call_summary_completed` (with action item / coaching insight / sections counts), and `post_call_summary_failed` (errorClass only) on the catch path.
* All `track()` calls are inside `try { ... } catch { /* non-fatal */ }` so a sink fault never breaks app behavior. Verified by an automated source check.

**Verification:** `electron/services/__tests__/TelemetryEmissionSites.test.mjs` — 8 tests, all pass. Asserts each call site exists, the dynamic-action-detected payload contains no transcript or evidence text, the post-call-started payload sends `transcriptSegmentCount` not `data.transcript`, and every `track()` is enclosed in a try block.

### Phase 4 — Hybrid RAG default on the answer hot path ✅ shipped

* **`electron/services/ModesManager.ts`** — added async `buildRetrievedActiveModeContextBlockHybrid(query, transcript, tokenBudget)` which calls into `ModeContextRetriever.retrieveHybrid`. Falls back to the existing sync lexical path internally if hybrid throws. Telemetry: `rag_query` on entry; `rag_hit` when hybrid returns content; `rag_lexical_fallback` when hybrid yields nothing but lexical did; `rag_miss` when both came back empty.
* **`electron/llm/WhatToAnswerLLM.ts`** — type slot for the optional async method; runtime branch prefers hybrid (await), falls back to sync lexical when method is missing or returns empty. The pre-existing `buildActiveModeContextBlock()` ad-hoc dump remains as the third-line fallback.

**Verification:** `electron/services/__tests__/RetentionAndHybridRag.test.mjs` — 3 of 7 tests cover this. All pass.

### Phase 9 — Retention foundation ✅ shipped

* **`electron/services/SettingsManager.ts`** — added `meetingRetention?: 'forever' | '7d' | '30d' | 'never'` and `telemetryEnabled?: boolean`. Defaults: retention=forever, telemetry=on (local-only).
* **`electron/MeetingPersistence.ts`** — `stopMeeting()` short-circuits when retention is `'never'` or when meeting metadata has `doNotPersist === true`. The do-not-persist branch still emits a `meeting_stop` telemetry event (with `persisted: false, reason: 'do_not_persist'`, no transcript) so usage analytics work, then calls `session.reset(); return null;` — no DB row, no `processAndSaveMeeting`, no summary LLM call, no plaintext written.
* **`docs/engineering/LOCAL_DB_ENCRYPTION_DESIGN.md`** — full design doc for SQLCipher-based at-rest encryption. Threat model, three options compared (SQLCipher recommended), key plumbing / migration / rotation / rollback plan, decision log. Implementation deferred — separate sprint.

**Verification:** `RetentionAndHybridRag.test.mjs` — 4 of 7 tests cover this. All pass.

### Phase 7 — Post-call enhancements visible in UI ✅ shipped

* **`src/components/MeetingDetails.tsx`** — extended the `Meeting.detailedSummary` type with `actionItemsStructured`, `followUpDraft`, `coachingInsights`, `schemaVersion: 2`. Added three new sections to the summary tab:
  * **Next Steps** — structured action items with owner + deadline metadata, rendered with emerald bullet + secondary-text owner/deadline subtitle.
  * **Coaching** — severity-tinted cards (warning amber / opportunity blue / info neutral) with optional evidence quote.
  * **Follow-up Draft** — pre-formatted email block with one-click Copy button (uses `navigator.clipboard`). Renders only when `followUpDraft.trim()` is truthy.
* The backend `buildPostCallEnhancements()` call in `MeetingPersistence.ts:310` was already in place from a prior pass — this pass connects it to the user-visible surface.

### Phase 11 — Test suite ✅ regression clean

```
$ npm test
ℹ tests 349
ℹ suites 34
ℹ pass 349
ℹ fail 0
ℹ duration_ms 986.268625
```

Net delta: **+24 tests, 0 regressions** (325 → 349).

---

### Manual / E2E scenarios that were *not* run this pass

For honesty, the following are **not** covered by automated tests and were
**not** clicked through manually in this session:

* DynamicActionCard rendering in the live Electron app (the React
  components were built and mounted, but the dev server was not started).
* Tab key intercept in real keyboard-focus scenarios.
* Multi-window broadcast (launcher + overlay simultaneously open).
* Mode switch during a live meeting visibly clearing the action bar.
* Long-session memory profile.
* Provider-failure UI message quality.

These are explicitly listed as **Phase 11 follow-ups** in the roadmap and
should be the first items in the next pass.

---

## Summary table — what this pass delivered

| Item | Before | After |
|---|---|---|
| ProviderRouting test suite | hung indefinitely → 0 verified test results | 20/20 pass in 199ms |
| `ModeContextRetriever.retrieveHybrid()` | unbuildable (`HybridContext` undefined) | builds and is type-safe |
| Verified passing test count across new infra | unknown (suite never completed) | ≥145 passing, 0 failing |
| `docs/engineering/ANSWERCUE_PARITY_FIX_LOG.md` | did not exist | source-of-truth log created |
| `docs/engineering/ANSWERCUE_PARITY_ROADMAP.md` | did not exist | concrete next-step ticket list created |

## Files changed in this pass

| File | Lines changed | Purpose |
|---|---|---|
| `electron/services/RateLimiter.ts` | +8/-2 | `setInterval(...).unref()` so test runner can exit |
| `electron/services/ModeContextRetriever.ts` | +1/-1 | fix missing `HybridContext` import |
| `electron/IntelligenceEngine.ts` | +~110 | DynamicActionEngine field + setDynamicActionContext + handleTranscript hook + accept/dismiss/list APIs + dynamic_action_emitted event + try/catch safety |
| `electron/IntelligenceManager.ts` | +~25 | event allow-list + delegators for dynamic-action API + DynamicAction type re-export |
| `electron/main.ts` | +~25 | startMeeting binds dynamic-action context with fresh sessionId; main.ts forwards `dynamic_action_emitted` → renderer via `intelligence-dynamic-action` IPC |
| `electron/ipcHandlers.ts` | +~50 | three new handlers: `dynamic-action:accept`, `dynamic-action:dismiss`, `dynamic-action:list`; modes:set-active rebinds context with fresh sessionId |
| `electron/preload.ts` | +14 | expose `onIntelligenceDynamicAction`, `acceptDynamicAction`, `dismissDynamicAction`, `listDynamicActions` |
| `src/types/electron.d.ts` | +35 | `DynamicActionPayload` + `DynamicActionEvidenceRef` types and four new ElectronAPI methods |
| `src/components/dynamic-actions/DynamicActionCard.tsx` | +95 (new) | presentation card |
| `src/components/dynamic-actions/DynamicActionBar.tsx` | +105 (new) | container, dedupe/expire, Tab shortcut |
| `src/components/AnswerCueInterface.tsx` | +18 | mount DynamicActionBar + onAcceptAction handler |
| `electron/services/__tests__/IntelligenceEngineDynamicActions.test.mjs` | +180 (new) | 8 wiring tests, all pass |
| `docs/engineering/ANSWERCUE_PARITY_FIX_LOG.md` | +new | this file |
| `docs/engineering/ANSWERCUE_PARITY_ROADMAP.md` | +new | concrete remaining work |

## Commands run in this pass

```
git status --short
git log --oneline -10
ls -la docs/engineering/
npm run typecheck:electron       # 27 pre-existing errors documented
npm run build:electron           # passes after fix in §0.5 (1211ms)
node --test electron/services/__tests__/TrialIpcRedaction.test.mjs \
              electron/services/__tests__/SttApiKeyRedaction.test.mjs \
              electron/services/__tests__/CredentialStorage.test.mjs \
              electron/services/__tests__/ImagePathValidation.test.mjs \
              electron/services/__tests__/SsrfProtection.test.mjs \
              electron/services/__tests__/SensitiveLogRedaction.test.mjs \
              electron/services/__tests__/ExternalUrlIpc.test.mjs
              # 26/26 pass
node --test --test-timeout=15000 electron/services/__tests__/DynamicActionEngine.test.mjs   # 13/13
node --test --test-timeout=15000 electron/services/__tests__/ScreenContextService.test.mjs  # 6/6
node --test --test-timeout=15000 electron/services/__tests__/TelemetryService.test.mjs      # 8/8
node --test --test-timeout=15000 electron/services/__tests__/ProviderRouting.test.mjs       # 20/20 after fix
```

## Honest position vs legacy overlay

| Dimension | Pre-pass score (audit) | Post-pass evidence |
|---|---|---|
| Security (1.1–1.5) | "must fix" | shipped, 26/26 tests pass |
| Mode bleeding | "unclear, P1" | shipped, 12/12 tests pass |
| Mode reference RAG | "lexical only, P2" | hybrid impl exists + tested, **integration pending** |
| Prompt assembly safety | "ad-hoc, P1" | assembler + trust levels exist + tested, **hot-path migration pending** |
| Provider routing | "no policy, P1" | router + breaker shipped + 20/20 tests pass after RateLimiter fix, **gateway pending** |
| Dynamic action cards | "missing, P0" | backend + wiring + UI shipped; trigger packs expanded across 8 modes; dynamic-action targeted suite 15/15 and full suite 358/358 pass; no live E2E click-through yet |
| Screen/OCR pipeline | "missing, P0" | service exists + tested, **integration pending** |
| Telemetry | "missing, P1" | service exists + tested, **emission sites pending** |
| Post-call workflow | "basic, P0" | enhancement engine exists + tested, **UI surface pending** |
| Retention / DB encryption | "missing" | not started |
| UX polish | "missing many states" | status pills present pre-pass; **DynamicActionBar shipped this pass**; settings/onboarding still in roadmap |
| Full E2E (Playwright) | "missing" | not started |

**Honest verdict:** AnswerCue now has a **substantially complete, well-tested
back-end foundation** for parity with legacy overlay on individual-user features. The
gap to legacy overlay-grade is no longer about the modules — it's about **wiring,
integration, and UI surface**, which is concrete week-scale work documented in
the roadmap.

AnswerCue is **not yet at individual legacy overlay parity in the running app** because
the user cannot see/use most of the new infrastructure. With ~2 weeks of focused
wiring + UI work following the roadmap, individual-tier parity is realistic.
Enterprise parity (CRM/ATS, team prompts, pre-call briefs) remains a multi-month
build per the original audit.
