You are now the autonomous QA architect, senior test engineer, product engineer, and code reviewer for AnswerCue.

Repository:
 /Users/evin/AnswerCue

Use these skills heavily:

@"test-engineer (agent)"
@/Users/evin/AnswerCue/.claude/skills/software-architecture/
@/Users/evin/AnswerCue/.claude/skills/senior-architect/
@/Users/evin/AnswerCue/.claude/skills/senior-backend/
@/Users/evin/AnswerCue/.claude/skills/code-reviewer/

Use Context7 and official documentation when needed.

Mission:
AnswerCue currently fixes reported bugs, but the testing is not deep enough. I want you to build a real automated mode/profile-intelligence test system that simulates real users, real resumes, real job descriptions, custom prompts, negotiation contexts, reference files, and long meeting/interview scenarios.

This should test whether each AnswerCue mode actually works like a real product, not just whether functions compile.

The core features to test:

1. Modes Manager
2. Mode-specific prompts
3. Mode-specific reference files
4. Profile intelligence
5. Resume context
6. JD context
7. Custom context
8. Negotiation context
9. Dynamic actions/live suggestions if present
10. RAG/reference retrieval
11. Mode switching
12. Mode bleeding prevention
13. Long-session context behavior
14. Hallucination/refusal behavior
15. AnswerCue API integration if configured
16. UI/IPC flow if possible

Do not only write unit tests.
Create realistic simulated user stories and run them end-to-end.

Important:
- Do not hardcode passing results.
- Do not fake assertions.
- Do not just create mock tests that prove nothing.
- Do not assume features work because a UI label exists.
- Do not expose API keys in logs or reports.
- If real AnswerCue API credentials are configured locally, use them safely.
- If real API testing is unavailable, create deterministic mocked provider tests and clearly mark real API tests as skipped.
- If any file format cannot be parsed, that is a bug to report/fix.
- If a test reveals a bug, fix the bug, then rerun the test.
- After each bug fix, verify no other mode broke.
- Record before/after behavior.

Start by creating these files:

docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_PLAN.md
docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_RESULTS.md
docs/testing/MODES_PROFILE_INTELLIGENCE_BUGFIX_LOG.md

Continuously update them.

For every bug found and fixed, record:

- Bug title
- Mode affected
- Scenario/user affected
- Before behavior
- Expected behavior
- Actual behavior
- Root cause
- Files changed
- Fix applied
- Tests added
- Commands run
- After behavior
- Remaining risk

Phase 0: Inspect the codebase first

Before writing tests:

1. Inspect:
   - ModesManager
   - ModeContextRetriever
   - RAGManager
   - VectorStore
   - EmbeddingPipeline
   - SessionTracker
   - IntelligenceEngine
   - PlannerDecision
   - WhatToAnswerLLM
   - LLMHelper
   - ProviderRouter
   - DatabaseManager
   - MeetingPersistence
   - Settings/profile/resume/JD/custom context modules
   - reference file upload/parsing modules
   - IPC handlers
   - renderer UI related to modes/profile/reference files

2. Identify the actual existing APIs for:
   - creating modes
   - switching modes
   - adding reference files
   - setting resume
   - setting JD
   - setting custom context
   - setting negotiation context
   - starting/stopping sessions
   - injecting transcript
   - generating answers
   - running post-call notes
   - calling AnswerCue API

3. Do not invent APIs.
   Use the app’s actual service functions, IPC handlers, or test utilities.
   If no test helper exists, create one properly.

4. Run baseline commands:
   - git status
   - npm test
   - npm run typecheck if available
   - npm run lint if available
   - npm run build if available

5. Record baseline failures separately from new failures.

Phase 1: Create realistic fixture generator

Create a test fixture generator that can produce realistic data for each mode.

Suggested location:

tests/fixtures/profile-intelligence/
tests/fixtures/modes/
tests/utils/createModeTestFixtures.ts
tests/utils/profileIntelligenceSeeder.ts
tests/utils/referenceFileFactory.ts

The fixture generator must create:

1. Resume files
2. Job description files
3. Custom context files
4. Negotiation context files
5. Mode-specific reference files
6. Meeting transcript scripts
7. Expected answer rules
8. Mode-bleeding sentinel files

Reference files must cover multiple formats:

- .txt
- .md
- .json
- .csv
- .html if supported
- .pdf if supported
- .docx if supported

If PDF/DOCX parsing exists in the app, generate real PDF/DOCX fixtures and test them.
If PDF/DOCX support is claimed but not working, fix it or report it as a bug.

Every fixture must contain unique sentinel facts so tests can verify whether the right context was used.

Examples:

Sales mode sentinel:
"AnswerCue Pro annual enterprise discount floor is 17 percent for Acme test accounts."

Recruiting mode sentinel:
"The Backend Platform role requires Kafka, PostgreSQL, and incident response ownership."

Interview mode sentinel:
"The candidate built PriceX, a price comparison website, and scaled AnswerCue to 10k users."

Lecture mode sentinel:
"The professor emphasized Green's function as a likely 12-mark exam topic."

Technical mode sentinel:
"The coding interviewer prefers O(n log n) solutions only if O(n) is impossible."

Team mode sentinel:
"Sarah owns the launch checklist and must deliver it by Friday."

Negative sentinel:
Each mode should also include a fake fact in another mode's reference file.
The active mode must never use the inactive mode's fake fact.


Additional requirement: Use real-world files and internet-sourced documents where possible

Do not only generate synthetic reference files.

For each mode and scenario, collect or create realistic test documents using internet-sourced examples, public datasets, public templates, official docs, GitHub samples, government/public PDFs, university notes, public resumes/JDs, public sales docs, public policy docs, and open-source documentation.

Use Context7, official documentation, public GitHub repositories, public sample files, public PDFs, and public web resources where useful.

Important:
- Only use legally accessible public files.
- Do not use copyrighted private files, scraped personal data, leaked documents, or anything requiring login.
- Prefer official/public/sample/template documents.
- Save source URLs in fixture metadata.
- If a source is copyrighted or too long, use it only as inspiration and create a safe synthetic fixture.
- Record every downloaded/created file in:
  docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_DATA_SOURCES.md

Create this file:

docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_DATA_SOURCES.md

For every internet-sourced or generated file, record:

- Mode
- Scenario
- File name
- File type
- Source URL if downloaded
- Whether downloaded or generated from template
- Why this file is relevant
- What feature it tests
- Sentinel facts added
- Expected retrieval behavior
- Expected answer behavior

File format coverage requirement:

For every mode, include mixed file formats where supported:

- .txt
- .md
- .json
- .csv
- .xml
- .html
- .pdf
- .docx

If the app claims to support a format, test it.
If the app does not support a format, add a test proving graceful rejection with a user-friendly error.

Do not silently skip unsupported formats.

Mode-specific internet/reference file requirements:

GENERAL MODE:
Use realistic files such as:
- public meeting agenda template
- public project brief template
- public product roadmap template
- public customer onboarding checklist
- public OKR/KPI CSV-style sample

Required fixture examples:
- general_meeting_agenda.md
- customer_onboarding_checklist.pdf
- product_roadmap.json
- kpi_dashboard.csv
- project_brief.docx

SALES MODE:
Use realistic sales/business files such as:
- public sales call script template
- public competitor battlecard template
- public pricing page snapshot converted to HTML/MD
- public sales pipeline report sample CSV
- public CRM export sample
- public sales report XML sample
- public security FAQ template
- public case study template

Required fixture examples:
- sales_playbook.md
- competitor_battlecard_legacy_overlay_otter_finalround.pdf
- pricing_policy.json
- sales_pipeline_report.csv
- quarterly_sales_report.xml
- security_faq.html
- enterprise_discount_rules.txt
- case_study_template.docx

Important sales tests:
- Pricing objection should retrieve pricing_policy.json and enterprise_discount_rules.txt.
- Competitor objection should retrieve competitor_battlecard_legacy_overlay_otter_finalround.pdf.
- Sales performance question should retrieve sales_pipeline_report.csv or quarterly_sales_report.xml.
- Security question should retrieve security_faq.html.
- The assistant must not invent discounts or customer logos absent from files.

RECRUITING MODE:
Use realistic hiring files such as:
- public job descriptions from real job boards or company career pages if legally accessible
- public sample resumes
- public interview scorecard templates
- public candidate evaluation rubric
- public compensation philosophy template
- public hiring policy template
- public ATS export sample CSV

Required fixture examples:
- backend_engineer_jd.md
- frontend_engineer_jd.html
- candidate_resume_backend.pdf
- candidate_resume_frontend.docx
- interview_scorecard.csv
- hiring_policy.json
- compensation_range_policy.txt
- ats_candidate_export.xml

Important recruiting tests:
- Candidate scoring should use interview_scorecard.csv.
- Role-fit answers should use JD + resume together.
- Compensation answers should use compensation_range_policy.txt.
- Visa/relocation answers should caveat if hiring_policy.json does not include it.
- The assistant must not invent candidate experience absent from resume.

TEAM MEETING MODE:
Use realistic internal/project files such as:
- public sprint planning template
- incident postmortem template
- launch checklist template
- design review template
- project timeline CSV
- risk register
- action item tracker

Required fixture examples:
- sprint_backlog.csv
- launch_checklist.xlsx_or_csv
- incident_postmortem_template.md
- product_design_spec.docx
- risk_register.json
- action_items.xml
- roadmap.html

If XLSX is not supported, create XLSX and verify graceful rejection or convert to CSV and record limitation.

Important team tests:
- Action items should retrieve action_items.xml and sprint_backlog.csv.
- Launch questions should retrieve launch_checklist.
- Incident review should retrieve incident_postmortem_template.md.
- Assistant must extract owners/deadlines correctly.

LOOKING FOR WORK / INTERVIEW MODE:
Use realistic candidate files such as:
- public sample SWE resume
- public AI engineer resume template
- public job description from accessible company career pages
- public STAR story template
- public interview prep guide
- public salary negotiation template

Required fixture examples:
- swe_resume.pdf
- ai_product_engineer_resume.docx
- software_engineer_jd.html
- ai_engineer_jd.md
- star_story_bank.json
- interview_prep_notes.txt
- salary_negotiation_context.xml
- portfolio_projects.csv

Important interview tests:
- Behavioral answers must use resume + star_story_bank.json.
- Recruiter screen answers must use JD + resume.
- Salary negotiation must use salary_negotiation_context.xml.
- Assistant must not invent FAANG experience, degrees, awards, or metrics absent from resume.
- If the resume says PriceX/AnswerCue, answers can use those facts only if present in fixture.

TECHNICAL INTERVIEW MODE:
Use realistic technical files such as:
- public LeetCode-style problem statements that are legally safe or generated equivalents
- open-source code snippets from permissive GitHub repos
- official language docs snippets
- public system design notes/templates
- public database/networking/OS notes
- bug reports/log samples
- API docs

Required fixture examples:
- leetcode_array_problem.md
- dynamic_programming_notes.pdf
- system_design_requirements.docx
- api_docs_sample.html
- error_log.txt
- code_snippet.py_or_ts
- complexity_cheatsheet.json
- interviewer_preferences.xml

Important technical tests:
- Coding answer should use problem statement and interviewer_preferences.xml.
- System design answer should use system_design_requirements.docx.
- Debug answer should use error_log.txt and code_snippet.
- Complexity explanation should use complexity_cheatsheet.json.
- Assistant must not output unrelated algorithms from other scenarios.

LECTURE MODE:
Use realistic education files such as:
- public university syllabus
- public lecture notes
- public past question paper samples
- public textbook-like notes if legally available
- generated exam-style question bank
- formula sheets
- slide outline

Required fixture examples:
- pde_syllabus.pdf
- greens_function_notes.md
- harmonic_functions_formula_sheet.txt
- previous_year_questions.csv
- lecture_slide_outline.html
- exam_question_bank.json
- professor_notes.docx
- topic_priority.xml

Important lecture tests:
- Exam-focused answers should use syllabus + previous_year_questions.csv.
- Definition answers should use notes/formula sheet.
- Topic-priority answers should use topic_priority.xml.
- Assistant should not claim a topic is “sure shot” unless files support frequency/importance.

NEGOTIATION MODE:
If there is no built-in negotiation mode, create a custom negotiation mode through Modes Manager if supported.

Use realistic negotiation files such as:
- salary negotiation templates
- refund policy
- SaaS discount policy
- statement of work template
- vendor comparison table
- procurement checklist
- contract terms sample

Required fixture examples:
- salary_negotiation_plan.md
- refund_policy.html
- saas_discount_policy.json
- statement_of_work.docx
- vendor_comparison.csv
- procurement_checklist.txt
- contract_terms.xml

Important negotiation tests:
- Salary negotiation should use salary_negotiation_plan.md.
- Refund retention should use refund_policy.html.
- SaaS annual discount should use saas_discount_policy.json.
- Freelancer scope negotiation should use statement_of_work.docx.
- Assistant must not offer discounts/refunds outside policy.

Internet search/download behavior:

Create a utility:

tests/utils/internetFixtureCollector.ts

It should:
- download public files only when safe
- store them in tests/fixtures/internet-sourced/
- save metadata JSON beside each file
- preserve source URL
- cache files so tests do not depend on internet every run
- fall back to generated safe fixture if internet is unavailable
- clearly mark fallback fixtures as generated
- never download executables
- enforce max file size
- enforce allowed extensions
- sanitize filenames

Suggested metadata shape:

interface FixtureSourceMetadata {
  mode: string;
  scenario: string;
  filename: string;
  fileType: string;
  sourceUrl?: string;
  sourceType: 'downloaded_public' | 'generated_from_public_template' | 'synthetic_fallback';
  licenseNote?: string;
  collectedAt: string;
  sentinelFacts: string[];
  expectedRetrievalQueries: string[];
  expectedAnswerMustInclude?: string[];
  expectedAnswerMustNotInclude?: string[];
}

Test requirement:
- First run can collect/download files.
- Normal test runs should use cached fixtures.
- CI should not require internet unless RUN_INTERNET_FIXTURE_COLLECTION=true is set.
- Add npm scripts if appropriate:
  - npm run test:modes
  - npm run test:modes:collect-fixtures
  - npm run test:modes:e2e
  - npm run test:modes:long

Reference file parser tests:

For each file format:
1. Upload/add file to Modes Manager.
2. Verify content is parsed.
3. Verify sentinel fact is retrievable.
4. Verify answer uses sentinel when relevant.
5. Verify irrelevant file ignored.
6. Verify malicious prompt-injection file ignored.
7. Verify unsupported file produces clear error.

Mode-specific file association tests:

For every mode:
1. Add all required files to that mode.
2. Add unrelated files to every other mode.
3. Ask question that should retrieve active mode file.
4. Assert active mode file sentinel appears.
5. Assert inactive mode sentinel does not appear.
6. Switch mode.
7. Assert previous active reference no longer appears.

Example sales scenario:

Files:
- sales_playbook.md
- pricing_policy.json
- quarterly_sales_report.xml
- competitor_battlecard.pdf
- security_faq.html

Transcript:
Prospect: "Your product sounds useful, but compared to legacy overlay this feels expensive. Also, what did your last quarter sales report show about enterprise adoption?"

Expected:
- dynamic action: competitor/pricing objection
- retrieval: competitor_battlecard + pricing_policy + quarterly_sales_report.xml
- answer mentions only fixture-supported enterprise adoption metric
- answer does not invent fake customers
- answer asks a discovery/follow-up question

Example technical scenario:

Files:
- leetcode_array_problem.md
- interviewer_preferences.xml
- complexity_cheatsheet.json
- code_snippet.ts
- error_log.txt

Transcript:
Interviewer: "Can you solve this in better than O(n log n)? Walk me through the edge cases."

Expected:
- technical mode uses interviewer_preferences.xml
- answer proposes O(n) if possible
- includes complexity
- includes edge cases
- does not use sales/recruiting reference facts

Example lecture scenario:

Files:
- pde_syllabus.pdf
- greens_function_notes.md
- previous_year_questions.csv
- topic_priority.xml


Transcript:
Professor: "Green's functions help solve boundary value problems and are important for the exam."

Expected:
- lecture mode creates exam-style note
- uses syllabus and previous_year_questions
- says “high priority based on provided files” only if supported
- does not overclaim certainty

Add these requirements into the test plan before implementation.

Then implement the fixture collector, file fixtures, metadata, tests, and reports.
Phase 2: Define all modes and 5 user stories per mode

Discover actual modes from the codebase.

At minimum test these if present:

1. General
2. Sales
3. Recruiting
4. Team Meeting
5. Looking for Work / Interview
6. Technical Interview
7. Lecture
8. Negotiation if present or create/test as a custom mode if supported

For each mode, create 5 realistic users/scenarios.

Each scenario must have:

- user profile
- resume if relevant
- job description if relevant
- custom context
- mode-specific reference files
- transcript script
- expected good answer behavior
- expected bad answer behavior
- hallucination traps
- mode bleeding traps
- post-call expected notes if applicable

Use this scenario map.

GENERAL MODE — 5 users:

1. Founder investor call
   - User: solo founder
   - Custom context: company metrics, product roadmap
   - Reference files: investor FAQ, metrics sheet, roadmap
   - Test: answer investor questions without inventing revenue

2. Customer onboarding call
   - User: SaaS founder onboarding customer
   - Reference files: setup guide, pricing FAQ
   - Test: give clear next steps and troubleshoot setup

3. Internal planning call
   - User: product manager
   - Reference files: sprint roadmap, bug list
   - Test: identify decisions and action items

4. Client update call
   - User: freelancer/consultant
   - Reference files: project proposal, timeline, deliverables
   - Test: respond to timeline pushback

5. General brainstorming call
   - User: founder brainstorming features
   - Reference files: product notes
   - Test: give useful concise ideas, not generic AI fluff

SALES MODE — 5 users:

1. Pricing objection
   - Prospect says: "This is too expensive."
   - Reference: pricing policy, discount rules
   - Expected: handle objection, ask discovery question, use correct discount floor

2. Competitor objection
   - Prospect compares to legacy overlay/Otter/Final Round
   - Reference: competitor battlecard
   - Expected: compare without hallucinating

3. Security/compliance question
   - Prospect asks about data storage/API keys
   - Reference: security FAQ
   - Expected: answer only from known policy, caveat unknown SOC2 if not present

4. Buying signal
   - Prospect asks about annual plan, onboarding, team seats
   - Reference: sales playbook
   - Expected: push toward next step

5. Angry trial user
   - Prospect had setup issue
   - Reference: support troubleshooting guide
   - Expected: empathetic, concrete fix, no overpromising

RECRUITING MODE — 5 users:

1. Backend engineer screen
   - Candidate resume + role JD
   - Reference: scorecard
   - Expected: evaluate Kafka/Postgres/system design fit

2. Frontend engineer screen
   - Resume: React/Tailwind/Electron
   - JD: UI platform role
   - Expected: ask follow-up about architecture and UI ownership

3. Candidate compensation concern
   - Reference: compensation range policy
   - Expected: answer carefully and sell role

4. Candidate relocation/visa concern
   - Reference: hiring policy
   - Expected: do not invent legal policy

5. Weak candidate signal
   - Transcript has vague answers
   - Expected: identify weak evidence and suggest follow-up probes

TEAM MEETING MODE — 5 users:

1. Sprint planning
   - Reference: sprint backlog
   - Expected: extract owners, deadlines, blockers

2. Product launch meeting
   - Reference: launch checklist
   - Expected: catch Sarah owns launch checklist by Friday

3. Incident review
   - Reference: incident timeline
   - Expected: identify root cause, action items, unresolved questions

4. Design review
   - Reference: design spec
   - Expected: summarize decisions and tradeoffs

5. Leadership sync
   - Reference: KPI dashboard CSV
   - Expected: summarize metrics without inventing numbers

LOOKING FOR WORK / INTERVIEW MODE — 5 users:

1. Behavioral interview
   - Resume: PriceX, AnswerCue, open-source
   - JD: SWE role
   - Expected: STAR answer using resume facts

2. Recruiter screen
   - JD: AI product engineer
   - Custom context: salary expectations, availability
   - Expected: natural recruiter answer

3. Product sense interview
   - Resume: startup founder
   - Expected: structured product answer

4. Conflict/leadership story
   - Resume contains one conflict story
   - Expected: use correct story, not invent FAANG experience

5. Negotiation call after offer
   - Negotiation context: target salary, BATNA, constraints
   - Expected: calibrated negotiation response

TECHNICAL INTERVIEW MODE — 5 users:

1. LeetCode array/hashmap problem
   - Reference: coding preferences
   - Transcript: interviewer asks two-sum variant
   - Expected: algorithm, complexity, edge cases

2. Dynamic programming reasoning
   - Transcript: longest increasing subsequence variant
   - Expected: explain recurrence clearly

3. System design interview
   - JD: backend distributed systems
   - Reference: system design notes
   - Expected: architecture, tradeoffs, scaling

4. Debugging/runtime error
   - Reference: code snippet/error log
   - Expected: identify likely bug, safe debugging steps

5. CS fundamentals reasoning
   - Transcript: OS/database/networking question
   - Expected: clear concise technical explanation

LECTURE MODE — 5 users:

1. PDE/math lecture
   - Reference: syllabus
   - Transcript: Green's function/harmonic functions
   - Expected: exam-style notes

2. Machine learning lecture
   - Reference: ML notes
   - Expected: definitions, formulas, likely questions

3. Operating systems lecture
   - Reference: OS syllabus
   - Expected: actionably structured notes

4. Data mining lecture
   - Reference: past questions CSV
   - Expected: focus on repeated topics

5. Seminar/webinar
   - Reference: slide summary
   - Expected: summarize key points and open questions

NEGOTIATION MODE — 5 users:

If no dedicated negotiation mode exists, create a custom mode through the app if supported.

1. Salary negotiation
   - Resume + JD + offer details
   - Expected: confident counteroffer

2. Refund retention conversation
   - Reference: refund policy
   - Expected: empathetic retention without violating policy

3. SaaS annual contract negotiation
   - Reference: pricing/discount rules
   - Expected: defend value and propose annual deal

4. Freelancer scope negotiation
   - Reference: proposal and SOW
   - Expected: protect scope and ask for tradeoff

5. Vendor price negotiation
   - Custom context: budget and alternatives
   - Expected: calibrated counter, no bluffing unsupported facts

Phase 3: Autopopulate profile intelligence and mode context

Build a test seeder that can automatically populate the app with each synthetic user.

For every scenario:

1. Create profile:
   - name
   - role
   - goal
   - preferences
   - communication style
   - constraints

2. Add resume if relevant.

3. Add JD if relevant.

4. Add custom context:
   - user goals
   - answer style
   - constraints
   - negotiation limits
   - company/product facts

5. Add mode-specific reference files:
   - at least 3 files per scenario
   - mixed formats
   - include sentinel facts
   - include one malicious prompt-injection file
   - include one irrelevant file
   - include one contradictory file when useful

6. Select active mode.

7. Start simulated session.

8. Feed transcript script as if it is live conversation.

9. Trigger answer generation:
   - natural auto-trigger if implemented
   - dynamic action accept if implemented
   - manual ask/get answer fallback if auto-trigger is not implemented

10. Capture:
   - prompt packet if safe
   - selected mode
   - retrieved references
   - answer text
   - dynamic action card if present
   - post-call notes
   - telemetry if present

Phase 4: Assertions

Every scenario must assert:

Context correctness:
- Uses active mode's correct reference files.
- Does not use inactive mode reference files.
- Uses resume/JD only when relevant.
- Uses custom context when relevant.
- Uses negotiation context only in negotiation/interview/sales cases where appropriate.
- Does not leak previous user's data.
- Does not leak previous mode context.

Answer quality:
- Answer is relevant to transcript.
- Answer follows active mode style.
- Answer includes required sentinel fact when relevant.
- Answer does not include inactive sentinel fact.
- Answer does not hallucinate facts absent from context.
- Answer refuses/caveats when reference data is missing.
- Answer is concise enough for live use.
- Answer is not generic AI fluff.

Mode behavior:
- Sales handles objections.
- Recruiting evaluates candidate signals.
- Team meeting extracts owners/deadlines.
- Interview uses resume/JD.
- Technical explains code/complexity.
- Lecture creates exam-style notes.
- Negotiation protects user constraints.

RAG/reference behavior:
- Correct file chunks retrieved.
- Irrelevant files ignored.
- Malicious prompt injection ignored.
- Contradictory references handled cautiously.
- Large files do not overflow prompt.
- PDF/DOCX parsing works if supported.

Dynamic action behavior:
- Correct card appears for pricing objection.
- Correct card appears for competitor objection.
- Correct card appears for action item.
- Correct card appears for lecture concept.
- Correct card appears for coding problem.
- Duplicate cards suppressed.
- Dismissed cards do not immediately reappear.
- Accepted card produces correct answer.

Post-call behavior:
- Notes use snapshotted mode, not later active mode.
- Action items have owner/deadline when transcript includes them.
- Follow-up email matches mode.
- Coaching/missed opportunity appears if implemented.
- No unrelated mode content appears.

Security/privacy:
- API keys are never printed.
- Raw transcript is not leaked into logs if logging redaction exists.
- Custom provider does not receive disabled data scopes.
- Prompt injection reference files cannot override system prompt.

Phase 5: Long-session simulations

For each mode, create one longer simulation.

Minimum:
- 20 to 30 minutes simulated transcript per mode
- 100+ transcript turns if practical
- multiple topic shifts
- one correction/contradiction
- one action item
- one irrelevant question
- one context recall question near the end

Test:
- early facts are still remembered or summarized correctly
- outdated facts are replaced by later corrections
- answer latency does not degrade badly
- context does not overflow
- reference retrieval still works
- mode-specific behavior remains stable

Phase 6: Mode bleeding torture tests

Create dedicated tests:

1. User A in Sales mode with Sales reference files.
2. Switch to User B in Interview mode.
3. Ask a question where Sales sentinel would be tempting.
4. Assert no Sales sentinel appears.

Repeat:

- Interview → Sales
- Sales → Lecture
- Lecture → Technical
- Technical → Recruiting
- Recruiting → Team Meeting
- Team Meeting → General
- General → Negotiation

Also test:
- Switching mode while answer is streaming.
- Switching mode before post-call summary completes.
- Switching mode after adding reference files.
- Deleting reference files before asking.
- Updating reference files and verifying old chunks are not retrieved.

Phase 7: Fix failures one by one

When a test fails:

1. Identify whether failure is:
   - test bug
   - fixture bug
   - real product bug
   - missing feature
   - flaky provider/API issue

2. If product bug:
   - inspect root cause
   - use code-reviewer skill
   - use senior-architect skill for architectural changes
   - fix it properly
   - do not hardcode to the fixture
   - add regression test

3. Rerun:
   - failing test
   - related mode tests
   - mode bleeding tests
   - typecheck/build

4. Update:
   - MODES_PROFILE_INTELLIGENCE_BUGFIX_LOG.md
   - MODES_PROFILE_INTELLIGENCE_TEST_RESULTS.md

Phase 8: UI/UX behavior testing

If app has Playwright/Electron testing support, create UI/E2E tests.

If not, create the necessary test harness.

Test:

1. User opens settings.
2. Adds resume.
3. Adds JD.
4. Adds custom context.
5. Selects mode.
6. Adds reference files.
7. Starts session.
8. Transcript comes in.
9. Dynamic card appears.
10. User accepts card.
11. Answer streams.
12. User switches mode.
13. App clearly shows active mode.
14. Previous reference context is not used.
15. User stops meeting.
16. Post-call notes are generated.

If full UI E2E is blocked, document exactly why and create a near-E2E service-level test instead.

Phase 9: Real AnswerCue API testing

If real AnswerCue API is configured locally:

1. Do not print key.
2. Do not commit key.
3. Do not include key in logs.
4. Use safe short test audio/transcript only.
5. Test:
   - valid request
   - fake invalid key
   - provider failure
   - timeout
   - retry/fallback
   - streaming behavior if available

If real AnswerCue API is not configured:
- Skip real API tests cleanly.
- Run mocked provider tests.
- Document what environment variables/settings are needed.

Phase 10: Final reports

At the end, update:

docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_PLAN.md
docs/testing/MODES_PROFILE_INTELLIGENCE_TEST_RESULTS.md
docs/testing/MODES_PROFILE_INTELLIGENCE_BUGFIX_LOG.md

Final report must include:

1. All modes tested.
2. All 5 users per mode.
3. All generated fixture files.
4. Resume/JD/custom context/reference file coverage.
5. File formats tested.
6. Tests passed/failed/skipped.
7. Bugs found.
8. Bugs fixed.
9. Bugs remaining.
10. Mode bleeding results.
11. RAG/reference retrieval results.
12. Profile intelligence results.
13. Dynamic action results.
14. Long-session results.
15. Real AnswerCue API results if run.
16. UI/E2E results.
17. Build/typecheck/lint/test results.
18. Remaining risks.
19. Next testing roadmap.

Also produce a concise final verdict:

- Is Modes Manager actually production-ready?
- Is profile intelligence actually working?
- Are resume/JD/custom context correctly injected?
- Are reference files truly used?
- Is there mode bleeding?
- Which mode is strongest?
- Which mode is weakest?
- Which mode would fail against legacy overlay/Final Round?
- What are the top 10 fixes still needed?

Important quality bar:

This should not be a small test file.
This should become a real AnswerCue QA system.

The goal is that after this work, whenever I fix a reported issue, I can run this suite and know whether I accidentally broke:
- modes
- profile intelligence
- resume/JD injection
- custom context
- reference files
- RAG
- dynamic actions
- AnswerCue API behavior
- mode isolation
- long session behavior

Begin now.
First inspect the repo.
Then create the test plan.
Then create fixtures.
Then implement tests.
Then run them.
Then fix failures one by one.
Then rerun everything.
Then write the final report.