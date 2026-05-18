You are now operating as the lead senior engineer, product architect, backend architect, QA lead, and code reviewer for Natively.

You are working inside this repository:

/Users/evin/natively-cluely-ai-assistant

Use these Claude skills heavily and repeatedly:

@"test-engineer (agent)"
@/Users/evin/natively-cluely-ai-assistant/.claude/skills/software-architecture/
@/Users/evin/natively-cluely-ai-assistant/.claude/skills/senior-architect/
@/Users/evin/natively-cluely-ai-assistant/.claude/skills/senior-backend/
@/Users/evin/natively-cluely-ai-assistant/.claude/skills/code-reviewer/

Use context7 and official documentation whenever needed for Electron, IPC security, sqlite/sqlite-vec, WebSocket STT, provider SDKs, PostHog/Axiom/Sentry, OCR/screenshot APIs, keytar, local encryption, React UI patterns, and any package-specific behavior.

Mission:
Fix the weaknesses found in the Natively vs Cluely audit and upgrade Natively into a Cluely-grade or better realtime AI meeting assistant.

Do not just patch randomly.
Work like a senior engineer shipping a production release.

Core goal:
Make Natively equal to or better than Cluely in these areas:

1. Security and privacy
2. Mode runtime system
3. Dynamic action cards / live insights
4. Screen/OCR context
5. Reference files / RAG
6. Prompt/context architecture
7. Provider routing, rate limiting, fallback, and privacy policy
8. Telemetry and observability
9. Post-call notes, coaching, and follow-up workflow
10. UI/UX polish
11. End-to-end testing using real-world Natively scenarios

The previous audit found these high-priority gaps:

- Modes are currently too shallow: mostly prompt suffixes, custom context, reference files, and note templates.
- Cluely-style modes should be full workflows:
  Mode = prompt + context policy + trigger rules + retrieval scope + actions + output templates + post-call workflow + telemetry + security policy.
- Dynamic Actions are missing as first-class UI cards.
- Planner decisions exist but are not exposed as lifecycle-tracked action cards.
- No per-mode dynamic action registry.
- No per-mode trigger rules.
- No per-mode RAG policy.
- No per-mode provider/privacy policy.
- No per-mode telemetry.
- Mode bleeding risk exists when switching modes or when async post-call summary uses the wrong active mode.
- Screen context/screenshot/OCR is not properly integrated into answer generation.
- Mode reference file retrieval is lexical/basic and should become hybrid semantic RAG.
- Existing sqlite-vec/RAG infrastructure should be reused for mode reference files.
- Prompt/context assembly needs trust levels and safer escaping.
- Full raw reference injection fallback is unsafe.
- LLMHelper is too large and mixes too many responsibilities.
- Provider routing is not policy-aware enough.
- Rate limiters may exist but must be verified and wired into all provider calls.
- Trial tokens and STT keys must never be returned to renderer.
- Custom cURL provider can exfiltrate transcript/profile/reference/screenshot data unless scoped and validated.
- Arbitrary image paths must not be accepted from renderer.
- Raw LLM/provider/summary responses must not be logged.
- Meeting transcripts, AI responses, and reference files may be stored plaintext; add retention/privacy controls and prepare encryption strategy.
- No structured telemetry for latency, STT failures, provider fallbacks, RAG hit/miss, mode usage, action accepted/dismissed, crashes, etc.
- No robust E2E QA for long meetings, provider failures, mode switching, hallucination, bad references, or audio recovery.
- UI needs active mode visibility, dynamic action bar, confidence/evidence display, better onboarding, clearer privacy states, and better failure messages.

Important working principles:

1. Do not hardcode fake fixes.
2. Do not add placeholder UI that does not work.
3. Do not break existing working features.
4. Do not change public behavior without migration/backward compatibility.
5. Do not leak secrets into renderer, logs, tests, screenshots, or reports.
6. Do not claim stealth/invisibility as guaranteed; use best-effort privacy language in UI if touched.
7. Every fix must include tests.
8. After every major finding/fix, run targeted tests and then an end-to-end scenario.
9. Record before/after evidence for every fix.
10. If a fix is too large for one pass, land the safe foundation first and create a tracked TODO with exact next steps.
11. Prefer small, reviewable commits/patch groups.
12. Use existing architecture where good, but refactor god objects when necessary.
13. Build real product behavior, not only backend plumbing.
14. Always consider Mac and Windows behavior.
15. Always consider hosted Natively API behavior and local provider behavior.

Start by creating a working file:

docs/engineering/NATIVELY_CLUELY_PARITY_FIX_LOG.md

This file must be continuously updated after each completed fix.

For every issue fixed, record:

- Issue title
- Audit severity
- Files changed
- Before behavior
- After behavior
- UI changes
- Backend behavior changes
- Security/privacy impact
- Tests added
- Commands run
- Manual/E2E scenario tested
- Result
- Remaining risk
- Follow-up tasks

Also create:

docs/engineering/NATIVELY_CLUELY_PARITY_ROADMAP.md

This should track everything not completed in this run.

Phase 0: Baseline and safety snapshot

Before changing code:

1. Inspect the repo structure.
2. Read package.json, README, main Electron entrypoints, IPC handlers, LLM provider code, STT provider code, ModesManager, ModeContextRetriever, RAGManager, DatabaseManager, SessionTracker, IntelligenceEngine, PlannerDecision, NativelyInterface, overlay components, settings components, tests, and docs.
3. Run:
   - git status
   - npm install only if needed
   - npm test if available
   - npm run lint if available
   - npm run typecheck if available
   - npm run build if available
4. Record failing baseline tests/build errors in NATIVELY_CLUELY_PARITY_FIX_LOG.md.
5. Do not hide pre-existing failures. Separate them into:
   - pre-existing
   - caused by current changes
   - fixed by current changes
6. Search for:
   - TODO
   - FIXME
   - placeholder
   - mock
   - hardcoded
   - console.log
   - console.warn
   - console.error
   - localStorage
   - sessionStorage
   - trialToken
   - apiKey
   - keytar
   - curl
   - imagePaths
   - custom provider
   - transcript
   - raw response
   - setActiveMode
   - ModeContextRetriever
   - PlannerDecision
   - dynamic action
   - telemetry

Phase 1: Security/privacy blockers first

Fix these before product feature work.

1. Stop returning trial tokens to renderer.
   - Find IPC path such as trial:get-local.
   - Renderer should only receive safe metadata:
     - hasToken
     - expiresAt
     - expired
     - trialClaimed
     - plan/status if needed
   - Never return raw token.
   - Add regression test.

2. Stop returning STT provider API keys to renderer.
   - Find get-stored-credentials and related settings IPC.
   - Return only:
     - hasKey boolean
     - masked display like sk-...abcd if needed
     - provider configured status
   - Re-entry required to replace key.
   - Keep secrets in main process/keytar only.
   - Update settings UI accordingly:
     - show “Configured”
     - show “Replace key”
     - show “Remove key”
     - never render full key.
   - Add tests for every provider.

3. Guard all renderer-supplied image/file paths.
   - Any IPC accepting imagePaths or file paths must validate:
     - resolved absolute path
     - inside app-owned userData/screenshot/reference directory
     - valid extension/content type
     - file size limit
   - Reject arbitrary local paths.
   - Add tests for path traversal, symlink if possible, /etc/passwd, private home paths, Windows drive paths.

4. Lock down custom cURL/custom provider.
   - Validate URL.
   - HTTPS by default.
   - Block localhost, 127.0.0.1, 0.0.0.0, ::1, link-local, private LAN, metadata IP ranges unless explicit “local provider mode” is enabled.
   - Add data-scope controls:
     - transcript allowed?
     - screenshots allowed?
     - reference files allowed?
     - profile/resume/JD allowed?
     - meeting history allowed?
   - UI must clearly show destination hostname and data scopes before enabling.
   - Add “unsafe provider” warning if user enables local/private custom provider mode.
   - Add tests for SSRF and blocked hosts.

5. Remove raw sensitive logging.
   - Remove logs of raw transcript, raw provider response, raw summary output, raw screenshot paths, raw API error bodies that may contain sensitive data.
   - Replace with structured safe logs:
     - provider
     - status code
     - duration
     - byte length
     - parse success/failure
     - redacted error class
   - Add centralized redactSecrets/redactSensitiveMeetingData helper.
   - Add tests using sentinel transcript/API key values and verify logs do not contain them.

6. Add privacy controls foundation.
   - Add per-meeting “Do not persist this meeting” option if feasible.
   - Add retention settings foundation if feasible:
     - keep forever
     - delete after 7 days
     - delete after 30 days
     - do not store transcripts
   - If DB encryption is too large for this pass, create an encryption design doc and TODO in roadmap.
   - Do not break existing meeting persistence.

After Phase 1:
- Run security-related tests.
- Run build/typecheck.
- Update fix log.
- Commit or stage as one logical patch group if the workflow supports it.

Phase 2: Mode Runtime foundation

Implement a first-class Mode Runtime.

Create or refactor toward:

electron/services/modes/ModeDefinition.ts
electron/services/modes/ModeRuntime.ts
electron/services/modes/ModeActionRegistry.ts
electron/services/modes/ModePolicy.ts

Target conceptual shape:

interface ModeDefinition {
  id: string;
  name: string;
  templateType: string;
  systemPrompt: string;
  ragPolicy: RagPolicy;
  actions: ModeActionDefinition[];
  notesSchema: NotesSchema;
  triggerPolicy: TriggerPolicy;
  providerPolicy: ProviderPolicy;
  retentionPolicy: RetentionPolicy;
  outputPolicy: OutputPolicy;
}

interface ModeActionDefinition {
  id: string;
  modeTemplateType: string;
  label: string;
  description: string;
  triggerType: 'regex' | 'keyword' | 'intent' | 'llm_classify' | 'manual';
  triggerPatterns?: string[];
  priority: number;
  minConfidence: number;
  promptInstruction: string;
  answerStyle: {
    maxWords: number;
    format: 'bullets' | 'short_script' | 'code' | 'checklist' | 'summary';
    tone: string;
  };
}

Implement default actions per mode.

General:
- Answer this
- What should I say next?
- Follow-up questions
- Recap
- Fact check
- Who am I talking to?

Sales:
- Handle pricing objection
- Handle competitor objection
- Ask discovery question
- Identify buying signal
- Summarize pain
- Draft follow-up

Recruiting:
- Evaluate candidate signal
- Ask follow-up interview question
- Sell role
- Answer candidate concern
- Score candidate
- Generate interview notes

Team Meeting:
- Extract action item
- Summarize decision
- Identify blocker
- Recap last discussion
- Draft follow-up

Looking for Work / Interview:
- Answer behavioral question
- Use resume/JD context
- Generate STAR answer
- Answer recruiter screen question
- Improve answer naturally

Technical Interview:
- Solve coding problem
- Explain complexity
- Generate edge cases
- Debug visible error
- System design outline

Lecture:
- Explain concept
- Make exam-style note
- Extract definition
- Summarize slide/topic
- Generate possible exam question

Negotiation:
- Detect negotiation moment
- Suggest counter
- Anchor value
- Handle pushback
- Ask calibrated question

Behavior changes:
- Active mode must visibly control:
  - available actions
  - prompt instructions
  - output style
  - reference retrieval policy
  - post-call notes
  - telemetry labels
- If user switches mode mid-meeting:
  - cancel or isolate old generation
  - clear mode-specific transient context
  - keep transcript if product-intended, but mark previous context with old mode and do not inject old mode references
  - show UI toast: “Mode changed to Sales. Previous mode-specific reference context cleared.”
- At meeting start:
  - show active mode badge
  - allow quick switch
  - optionally confirm active mode
- At meeting stop:
  - snapshot activeModeId, templateType, note sections, prompt version, and mode policies for summary generation.

Fix mode bleeding:
- Ensure async post-call summary uses the meeting’s snapshotted mode, not current active mode at processing time.
- Add tests:
  - sales meeting stopped, switch to lecture, summary still uses sales note schema
  - interview mode reference sentinels absent after switching to sales
  - active mode suffix appears exactly once
  - inactive mode prompt/reference absent

Phase 3: Dynamic Actions / Live Insights UI

Build Cluely-style dynamic action cards as a real product feature.

New backend models/services:

electron/services/dynamic-actions/DynamicAction.ts
electron/services/dynamic-actions/DynamicActionEngine.ts
electron/services/dynamic-actions/DynamicActionStore.ts
electron/services/dynamic-actions/DynamicActionDetector.ts

Target model:

interface DynamicAction {
  id: string;
  sessionId: string;
  modeId: string;
  type: string;
  label: string;
  description?: string;
  confidence: number;
  priority: number;
  evidenceRefs: EvidenceRef[];
  status: 'candidate' | 'shown' | 'accepted' | 'dismissed' | 'completed' | 'expired';
  createdAt: number;
  expiresAt?: number;
  promptInstruction: string;
  answerStyle?: ActionAnswerStyle;
}

interface EvidenceRef {
  source: 'transcript' | 'screen' | 'reference' | 'meeting_history';
  text: string;
  timestamp?: number;
  speaker?: string;
  fileId?: string;
  chunkId?: string;
}

Backend behavior:
- DynamicActionEngine listens to transcript updates and mode runtime.
- It detects mode-specific actions using:
  - regex/keyword fast path
  - existing intent classifier where useful
  - optional lightweight LLM classifier only when needed
- It emits top 1-3 actions to renderer.
- It dedupes repeated actions.
- It expires stale actions.
- It supports user actions:
  - accept/run action
  - dismiss action
  - pin action if useful
- It records telemetry events.

Frontend UI:
Create:

src/components/dynamic-actions/DynamicActionCard.tsx
src/components/dynamic-actions/DynamicActionBar.tsx
src/components/dynamic-actions/ActionEvidencePopover.tsx

UI requirements:
- Show compact cards above/below answer area.
- Each card shows:
  - label
  - short reason/evidence snippet
  - confidence indicator, not too technical
  - shortcut hint if available
- Max 3 visible cards.
- Primary card can be triggered with Tab or configured shortcut.
- Cards must be dismissible.
- Accepted card should show loading state and then stream answer.
- Card should not block existing manual Ask AI flow.
- Visual style must match Natively’s current UI.
- Add active mode badge near cards.

Dynamic action examples:
- Sales transcript: “This is too expensive compared to Gong.”
  Card: “Handle pricing + competitor objection”
- Recruiting transcript: “I’m also interviewing with another company.”
  Card: “Handle candidate competing offer”
- Team meeting transcript: “Sarah will send the deck by Friday.”
  Card: “Capture action item”
- Lecture transcript: “This is called Green’s function.”
  Card: “Explain concept”
- Interview transcript: “Tell me about a time you handled conflict.”
  Card: “Answer with STAR story”
- Technical transcript/screen: coding prompt visible.
  Card: “Solve coding problem”

Tests:
- Unit tests for detection.
- Mode-specific trigger tests.
- Deduplication tests.
- Expiry tests.
- UI rendering tests if framework supports.
- E2E simulated transcript tests.

Phase 4: Screen/OCR context integration

Goal:
Make “Get Answer” work from visible screen context, especially coding, Excel, slides, PDFs, browser pages, and lecture slides.

Implementation:
- Inspect existing ScreenshotHelper, CropperWindowHelper, Cropper UI, imagePaths flow, LLMHelper multimodal paths.
- Create a safe ScreenContextService:
  - captures screenshot/crop
  - stores only in allowed app directory
  - extracts OCR text if available
  - optionally passes image to vision-capable provider
  - creates a ScreenContext object with:
    - ocrText
    - imagePath
    - activeWindowTitle if available
    - timestamp
    - hash for dedupe
- Do not run expensive vision every frame.
- Use change detection:
  - if screenshot hash unchanged, reuse screen context
  - if new screenshot/slide/code prompt detected, update context
- Integrate with WhatToAnswerLLM / PromptAssembler:
  - screen context must be labeled as untrusted visual evidence
  - include OCR text within token budget
  - include image only when provider supports vision
  - never accept arbitrary image paths from renderer
- Add dynamic action:
  - “Answer from screen”
  - “Solve visible problem”
  - “Explain visible slide”
  - “Debug visible error”

UI changes:
- Add a small “Screen context: available / stale / unavailable” indicator.
- Add a manual “Use current screen” button.
- Show clear permission error if screen recording permission missing.
- Do not claim it can see screen when permissions are missing.

Tests:
- Allowed screenshot path accepted.
- External path rejected.
- OCR/screen text included in prompt packet.
- Non-vision provider receives OCR text, not image.
- Vision provider receives safe image path/base64.
- Coding problem screenshot triggers technical action.
- Stale screenshot not repeatedly reprocessed.

Phase 5: Prompt/context architecture

Create a central PromptAssembler.

New module:

electron/services/context/PromptAssembler.ts
electron/services/context/ContextPacket.ts
electron/services/context/TrustLevels.ts

Goal:
Stop concatenating raw strings across many places.

Target trust levels:
- system_policy
- mode_policy
- developer_policy
- user_preferences
- trusted_profile
- untrusted_transcript
- untrusted_screen
- untrusted_reference
- untrusted_meeting_history
- assistant_history

Behavior:
- Every context block must have:
  - type
  - trust level
  - source
  - token budget
  - recency
  - evidence refs
- Escape XML-like content.
- Reference files are always untrusted evidence, never instructions.
- File names must be escaped.
- Prompt injection in reference files must not override system or mode policy.
- Remove unsafe full raw file fallback for generation.
- If retrieval fails, use safe bounded fallback with guard.

Output:
PromptAssembler should produce:
- systemPrompt
- developer/context instructions if applicable
- user message
- metadata for telemetry
- evidence refs for answer/citations

Tests:
- Reference file says “ignore previous instructions” — system ignores it.
- Filename contains XML/prompt injection — escaped.
- Transcript contains prompt injection — ignored.
- Active mode prompt appears once.
- Inactive mode prompt absent.
- Screen context marked untrusted.
- Token budget enforced.

Phase 6: Mode reference files → hybrid RAG

Goal:
Upgrade mode reference file retrieval from lexical/basic to hybrid semantic RAG using existing sqlite-vec infrastructure.

Inspect:
- RAGManager.ts
- VectorStore.ts
- EmbeddingPipeline.ts
- DatabaseManager.ts
- ModeContextRetriever.ts

Add tables if needed:
- mode_reference_chunks
- mode_reference_embeddings
- mode_reference_chunk_fts
- mode_reference_index_state

Behavior:
- On reference file add/update/delete:
  - parse
  - chunk
  - embed
  - index FTS
  - mark index version
- Retrieval:
  1. FTS/BM25 exact match
  2. Vector semantic search
  3. Combine score
  4. Rerank
  5. Deduplicate
  6. Fit token budget
  7. Return evidence refs
- Support stale-index invalidation.
- If embedding provider unavailable:
  - fallback to lexical retrieval
  - show safe degraded metric/log
- Add citations/source names in prompt metadata.
- For generated answers, include source hints when relevant.

Tests:
- Semantic match works when keyword absent.
- Deleted reference not retrieved.
- Updated reference invalidates stale chunks.
- Prompt injection content ignored.
- Conflicting references handled with caveat.
- Large file budget enforced.
- Unknown fact absent from reference causes admission/refusal.

Phase 7: Provider routing and LLMHelper refactor

Do not rewrite everything blindly. Extract safely.

Target modules:
- PromptAssembler
- ProviderRouter
- ProviderGateway
- GeminiProvider
- OpenAIProvider
- ClaudeProvider
- GroqProvider
- NativelyProvider
- OllamaProvider
- CustomCurlProvider
- MediaPreprocessor
- RetryPolicy
- RateLimitPolicy
- ProviderHealthTracker

Required behavior:
- All provider requests pass through:
  - provider policy
  - data-scope policy
  - rate limiter
  - retry/backoff
  - telemetry span
  - redacted error handling
- Route by:
  - mode
  - action type
  - need for vision
  - need for low latency
  - privacy setting
  - configured provider availability
  - provider health
  - cost/quality preference if already available
- Realtime dynamic answers should prefer low-latency models.
- Post-call summaries can use quality models.
- Local-only mode must not call cloud providers.
- Natively API mode must clearly disclose cloud usage.

Tests:
- Rate limiter acquire called before provider request.
- Provider fallback works.
- Local-only blocks cloud.
- Vision action chooses vision-capable provider or OCR-only fallback.
- Custom provider respects data scopes.
- Error UI is actionable.

Phase 8: Telemetry / observability

Add structured telemetry foundation.

Default:
- local-only telemetry/logging unless user opts into cloud analytics.
- no raw transcript, raw screenshots, raw keys, raw reference content.

Create:
electron/services/telemetry/TelemetryService.ts

Support:
- local JSONL metrics
- optional PostHog
- optional Axiom
- optional Sentry/crash reporting if configured

Track:
- app_start
- meeting_start
- meeting_stop
- mode_selected
- mode_switched
- dynamic_action_detected
- dynamic_action_shown
- dynamic_action_accepted
- dynamic_action_dismissed
- dynamic_action_completed
- llm_request_started
- llm_first_token_latency
- llm_completed
- provider_fallback
- provider_error
- stt_started
- stt_partial_latency
- stt_final_latency
- stt_reconnect
- stt_error
- rag_query
- rag_hit
- rag_miss
- screen_context_captured
- screen_context_error
- post_call_summary_started
- post_call_summary_completed
- post_call_summary_failed

UI:
- Add diagnostics panel or hidden developer diagnostics:
  - provider status
  - STT status
  - last error
  - average answer latency
  - active mode
  - reference retrieval status
  - screen permission status

Tests:
- No sensitive payloads in telemetry.
- Events emitted for action lifecycle.
- Provider fallback tracked.
- RAG hit/miss tracked.

Phase 9: Post-call workflow and coaching

Upgrade meeting notes and add basic coaching.

Behavior:
- Use snapshotted meeting mode.
- Notes schema should use stable IDs, not only section titles.
- Post-call output should include:
  - summary
  - decisions
  - action items with owner/deadline
  - unanswered questions
  - follow-up draft
  - mode-specific sections
  - evidence snippets/timestamps where possible
- Add basic coaching module:
  Sales:
    - missed discovery question
    - unanswered objection
    - weak next step
    - pricing handled poorly
  Recruiting:
    - missing follow-up question
    - candidate concern not addressed
    - weak role selling
  Interview:
    - answer too vague
    - missing example
    - missing metric
  Lecture:
    - key concepts
    - likely exam questions
  Team:
    - action item missing owner/deadline
    - decision not confirmed

UI:
- Post-call page should show:
  - notes
  - action items
  - follow-up email
  - coaching insights
  - regenerate button
  - export/copy buttons if feasible
- Do not overbuild CRM/ATS yet unless foundation exists.

Tests:
- Stop meeting in Sales mode, switch to Lecture, summary remains Sales.
- Action item owner/deadline extracted.
- Follow-up draft generated.
- Coaching insight generated from missed opportunity.
- Summary JSON schema validated.

Phase 10: UX polish

UI changes to implement:

1. Active mode badge always visible during meeting.
2. Dynamic action bar with max 3 cards.
3. Screen context indicator.
4. Provider/STT health indicator.
5. Privacy indicator:
   - local only
   - cloud STT
   - cloud LLM
   - custom provider
6. Better empty/error states:
   - mic permission missing
   - screen permission missing
   - provider key missing
   - STT disconnected
   - reference index stale
   - local model missing
7. Settings UI improvements:
   - configured keys masked
   - custom provider data scopes
   - reset mode after meeting toggle
   - privacy/retention controls
8. Onboarding improvements:
   - choose primary use case
   - choose default mode
   - test mic
   - test system audio
   - test AI provider
   - add first reference file
   - explain local vs cloud

Keep visual style consistent with the existing app. Do not introduce a totally different design language.

Phase 11: Testing and real-world scenarios

Use @"test-engineer (agent)" heavily.

Create or update tests for:

Security:
1. Trial token never returned to renderer.
2. STT keys never returned to renderer.
3. Image path allowlist.
4. Custom provider SSRF blocking.
5. Custom provider data scopes.
6. Logs do not contain sentinel transcript/API key.
7. Reference prompt injection blocked.

Modes:
8. Same transcript across all modes:
   - sales
   - recruiting
   - team-meet
   - lecture
   - looking-for-work
   - technical-interview
   - general
   Assert:
   - correct perspective
   - no wrong-mode vocabulary
   - no invented facts
   - correct output format
   - appropriate caveat when context absent

Mode bleeding:
9. Switch interview → sales mid-meeting.
10. Switch sales → lecture before async summary.
11. Active reference sentinel present only when active.
12. Inactive reference sentinel absent.
13. Mode prompt appears once.

Dynamic actions:
14. Sales pricing objection.
15. Sales competitor objection.
16. Recruiting candidate concern.
17. Team action item.
18. Team decision.
19. Lecture concept.
20. Interview behavioral question.
21. Technical coding question.
22. Duplicate action suppression.
23. Action expiry.
24. Accept/dismiss lifecycle.

RAG:
25. Semantic retrieval without exact keyword.
26. Deleted reference stale-context test.
27. Updated reference reindex.
28. Conflicting references.
29. Unknown fact absent from reference.
30. Large file retrieval budget.
31. Citation/evidence attached.

Screen:
32. Safe screenshot accepted.
33. Unsafe path rejected.
34. OCR text added to context.
35. Vision provider gets image.
36. Non-vision provider gets OCR fallback.
37. Screen permission missing UI.

STT/audio:
38. NativelyProSTT auth failure.
39. NativelyProSTT DNS failure.
40. NativelyProSTT reconnect cap.
41. Deepgram reconnect/buffer behavior.
42. Google stream rollover.
43. Local Whisper worker failure cleanup.
44. Stop during reconnect.
45. Stop flush at meeting end.
46. Partial/final duplicate prevention.
47. Silent audio detection.
48. Sleep/wake recovery if feasible.

Long sessions:
49. 30-minute synthetic meeting replay.
50. 60-minute synthetic meeting replay.
51. Early fact recall after compression.
52. Contradicted decision update.
53. Action item owner/deadline preservation.
54. Prompt budget stability.
55. Memory/latency profile.

E2E:
56. Launch app.
57. Select mode.
58. Add reference file.
59. Start mocked meeting.
60. Feed mocked transcript.
61. Dynamic card appears.
62. Accept card.
63. Answer streams.
64. Switch mode and verify old reference absent.
65. Stop meeting.
66. Persist summary.
67. Provider failure shows actionable UI.
68. Logs do not contain transcript/key sentinels.

Real-world Natively API testing:
- Use real Natively API only if credentials are configured locally.
- Never print or log the key.
- Test:
  - happy path STT
  - auth failure with fake key
  - network failure if feasible
  - reconnect behavior
  - fallback behavior
- Record results without exposing secrets.

Before/after reporting requirement:

For every major phase, add a section to NATIVELY_CLUELY_PARITY_FIX_LOG.md:

## Phase X Before
- What was broken
- How it was verified
- Screenshots/logs/test output if safe
- User impact

## Phase X After
- What changed
- Exact files changed
- UI behavior change
- Backend behavior change
- Security behavior change
- Tests added
- Commands run
- Result
- Remaining risks

Do not mark a phase complete until:
- relevant tests pass
- typecheck/build passes or failures are documented as pre-existing
- manual/E2E scenario is run or clearly documented as blocked
- fix log is updated

Suggested implementation order:

1. Security/privacy blockers
2. Mode snapshot + mode bleeding fixes
3. Mode Runtime foundation
4. DynamicAction data model/backend
5. DynamicAction UI
6. Screen/OCR context integration
7. PromptAssembler/trust levels
8. Hybrid RAG for mode files
9. Provider routing/rate limit/privacy policy
10. Telemetry
11. Post-call/coaching
12. UX polish
13. Full test suite + final report

Final deliverable:

When finished, produce:

1. Summary of all fixes completed.
2. List of files changed.
3. Before/after behavior table.
4. Tests added.
5. Test commands run and results.
6. Remaining gaps vs Cluely.
7. Next 7-day roadmap.
8. Any risky areas needing manual review.
9. Whether Natively is now:
   - individual-user Cluely parity
   - better than Cluely in some areas
   - still behind in enterprise areas

Be brutal and honest. Do not say it is fixed unless tested.