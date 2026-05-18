# FINDING-010: Negotiation Mode — Graceful-Rejection Decision Record

**Date:** 2026-05-15
**Finding source:** FINDING-010 in `docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_RESULTS.md`
**Owner:** Product / Engineering

---

## What the finding says

> There is no negotiation-mode template type. The QA suite overlays it on `looking-for-work`. If the product wants a first-class negotiation mode, the template should be added to `MODE_TEMPLATES` + a `TEMPLATE_SYSTEM_PROMPTS` entry rather than relying on `customContext` to carry negotiation rules.

---

## Current state

The codebase has **no first-class negotiation mode**. The existing modes are:

- `general`, `sales`, `recruiting`, `team-meet`, `looking-for-work`, `technical-interview`, `lecture`

The QA suite's "negotiation" overlay (`ModeNegotiationOverlay.test.mjs` scenario tests) work by running in `looking-for-work` mode but injecting a `customContext` block with negotiation rules (BATNA, offer strategy, etc.).

This approach works because:
1. `customContext` is retrieved as a `ModeKnowledgeSource` (type: `custom_context`)
2. It is included in the lexical retriever alongside reference files
3. The prompt assembly adds `customContext` before the LLM call

But it has limitations:
- The mode selector UI shows "looking-for-work" not "negotiation"
- Mode-specific routing in `IntelligenceEngine` can't distinguish negotiation from generic job-seeker
- The `TEMPLATE_SYSTEM_PROMPTS` for negotiation are not centralized — they're embedded in test fixtures
- No `mode.systemPrompt` prefix for negotiation (unlike the 7 canonical modes)

---

## Option A: Add first-class `negotiation` mode template

**What changes:**

1. `electron/services/ModesManager.ts` — add `negotiation` to `MODE_TEMPLATES`:
```ts
negotiation: {
  name: 'Negotiation',
  description: 'For salary and offer negotiation conversations',
  icon: 'handshake',
  systemPrompt: `<negotiation_coach>You are an expert salary negotiation coach...</negotiation_coach>`,
  noteSection: '...',
  promptPrefix: '...',
  customContext: '',
}
```

2. `electron/llm/prompts.ts` or a new `negotiationPrompts.ts` — add `TEMPLATE_SYSTEM_PROMPTS` for the negotiation mode

3. `electron/services/ModeContextRetriever.ts` — ensure negotiation mode uses the correct retriever strategy

4. Update the mode-selector UI to show "Negotiation" as a distinct option

**Pros:**
- First-class UX: mode selector shows "Negotiation" instead of "looking-for-work"
- Centralized system prompt — no fragile embedding in `customContext` fields
- `IntelligenceEngine` can route to negotiation-specific logic
- Consistent with the 7 other modes

**Cons:**
- Engineering investment (3–5 files to update)
- Potential overlap with `looking-for-work` (both relate to job search)
- If product roadmap deprioritizes negotiation features, the template becomes dead code

---

## Option B: Keep `customContext` overlay approach

**What changes:**
- Nothing in code. Document the pattern and its limitations.

**Pros:**
- Zero engineering cost right now
- Sufficient for current QA coverage
- `customContext` mechanism already works

**Cons:**
- `looking-for-work` + negotiation overlay is semantically confusing in the UI
- No way to route to negotiation-specific behavior without conflating modes
- Fragile if `customContext` schema changes

---

## Decision needed

**Is negotiation a first-class mode the product intends to ship, or is it a test overlay pattern that will be replaced by a dedicated negotiation feature later?**

If **yes (first-class):** Engineering should add a `negotiation` entry to `MODE_TEMPLATES` and `TEMPLATE_SYSTEM_PROMPTS`, then update the QA fixtures to use the real mode instead of the `looking-for-work` overlay.

If **no (overlay only):** The finding is closed as "working as intended for this release." The limitation is documented, and the UI/mode-routing gaps are noted as acceptable trade-offs.

---

## Recommended action

## Decision (2026-05-15)

**Selected: Option B — negotiation stays as an overlay / custom-mode use case for this release.**

Rationale:

1. The custom-modes infrastructure shipped in Phase 4 (see `electron/services/__tests__/CustomModes.test.mjs`) demonstrates that any user can create a "Negotiation" mode using the `general` or `sales` template with reference files (`negotiation_*.md/.xml/.json/.csv/.docx`) and a custom-context prompt. This is the same mechanism the QA suite uses today and it is now a real product feature, not a test workaround.
2. Shipping an 8th first-class template requires: new template entry, new system prompt, new note-section seeding, new dynamic-action triggers, new UI affordance, and migration of the existing overlay tests. That is a multi-day cross-stack change with no user-visible win over the custom-modes path.
3. No marketing surface (Settings, onboarding, mode picker, docs) currently says "Negotiation mode" — there is nothing for a user to be confused by. The change here is purely linguistic in our own test/doc files.

### Language hygiene applied with this decision

- Tests that previously called themselves "negotiation mode" must instead call themselves "negotiation overlay" or "negotiation custom mode". The retriever fixtures in `tests/fixtures/modes/negotiation/` remain valid as overlay fixtures.
- The QA results doc (`MODES_PROFILE_INTELLIGENCE_TEST_RESULTS.md`) section 2.1 was already accurate: the negotiation overlay is documented under `looking-for-work` and Profile Intelligence. No change needed there.
- Future product copy that introduces a first-class Negotiation mode must add it to `MODE_TEMPLATES`, `TEMPLATE_SYSTEM_PROMPTS`, `TEMPLATE_NOTE_SECTIONS`, and the UI mode picker before the label can be used externally.

### Status

**Closed: working as intended for this release.** A future Phase reopens this if product wants negotiation as a marketed first-class mode.