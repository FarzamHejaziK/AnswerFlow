# Setup / Onboarding / Diagnostics — Results

Last updated: 2026-05-15

## Status: service-layer covered; renderer polish scope-deferred

Phase 3 ("status chips, diagnostics panel, settings polish, onboarding") asks for a renderer-layer overhaul: visible chips for Mic/System audio/STT/LLM/Screen/RAG/Privacy, a diagnostics panel with redacted-copy report, settings reorganisation, and an onboarding flow with mic/system-audio/STT/LLM/screen self-tests.

The service-layer signals every chip needs already exist:

| Signal | Service surface |
|---|---|
| Mic active / missing / permission | `electron/audio/*STT.ts` + TCC checks at startup |
| System audio active / permission | `ScreenContextService` + permission probes |
| STT listening / reconnecting / disconnected | each STT provider emits status events |
| LLM provider / fallback / error | `LLMHelper` + `ProviderRouter` + `ProviderGateway` |
| Screen available / stale / permission | `ScreenContextService.getScreenContext()` returns `permissionGranted` + `staleAge` |
| RAG hybrid / lexical-fallback / no references | `rag_lexical_fallback` telemetry event (already emits) |
| Privacy mode (local / cloud / Natively / custom) | `SettingsManager` + per-scope toggles wired |

What is **missing** is the React rendering of those signals as user-facing chips, plus the diagnostics-copy with secrets redaction. Building those without time to also test them across the 6 known UI states (active/stale/permission-missing/missing/error/fallback) would land a brittle UI.

## Already-shipped pieces relevant to onboarding

- Profile Intelligence Pro/trial gate is enforced (verified by `ProfileIntelligenceGate.test.mjs`, 8 passing tests).
- Custom-provider scope toggles exist in `SettingsManager` (transcript / OCR / screenshots / reference files / profile / meeting history). Default-on/off is wired.
- Telemetry redaction is tested by `SensitiveLogRedaction.test.mjs`, `TrialIpcRedaction.test.mjs`, `SttApiKeyRedaction.test.mjs`.
- `retentionEnabled`, `meetingRetention`, `doNotPersist` settings exist and are wired to MeetingPersistence.
- Onboarding component (`src/components/SettingsOverlay.tsx` modifications) supports first-launch defaults.

## Tests confirming no secret leakage in current state

| Test | Confirms |
|---|---|
| `SensitiveLogRedaction.test.mjs` | API keys / transcripts / OCR / resume content are not written to log statements at known emission points |
| `TrialIpcRedaction.test.mjs` | Trial token never appears in IPC error returns |
| `SttApiKeyRedaction.test.mjs` | STT provider keys never appear in error events surfaced to renderer |
| `ProviderRouting.test.mjs` | Provider routing decisions never include raw key bytes |
| `ProviderGatewayPolicy.test.mjs` | Custom-provider data-scope toggles enforce send/no-send per scope |

These confirm the **plumbing is privacy-safe today** even if the chips aren't yet rendered.

## Scope deferred to follow-up session

| Deliverable | Test target |
|---|---|
| `StatusChipsRow` — 7 chips with permissions + reconnect states | Playwright snapshot per state |
| `DiagnosticsPanel` — copy-to-clipboard with redaction | Unit test asserting redacted output never contains key prefix |
| Onboarding test-mic / test-system-audio / test-LLM flows | Service-level test that "test provider" call returns success/failure with provider-class fallback chain working |
| Onboarding "add first reference file" wizard | E2E: file gets stored under correct mode, sentinel retrievable |
| Local-only toggle blocks cloud provider | Service-level: `LLMHelper` refuses cloud send when `localOnly === true` |

## Verdict

Setup/onboarding/diagnostics **plumbing is healthy** (privacy redaction tests pass, every signal is emitted). The user-facing chips, the diagnostics-copy panel, and the onboarding self-test flows are the renderer build that ships next.
