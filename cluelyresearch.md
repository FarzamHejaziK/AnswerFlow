The strongest finding so far: Cluely’s “modes” are not separate models. Public docs describe them as active prompt modes plus KB/RAG, live actions, meeting notes templates, and enterprise role/team assignment.

Thought for 2m 25s

Below is the full Cluely teardown from official docs, public reviews, Reddit, GitHub clones, Hacker News/forum-style discussions, and technical Electron/OS references.

The biggest correction first: Cluely’s “auto answer” is not fully automatic in the way people imagine. Official docs show that Cluely auto-detects questions/keywords/suggestions as Dynamic Actions, but the user usually clicks, presses Tab, or uses Cmd/Ctrl + Enter to get the answer. Reddit users and third-party reviews also report that it does not always auto-generate direct answers without a trigger.

1. What Cluely actually is

Cluely is a desktop/mobile AI assistant that listens to meeting audio, reads screen context, gives real-time answers, creates meeting notes, and optionally hides its overlay from screen sharing. Its own site describes the core loop as: listen in real time, understand what is being said, and give instant answers, notes, and next steps.

For enterprise, Cluely frames itself mainly around sales, recruiting, consulting, support, and internal meetings, not just interviews. Its enterprise docs say it helps users “win deals, scan candidates, consult better, and deliver more value,” and specifically mentions handling tough questions, objections, and follow-up questions.

The app has three big surfaces:

Live Insights during the call.
Pre-call briefs before the call.
Post-call notes/coaching/analytics after the call.
2. Core app architecture

The working pipeline is probably this:

Audio capture
+ screen context
+ calendar / meeting metadata
+ active mode prompt
+ user files / company KB / CRM context
        ↓
Realtime transcript + OCR/screen state
        ↓
Intent / trigger detector
        ↓
Dynamic Action card
        ↓
User clicks / Tab / Cmd Enter / Cmd Shift Enter
        ↓
Context builder
        ↓
LLM response
        ↓
Overlay answer + meeting notes + follow-up actions

Official docs confirm the key pieces: Cluely has real-time transcription, no-bot meeting notes, keyword detection, question/objection/technical-term detection, prompt-based answers, knowledge base retrieval, and enterprise models.

3. What “Modes” are

Cluely “Modes” are basically active prompt configurations.

A mode is not a separate trained AI model. It is closer to:

{
  "mode_name": "Sales Discovery",
  "system_prompt": "...",
  "knowledge_base_scope": ["sales scripts", "pricing", "objection docs"],
  "default_actions": ["what_should_i_say", "follow_up_questions"],
  "custom_live_actions": ["handle_pricing_objection", "compare_competitor"],
  "post_call_template": "sales_call_notes",
  "coaching_rubric": "MEDDICC / BANT / custom scorecard",
  "crm_context": true,
  "allowed_team_roles": ["sales_rep", "account_manager"]
}

Official docs call the mode dropdown “Customize Cluely” prompts, and say users can switch the active mode inside Live Insights or from the desktop app.

For individuals, modes appear to be mostly custom prompts and uploaded files. Cluely pricing says Starter includes limited AI responses, limited note-taking, custom instructions, and file uploads; Pro expands to unlimited responses, note-taking, models, files, and customization.

For enterprise, modes become much more powerful: admins create prompts, assign prompts to teams, attach knowledge bases, define team access, and use analytics/coaching. The docs explicitly mention prompt customization, knowledge base management, team configuration, permissions, and analytics.

4. Pro vs Enterprise modes

This is important for Natively.

Cluely Pro seems to have:

Custom prompt
+ personal files
+ default actions
+ basic meeting notes

Cluely Enterprise adds:

Team prompts
+ role-based prompt assignment
+ company knowledge base
+ CRM/ATS integrations
+ custom live actions
+ custom notes templates
+ missed-opportunity coaching
+ admin analytics

Their own enterprise comparison says Pro has only default live actions like “What should I say next?” and “Suggest follow up questions,” while Enterprise adds custom live action buttons from prompts to links.

This means the real product depth is not the overlay. It is the mode management system around prompts, retrieval, actions, templates, role assignment, and analytics.

5. How “Auto Answer” / Dynamic Actions work

Cluely’s “auto answer” is better understood as auto-detected answer opportunities.

Official docs say real-time questions, keywords, and suggestions detected from the transcript appear below the main Live Insights card. Users can click one, or hit Tab to answer the top Dynamic Action.

So the loop is likely:

Transcript chunk arrives:
"The pricing seems high compared to Gong."

Detector classifies:
intent = competitor/pricing objection
priority = high
topic = Gong
mode = Sales

UI creates Dynamic Action:
"Handle pricing objection vs Gong"

User hits Tab/clicks:
generate answer using transcript + mode prompt + KB + pricing docs

Cluely also has Cmd/Ctrl + Enter for Ask AI and Cmd/Ctrl + Shift + Enter / Get Answer for screen/conversation-based answers without typed input.

Reddit users report that, at least in some versions, users still needed to prompt it manually; one commenter says “No auto-capture. Must prompt it if you want an answer.” A third-party review also says no automatic answer was generated in their test and they had to type or click.

So for Natively: do not build “auto answer” as fully autonomous first. Build “auto-detected action cards” first. That is safer, faster, and closer to what Cluely seems to do.

6. The mode-by-mode map

Cluely does not publish one clean “all modes” list, but public docs, site copy, Reddit posts, and product pages reveal these mode families.

A. General Meeting Mode

Purpose:

Help user during normal meetings.

Inputs:

Live transcript
Screen context
Meeting title
Participants
Recent context
User prompt

Default actions:

What should I say next?
Follow-up questions
Fact check
Who am I talking to?
Recap

Cluely’s Live Insights docs list these exact default actions: “What should I say next,” “Follow up questions,” “Fact check,” “Who am I talking to,” and “Recap.”

Output style:

Short answer
1-3 talking points
Clarifying question
Mini recap

Natively implementation:

{
  "mode": "general_meeting",
  "actions": [
    "suggest_reply",
    "suggest_followups",
    "recap_last_2_minutes",
    "fact_check_claim",
    "identify_person_or_company"
  ]
}
B. Sales Mode

Purpose:

Help reps handle discovery, objection handling, pricing, competitor questions, and follow-up.

Official docs repeatedly position Cluely around sales: “win deals,” “make every rep your best rep,” answer during calls, handle objections, and ask follow-up questions.

Inputs:

Sales script
ICP
Pricing
Offer
Objection library
Competitor battlecards
CRM history
Previous meetings
Customer profile

Triggers:

Pricing objection
Competitor mention
“Need to think about it”
“Talk to my boss”
Security/compliance question
Onboarding question
Budget/timeline question
Buying signal

The official enterprise docs say Cluely listens for questions, objections, and technical terms, and gives answers from prompts, KB, and models.

Reddit sales users are doing exactly this manually: uploading rebuttal docs, building objection lists, and writing prompts that group objections by call stage.

How Sales Mode likely works:

Prospect says: "This feels expensive."
        ↓
Intent detector: pricing_objection
        ↓
Retrieve pricing docs + case studies + discount policy
        ↓
Generate:
- what concern this signals
- short reply
- proof point
- follow-up question

Best Sales Mode actions for Natively:

Handle objection
Ask discovery question
Compare competitor
Explain pricing
Summarize pain
Identify buying signal
Draft follow-up email
Update CRM notes
Score call quality
C. Customer Support Mode

Purpose:

Help support reps answer product questions and resolve issues live.

Official enterprise docs mention using support prompts for customer issue resolution and say users can switch between prompts for sales calls, support sessions, or internal meetings.

Inputs:

Help center docs
Product docs
Known issues
Refund/cancellation policy
Troubleshooting SOPs
Customer account history
Past tickets

Triggers:

Bug report
Refund request
Setup issue
Integration error
“How do I...”
“Why is this not working?”
Angry customer sentiment
Escalation language

Knowledge base docs are central here. Cluely supports files, live links, and data sources; it mentions support documentation, product knowledge bases, company wikis, internal docs, and external knowledge sources.

Likely Support Mode flow:

Customer: "Audio capture is not working on Windows."
        ↓
Detect: support_troubleshooting
        ↓
Retrieve: Windows audio troubleshooting SOP
        ↓
Answer:
1. Check mic permission
2. Verify input/output device
3. Restart app/audio service
4. Escalate if still failing

Natively actions:

Troubleshoot issue
Find policy
Summarize customer problem
Suggest empathetic response
Escalate to human
Draft resolution email
D. Recruiting / Talent Mode

Purpose:

Help recruiters screen candidates consistently and sell the role.

Official docs mention scanning candidates and recruiting workflows, and CRM/ATS integrations are built into enterprise.

Inputs:

Role requirements
Candidate resume
Company pitch
Interview SOP
Scorecard
Compensation range
Runway/funding facts
Culture talking points
ATS history

Reddit has a concrete recruiting mode prompt template: role title, ideal candidate profile, tech stack, company differentiation, role requirements, candidate Q&A, company details, and screening flow/scorecard.

Triggers:

Candidate asks about work-life balance
Candidate asks about runway
Candidate asks why role is open
Candidate gives weak/strong signal
Candidate mentions competing offer
Candidate asks compensation/equity

Likely Recruiting Mode output:

Candidate signal:
- Strong backend fit
- Weak product communication
- Ask deeper about ownership

Suggested reply:
"That’s a fair question. The role is open because..."

Natively actions:

Evaluate candidate answer
Ask follow-up interview question
Sell role
Answer candidate concern
Score candidate
Generate interview notes
Push notes to ATS

Cluely’s ATS/CRM integration docs say integrations can match participants, pull activity history, and push meeting notes into CRM/ATS systems.

E. Interview / Job-Seeker Mode

Purpose:

Help a candidate answer recruiter, behavioral, technical, coding, or system design questions.

This is the controversial original use case. Cluely’s public positioning has included interviews, and the mobile page lists “Interview” among “perfect for your next” use cases.

Inputs:

Resume
Job description
Company brief
Story bank
STAR answers
Technical experience
Coding screen
System design notes

Reddit setup advice says users paste resume, JD, company brief, and 4-6 stories into the system prompt field, then dry-run the overlay and hotkeys.

Triggers:

Tell me about yourself
Why this company?
Conflict story
Leadership story
Weakness question
System design prompt
LeetCode/coding screen
Runtime/complexity follow-up

The alleged public Cluely system prompt contains specific handling for behavioral/PM questions, technical problems, math, multiple choice, UI navigation, screen problem solving, and transcript errors. Treat this as unverified but useful signal, because it is a public gist, not official Cluely docs.

For Natively, Interview Mode should be split into submodes:

Recruiter Screen
Behavioral / STAR
Technical Concept
Coding / DSA
System Design
PM / Case

Each submode should have different answer length, latency target, and context strategy.

F. Technical / Coding Smart Mode

Purpose:

Answer coding, LeetCode, system design, spreadsheet, and visible screen problems.

Cluely docs mention Smart Mode for coding assistance, and Get Answer for coding problems or Excel sheets on the screen.

Inputs:

Screen OCR / screenshot
Problem statement
Code editor content
Transcript question
Previous answer context

Triggers:

LeetCode problem visible
Compiler error
Runtime complexity question
“Optimize this”
Spreadsheet formula issue
Code review prompt

Output:

Code
Explanation
Complexity
Dry run
Edge cases

Open-source Cluely-style clones follow the same pattern: Cass captures screenshots/audio notes, sends them to Gemini, and formats responses for LeetCode, MCQs, math, and plans.

G. Internal Meeting / 1:1 / Standup Mode

Purpose:

Take notes, catch decisions, suggest follow-ups, and extract action items.

Official docs recommend using Cluely in daily standups and internal meetings during team adoption.

Inputs:

Meeting title
Participants
Transcript
Project docs
Previous meeting notes

Triggers:

Decision made
Action item assigned
Blocker mentioned
Timeline changed
Risk raised
Follow-up promised

Output:

Meeting notes
Action items
Decision log
Risks/blockers
Follow-up draft

Meeting Notes docs confirm Cluely generates detailed notes, AI-drafted next steps, full transcripts with speaker identification, key insights, editable summaries, share links, and transcript export.

H. Consulting / Client Advisory Mode

Purpose:

Help consultants respond confidently in client calls.

Cluely’s docs mention “consult better,” and Reddit users discuss people using Cluely to handle consulting-style client communication.

Inputs:

Client brief
Proposal
Past calls
Industry context
Deliverables
Pricing/SOW
Case studies

Triggers:

Client asks for recommendation
Client challenges scope
Client asks timeline
Client asks ROI
Client asks technical feasibility

Output:

Strategic answer
Clarifying question
Risk framing
Next-step recommendation

This is basically Sales Mode + Support Mode + Strategy Mode.

I. Education / Lecture / Class / Seminar Mode

Purpose:

Capture notes and answer questions during learning sessions.

The mobile page lists lecture, seminar, class, campus event, advising session, brainstorm, workshop, and note-to-self as use cases.

Inputs:

Lecture audio
Slides/screen
Syllabus/reference files
Student question

Triggers:

Professor explains concept
Slide changes
Formula appears
Definition appears
Question asked

Output:

Structured notes
Definitions
Summary
Possible exam questions
Follow-up explanation

This is very relevant to your earlier lecture-note mode idea.

7. Full use-case map

Public Cluely pages and docs support these use cases:

Meetings
Sales calls
Recruiting
Support sessions
Internal meetings
Client calls
Consulting
Interviews
Homework
Coffee chats
Brainstorms
Lectures
Therapy sessions
Standups
Workshops
Doctor visits
Seminars
Catch-ups
Pitches
Campus events
Advising sessions
Client debriefs
Dinner conversations
Classes
Notes to self

The mobile page explicitly lists many of these casual/professional use cases. Pricing also says people use it for meetings, homework, sales calls, or curiosity.

For Natively, do not present all these as separate modes. Group them into mode families:

1. Meeting Assistant
2. Sales Copilot
3. Support Copilot
4. Recruiting Copilot
5. Interview Copilot
6. Technical/Coding Copilot
7. Study/Lecture Copilot
8. Consulting/Client Copilot
8. Intent detection taxonomy

Based on docs, alleged prompt leaks, and user behavior, Cluely likely detects these intent families.

Officially supported / strongly documented
Question detected
Objection detected
Technical term detected
Keyword detected
Suggestion opportunity detected
Screen problem detected
Summary/recap request
Follow-up question opportunity

Official docs explicitly say Cluely detects questions, objections, technical terms, questions/keywords/suggestions, and surfaces them as live actions.

Likely inferred from modes
Pricing objection
Competitor objection
Security/compliance question
Onboarding question
Support troubleshooting request
Candidate concern
Role-fit signal
Buying signal
Decision point
Action item
Risk/blocker
CRM/account mention
ATS/candidate mention

The inferred list follows directly from Cluely’s sales/recruiting/support positioning, knowledge base docs, CRM/ATS integration docs, and Reddit prompt usage.

Alleged prompt-level logic

The public gist says the assistant should focus on the end of the transcript, infer intent from messy transcript text, answer if 50%+ confident a question is being asked, define technical/proper nouns in the final 10-15 words, solve visible screen problems when clear, and generate follow-up questions after technical/project stories. Again, this is public-gist evidence, not official documentation.

9. How the overlay / invisibility likely works

Cluely says it does not join meetings, so there is no meeting bot in the participant list. Its site says it is invisible to screen share, recordings, and external meeting tools.

Official docs say the invisibility feature uses the same privacy technology Zoom uses to avoid infinite overlays and depends on Windows/macOS standards.

Technically, Electron provides win.setContentProtection(true), which prevents window contents from being captured by other apps. Electron says on Windows it uses SetWindowDisplayAffinity with WDA_EXCLUDEFROMCAPTURE; on macOS it sets NSWindowSharingNone, but newer macOS apps using ScreenCaptureKit may still capture the window.

Microsoft’s docs say WDA_EXCLUDEFROMCAPTURE makes a window appear only on the monitor and not in capture, but also warns this is not DRM/security and cannot stop someone photographing the screen.

Cluely’s own docs admit limitations: as of September 2025, it was not invisible for Windows 10, Windows 11 Home, or pre-2020 Apple devices in Microsoft Teams, Zoom full-screen share, or Google Meet full-screen share.

For Natively: make invisibility a compatibility matrix, not a promise.

10. Audio capture / transcription

Cluely requires microphone and screen/system audio permissions. Its troubleshooting docs say users should see a waveform, open a transcription window, and see text appear; own voice appears in blue.

The docs also mention Cluely uses system audio settings, microphone permissions, screen/system audio recording permissions, Windows Audio service restarts, and network/WebSocket access to Cluely transcription endpoints.

For Natively, the important architecture is:

Mic audio
+ system loopback audio
+ VAD
+ streaming STT
+ speaker labeling
+ rolling transcript buffer

Cluely appears to use cloud transcription infrastructure, because its docs mention domains like service.transcribe.cluely.com and WebSocket/network troubleshooting.

11. Screen context / OCR / screenshot analysis

Cluely’s site says users can ask about the screen or conversation, and the UI says “Viewed screen.”

Docs say Get Answer / Cmd Shift Enter can help with coding problems or Excel sheets on screen without text input.

Open-source clones confirm the common implementation pattern: screenshot capture + OCR/screen analysis + audio transcription + LLM answer + floating overlay. Cheap-cluely uses Tesseract/screen OCR, Whisper, Gemini, and a translucent always-on-top overlay; Cass captures screenshots/audio and streams them to Gemini; Pluely describes system audio capture and voice input.

For Natively, screen context should be split into:

fast OCR text
+ screenshot image model call
+ active app/window title
+ cursor/focus context
+ change detection

Do not image-model every frame. Use OCR/change detection first, then vision model only when needed.

12. Knowledge Base / RAG

This is one of Cluely’s biggest enterprise advantages.

Cluely’s knowledge base can sync company knowledge, sales scripts, and process docs so AI can use them during calls. It supports files, live links, data sources, team-level permissions, shared access, and analytics.

Supported text-based docs include PDFs, Word docs, TXT, MD, and other text-based files. Live links can be configured for support documentation, product updates, knowledge articles, company wikis, and external sources.

Cluely says its RAG is used for live insights, Cmd Enter, scoped missed-opportunity/meeting-note context, and conversation linking for pre-call briefs.

This means modes should not just have prompts. Modes need retrieval scopes:

{
  "sales_discovery": {
    "retrieval_scopes": ["pricing", "competitors", "case_studies", "sales_scripts"]
  },
  "support": {
    "retrieval_scopes": ["docs", "known_issues", "refund_policy", "setup_guides"]
  },
  "recruiting": {
    "retrieval_scopes": ["role_requirements", "candidate_scorecards", "company_pitch"]
  }
}
13. CRM / ATS integrations

Cluely integrates CRM and ATS systems through Merge.dev. Docs say it can match call participants with contacts, pull activity history, and push meeting notes into the CRM or ATS.

Supported examples include HubSpot, Salesforce, Pipedrive, Zoho CRM, Greenhouse, Lever, Workday, BambooHR, and others via Merge.dev.

The important mode behavior:

Sales Mode:
pull account/deal history → answer based on current opportunity

Recruiting Mode:
pull candidate/job history → evaluate candidate and push interview notes

Support Mode:
pull customer/ticket history → suggest resolution and escalation

For Natively, this is a huge upsell layer. Personal users need files/prompts. Teams need CRM/ATS + KB + admin controls.

14. Pre-call briefs

Cluely pre-call briefs use Google Calendar to identify upcoming meeting participants, research professional profiles, pull meeting context, and generate preparation summaries. Only Google Calendar was supported as of August 27, 2025, according to their docs.

Briefs include meeting details, participant names/roles/backgrounds, previous meeting history, relevant docs/topics, suggested talking points/questions, and company/role background.

For Natively:

5 minutes before meeting:
calendar event → participants → CRM/LinkedIn/company search → past notes → mode suggestion

Then auto-select likely mode:

External prospect + CRM deal = Sales Mode
Candidate + ATS record = Recruiting Mode
Customer domain + support ticket = Support Mode
Internal team = Internal Meeting Mode

That is how you make modes feel “smart.”

15. Post-call notes and follow-ups

Cluely meeting notes include detailed notes, AI-drafted next steps, full transcripts with speaker identification, key insights, editable summaries, shareable links, session continuation, and transcript export.

Enterprise docs also say meeting notes can include mode-specific email templates and generated follow-up emails. Changelog says Cluely Modes include customized email templates for meeting notes.

For Natively, each mode needs a post-call template:

Sales:
- pain
- budget
- authority
- timeline
- objections
- next steps
- follow-up email

Recruiting:
- candidate summary
- strengths
- concerns
- scorecard
- next step

Support:
- issue
- root cause
- attempted fixes
- resolution
- escalation

Internal:
- decisions
- action items
- blockers
- owners
16. Coaching / missed opportunities

Cluely’s Coaching feature monitors how reps respond to prospect queries during calls, compares against customizable sales scorecards, and summarizes missed opportunities after calls.

The docs describe real-time monitoring, custom criteria, instant feedback, post-call analysis, actionable improvement recommendations, ROI tracking, team dashboards, and trend analysis.

This is another layer beyond “answer mode.”

Natively equivalent:

During call:
- classify moments
- detect missed discovery questions
- detect unanswered objections
- detect weak/unsupported claims
- detect overtalking / poor listening

After call:
- missed opportunities
- coaching score
- next training suggestions

For sales, this is enterprise gold.

17. Analytics / admin layer

Cluely pilot reporting includes detailed Ask AI interaction analysis, categorization by use case, call-specific context, time-based usage trends, ROI and business impact metrics, objection handling success, knowledge base ROI, technical health, adoption, app version rates, and integration success.

For Natively, track:

Mode used
Meeting type
Actions surfaced
Actions clicked
Answer latency
STT latency
OCR latency
RAG retrieval hit/miss
User copy/use rate
Regeneration rate
Thumbs up/down
Post-call note edits
Follow-up email created

This is how you debug modes scientifically instead of guessing.

18. Public weaknesses / complaints
Latency

A Medium reviewer reported 5-10 second response delays in some cases, which felt too slow for live calls.

A Reddit commenter claimed recruiter-screen answers can appear in 2-3 seconds, but complex screen+audio tasks are slower.

Reliability

Users and reviewers mention freezing/crashing, transcript issues, and cases where audio capture appears active but does not pick up correctly.

Hallucination

The Medium reviewer reported hallucinated personal details and wrong meeting decisions, so generated answers still require sanity checking.

Auto-answer mismatch

Some users expect fully automatic answers, but public reports show manual prompting is still common.

Personalization friction

A reviewer said prompt personalization existed but felt clunky when switching between interview, sales, and product-sync contexts.

Invisibility is not universal

Official docs list specific OS/device/platform cases where invisibility does not work reliably.

19. What to copy for Natively

The core Cluely playbook is:

1. Make the assistant ambient.
2. Detect when help is needed.
3. Show a tiny action card.
4. Let user trigger answer instantly.
5. Inject the right mode context.
6. Retrieve relevant docs.
7. Keep answer short and usable.
8. Turn the call into notes/follow-ups/coaching.

The minimum strong Natively mode schema should be:

{
  "id": "sales_discovery",
  "name": "Sales Discovery",
  "description": "Helps with discovery, objections, pricing, and follow-ups.",
  "system_prompt": "...",
  "answer_style": {
    "max_words": 80,
    "tone": "confident, natural, not robotic",
    "format": "headline + bullets"
  },
  "context_sources": {
    "transcript": true,
    "screen": true,
    "user_profile": true,
    "reference_files": true,
    "crm": false
  },
  "retrieval_scopes": ["pricing", "competitors", "case_studies"],
  "dynamic_actions": [
    {
      "id": "pricing_objection",
      "trigger": ["too expensive", "budget", "price", "cost"],
      "priority": 0.9,
      "prompt": "Handle this pricing objection using proof and one follow-up question."
    },
    {
      "id": "competitor_objection",
      "trigger": ["competitor names"],
      "priority": 0.85,
      "prompt": "Compare against the competitor without sounding defensive."
    }
  ],
  "post_call_template": "sales_notes",
  "coaching_rubric": "custom_sales_scorecard"
}
20. Best Natively implementation roadmap
Phase 1: Make modes real

Build:

Mode CRUD
Mode prompt
Reference files per mode
Default answer style per mode
Post-call template per mode
Shortcut to switch mode
Phase 2: Dynamic Actions

Build these first:

Question detected
Follow-up suggested
Recap requested
Objection detected
Technical term detected
Action item detected
Screen problem detected

Do not overbuild. The UI should show 1-3 actions max.

Phase 3: Auto-mode detection

Infer mode from:

Calendar title
Participant emails/domains
Window/app context
Keywords in first 2 minutes
User history

Example:

"Discovery call with Acme" → Sales
"Candidate screen: Backend Engineer" → Recruiting
"Customer escalation" → Support
"Lecture / class" → Study
"Zoom interview" → Interview
Phase 4: RAG per mode

Every mode should choose different retrieval collections.

Sales → pricing, objections, competitors
Support → docs, bugs, policies
Interview → resume, JD, story bank
Recruiting → candidate resume, scorecard, role spec
Lecture → syllabus, notes, textbook
Phase 5: Enterprise layer

Build:

Teams
Role-based default modes
Admin-created prompts
Shared KB
Usage analytics
Call coaching
CRM/ATS sync
Custom privacy settings

That is where Cluely is trying to monetize enterprise.

21. The final mental model

Cluely is not “one chatbot over a meeting.”

It is:

Realtime meeting OS
+ active mode prompt
+ screen/audio context
+ action detector
+ RAG
+ overlay
+ notes
+ follow-ups
+ coaching
+ admin analytics

The most important product insight:

Mode = prompt + context + trigger rules + retrieval scope + output template + post-call workflow.

The second most important insight:

Auto Answer = dynamic action detection first, generation second.

The third:

The hard moat is latency + context orchestration + UX reliability, not the model.

For Natively, the fastest way to beat them is not “copy Cluely modes.” It is to make modes testable objects with measurable trigger accuracy, latency, retrieval quality, and answer usefulness.