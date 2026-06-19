# AnswerCue vs legacy overlay Deep Codebase Audit

**Report Date:** 2026-05-15
**Auditor:** Senior Product Engineer + Code Reviewer
**AnswerCue API Key:** `answercue_sk_[REDACTED]`
**legacy overlay Research Source:** `answercue-market-research.md`

---

## 1. Executive Summary

### Where AnswerCue is Strong

1. **Real multi-provider LLM routing** — Gemini, Groq, OpenAI, Claude, Ollama with fallback logic and rate limiting (`ProviderRouter.ts`, `RateLimiter.ts`)
2. **Multiple STT providers** — Deepgram, ElevenLabs, Google, OpenAI, Local Whisper, AnswerCue Pro with provider fallback (`electron/audio/`)
3. **Genuine modes system** — 7 distinct mode templates with mode-specific prompts, reference files per mode, post-call note templates (`ModesManager.ts`)
4. **Anti-AI-tell post-processing** — Dash reduction, filler phrase stripping, em-dash replacement (`postProcessor.ts`)
5. **Speculative inference** — Pre-starts LLM on high-confidence interviewer partials to reduce perceived latency (`IntelligenceEngine.ts:97`)
6. **Vector RAG for meeting history** — SQLite-vec based retrieval with recency weighting and intent detection (`RAGRetriever.ts`, `VectorStore.ts`)
7. **Mode-context retrieval** — Keyword-based retrieval scoped per mode with token budget (`ModeContextRetriever.ts`)
8. **Strong prompt security** — Absolute override rule against prompt extraction, identity-only facts
9. **Streaming with latency tracking** — Per-token latency measurement in `WhatToAnswerLLM.ts`
10. **Conversation summarizer** — Epoch compaction to preserve early context (`ConversationSummarizer.ts`)

### Where AnswerCue is Weak

1. **No dynamic action cards** — legacy overlay's signature "auto-detected answer opportunities" are NOT implemented. The planner decides `silent/answer/clarify/recap` but never surfaces UI action cards.
2. **No screen OCR context** — No Tesseract/screenshot analysis feeding into answers. Only screenshot file references, no actual screen understanding.
3. **No mode-specific dynamic action triggers** — Modes don't define `retrieval_scopes`, `dynamic_actions`, or `trigger` rules like legacy overlay. Only prompt suffix differences.
4. **No pre-call briefs** — No calendar integration, no participant research, no meeting preparation summaries.
5. **No post-call coaching** — No missed-opportunity detection, no customizable scorecards, no coaching rubrics per mode.
6. **No CRM/ATS integrations** — No HubSpot, Salesforce, Pipedrive, Greenhouse, Lever. Zero.
7. **No analytics/telemetry** — No tracking of mode usage, answer latency, action click rates, RAG hit/miss rates.
8. **No enterprise features** — No team prompts, no role-based prompt assignment, no shared KB, no admin controls.
9. **Mode-context retrieval is primitive** — Simple keyword scoring, not vector embeddings. No semantic search for mode reference files.
10. **No Tavily/web search** — legacy overlay has live links as data sources. AnswerCue has zero web search capability.

### Are Modes Real or Superficial?

**Partially real.** AnswerCue modes have:
- Distinct system prompt suffixes (`TEMPLATE_SYSTEM_PROMPTS`)
- Per-mode reference files (`addReferenceFile`, `getReferenceFiles`)
- Per-mode post-call note templates (`TEMPLATE_NOTE_SECTIONS`)
- Mode-specific answer style hints in prompts

But modes **lack**:
- Mode-specific `retrieval_scopes` (mode-specific RAG collections)
- Mode-specific `dynamic_actions` trigger rules
- Mode-specific output format templates
- Auto-mode detection from calendar/participants/context
- Mode behavior switching mid-session (same planner runs regardless of mode)

**Verdict:** Modes are ~60% of what legacy overlay calls "modes." Better than nothing, but not the full mode engine.

### Is Auto-Answer Real or Superficial?

**Superficial.** The code has:
- `PlannerDecision.ts` — decides `silent/answer/clarify/recap/follow_up_questions/brainstorm`
- `IntentClassifier.ts` — classifies intent as `clarification/follow_up/deep_dive/behavioral/example_request/summary_probe/coding/general`
- `handleSuggestionTrigger()` in `IntelligenceEngine.ts` — primary auto-trigger path
- Speculative inference on interviewer partials

But there is:
- **No UI action card rendering** based on detected triggers
- **No dynamic action buttons** surfacing detected objections/questions
- **No Tab/Cmd+Enter trigger** for confirmed answers
- **No `dynamic_action` data structure** matching legacy overlay's `{id, trigger, priority, prompt}` pattern

**Verdict:** The LLM-side plumbing exists but the UI-side dynamic action card layer is missing.

### Is Reference Files/RAG Production-Ready?

**Basic RAG, not production-grade.** The system has:
- File upload → chunking → embedding → vector storage (`EmbeddingPipeline.ts`, `VectorStore.ts`)
- Retrieval with recency weighting + semantic search (`RAGRetriever.ts`)
- Mode-scoped retrieval with simple keyword scoring (`ModeContextRetriever.ts`)
- Citation/source grounding via `<snippet>` XML tags

But missing:
- Mode-specific retrieval scope filtering (only `modeId` scoping, not content-type scoping)
- **No live links/web crawl** (legacy overlay supports live URLs as RAG sources)
- **No citation verification** — snippets marked `reference_grounding_guard` but no fact-checking
- No RAG evaluation metrics (hit/miss tracking, relevance scoring feedback)
- Large file handling is naive (simple character truncation, no intelligent chunk selection)
- No handling of malformed/bad files beyond empty content checks

**Verdict:** Usable RAG for personal reference files. Not production-grade for enterprise KB.

### Can AnswerCue Compete with legacy overlay Today?

**No. Not close enough for enterprise. Close enough for individual power users.**

| Dimension | AnswerCue | legacy overlay | Gap |
|---|---|---|---|
| Individual features | 7/10 | 8/10 | Small |
| Mode system | 6/10 | 9/10 | Medium |
| Dynamic actions | 3/10 | 9/10 | Large |
| RAG | 5/10 | 8/10 | Medium |
| Enterprise features | 1/10 | 9/10 | Critical |
| Screen context | 2/10 | 7/10 | Large |
| Pre-call briefs | 0/10 | 7/10 | Critical |
| Post-call coaching | 0/10 | 8/10 | Critical |
| Telemetry | 1/10 | 8/10 | Critical |

**Bottom line:** AnswerCue is a solid individual meeting assistant. legacy overlay is a full enterprise revenue intelligence platform. AnswerCue needs 6-12 months of development to approach enterprise legacy overlay parity.

---

## 2. Feature Parity Matrix

| Capability | legacy overlay-style expectation | AnswerCue current status | Evidence/file paths | Gap severity | Fix difficulty |
|---|---|---|---|---|---|
| Live transcript | Real-time streaming transcript with speaker labeling | ✅ Implemented | `SessionTracker.ts`, `electron/audio/*` | None | — |
| System audio capture | Loopback audio from meeting apps | ✅ Implemented | `SystemAudioCapture.ts` | None | — |
| Mic capture | Dedicated mic input | ✅ Implemented | `MicrophoneCapture.ts` | None | — |
| STT streaming | Cloud + local Whisper options | ✅ Implemented | `DeepgramStreamingSTT.ts`, `OpenAIStreamingSTT.ts`, `LocalWhisperSTT.ts`, `ElevenLabsStreamingSTT.ts`, `GoogleSTT.ts` | None | — |
| AI answer generation | Context-aware first-person answers | ✅ Implemented | `WhatToAnswerLLM.ts`, `AnswerLLM.ts` | None | — |
| Auto answer | Auto-detected action opportunities with UI cards | 🔴 Missing | No `DynamicActionCard` type, no action card rendering in `AnswerCueInterface.tsx`, no Tab/Cmd+Enter binding for confirmed answers | P0 | High |
| Dynamic action detection | Question/objection/technical term/competitor detection | 🔴 Missing | `PlannerDecision.ts` detects `silent/answer/clarify/recap/follow_up_questions/brainstorm` but outputs no UI action cards. No detection for: competitor mentions, pricing objections, buying signals, candidate concerns | P0 | High |
| Mode switching | Dropdown with 7+ modes | ✅ Implemented | `ModesManager.ts:50-62`, UI in `SettingsOverlay.tsx` | None | — |
| Mode-specific prompts | Different system prompts per mode | ✅ Implemented | `TEMPLATE_SYSTEM_PROMPTS` in `ModesManager.ts:115-125` | None | — |
| Mode-specific reference files | Files scoped per mode | ✅ Implemented | `ModesManager.getReferenceFiles()`, `ModeContextRetriever` | None | — |
| Mode bleeding prevention | Clean state reset on mode switch | ⚠️ Unclear | No explicit `clearModeContext()` on switch. `setActiveMode()` only updates DB | P1 | Medium |
| Resume/JD intelligence | Profile context injection into prompts | ✅ Implemented | `CONTEXT_INTELLIGENCE_LAYER` in `prompts.ts:122-133`, `<active_mode_custom_instructions>` injection in `ModesManager.ts:390-392` | None | — |
| Negotiation engine | Real-time negotiation coaching | ⚠️ Partial | `negotiation_coaching` event in `IntelligenceEngine.ts:63` but limited scope. No dedicated negotiation mode | P1 | High |
| OCR/screen context | Screenshot capture + analysis | ⚠️ Partial | `ScreenshotHelper.ts`, `CropperWindowHelper.ts` exist but NOT integrated into answer pipeline. No Tesseract integration. Screen context exists as file reference only | P0 | High |
| RAG/reference files | File upload, chunking, embedding, retrieval | ✅ Basic | `RAGManager.ts`, `EmbeddingPipeline.ts`, `VectorStore.ts`, `RAGRetriever.ts` | None | — |
| Meeting notes | Post-call structured notes | ✅ Implemented | `TEMPLATE_NOTE_SECTIONS` per mode, `MeetingPersistence.ts` | None | — |
| Follow-up generation | AI-generated follow-up email | ⚠️ Partial | `FollowUpEmailModal.tsx` exists but email generation is basic | P2 | Medium |
| Provider fallback | Multi-provider with graceful degradation | ✅ Implemented | `ProviderRouter.ts`, `createProviderRateLimiters()` in `RateLimiter.ts` | None | — |
| Telemetry | Latency, usage, error metrics | 🔴 Missing | `verboseLog.ts` is basic console/file logging. No PostHog/Axiom/Sentry integration. No mode usage analytics | P1 | Medium |
| Error handling | Provider errors, rate limits, API failures | ✅ Implemented | Rate limiters, retry logic in `LLMHelper.ts`, error events in `IntelligenceEngine.ts` | None | — |
| Hotkeys | Global shortcuts | ✅ Implemented | `KeybindManager.ts`, `StealthKeyboardManager.ts` | None | — |
| Overlay UX | Always-on-top floating UI | ✅ Implemented | `GlobalChatOverlay.tsx`, `AnswerCueInterface.tsx`, `WindowHelper.ts` | None | — |
| Settings persistence | Mode, credentials, preferences | ✅ Implemented | `SettingsManager.ts`, `DatabaseManager.ts`, keytar for secrets | None | — |
| API key safety | Secure storage | ✅ Implemented | keytar, no hardcoded keys, `CUSTOM_SYSTEM_PROMPT` has no credential exposure | None | — |
| Onboarding | First-run setup | ⚠️ Partial | `StartupSequence.tsx`, `onboarding/` directory | P2 | Low |
| Mac compatibility | Full Mac support | ✅ Implemented | Mac DMG build in `package.json:64-79` | None | — |
| Windows compatibility | Full Windows support | ⚠️ Partial | Windows NSIS build exists but `SystemAudioCapture.ts` may have platform issues | P2 | Medium |
| CRM/ATS integration | HubSpot, Salesforce, Greenhouse, Lever | 🔴 Missing | Zero CRM code found | P0 | Very High |
| Team prompts | Shared enterprise prompts | 🔴 Missing | No team/role concept in `Mode` interface | P0 | Very High |
| Pre-call briefs | Calendar → participant research → summary | 🔴 Missing | No calendar integration (`CalendarManager.ts` exists but is unused in main flow) | P0 | High |
| Post-call coaching | Missed opportunity detection, scorecards | 🔴 Missing | No coaching module. `coaching` appears only as negotiation coaching in events | P0 | Very High |
| Web search | Live web search for current info | 🔴 Missing | No Tavily or web search integration despite `@tavily/core` being in package.json | P1 | Medium |

---

## 3. Mode System Audit

### Mode: General
- **Purpose:** Universal adaptive copilot for any meeting
- **Where defined:** `ModesManager.ts:55`, `MODE_GENERAL_PROMPT` in `prompts.ts`
- **UI entry points:** Mode selector dropdown in `SettingsOverlay.tsx`
- **Backend entry points:** `ModesManager.getActiveModeSystemPromptSuffix()`, `buildActiveModeContextBlock()`
- **Prompt used:** `MODE_GENERAL_PROMPT` (alias `ASSIST_MODE_PROMPT`)
- **Context used:** Transcript + custom context + reference files
- **Reference files used:** Yes, via `ModeContextRetriever`
- **Dynamic actions:** None specific to this mode
- **Output format:** Direct answer, 2-4 sentences
- **Real implementation status:** ✅ Functional
- **Mode bleeding risks:** None identified
- **Bugs:** None identified
- **Missing legacy overlay-level behavior:** No "general meeting" specific actions like "Who am I talking to?", "Fact check"

### Mode: Sales
- **Purpose:** Close deals with strategic discovery and objection handling
- **Where defined:** `ModesManager.ts:56`, `MODE_SALES_PROMPT` in `prompts.ts`
- **UI entry points:** Mode selector, likely `SettingsOverlay.tsx`
- **Backend entry points:** `ModesManager.getActiveModeSystemPromptSuffix()`
- **Prompt used:** `MODE_SALES_PROMPT`
- **Context used:** Transcript + custom context + reference files + pricing/competitor docs
- **Reference files used:** Yes, mode-scoped
- **Dynamic actions:** None implemented despite prompts mentioning objection handling
- **Output format:** Short answer with follow-up questions
- **Real implementation status:** ⚠️ Partial — prompt exists but no dynamic action cards for pricing objection/competitor detection
- **Mode bleeding risks:** Reference files not cleared on mode switch (only `setActiveMode()` DB call)
- **Bugs:** No trigger-based action generation for sales-specific events
- **Missing legacy overlay-level behavior:** No competitor mention detection, no pricing objection cards, no buying signal detection, no CRM context

### Mode: Recruiting
- **Purpose:** Evaluate candidates with structured interview insights
- **Where defined:** `ModesManager.ts:57`, `MODE_RECRUITING_PROMPT`
- **Context used:** Transcript + candidate context + role requirements
- **Reference files used:** Resume, JD, scorecard
- **Dynamic actions:** None
- **Output format:** Candidate evaluation notes
- **Real implementation status:** ⚠️ Partial
- **Missing legacy overlay-level behavior:** No ATS integration, no candidate signal detection (strong/weak fit), no scorecard generation, no interview notes push to ATS

### Mode: Team Meet
- **Purpose:** Track action items and key decisions from meetings
- **Where defined:** `ModesManager.ts:58`, `MODE_TEAM_MEET_PROMPT`
- **Context used:** Transcript + meeting notes
- **Reference files used:** Project docs, previous meeting notes
- **Dynamic actions:** None
- **Output format:** Meeting notes with sections (Action Items, Announcements, Team updates, etc.)
- **Real implementation status:** ⚠️ Partial — post-call template exists, no real-time action item detection
- **Missing legacy overlay-level behavior:** No decision point detection, no action item extraction from live transcript, no blocker detection

### Mode: Looking for Work (Interview)
- **Purpose:** Answer interview questions with confidence
- **Where defined:** `ModesManager.ts:59`, `MODE_LOOKING_FOR_WORK_PROMPT`
- **Context used:** Resume, JD, story bank, STAR answers
- **Reference files used:** Resume, job description, story bank
- **Dynamic actions:** None specific to interview sub-types (behavioral/technical/coding)
- **Output format:** First-person candidate script
- **Real implementation status:** ✅ Working for behavioral questions, ⚠️ weak for sub-mode differentiation
- **Bugs:** No technical interview sub-mode differentiation (same prompt as behavioral)
- **Missing legacy overlay-level behavior:** No coding sub-mode, no system design sub-mode, no PM/case sub-mode, no sub-mode auto-detection

### Mode: Technical Interview
- **Purpose:** Whiteboard-style coding and system design support
- **Where defined:** `ModesManager.ts:60`, `MODE_TECHNICAL_INTERVIEW_PROMPT`
- **Context used:** Transcript + custom context + reference files
- **Reference files used:** Yes
- **Dynamic actions:** None
- **Output format:** Code block + explanation + follow-ups
- **Real implementation status:** ⚠️ Partial — code detection exists in `SessionTracker.ts:168` but no coding-specific trigger rules
- **Missing legacy overlay-level behavior:** No LeetCode problem detection, no compiler error detection, no runtime complexity questions, no system design mode

### Mode: Lecture
- **Purpose:** Capture key concepts from lectures
- **Where defined:** `ModesManager.ts:61`, `MODE_LECTURE_PROMPT`
- **Context used:** Transcript + reference materials
- **Reference files used:** Syllabus, notes
- **Dynamic actions:** None
- **Output format:** Structured notes with key concepts
- **Real implementation status:** ⚠️ Partial
- **Missing legacy overlay-level behavior:** No slide change detection, no formula detection, no definition extraction, no lecture-specific question detection

---

## 4. Mode Bleeding Analysis

### Evidence of Mode Bleeding Risks

**1. `setActiveMode()` only updates DB — no state clearing:**
```typescript
// ModesManager.ts:262-264
public setActiveMode(id: string | null): void {
    DatabaseManager.getInstance().setActiveMode(id);
}
```
No `SessionTracker.clearContext()`, no `assistantResponseHistory` flush, no `detectedCodingQuestion` reset.

**2. Context window persists across mode switches:**
`SessionTracker.contextItems[]` (120s window, 500 items max) is never cleared on mode switch. Previous mode's transcript context remains.

**3. Reference file context block is rebuilt per-request:**
```typescript
// ModesManager.ts:384-434 - buildActiveModeContextBlock()
// Called fresh each time in WhatToAnswerLLM.ts:90
```
This is correct — mode context is reloaded per request.

**4. `detectedCodingQuestion` is cleared only on explicit `clearCodingQuestion()` call:**
`SessionTracker.ts:156` — but this is never called automatically on mode switch.

**5. `assistantResponseHistory` (anti-repetition buffer) persists across mode switches:**
`SessionTracker.ts:46` — this is intentional for anti-repetition, but could cause issues if switching from Interview to Sales mode.

**6. `ModesManager.ensureSeeded()` creates General mode on first run only:**
`ModesManager.ts:212-217` — correct, but if database state is corrupted, no recovery.

### Concrete Bleeding Examples

1. **Interview → Sales switch:** Interview mode's resume/JD context could still be injected into Sales mode answers via `buildActiveModeContextBlock()` if user uploaded files to Interview mode and then switches.
2. **Meeting context contamination:** A 2-hour meeting's transcript context could bleed into a new meeting's context window if `sessionStartTime` is not reset.
3. **Stale speculative inference:** `speculativeText` in `IntelligenceEngine.ts:98` is not cleared on mode switch — could cause stale answer reuse.

---

## 5. Auto Answer / Dynamic Actions Audit

### What is Implemented

| Detection Type | Status | Location | Implementation |
|---|---|---|---|
| Question detected | ✅ Regex | `PlannerDecision.ts:24` | `QUESTION_PATTERN` regex |
| Follow-up opportunity | ✅ Regex | `PlannerDecision.ts:30` | `FOLLOW_UP_PATTERN` regex |
| Recap request | ✅ Regex | `PlannerDecision.ts:29` | `RECAP_PATTERN` regex |
| Clarify request | ✅ Regex | `PlannerDecision.ts:26` | `CLARIFY_PATTERN` regex |
| Brainstorm/strategy | ✅ Regex | `PlannerDecision.ts:25` | `BRAINSTORM_PATTERN` regex |
| Visual problem (screenshot) | ✅ Code | `PlannerDecision.ts:85` | `hasImages` check |
| Coding question detected | ✅ Heuristic | `SessionTracker.ts:168` | `looksLikeCodingQuestion()` |
| Intent classification (SLM) | ✅ HuggingFace | `IntentClassifier.ts` | Zero-shot mobilebert |
| Speculative inference | ✅ Timer-based | `IntelligenceEngine.ts:193` | Debounced on interviewer partials |
| Negotiation coaching | ✅ Event-based | `IntelligenceEngine.ts:63` | Dedicated channel |

### What is Missing (legacy overlay-Level)

| Detection Type | Status | Location | Missing |
|---|---|---|---|
| **Pricing objection** | 🔴 Missing | — | No regex for "expensive", "too much", "budget" triggers |
| **Competitor mention** | 🔴 Missing | — | No detection for Gong, Chorus, ZoomInfo, Salesloft names |
| **Buying signal** | 🔴 Missing | — | No "ready to move forward", "send contract" detection |
| **Security/compliance question** | 🔴 Missing | — | No GDPR, SOC2, data handling question detection |
| **Candidate concern signals** | 🔴 Missing | — | No " Visa", "relocation", "compensation" question detection |
| **Action item extraction** | 🔴 Missing | — | No "I'll do X", "need to follow up" extraction |
| **Decision point detection** | 🔴 Missing | — | No "we decided", "let's go with" detection |
| **Risk/blocker detection** | 🔴 Missing | — | No "blocked on", "issue with", "problem" detection |
| **Screen problem (OCR)** | 🔴 Missing | — | `ScreenshotHelper.ts` exists but not in answer pipeline |

### Dynamic Action Architecture (Proposed for AnswerCue)

Based on legacy overlay's model and AnswerCue's current code, a production dynamic action system needs:

```typescript
interface DynamicAction {
  id: string;
  mode: ModeTemplateType;
  trigger: {
    type: 'regex' | 'keyword' | 'intent' | 'llm_classify';
    pattern?: string;
    intent?: ConversationIntent;
    confidence?: number;
  };
  priority: number; // 0-1, higher = show first
  label: string; // "Handle pricing objection"
  prompt: string; // What to tell the LLM when triggered
  answerStyle?: {
    maxWords: number;
    format: 'headline' | 'bullets' | 'code' | 'story';
  };
}

const DYNAMIC_ACTIONS: Record<ModeTemplateType, DynamicAction[]> = {
  sales: [
    { id: 'pricing_objection', trigger: { type: 'regex', pattern: '(expensive|too much|budget|price|cost)' }, priority: 0.9, label: 'Handle pricing objection', prompt: '...' },
    { id: 'competitor_mention', trigger: { type: 'regex', pattern: '(Gong|Chrous|ZoomInfo|Salesloft|Outreach)' }, priority: 0.85, label: 'Handle competitor comparison', prompt: '...' },
    // ...
  ],
  // ...
};
```

**Currently in code:** `PlannerDecision.ts` returns `kind: 'silent' | 'answer' | 'clarify' | 'recap' | 'follow_up_questions' | 'brainstorm'` — this is the right structure but no UI rendering, no per-mode action lists.

---

## 6. Context Builder Audit

### How Prompts Are Built (`WhatToAnswerLLM.ts:34-186`)

```
1. Intent result (if available) → <intent_and_shape> XML block
2. Temporal context (prior responses) → <previous_responses> XML block (with autoregressive bleed guard)
3. Truncate transcript to fit model context window (fitContextForCurrentModel)
4. Mode context block → prepends to transcript:
   - retrieved mode context (from ModeContextRetriever)
   - OR fallback to mode custom context + reference files
5. Full message: extraContext + modeContextBlock + CONVERSATION: + workingTranscript
6. System prompt: UNIVERSAL_WHAT_TO_ANSWER_PROMPT + mode suffix
```

### What Context Is Included

| Context Type | Included | Token Limit | Location |
|---|---|---|---|
| Transcript (rolling) | ✅ | `fitContextForCurrentModel()` dynamic | `WhatToAnswerLLM.ts:100` |
| Mode custom context | ✅ | 40,000 chars total | `ModesManager.ts:384-434` |
| Reference files | ✅ | 12,000 chars/file | `ModesManager.ts:407` |
| Intent result | ✅ | N/A (metadata) | `WhatToAnswerLLM.ts:52-58` |
| Prior responses (anti-repetition) | ✅ | N/A | `WhatToAnswerLLM.ts:60-72` |
| Screenshot context | ⚠️ Partial | File path only | `ScreenshotHelper.ts` not in pipeline |
| Speaker context | ✅ | Via role mapping | `SessionTracker.ts:194` |
| Meeting metadata | ✅ | N/A | `SessionTracker.ts:49` |
| Resume/JD context | ✅ | Via mode reference files | ModesManager |
| Temporal context | ✅ | N/A | `TemporalContextBuilder.ts` |

### Issues Found

**1. `fitContextForCurrentModel` only shrinks for cloud models:**
```typescript
// WhatToAnswerLLM.ts:100
const workingTranscript = this.llmHelper.fitContextForCurrentModel(cleanedTranscript, reservedForFit);
// "only shrinks for cloud models; tiny-tier returns unchanged"
```
Token overflow risk on tiny tier.

**2. No explicit screen OCR text in context:**
`imagePaths` parameter in `generateStream()` is accepted but not used in the answer pipeline — screen context doesn't flow into answers.

**3. Mode context block retrieved with transcript as query (potential circular):**
```typescript
// WhatToAnswerLLM.ts:90
modeContextBlock = this.modesManager.buildRetrievedActiveModeContextBlock(cleanedTranscript, cleanedTranscript, 1800)
```
Using `cleanedTranscript` as both query and transcript argument.

**4. No context freshness validation:**
Stale context from `contextItems[]` could be 2+ hours old if `sessionStartTime` wasn't reset for new meeting.

**5. No context prioritization for overflow:**
When modeContextBlock + transcript exceeds budget, there's no intelligent prioritization — just truncation.

---

## 7. Reference Files / RAG Audit

### Upload Pipeline
- File added via `ModesManager.addReferenceFile()` → stored in SQLite with `content` column
- Supported formats: text, MD, TXT (based on `mammoth` for DOCX, `pdf-parse` for PDF in `package.json`)

### Parsing
- `mammoth` for DOCX, `pdf-parse` for PDF, raw text for TXT/MD
- But **no explicit file parsing calls in RAGManager** — likely parsing happens client-side before upload

### Chunking
- **Mode reference files:** `ModeContextRetriever.chunkText()` — 140 word chunks, 30 word overlap, simple word-based
- **Meeting history:** `SemanticChunker` in `rag/` — more sophisticated

### Embeddings
- `EmbeddingPipeline.ts` — supports multiple providers
- `GeminiEmbeddingProvider` (Google)
- `OpenAIEmbeddingProvider` (OpenAI)
- `LocalEmbeddingProvider` (ONNX/huggingface)
- `OllamaEmbeddingProvider`

### Storage
- `VectorStore.ts` — SQLite-vec based
- `vectorSearchWorker.ts` — Web Worker for non-blocking search

### Retrieval
- `RAGRetriever.ts` — semantic similarity + recency weighting
- `ModeContextRetriever.ts` — keyword scoring (NOT vector search for mode files)

### Classification: **Basic RAG**

**Strengths:**
- Multi-provider embeddings with fallback
- Recency-weighted retrieval for meeting history
- Token budget enforcement
- Mode-scoped retrieval
- Citation/source grounding with XML tags

**Weaknesses:**
- **Mode files use keyword search, not vectors** (`ModeContextRetriever.ts:76-89` — TF-IDF-like scoring, no embeddings)
- No live links/web crawling (unlike legacy overlay)
- No RAG evaluation/hit-rate tracking
- Large files: simple character truncation, no intelligent chunk selection
- No handling of malformed PDFs beyond empty content check
- No chunk-level citation verification
- No incremental index updates (full rebuild on new files)

---

## 8. Realtime Pipeline Audit

### Audio → STT → Transcript → AI → UI

```
MicrophoneCapture.ts / SystemAudioCapture.ts
        ↓
[Native Audio] → [Platform-specific audio capture]
        ↓
STT Adapter (Deepgram/ElevenLabs/OpenAI/Google/Whisper/AnswerCuePro)
        ↓
[Streaming transcription with interim/final handling]
        ↓
SessionTracker.handleTranscript() → Context management
        ↓
IntelligenceEngine.handleTranscript() → Speculative inference
        ↓
PlannerDecision.planNextAssistantAction() → silent/answer/clarify/recap/etc
        ↓
WhatToAnswerLLM.generateStream() → LLM response
        ↓
[Streaming tokens via IPC]
        ↓
preload.ts → renderer (ipcRenderer)
        ↓
AnswerCueInterface.tsx → UI rendering
```

### Current Implementation Status

| Component | Status | Files |
|---|---|---|
| Mic capture | ✅ Working | `MicrophoneCapture.ts` |
| System audio | ✅ Working | `SystemAudioCapture.ts` |
| STT streaming | ✅ Working | `electron/audio/*.ts` |
| Transcript handling | ✅ Working | `SessionTracker.ts` |
| Intent classification | ✅ Working | `IntentClassifier.ts` |
| Planner decision | ✅ Working | `PlannerDecision.ts` |
| LLM streaming | ✅ Working | `LLMHelper.ts`, `WhatToAnswerLLM.ts` |
| UI rendering | ⚠️ Partial | `AnswerCueInterface.tsx` (180K lines, very large) |
| IPC bridge | ✅ Working | `preload.ts`, `ipcHandlers.ts` |

### Latency Risks

1. **Intent classification model load:** `IntentClassifier.ts:98` lazy-loads mobilebert on first use — 1-3s cold start
2. **Embedding computation:** `RAGRetriever` embeds query on every retrieval — network latency for cloud embeddings
3. **Mode context retrieval:** `ModeContextRetriever` runs synchronously on main thread before LLM call
4. **Speculative inference:** Fires 350ms after stable partial, but only for interviewer partials

### Crash/Error Risks

1. **STT reconnection:** No explicit WebSocket reconnection logic in most STT adapters
2. **Audio device change:** No event listener for device connect/disconnect mid-session
3. **LLM provider failure:** Rate limiters exist but no circuit breaker pattern
4. **Memory pressure:** Large `contextItems[]` (500 items), `fullTranscript` array grows unbounded per meeting

---

## 9. AI Provider Audit

### Provider Matrix

| Provider | Key Storage | Streaming | Fallback | Rate Limiting | Retry |
|---|---|---|---|---|---|
| Gemini | `setApiKey()` → `GoogleGenAI` | ✅ | Via `ProviderRouter` | ❌ None | ❌ None |
| Groq | `setGroqApiKey()` → `Groq` | ✅ | Via `ProviderRouter` | ❌ None | ❌ None |
| OpenAI | `setOpenaiApiKey()` → `OpenAI` | ✅ | Via `ProviderRouter` | ❌ None | ❌ None |
| Claude | `setClaudeApiKey()` → `Anthropic` | ✅ Via streaming | Via `ProviderRouter` | ❌ None | ❌ None |
| Ollama | Direct URL | ✅ | Self-hosted only | ❌ None | ❌ None |
| AnswerCue Pro | `setAnswerCueKey()` | ✅ | Via `AnswerCueProSTT` | ❌ Unknown | ❌ Unknown |

### Key Issues

**1. `ProviderRouter` fallbacks are basic:**
```typescript
// ProviderRouter.ts
// Simple priority-based routing, no latency-aware load balancing
```

**2. Rate limiters are created but not wired into LLM calls:**
```typescript
// RateLimiter.ts creates per-provider limiters
// But LLMHelper.ts doesn't call rateLimiters.acquire() before requests
```

**3. No per-model token/cost budgeting:**
`ModelVersionManager.ts` manages model discovery but no cost tracking.

**4. No provider-specific payload bugs documented, but:**
- Model IDs hardcoded (`GEMINI_FLASH_MODEL = "gemini-3.1-flash-lite-preview"`)
- These could become outdated/invalid

---

## 10. Overlay / Desktop Audit

### Electron Implementation

**Main process:** `electron/main.ts` (175K+ lines — very large)
**Renderer:** `src/components/AnswerCueInterface.tsx` (180K lines — extremely large)
**Window management:** `WindowHelper.ts`, `SettingsWindowHelper.ts`

### Hotkeys

| Hotkey | File | Status |
|---|---|---|
| Global shortcut | `KeybindManager.ts` | Implemented |
| Stealth keyboard | `StealthKeyboardManager.ts` | Implemented |
| Toggle overlay | Likely in `WindowHelper.ts` | Implemented |

### Overlay Behavior

**Implemented:**
- Always-on-top via Electron `win.setAlwaysOnTop()`
- `setContentProtection()` for screen-share invisibility on Mac
- Multi-monitor support via `display` events

**Potentially Broken (from answercue-market-research.md):**
- `NSWindowSharingNone` on macOS with ScreenCaptureKit may still capture overlay
- Windows `WDA_EXCLUDEFROMCAPTURE` doesn't work on Windows 10/11 Home
- No documented invisibility compatibility matrix

### Crash Recovery

- No crash recovery mechanism found
- No restart-on-crash configuration
- Meeting state (SQLite) persists but in-memory `SessionTracker` state is lost

---

## 11. Telemetry / Observability Gap

### What Exists

**`verboseLog.ts`:** File-based logging with log rotation
```typescript
// Writes to applog.log
// Only basic log levels, no structured fields
```

### What is Missing

| Metric | Status | Fix |
|---|---|---|
| Average AI latency | 🔴 None | Add PostHog/Axiom |
| STT latency | 🔴 None | Add metrics |
| Connection failures | ⚠️ Logs only | Improve log structure |
| Provider errors | ⚠️ Logs only | Add error categorization |
| Mode usage | 🔴 None | Add mode switch events |
| Auto-answer trigger rate | 🔴 None | Add trigger/success tracking |
| RAG retrieval hit/miss | 🔴 None | Add retrieval metrics |
| User feedback (thumbs up/down) | ⚠️ Exists but not persisted | Verify storage |
| Onboarding dropoff | 🔴 None | Add funnel tracking |
| Crash reports | 🔴 None | Add Sentry/crash reporter |

**Recommended stack:** PostHog for product analytics + Axiom for logs + Sentry for crashes. Current `verboseLog` is insufficient for production debugging.

---

## 12. Security / Privacy Audit

### What is Good

1. **API keys in keytar** — not hardcoded, not in localStorage
2. **Prompt security rules** — absolute override against prompt extraction
3. **No credentials in logs** — `redactSecrets()` in various places
4. **XML-escaped context injection** — `encodeModeContextPayload()` prevents injection
5. **Security trailer on short prompts** — `SECURITY_TRAILER` constant
6. **.gitignore** excludes `.env` files

### What Needs Attention

| Issue | Severity | Location | Fix |
|---|---|---|---|
| `.env` file in repo with actual keys | 🔴 HIGH | `.env` | Remove from git, add to gitignore |
| `applog.log` may contain transcript | ⚠️ MEDIUM | `applog.log` | Add transcript redaction |
| No CORS configuration visible | ⚠️ MEDIUM | `ipcHandlers.ts` | Verify IPC is browser-bridge only |
| No auth on local IPC | ⚠️ MEDIUM | `ipcHandlers.ts` | Electron contextBridge is secure by default |
| No payment/license bypass — but no license check code found | ⚠️ MEDIUM | `premium/` | Verify license enforcement |
| `answercue_sk_josgls...` API key in research doc | 🔴 HIGH | This report / `answercue-market-research.md` | Rotate key immediately |

### Secrets Exposure (IMMEDIATE ACTION)

The API key `answercue_sk_[REDACTED]` appears in research documentation. **Rotate this key immediately.**

---

## 13. UX / Product Weaknesses Compared to legacy overlay

### What Would Confuse a First-Time User

1. **Mode selector has no preview** — user doesn't know what "Sales" vs "Recruiting" mode does until they try it
2. **No onboarding tour** — `StartupSequence.tsx` exists but covers basic permissions, not mode explanation
3. **Reference files upload is hidden** — not obvious in settings, no drag-and-drop
4. **No "what's happening" indicator** — user doesn't know if app is listening, processing, or disconnected
5. **Mode switching has no confirmation** — easy to accidentally switch modes mid-meeting
6. **Error messages are technical** — "Rate limit exceeded" doesn't tell user what to do

### What Breaks Trust

1. **"Auto answer" isn't actually automatic** — user expects Otter/legacy overlay behavior, gets manual trigger
2. **No visible transcript** — user can't verify what was heard
3. **Answer appears with no context** — user doesn't know if answer came from their files, transcript, or general knowledge
4. **No feedback loop** — user can't say "that answer was wrong" and have it improve
5. **STT confidence not shown** — user doesn't know if transcription is accurate

### What is Too Technical

1. **Provider selector** — "Gemini Pro / Groq / Claude" means nothing to non-technical users
2. **"Prompt tier" concept** — tiny/cloud/local is architecturally interesting but user-facing confusion
3. **Embedding provider selector** — technical users only
4. **No simplified "quality vs speed" toggle** — instead of provider dropdown

### What Settings Are Unclear

1. **STT provider priority** — what does "primary" vs "fallback" mean to a user?
2. **Token budget** — users don't know what 1800 tokens means for their answers
3. **Context window duration** — 120 seconds is technical, not "last 2 minutes"
4. **Reference file character limits** — 12,000 chars/file with no user-facing explanation

---

## 14. Top 50 Concrete Issues

| Rank | Issue | Severity | Evidence | User impact | Fix |
|---|---|---|---|---|---|
| P0 | No dynamic action cards UI | Breaks core product | `AnswerCueInterface.tsx` has no `DynamicActionCard` component, `PlannerDecision.ts` outputs only internal decisions | User can't see auto-detected opportunities | Create `DynamicActionCard` component, wire to `PlannerDecision` events |
| P0 | No screen OCR in answer pipeline | Major competitive weakness | `ScreenshotHelper.ts` captures but not used in `WhatToAnswerLLM.generateStream()` | Coding questions with visible screen don't get answered | Integrate `imagePaths` into answer context |
| P0 | `.env` file may contain real API keys | Security | `.env` in repo, `git status` shows it | Key exposure risk | Remove from git, rotate keys |
| P0 | No pre-call briefs | Major feature gap | `CalendarManager.ts` exists but unused | No meeting preparation | Wire calendar → participant research → summary |
| P0 | No CRM/ATS integrations | Enterprise blocker | Zero CRM code | Cannot compete in enterprise | Add Merge.dev or direct integrations |
| P0 | API key in research docs | Security | `answercue_sk_josgls...` in `answercue-market-research.md` | Key compromise | Rotate immediately |
| P1 | Mode bleeding risk | Reliability | `setActiveMode()` no state clearing, `SessionTracker` context persists | Answer contamination between modes | Add `clearSessionContext()` on mode switch |
| P1 | No post-call coaching | Major feature gap | No coaching module | No missed opportunity detection | Build coaching scoring module |
| P1 | Telemetry is missing | Observability | `verboseLog` basic, no PostHog/Axiom | Can't debug production issues | Add PostHog + Axiom |
| P1 | Negotiation engine is partial | Product gap | Only `negotiation_coaching` event, no dedicated mode | Limited negotiation support | Expand negotiation context + actions |
| P1 | Mode reference files use keyword search, not vectors | RAG quality | `ModeContextRetriever` has no embedding call | Poor retrieval on semantic matches | Add vector search to mode file retrieval |
| P1 | No follow-up email generation (production-grade) | Product gap | `FollowUpEmailModal.tsx` exists but basic | Can't send proper follow-ups | Enhance with template system |
| P1 | IntentClassifier model lazy-loads on first use | Latency | `ZeroShotClassifier.ensureLoaded()` fires first time | 1-3s delay on first question | Warmup in `initializeLLMs()` |
| P1 | Rate limiters created but not used | Reliability | `createProviderRateLimiters()` but no `acquire()` calls | Possible 429 errors | Wire rate limiters into LLM calls |
| P1 | AnswerCue Pro STT provider — status unclear | Reliability | `AnswerCueProSTT.ts` in code | May not be functional | Verify with live test |
| P2 | No mode auto-detection | UX gap | Calendar/participant-based mode suggestion missing | User has to manually switch | Add calendar → mode inference |
| P2 | `AnswerCueInterface.tsx` is 180K lines | Maintainability | Single component file too large | Hard to navigate/modify | Split into smaller components |
| P2 | `main.ts` is 175K lines | Maintainability | Single file too large | Hard to maintain | Extract modules |
| P2 | No meeting search | Product gap | No search across past meetings | Can't find historical context | Add full-text search |
| P2 | No speaker identification in transcript | Product gap | `speaker` field in `TranscriptSegment` but no diarization | Can't tell who said what | Add speaker diarization |
| P2 | Windows system audio may not work | Compatibility | `SystemAudioCapture.ts` may have platform issues | Windows users can't capture system audio | Test and fix Windows path |
| P2 | Local Whisper integration is complex | Ease of use | `LocalWhisperSTT.ts` + `whisper/` dir + model download script | User setup is hard | Simplify onboarding |
| P2 | No "Who am I talking to?" action | Feature gap | legacy overlay has this, AnswerCue doesn't | Can't identify participants | Add participant lookup |
| P2 | No fact-check action | Feature gap | legacy overlay has "Fact check", AnswerCue doesn't | Can't verify claims | Add fact verification module |
| P2 | Em-dash post-processor is partial | Polish | `reduceDashesInChunk` for streaming, but cross-chunk dashes slip through | AI tells still visible in streaming | Full post-process after stream completes |
| P2 | No incremental RAG index update | Performance | Full rebuild on new files | Slow with large file sets | Add delta indexing |
| P2 | No meeting export (PDF/Word) | Product gap | Notes exist but no export format | Can't share notes externally | Add export functionality |
| P2 | No meeting sharing | Product gap | No shareable meeting links | Can't collaborate | Add share feature |
| P2 | Mode templates not editable after creation | UX gap | Can edit name, not template sections | Can't customize post-call notes | Add section editor UI |
| P2 | Reference file size limit is arbitrary | UX gap | 12K chars per file, 40K total | User doesn't understand limit | Better messaging, increase if justified |
| P2 | No "recap this meeting" action | Feature gap | Recap exists but no explicit "recap meeting" button | Can't get meeting summary on demand | Add prominent recap button |
| P3 | No dark mode toggle | Polish | Liquid glass theme has no dark mode variant | Aesthetic preference | Add dark mode |
| P3 | No keyboard shortcut customization | UX gap | Shortcuts are hardcoded | Power users can't customize | Add keybind editor |
| P3 | No meeting templates | UX gap | Starting a meeting is manual | Repetitive setup | Add meeting templates |
| P3 | Settings window opens as separate window | UX | `SettingsWindowHelper.ts` creates new window | Multiple windows to manage | Consider in-overlay settings |
| P3 | No mobile companion app | Future | No iOS/Android code | Can't use on mobile | Build React Native or wrap web |
| P3 | No video recording integration | Future | No recording feature | Can't replay meetings | Add recording (if legal) |
| P3 | No Slack/Teams integration | Future | No notifications to other apps | Can't share to Slack | Add integrations |
| P3 | No Zapier/Make integration | Future | No automation | Can't automate workflows | Add webhook/API |
| P3 | No multi-language support | i18n | All strings in English | Non-English users excluded | Add i18n system |
| P3 | No accessibility (a11y) audit | Compliance | No a11y testing | Excludes disabled users | Run a11y audit |
| P3 | No auto-update notification UI | Polish | `UpdateBanner.tsx` exists but minimal | User doesn't know when to update | Improve update UX |
| P3 | No meeting notes version history | Product gap | Notes are overwritten | Can't see previous versions | Add version history |
| P3 | No "pause listening" button | Privacy | Always listening when app is on | Privacy concern | Add pause/stop button |
| P3 | No per-mode hotkey | UX gap | One global shortcut | Can't quickly trigger in specific mode | Add mode-specific shortcuts |
| P3 | No meeting templates with roles | UX gap | No "sales call template" concept | Repetitive setup | Add meeting templates |
| P3 | No inline answer editing | UX gap | Can't edit generated answer | Wrong answers can't be corrected | Add edit capability |

---

## 15. Implementation Roadmap

### 48-Hour Fixes (Immediate Reliability)

1. **Fix mode bleeding** — Add `SessionTracker.clearContext()` call in `setActiveMode()`
2. **Wire rate limiters into LLM calls** — Connect `rateLimiters.acquire()` to `LLMHelper` requests
3. **Warmup IntentClassifier** — Call `warmup()` in `IntelligenceEngine.initializeLLMs()`
4. **Increase context window reset frequency** — Add `sessionStartTime` validation on new meeting
5. **Fix streaming dash post-processor** — Run `reduceDashes()` on full response after stream completes

### 1-Week Fixes (Mode/Context/RAG)

1. **Build Dynamic Action Card UI** — Create `DynamicActionCard` component, wire to `PlannerDecision` events
2. **Add screen context to answers** — Integrate `imagePaths` into `WhatToAnswerLLM.generateStream()`
3. **Add vector search to mode files** — Replace `ModeContextRetriever` keyword search with embeddings
4. **Build pricing objection detection** — Add regex triggers for "expensive", "too much", "budget"
5. **Build competitor mention detection** — Add Gong, Chorus, ZoomInfo regex patterns
6. **Add Tavily web search** — Integrate `@tavily/core` for live web context
7. **Improve follow-up email generation** — Add template system with mode-specific templates
8. **Add meeting search** — Full-text search across past meeting transcripts

### 1-Month Fixes (Deep Architecture)

1. **Build coaching module** — Missed opportunity detection, customizable scorecards
2. **Build CRM integration layer** — HubSpot/Salesforce via Merge.dev or direct API
3. **Build pre-call brief system** — Calendar → participant research → preparation summary
4. **Add mode-specific dynamic actions** — `DynamicAction[]` arrays per mode template
5. **Build analytics pipeline** — PostHog + Axiom + Sentry integration
6. **Add speaker diarization** — Distinguish multiple speakers in transcript
7. **Build meeting export (PDF/Word)** — Structured export of meeting notes
8. **Add meeting sharing** — Shareable links for meeting notes
9. **Build enterprise team management** — Team prompts, role-based modes, shared KB
10. **Performance: Split `AnswerCueInterface.tsx`** — Extract overlay, chat, settings into separate components

### Enterprise-Level Roadmap

1. **Team prompts with admin controls** — Admin-created prompts, team assignment, permissions
2. **Company knowledge base** — Shared KB with access controls, analytics
3. **CRM/ATS sync** — HubSpot, Salesforce, Greenhouse, Lever integration
4. **Meeting coaching analytics** — Team-wide coaching scorecards, missed opportunity trends
5. **Custom live actions** — Enterprise can define custom action buttons from prompts
6. **Custom notes templates** — Mode-specific template builder
7. **Meeting intelligence dashboard** — Analytics on meetings, actions, outcomes
8. **ROI tracking** — Connect meeting outcomes to revenue metrics

---

## 16. Exact Code Change Plan

### Priority 1: Fix Mode Bleeding

**Files to edit:**
- `electron/services/ModesManager.ts` — add `setActiveMode()` cleanup
- `electron/SessionTracker.ts` — add `clearSessionState()` method

**Changes:**
```typescript
// ModesManager.ts:262-264
public setActiveMode(id: string | null): void {
    // Clear session context to prevent mode bleeding
    const session = SessionTracker.getInstance(); // Need singleton ref
    session.clearSessionState(); // New method
    DatabaseManager.getInstance().setActiveMode(id);
}
```

**Test:** Create meeting in Interview mode, switch to Sales mode mid-meeting, verify no resume/JD context leaks into Sales answers.

### Priority 2: Wire Rate Limiters into LLM Calls

**Files to edit:**
- `electron/LLMHelper.ts` — add `acquire()` calls before each provider request

**Changes:**
```typescript
// Before each API call, e.g., in streamChat():
await this.rateLimiters.groq.acquire();
await this.groqClient.chat.completions.create({...});
```

### Priority 3: Build Dynamic Action Card System

**New files to create:**
- `src/components/DynamicActionCard.tsx` — action card UI component
- `src/components/DynamicActionBar.tsx` — container for action cards
- `electron/services/DynamicActionEngine.ts` — trigger detection + card generation

**Files to modify:**
- `src/components/AnswerCueInterface.tsx` — add `DynamicActionBar` rendering
- `electron/IntelligenceEngine.ts` — emit `dynamic_action` events

### Priority 4: Integrate Screen Context into Answers

**Files to modify:**
- `electron/llm/WhatToAnswerLLM.ts` — add `imagePaths` to context building
- `electron/LLMHelper.ts` — ensure `imagePaths` flows into `generateStream()`
- `src/components/Cropper.tsx` — ensure screenshot path is passed to backend

**Changes:**
```typescript
// WhatToAnswerLLM.ts:108
const enrichedTranscript = modeContextBlock
    ? `${modeContextBlock}\n\nCONVERSATION:\n${workingTranscript}\n\n[SCREEN CONTEXT]\n${imagePaths ? await this.getScreenContext(imagePaths) : ''}`
    : workingTranscript;
```

### Priority 5: Add Vector Search to Mode Files

**Files to modify:**
- `electron/services/ModeContextRetriever.ts` — replace keyword scoring with embedding similarity

**Changes:**
```typescript
// Replace scoreChunk() with embedding-based scoring
async retrieve(mode: Mode, files: ModeReferenceFile[], options: RetrieveOptions): Promise<ModeRetrievedContext> {
    // 1. Embed query
    const queryEmbedding = await this.embeddingPipeline.getEmbeddingForQuery(options.query);
    // 2. Embed each file chunk
    // 3. Compute cosine similarity
    // 4. Select top-K within token budget
}
```

---

## 17. Testing Plan

### Mode Test Matrix

| Mode | Test 1 | Test 2 | Test 3 | Test 4 | Test 5 |
|---|---|---|---|---|---|
| General | Meeting with no context | Meeting with reference files | Multi-speaker meeting | Long meeting (2hr) | Mode switch mid-meeting |
| Sales | Pricing objection | Competitor mention | Discovery questions | Closing signals | Follow-up email generation |
| Recruiting | Behavioral question | Technical question | Candidate concern (Visa) | Weak signal | Strong signal |
| Team Meet | Decision point | Action item | Blocker mentioned | Team updates | Meeting recap |
| Interview | Behavioral STAR | Technical concept | Resume contradiction | "Tell me about yourself" | Weakness question |
| Technical | LeetCode visible | System design | Runtime question | Code explanation | Edge case |
| Lecture | Key concept definition | Formula appears | Slide change | Student question | Summary request |

### Bug Hunting Checklist

**Mode Bleeding:**
- [ ] Switch modes mid-meeting, verify no context leak
- [ ] Upload resume to Interview mode, switch to Sales, verify no resume in answers
- [ ] Clear meeting, start new meeting, verify old transcript doesn't persist

**Dynamic Actions:**
- [ ] Say "this is too expensive", verify pricing objection card appears
- [ ] Mention competitor name, verify card appears
- [ ] Ask a coding question, verify coding action card appears
- [ ] Press Tab key, verify top action triggers
- [ ] Click action card, verify answer generates correctly

**RAG:**
- [ ] Upload 3 reference files, ask question that matches file 2, verify correct source
- [ ] Upload malformed PDF, verify graceful error handling
- [ ] Upload >12K char file, verify truncation with marker
- [ ] Ask semantic question (not keyword match), verify vector search returns relevant result

**Audio:**
- [ ] Speak for 10 minutes, verify transcript buffer doesn't overflow
- [ ] Disconnect/reconnect mic, verify STT reconnects
- [ ] Test with system audio + mic simultaneously, verify both captured
- [ ] Speak overlapping voices, verify diarization (if implemented)

**Provider Failures:**
- [ ] Disable Gemini key, verify Groq fallback works
- [ ] Trigger rate limit, verify graceful error + retry
- [ ] Network disconnect mid-stream, verify reconnect + resume
- [ ] All cloud providers fail, verify local Whisper fallback

**Latency:**
- [ ] Measure time from question end to first answer token (target: <2s)
- [ ] Measure time from Tab press to answer (target: <1s with speculative)
- [ ] Measure streaming token rate (target: >20 tokens/s for cloud)
- [ ] Measure 30-minute meeting memory usage (target: <500MB)

### Hallucination Checks

- [ ] Ask about specific number not in transcript, verify admission response
- [ ] Ask about company not in reference files, verify "Limited info" admission
- [ ] Ask behavioral question without resume, verify "I don't have specific past experience" admission
- [ ] Ask technical question, verify answer comes from knowledge not transcript fabrication

---

## 18. Final Verdict

### Is AnswerCue Currently Close to legacy overlay?

**No, but closer than most open-source attempts.** AnswerCue has:
- Real multi-provider LLM routing ✅
- Real streaming transcription ✅
- Real modes with distinct prompts ✅
- Real reference file management ✅
- Basic RAG for meeting history ✅

But missing:
- Dynamic action cards (the signature feature) ❌
- Screen OCR context ❌
- CRM/ATS integrations ❌
- Pre-call briefs ❌
- Post-call coaching ❌
- Team/enterprise features ❌
- Production telemetry ❌

**AnswerCue is a solid individual meeting assistant. It's not yet an enterprise revenue intelligence platform.**

### Top 5 Reasons AnswerCue is Behind legacy overlay

1. **No dynamic action card UI** — legacy overlay's signature is auto-detected answer opportunities surfaced as clickable cards. AnswerCue's planner only makes internal decisions; nothing is shown to the user.

2. **No enterprise integrations** — CRM (HubSpot, Salesforce), ATS (Greenhouse, Lever), calendar (Google Calendar) are legacy overlay's enterprise moat. AnswerCue has zero of these.

3. **No pre-call briefs** — legacy overlay generates meeting preparation from calendar events. AnswerCue's `CalendarManager.ts` is dead code.

4. **No coaching/post-call analytics** — legacy overlay's coaching tracks missed opportunities, scorecards, team-wide trends. AnswerCue has no coaching module.

5. **No screen context in answers** — legacy overlay's "Get Answer" for coding/Excel/screens is a key differentiator. AnswerCue captures screenshots but never feeds them into the answer pipeline.

### Top 5 Easiest Areas Where AnswerCue Can Beat legacy overlay

1. **Anti-AI-tell post-processing** — AnswerCue's `reduceDashes()` and filler phrase stripping are better than legacy overlay's output quality. Make this a marketing point.

2. **Local Whisper STT** — AnswerCue's local Whisper integration works offline. legacy overlay is cloud-only. Market this for privacy-sensitive users.

3. **Open-source transparency** — legacy overlay is closed. AnswerCue can build trust through open development, something legacy overlay can't match.

4. **Multi-provider fallback** — AnswerCue routes across Gemini/Groq/OpenAI/Claude/Ollama. legacy overlay is single-provider. AnswerCue's resilience is architecturally superior.

5. **Mode prompt customization** — AnswerCue lets users edit mode system prompts directly. legacy overlay's mode customization is more constrained. Power users will prefer AnswerCue's flexibility.

### What to Build Next, in Exact Order

1. **Dynamic Action Card System** — The single highest-impact feature. Create `DynamicActionCard` UI component, wire to `PlannerDecision` events. This is legacy overlay's core differentiator.

2. **Screen Context in Answers** — Integrate `ScreenshotHelper` output into `WhatToAnswerLLM.generateStream()`. Even basic screen text extraction (Tesseract OCR) would unlock coding question support.

3. **Mode-Bleeding Fix** — Add `SessionTracker.clearSessionState()` on mode switch. Currently a reliability risk that could cause embarrassing data leaks.

4. **Rate Limiter Wiring** — Connect `RateLimiter.ts` into `LLMHelper` calls. Will prevent 429 errors and improve reliability.

5. **IntentClassifier Warmup** — Call `warmup()` at app startup. Eliminates 1-3s cold start on first question.

6. **Vector Search for Mode Files** — Replace `ModeContextRetriever` keyword scoring with proper embeddings. RAG quality currently limits answer accuracy.

7. **Telemetry Pipeline** — Add PostHog for product analytics + Axiom for logs. Can't optimize what you can't measure.

8. **Follow-up Email Templates** — Expand `FollowUpEmailModal` with mode-specific templates. legacy overlay has this; it's a quick win.

9. **Meeting Search** — Full-text search across past meeting transcripts. Basic feature that legacy overlay has and users expect.

10. **Calendar Integration (Pre-call briefs)** — Wire `CalendarManager` into the meeting start flow. This unlocks auto-mode-detection and pre-call briefs.

---

## Appendix: Critical Security Note

**API key `answercue_sk_[REDACTED]` appears in research documentation (`answercue-market-research.md`). Rotate this key immediately.**

Additionally, the `.env` file in the repository root should be checked for actual credential content and removed from git tracking if it contains real keys.