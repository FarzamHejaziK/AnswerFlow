# Modes & Profile Intelligence — Test Data Sources

Every reference fixture used by this suite is recorded here with its source classification, sentinel facts, expected retrieval behaviour, and expected answer behaviour.

Three source types are used:

* `downloaded_public` — file fetched from a public, legally-accessible URL. Only used when the downloader runs (`RUN_INTERNET_FIXTURE_COLLECTION=1`). All such files are cached under `tests/fixtures/internet-sourced/` along with metadata JSON.
* `generated_from_public_template` — content inspired by public template structure (e.g. a standard "sales call script" outline), but with synthetic facts so we own the IP and can place deterministic sentinels.
* `synthetic_fallback` — wholly invented for sentinel-bearing assertions. Used by default in CI so tests do not depend on the internet.

In CI the suite uses `synthetic_fallback` content unless `RUN_INTERNET_FIXTURE_COLLECTION=1` is set. The downloader is implemented at `tests/utils/internetFixtureCollector.ts` and is invoked only by `npm run test:modes:collect-fixtures` (added to package.json scripts in this PR).

## Per-mode fixtures

### General mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `general_meeting_agenda.md` | md | synthetic_fallback | "Investor sync set for May 22 with Hyperion Partners" | "when is the investor sync" | the May 22 date | "next Tuesday" if not provided |
| `general_metrics_sheet.csv` | csv | synthetic_fallback | "Q1 ARR run-rate $480k for AnswerFlow pilot" | "what is the Q1 ARR" | $480k figure | invented MRR numbers |
| `general_roadmap.json` | json | synthetic_fallback | "Q2 priority: multi-modal copilot beta" | "what is the Q2 priority" | multi-modal copilot beta | unrelated roadmap items |
| `general_onboarding_checklist.txt` | txt | synthetic_fallback | "Step 4 requires audio device approval" | "how do I configure audio" | step 4 audio approval | OS-specific steps not in file |
| `general_project_brief.html` | html-as-text | synthetic_fallback | "Project codename: Halcyon" | "what is the project codename" | Halcyon | other codenames |

### Sales mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `sales_pricing_policy.json` | json | synthetic_fallback | "Acme enterprise discount floor is 17 percent" | "what discount can we offer Acme" | 17 percent floor | discounts below 17% |
| `sales_competitor_battlecard.md` | md | synthetic_fallback | "legacy overlay lacks per-mode reference files" | "how do we compare to legacy overlay" | per-mode reference file advantage | fabricated legacy overlay features |
| `sales_security_faq.html` | html-as-text | synthetic_fallback | "API keys stored via Electron safeStorage" | "where are API keys stored" | safeStorage | SOC2 unless explicitly listed |
| `sales_playbook.txt` | txt | synthetic_fallback | "Buying signal: ask about annual seats" | "what's the next step after buying signal" | annual seat conversation | invented case studies |
| `sales_pipeline_report.csv` | csv | synthetic_fallback | "Enterprise pilot conversion 28% in Q1" | "how was enterprise pilot conversion" | 28% Q1 enterprise conversion | invented customer logos |

### Recruiting mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `recruiting_backend_jd.md` | md | synthetic_fallback | "Backend Platform role requires Kafka, PostgreSQL, incident response ownership" | "what does the backend role require" | Kafka + PostgreSQL + incident response | unrelated stacks |
| `recruiting_scorecard.csv` | csv | synthetic_fallback | "Score thresholds: 4=strong yes, 1=no" | "how do we score candidates" | 1–4 rubric | invented rubric levels |
| `recruiting_compensation_policy.txt` | txt | synthetic_fallback | "Backend L4 base 165–185k USD" | "what is L4 backend compensation" | 165–185k USD range | levels not listed |
| `recruiting_hiring_policy.json` | json | synthetic_fallback | "No visa sponsorship outside US/EU offices" | "do we sponsor visas" | only US/EU sponsorship | invented countries |
| `recruiting_ats_export.xml` | xml-as-text | synthetic_fallback | "Candidate id ATS-7321 came via referral" | "where did candidate ATS-7321 come from" | referral channel | unlisted channels |

### Team Meet mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `team_meet_sprint_backlog.csv` | csv | synthetic_fallback | "TM-204 owned by Sarah, due Friday" | "what does Sarah own" | TM-204, Friday | other owners |
| `team_meet_launch_checklist.md` | md | synthetic_fallback | "Sarah owns the launch checklist and must deliver it by Friday" | "who owns the launch checklist" | Sarah, Friday | other owners |
| `team_meet_incident_postmortem.txt` | txt | synthetic_fallback | "Root cause INC-119: bad migration on 2026-04-10" | "what was INC-119 root cause" | bad migration, 2026-04-10 | invented mitigations |
| `team_meet_design_spec.html` | html-as-text | synthetic_fallback | "Decision: use SQLite with sqlite-vec for embeddings" | "what was decided about embeddings" | SQLite + sqlite-vec | invented alternatives chosen |
| `team_meet_risk_register.json` | json | synthetic_fallback | "Risk R-7: third-party STT outage, mitigation: local Whisper fallback" | "how do we mitigate STT outages" | local Whisper fallback | invented mitigations |

### Looking-for-Work mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `lfw_resume.txt` | txt | synthetic_fallback | "Built PriceX, a price-comparison website; scaled AnswerFlow to 10k users" | "tell me about a project you scaled" | PriceX or AnswerFlow scale | invented FAANG roles |
| `lfw_jd.md` | md | synthetic_fallback | "Role: AI Product Engineer at Helio Labs, hybrid SF" | "tell me about the role you're applying for" | AI Product Engineer at Helio Labs | invented job titles |
| `lfw_star_stories.json` | json | synthetic_fallback | "Conflict story: chargeback escalation with payments vendor" | "tell me about a conflict you resolved" | chargeback escalation | invented conflicts |
| `lfw_negotiation_context.xml` | xml-as-text | synthetic_fallback | "Target base $185k; BATNA competing offer at $180k" | "what should I counter with" | $185k target | offers below BATNA |
| `lfw_interview_prep_notes.txt` | txt | synthetic_fallback | "Always anchor stories in measurable outcomes" | "how should I frame STAR stories" | measurable outcomes anchor | invented frameworks |

### Technical Interview mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `tech_array_problem.md` | md | synthetic_fallback | "Find pair summing to target; sorted array required" | "what was the array problem" | pair sum on sorted array | invented constraints |
| `tech_interviewer_preferences.xml` | xml-as-text | synthetic_fallback | "Interviewer prefers O(n log n) only if O(n) is impossible" | "what is the interviewer's complexity preference" | O(n log n) only if O(n) impossible | invented preferences |
| `tech_complexity_cheatsheet.json` | json | synthetic_fallback | "Two-pointer scan: O(n), O(1) space" | "what's the complexity of two-pointer" | O(n), O(1) | invented complexities |
| `tech_system_design_notes.html` | html-as-text | synthetic_fallback | "Cap throughput at 10k qps per shard; use read replicas" | "what's the throughput cap" | 10k qps per shard | invented caps |
| `tech_error_log.txt` | txt | synthetic_fallback | "TypeError at handlers.ts:114 — undefined modeSnapshot" | "what does the error log show" | TypeError handlers.ts:114 | invented stack frames |

### Lecture mode

| File | Type | Source | Sentinel facts | Retrieval queries | Answer must include | Answer must NOT include |
|---|---|---|---|---|---|---|
| `lecture_pde_syllabus.md` | md | synthetic_fallback | "Green's function is a likely 12-mark exam topic" | "what is the exam priority for Green's function" | likely 12-mark exam topic | invented marks |
| `lecture_notes_greens_function.txt` | txt | synthetic_fallback | "Green's function definition: G satisfies LG=δ" | "define Green's function" | LG=δ | invented definitions |
| `lecture_past_questions.csv` | csv | synthetic_fallback | "PYQ-2024-Q3: solve harmonic boundary problem" | "what did PYQ-2024-Q3 ask" | harmonic boundary problem | invented PYQ |
| `lecture_topic_priority.xml` | xml-as-text | synthetic_fallback | "Topic priority: harmonic functions=high, separation of variables=medium" | "which topics are high priority" | harmonic functions high | invented priorities |
| `lecture_formula_sheet.html` | html-as-text | synthetic_fallback | "Laplacian Δu = ∂²u/∂x² + ∂²u/∂y²" | "what is the Laplacian formula" | Δu = ∂²u/∂x² + ∂²u/∂y² | invented formulas |

### Negotiation overlay (looking-for-work + custom mode)

| File | Type | Source | Sentinel facts |
|---|---|---|---|
| `neg_salary_plan.md` | md | synthetic_fallback | "Target $185k; floor $175k; BATNA competing offer at $180k" |
| `neg_refund_policy.html` | html-as-text | synthetic_fallback | "Refunds within 30 days; pro-rata for annual plans" |
| `neg_saas_discount_policy.json` | json | synthetic_fallback | "Annual: 12% off list; multi-seat: extra 4% from 10 seats" |
| `neg_statement_of_work.txt` | txt | synthetic_fallback | "SOW scope: 4 milestones; rate $140/hr; cap 200 hours" |
| `neg_vendor_comparison.csv` | csv | synthetic_fallback | "Vendor B price 18% lower but no SOC2" |

## Internet collector

Implementation: `tests/utils/internetFixtureCollector.ts`. Behaviour:

* Only fetches `https://` URLs with allow-listed hosts (Wikipedia, github.com raw, ietf.org, w3.org).
* Max file size: 1 MiB.
* Allowed extensions: `.txt`, `.md`, `.json`, `.csv`, `.xml`, `.html`.
* Filenames sanitized (`[^a-zA-Z0-9._-]` → `_`).
* Metadata JSON sidecar (`FixtureSourceMetadata`) written next to every cached file.
* If a fetch fails or the host is blocked, the collector falls back to the synthetic fixture and marks `sourceType: 'synthetic_fallback'`.

The collector is **not** invoked from default test runs. It is documented and shipped so that operators can opt in.

## Adding new fixtures

1. Drop the file under `tests/fixtures/modes/<mode>/`.
2. Add a row to the table above.
3. Add at least one sentinel sentence to the file content.
4. If the file should be retrieved by a specific test, ensure the sentinel word(s) overlap by ≥1 stemmed token with the test query (the lexical retriever uses a Jaccard-style score with a 0.18 minimum).
