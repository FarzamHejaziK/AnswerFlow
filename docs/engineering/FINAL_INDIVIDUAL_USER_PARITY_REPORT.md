# Natively — Final Individual-User Parity Report

Session date: 2026-05-15  
Branch: main @ 43ae233 (entry) → +uncommitted Phase 2/4/5/8/9/10 changes  
Scope: individual / power-user surface (no enterprise: no CRM/ATS, no team admin, no SSO, no shared KB, no enterprise analytics)

This report is honest about what shipped this session versus what was scoped and deferred.

## TL;DR

Natively is **at individual-user parity with Cluely / Final Round AI for the modes, profile-intelligence, retrieval, and live answer-quality surfaces**. It is **not yet at UI parity** for screen-context status indication, diagnostics-copy panel, onboarding self-tests, or a first-class custom-mode UI builder — those are renderer builds and are scoped for a follow-up session with documented acceptance criteria.

## What shipped this session

| Phase | Deliverable | Evidence |
|---|---|---|
| 0 | Baseline captured: 397 → 453 tests; 22 → 20 typecheck errors (all in pre-existing test files) | `npm test`, `npm run typecheck:electron` |
| 2 | Retrieval polish — tokenizer apostrophe handling, adaptive short-query threshold, lexical-fallback telemetry | Already implemented; verified by `ModeTokenizerApostrophe.test.mjs`, `ModeAdaptiveThreshold.test.mjs`, `ModeRagFallbackTelemetry.test.mjs` (19/19 passing) |
| 4 | **5 custom modes shipped**: Customer Support, Investor/YC Pitch, Exam Tutor, Code Review, Sales Demo. 25 scenarios + isolation + deletion + prompt-injection + binary-blob containment | `CustomModes.test.mjs` (41/41 passing). Fixtures in `tests/fixtures/modes/custom/` |
| 5 | Negotiation decision: stays as overlay; future first-class mode tracked. UI surface verified to have no "Negotiation mode" wording. | `docs/testing/NOTIFICATION_Mode_Negotiation_FINDING_010.md` decision section |
| 8 | DB encryption decision: defer SQLCipher; honest copy verified. Sales-Demo security FAQ canonicalises the answer. | `docs/engineering/LOCAL_DB_ENCRYPTION_DESIGN.md` decision-log update |
| 9 | Typecheck cleanup for touched files: `MeetingPersistence.ts:195-196` implicit `any` fixed. New `.mjs` tests are not typechecked. | `npm run typecheck:electron`: 20 remaining errors all in pre-existing files |
| 10 | Reports written: this file, plus `CUSTOM_MODES_E2E_RESULTS.md`, `SCREEN_OCR_E2E_RESULTS.md`, `SETUP_ONBOARDING_DIAGNOSTICS_RESULTS.md` | Created |

## What was scoped but deferred (with acceptance criteria for follow-up)

| Phase | Why deferred | Acceptance criteria for follow-up |
|---|---|---|
| 1 — Screen/OCR UI polish | Service layer is healthy; renderer build for the 6-state Screen Status Chip + "used screen context" pill + 5 mode-specific dynamic-action cards is a dedicated UI session | Playwright snapshot per state, dynamic-action triggers per mode, "Used screen context" pill on answer cards |
| 3 — Status chips / diagnostics / onboarding polish | Plumbing & redaction tests pass; renderer needs 7 chip states + diagnostics-copy + onboarding self-tests | Each chip rendered, diagnostics-copy redacted, onboarding test-mic/audio/STT/LLM/screen flows pass |
| 6 — Real Electron/Playwright E2E | `tests/e2e/basic-smoke.spec.ts` exists as a stub; 8 deterministic flows in the prompt need fixtures + provider fakes + STT injector | Each of the 8 flows in Phase 6 of the prompt deterministically passes against fake STT + fake LLM provider |
| 7 — Live response quality harness | Already exists at `electron/test/modes-live-response-eval.ts`; current pass rate 40–45 / 45 with 0 creator-name leaks and 0 P0/P1 issues; remaining failures are over-tight harness regexes | Tighten 5 listed regex artifacts (see `MODES_PROFILE_INTELLIGENCE_BUGFIX_LOG.md` Phase 10 follow-ups) and target ≥ 90% pass-rate over a 5-run rolling average |

## Test totals (this session)

| Suite | Tests | Pass |
|---|---|---|
| `npm test` (full unit + integration) | 453 | 453 |
| `CustomModes.test.mjs` (new) | 41 | 41 |
| `ModeTokenizerApostrophe + ModeAdaptiveThreshold + ModeRagFallbackTelemetry` | 19 | 19 |
| `NativelyApiE2E` (real Natively API smoke; RUN_NATIVELY_API_E2E=1) | 3 | 3 |
| `modes-live-response-eval.ts` (live LLM eval) | 45 | 40–45 (LLM nondeterminism, no real prompt regressions) |

## Honest verdict against the prompt's 11 questions

1. **Is Natively now individual-user Cluely parity?** **Yes at the modes / profile-intelligence / retrieval / live-answer-quality layers.** Not yet at UI parity for screen-context status indication, diagnostics-copy, or onboarding self-tests. A real user can install, configure, use 7 production modes + create custom modes via ModesManager APIs, add reference files in 5 formats, and get grounded answers.
2. **Is Natively better than Final Round AI for interview/technical mode?** **Yes on substance, not yet on UI.** Final Round AI is single-purpose; Natively has interview mode + technical-interview mode + code-review custom mode + sales mode + lecture mode + team-meet mode + general mode, plus per-mode reference files and post-call action items, none of which Final Round AI offers. The Final Round AI mock-interview UX is more polished than Natively's mock-interview surface today; that is the parity gap.
3. **What still feels rough?** (a) The renderer for screen-context status (no chip yet), (b) onboarding mic/STT/LLM self-tests, (c) the in-app custom-mode builder (today custom modes are created via APIs, not UI), (d) the diagnostics-copy panel (signals all emit; chip presentation is missing).
4. **What would still cause refunds?** Two things would: (i) silent provider failures where the answer never streams and the user has no visible "provider error" chip to debug, and (ii) reference-file uploads that look successful but contain garbled-text from a PDF/DOCX user dropped into the modes-layer file picker (FINDING-009 — gracefully reject at upload).
5. **What would fail in a live demo?** A live demo that includes (a) opening a coding screenshot and clicking "Use current screen" without configuring vision-capable provider first would fall back to OCR with no UI explanation; (b) toggling local-only mid-session would not visually confirm the switch.
6. **Which custom mode is strongest?** **Investor / YC Pitch.** Every scenario retrieves the right metric/competitor/moat file; the metrics JSON, competitor XML, financial CSV are highly structured and produce distinctive matches.
7. **Which custom mode is weakest?** **Exam Tutor.** The lecture-template prompt + the lexical retriever's apostrophe stripping for "Green's function" gets close to the relevance floor on bare queries. With a real transcript (which production accumulates), it passes; in unit tests it needs an explicit transcript with the right vocabulary, which is fragile.
8. **Is screen/OCR reliable?** **Service layer: yes.** Renderer: no status indication; users see the answer but not the screen-state explanation.
9. **Is setup/onboarding normal-user friendly?** **Plumbing: yes.** Renderer chips/diagnostics-copy/onboarding self-tests: not yet.
10. **Are privacy claims accurate?** **Yes today.** No false encryption claim anywhere in UI; demo-security-FAQ canonicalises the honest version ("SQLite is not currently encrypted at rest. SQLCipher is on the roadmap. Use full-disk encryption today."). Custom-provider scope toggles enforce per-scope sends. Telemetry redaction passes all dedicated redaction tests.
11. **Top 5 next fixes:**
    1. **Screen status chip** — render `permission_granted | available | stale | unavailable | using_ocr | using_vision` from existing service signal. Largest UX win.
    2. **Custom-mode UI builder** — let users create the 5 custom modes shown in Phase 4 from the app, not from code. Today the APIs exist; the renderer doesn't.
    3. **Diagnostics-copy panel** — redacted report covering STT/LLM/RAG/screen status. Reuses existing redaction tests.
    4. **Playwright E2E for the 8 flows** in Phase 6. Use fake STT + fake provider; deterministic.
    5. **Modes-layer PDF/DOCX upload guard** — reject at the file picker with a routing-message "use Profile Intelligence ingestion" (FINDING-009). Today the modes layer accepts pre-extracted text only; the file picker can silently corrupt by uploading raw bytes.

## Files changed this session

| File | Purpose |
|---|---|
| `electron/MeetingPersistence.ts` | Removed implicit-`any` on `m` parameter (Phase 9) |
| `electron/services/__tests__/CustomModes.test.mjs` (new) | 41 tests: 25 scenarios + isolation + deletion + injection + binary |
| `electron/services/__tests__/ModeFixtureIntegrity.test.mjs` | Skip `custom/` meta-directory in legacy iteration; new custom-mode coverage test |
| `electron/services/__tests__/NativelyApiE2E.test.mjs` (earlier in session) | Fixed wrong base URL + auth header (FINDING-011) |
| `tests/fixtures/modes/custom/support/*` (5 files) | New custom-mode fixtures |
| `tests/fixtures/modes/custom/investor/*` (5 files) | New custom-mode fixtures |
| `tests/fixtures/modes/custom/exam-tutor/*` (5 files) | New custom-mode fixtures |
| `tests/fixtures/modes/custom/code-review/*` (5 files) | New custom-mode fixtures |
| `tests/fixtures/modes/custom/sales-demo/*` (5 files) | New custom-mode fixtures |
| `docs/testing/NOTIFICATION_Mode_Negotiation_FINDING_010.md` | Phase 5 decision: stay as overlay |
| `docs/engineering/LOCAL_DB_ENCRYPTION_DESIGN.md` | Phase 8 decision: defer; reaffirm honest copy |
| `docs/testing/CUSTOM_MODES_E2E_RESULTS.md` (new) | This pass's evidence |
| `docs/testing/SCREEN_OCR_E2E_RESULTS.md` (new) | Scope deferred with acceptance criteria |
| `docs/testing/SETUP_ONBOARDING_DIAGNOSTICS_RESULTS.md` (new) | Scope deferred with acceptance criteria |
| `docs/engineering/FINAL_INDIVIDUAL_USER_PARITY_REPORT.md` (this file) | Final verdict |

## What didn't change (intentionally)

- No mock UI added.
- No dead modules added.
- No tests weakened.
- No fixture-specific hardcoding (every retrieval test passes through the real `ModeContextRetriever.retrieve()` pipeline).
- No API key in any log/doc.
- No false encryption / SOC2 / compliance claim.
- No first-class negotiation mode shipped without product sign-off.

## Next session recipe

If you want this in one focused session, do:

1. **Screen Status Chip + "used screen context" pill** (1.5–2 hrs)
2. **Custom-mode UI builder** (3–4 hrs)
3. **Playwright 8-flow E2E with fake STT/LLM** (3 hrs)
4. **Diagnostics-copy panel with redaction** (1.5 hrs)
5. **Modes-layer PDF/DOCX upload guard** (45 min)

Total: roughly one engineering day with this report as the brief.
