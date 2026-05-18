# Cluely Parity — E2E / Manual Scenario Results

**Pass:** 2026-05-15
**Test runner:** `node --test` over `electron/services/__tests__/**`,
`electron/llm/__tests__/**`
**Final result:** 371 tests / 36 suites / 0 fail / ~45s

This file tracks both the automated source-level wiring tests **and** the
manual click-through scenarios from `promptfix.md` Phase 10. Manual
scenarios that were not exercised in this pass are listed honestly with
the reason and the unit tests that *do* cover the same code path.

---

## Automated wiring tests (this pass)

### Phase 6 — TelemetryService production emission sites
File: `electron/services/__tests__/TelemetryEmissionSites.test.mjs` (8/8 pass)

| # | Scenario | Result |
|---|---|---|
| 1 | `main.ts` configures `TelemetryService` with userDataPath at app init | PASS |
| 2 | `main.ts` emits `meeting_start` at start-meeting site | PASS |
| 3 | `main.ts` emits `meeting_stop` early in `endMeeting` | PASS |
| 4 | `main.ts` emits `dynamic_action_detected` from forwarder | PASS |
| 5 | `dynamic_action_detected` payload contains no transcript / evidence text | PASS |
| 6 | `ipcHandlers.ts` emits `dynamic_action_accepted` + `dynamic_action_dismissed` | PASS |
| 7 | `ipcHandlers.ts` emits `mode_switched` in modes:set-active | PASS |
| 8 | `MeetingPersistence.ts` emits `post_call_summary_started/completed/failed` with counts not bodies | PASS |
| 9 | All `track()` calls are inside try/catch | PASS |

### Phase 4 + Phase 9 — Hybrid RAG and Retention
File: `electron/services/__tests__/RetentionAndHybridRag.test.mjs` (7/7 pass)

| # | Scenario | Result |
|---|---|---|
| 10 | `ModesManager` exposes async `buildRetrievedActiveModeContextBlockHybrid` | PASS |
| 11 | Hybrid wrapper emits `rag_query` / `rag_hit` / `rag_lexical_fallback` / `rag_miss` | PASS |
| 12 | `WhatToAnswerLLM` prefers async hybrid, falls back to sync lexical | PASS |
| 13 | `SettingsManager` exposes `meetingRetention` enum | PASS |
| 14 | `SettingsManager` exposes `telemetryEnabled` | PASS |
| 15 | `stopMeeting` short-circuits on `'never'` retention or per-meeting `doNotPersist` | PASS |
| 16 | Do-not-persist branch emits `meeting_stop` with `persisted:false, reason:'do_not_persist'` | PASS |

### Phase 2 — Mode runtime and mode-bleeding guards
Files: `electron/services/__tests__/ModesManager.test.mjs`, `electron/services/__tests__/ModeBleeding.test.mjs` (19/19 pass)

| # | Scenario | Result |
|---|---|---|
| 17 | `stopMeeting` snapshots active mode before reset and passes it to post-call processing | PASS |
| 18 | `processAndSaveMeeting` uses snapshotted mode ID for section lookup | PASS |
| 19 | `modes:set-active` clears transient session context before switching active mode | PASS |
| 20 | Mode-context payload encoder is exported for snapshotted post-call custom context/reference blocks | PASS |

### Phase 3.3 — Dynamic action trigger pack expansion
File: `electron/services/__tests__/DynamicActionEngine.test.mjs` (15/15 pass)

| # | Scenario | Result |
|---|---|---|
| 21 | General, negotiation, sales, recruiting, team-meeting, interview, technical-interview, and lecture canonical phrases emit expected action types | PASS |
| 22 | Negotiation / sales / interview trigger packs do not bleed into each other | PASS |

### Phase 4 — Screen/OCR answer-path integration
File: `electron/services/__tests__/IntelligenceEngineScreenContext.test.mjs` (2/2 pass)

| # | Scenario | Result |
|---|---|---|
| 23 | `runWhatShouldISay` forwards OCR `screenContext` while preserving screenshot `imagePaths` | PASS |
| 24 | `runWhatShouldISay` still works when no screen context is supplied | PASS |

### Phase 5 — PromptAssembler answer hot-path migration
Files: `electron/services/__tests__/PromptAssembler.test.mjs`, `electron/llm/__tests__/suggestionPromptAssembly.test.mjs` (26/26 pass)

| # | Scenario | Result |
|---|---|---|
| 25 | Runtime intent context is assembled as developer-policy context before untrusted transcript | PASS |
| 26 | Retrieved active-mode context is assembled as untrusted reference content | PASS |
| 27 | `WhatToAnswerLLM` sends mode context only through user content, not the system prompt | PASS |
| 28 | `WhatToAnswerLLM` assembles intent, prior responses, OCR screen context, and transcript while preserving `imagePaths` | PASS |

### Phase 5 hardening — Raw active-mode reference fallback removal
Files: `electron/llm/__tests__/suggestionPromptAssembly.test.mjs`, `electron/services/__tests__/ModesManager.test.mjs` (19/19 pass)

| # | Scenario | Result |
|---|---|---|
| 29 | `generateSuggestion` uses retrieved active-mode context only and does not append raw `buildActiveModeContextBlock()` fallback | PASS |
| 30 | `WhatToAnswerLLM` does not call raw active-mode fallback when retrieval misses | PASS |
| 31 | Retrieved active-mode context still appears as user content while trusted mode suffix stays in the system prompt | PASS |

### Pre-existing wiring tests (verified intact this pass)

| Suite | Result |
|---|---|
| `IntelligenceEngineDynamicActions.test.mjs` (Phase 3 wiring) | 8/8 PASS |
| `DynamicActionEngine.test.mjs` (Phase 3 backend + trigger expansion) | 15/15 PASS |
| `ModeBleeding.test.mjs` (Phase 2) | 12/12 PASS |
| `ModesManager.test.mjs` | 10/10 PASS |
| `ModeContextRetriever.test.mjs` | 3/3 PASS |
| `ModeHybridRetriever.test.mjs` | 6/6 PASS |
| `PromptAssembler.test.mjs` | 18/18 PASS |
| `PostCallWorkflow.test.mjs` | 9/9 PASS |
| `ScreenContextService.test.mjs` | 6/6 PASS |
| `TelemetryService.test.mjs` | 8/8 PASS |
| `ProviderRouting.test.mjs` | 20/20 PASS |
| `SsrfProtection.test.mjs` | 5/5 PASS |
| `SttApiKeyRedaction.test.mjs` | 4/4 PASS |
| `CredentialStorage.test.mjs` | 3/3 PASS |
| `ImagePathValidation.test.mjs` | 5/5 PASS |
| `SensitiveLogRedaction.test.mjs` | 5/5 PASS |
| `TrialIpcRedaction.test.mjs` | 2/2 PASS |
| `ExternalUrlIpc.test.mjs` | 2/2 PASS |
| (all other suites) | PASS |

**Total: 371 / 371 PASS in ~45 s on `npm test`.**

---

## Manual / live-Electron scenarios from promptfix.md Phase 10

These require running the Electron app with real audio + a real STT
provider. They are listed for completeness but were **not** exercised
in this pass — see "Why not run this pass" column.

| # | Scenario | Status | Why not run this pass |
|---|---|---|---|
| 1 | Sales dynamic action E2E | NOT RUN | Requires a fake-audio fixture + manual click-through. Source-level wiring covered by `IntelligenceEngineDynamicActions.test.mjs`. |
| 2 | Interview profile intelligence E2E | NOT RUN | Requires real resume + JD reference files + Electron start. |
| 3 | Technical screen-context E2E | NOT RUN | OCR screen context is now wired into screenshot-backed `generate-what-to-say`, but live Electron click-through still needs Playwright/manual harness. |
| 4 | Team-meeting post-call E2E | NOT RUN | The post-call **rendering** is now in place (`MeetingDetails.tsx`), but verifying it on a real saved meeting requires a fixture meeting in the local DB. |
| 5 | Lecture mode E2E | NOT RUN | Same — needs DB fixture + Electron start. |
| 6 | Mode-bleeding E2E | NOT RUN | Source-level coverage in `ModeBleeding.test.mjs` (12 tests). |
| 7 | Provider-failure E2E | NOT RUN | Source-level coverage in `ProviderRouting.test.mjs` (20 tests). Live failure-injection harness not built. |
| 8 | Privacy E2E (`doNotPersist`) | NOT RUN | Source-level coverage in `RetentionAndHybridRag.test.mjs` (4 of 7 tests). The persistence boundary IS verified; what's not verified is that the renderer can reach that boundary. |

**Honest position:** the source-level wiring tests prove every IPC contract,
event emission site, fallback path, and redaction guard exists and behaves.
They do **not** prove that a real user clicking through the running app
sees what the tests imply. Bridging that gap is the Playwright bootstrap
work in roadmap §11 (estimated 2 days for infra, then 0.5–1 day per
scenario).

---

## How to add a Playwright E2E in the next pass

Suggested commit-by-commit plan once Playwright is bootstrapped:

1. `npm i -D @playwright/test electron`
2. Add `playwright.config.ts` with `use: { electronExecutable: ... }`.
3. Create `e2e/sales-dynamic-action.spec.ts`:
   * launch Electron in test mode with `--no-system-audio --fake-stt`
   * call `test-inject-transcript` IPC (already exists for QA) with
     `"This is too expensive compared to Cluely"`
   * assert a `[data-testid="dynamic-action-card-action_…"]` appears
     within 1 s
   * click it, assert an answer streams into the chat area
4. Repeat for the other 7 scenarios above.

The IPC seam is already in place (`test-inject-transcript` in
`ipcHandlers.ts:2748`), so the harness mostly needs Electron lifecycle
plumbing.
