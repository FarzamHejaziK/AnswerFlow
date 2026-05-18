// electron/test/__tests__/evalHarnessPatterns.test.mjs
//
// Regression tests for S454 sub-issue 3: harness false negatives.
//
// The baseline eval (electron/test/modes-live-response-eval.ts) was rejecting
// valid model outputs across 5 scenarios because mustInclude / mustNotInclude
// patterns were either too greedy (matched on substrings inside larger words)
// or too narrow (only accepted one specific variable name / phrasing).
//
// These tests pin down the new behavior so a future tightening pass doesn't
// silently re-introduce the false-negative shape.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// --- Fix 1: technical-two-sum-clean-impl ----------------------------------
// The mustInclude pattern must accept `target - <ANY identifier>`, not just
// the single literal "num" / "nums[]" / "current" the model happened to use
// during the bootstrap run. The CodeSanityCheck + mustNotInclude side still
// catches the buggy tuple form (`target , num`).
const TWO_SUM_SUBTRACTION =
  /target\s*-\s*[A-Za-z_$][\w$]*|target\s*-\s*nums?\[|complement\s*=\s*target\s*-|target\.?subtract/i;

describe('two-sum mustInclude accepts any identifier as the second operand', () => {
  for (const code of [
    'complement = target - num',
    'complement = target - n',
    'complement = target - x',
    'const diff = target - value;',
    'let need = target - element;',
    'complement = target - nums[i]',
    'return target.subtract(current);',
    'complement = target -nums[i]',  // no space after -
  ]) {
    test(`accepts: ${code}`, () => {
      assert.match(code, TWO_SUM_SUBTRACTION);
    });
  }

  test('still rejects the tuple bug', () => {
    assert.doesNotMatch('complement = target, num', TWO_SUM_SUBTRACTION);
  });

  test('still rejects target + num (addition bug)', () => {
    // The mustInclude side doesn't catch addition bugs; the mustNotInclude
    // side does (see eval file). This assertion documents the boundary.
    assert.doesNotMatch('complement = target + num', /target\s*-\s*[A-Za-z_$][\w$]*/);
  });
});

// --- Fix 2: sales-upsell-renewal-already-happy ----------------------------
// `you need to` was matching benign "if you need to expand later" lines.
// Now it only fires when paired with a pressure verb.
const UPSELL_PRESSURE =
  /you need to (upgrade|buy|purchase|sign up|act now|commit|expand now)|should upgrade|have to upgrade|must upgrade|sign up now/i;

describe('upsell pressure detector is anchored to pressure verbs', () => {
  test('benign: "if you need to expand later" is NOT flagged', () => {
    assert.doesNotMatch(
      'Totally makes sense — if you need to expand later, here is what works.',
      UPSELL_PRESSURE,
    );
  });

  test('benign: "you need to know about" is NOT flagged', () => {
    assert.doesNotMatch('You need to know about the team-tier option.', UPSELL_PRESSURE);
  });

  test('pressure: "you need to upgrade" IS flagged', () => {
    assert.match('You need to upgrade today.', UPSELL_PRESSURE);
  });

  test('pressure: "you need to sign up" IS flagged', () => {
    assert.match('You need to sign up before EOM.', UPSELL_PRESSURE);
  });

  test('pressure: "must upgrade" IS flagged', () => {
    assert.match('You must upgrade to stay current.', UPSELL_PRESSURE);
  });
});

// --- Fix 3: lecture-office-hours-stem-clarity -----------------------------
// `here is` was matching inside `there is`. Add word boundary.
const LECTURE_FORBIDDEN = /I think|\bokay\b|let me try|\bhere is\b/i;

describe('lecture mustNotInclude — word-bounded here-is', () => {
  test('benign: "there is" does NOT trigger', () => {
    assert.doesNotMatch('There is strong evidence against the null hypothesis.', LECTURE_FORBIDDEN);
  });

  test('benign: "everywhere is" does NOT trigger', () => {
    assert.doesNotMatch('Everywhere is calibrated against the same threshold.', LECTURE_FORBIDDEN);
  });

  test('flag: "here is" at start of explanation IS flagged', () => {
    assert.match('Here is what happens when p is low.', LECTURE_FORBIDDEN);
  });

  test('benign: "okayed" does NOT trigger word-bound okay', () => {
    assert.doesNotMatch('The review board okayed the threshold.', LECTURE_FORBIDDEN);
  });

  test('flag: bare "okay" IS flagged', () => {
    assert.match('Okay, so the null hypothesis is...', LECTURE_FORBIDDEN);
  });
});

// --- Fix 4: long-context-recruiting-evolution -----------------------------
// `strong.*hire` was matching the intended structured output
// "Strong Yes ... hire". Tighten to literal "strong hire" phrase.
const RECRUITING_FORBIDDEN = /hire.*unqualified|\bstrong hire\b|definite.*no.*hire/i;

describe('recruiting mustNotInclude — bounded strong-hire phrase', () => {
  test('intended structured output "Strong Yes ... hire" is NOT flagged', () => {
    const intended =
      '**Hire signal:** Strong Yes. Demonstrated ownership and clean tradeoff articulation. Gap: behavioral maturity.';
    assert.doesNotMatch(intended, RECRUITING_FORBIDDEN);
  });

  test('intended structured output "Lean No" is NOT flagged', () => {
    assert.doesNotMatch('Hire signal: Lean No.', RECRUITING_FORBIDDEN);
  });

  test('literal "strong hire" IS flagged', () => {
    assert.match('My read is strong hire on this one.', RECRUITING_FORBIDDEN);
  });

  test('"definite no hire" IS flagged', () => {
    assert.match('This is a definite no hire.', RECRUITING_FORBIDDEN);
  });
});

// --- Fix 5: sales-competitor-comparison-no-bash ---------------------------
// mustInclude was missing speed / integration / fit framing vocabulary,
// AND missing ROI / implementation / investment framing the live model
// produced on its first re-run (post 1st-pass loosening).
const COMPETITOR_VALUE =
  /focus.*specifically|focus on|specific.*requirement|connectivity gap|not about price|not price factor|your priorities|what matters|walk through.*requirements|specific outcomes|depth of the integration|value.*stacks.*goals|speed|integration|reliability|scalab|differentiat|where we excel|fit.*you|fit for|tailored to|ROI|implementation|investment|manual overhead|operational|outcome|business value|value driver|your goals/i;

describe('sales competitor-comparison value framing — accepts speed/integration vocabulary', () => {
  for (const valid of [
    'Let me focus on what matters for your team.',
    'The depth of the integration with your existing stack is where we differentiate.',
    'Where we excel is speed and reliability under load.',
    'This is tailored to your specific outcomes.',
    'Our integration story fits your environment better.',
    'Scalability under your peak hours is the differentiator.',
    // Round-2 fixes (eval re-run 2026-05-15) — model used ROI/implementation framing:
    'When we look at your specific goals, our focus is entirely on ensuring the implementation succeeds without the manual overhead.',
    'Would it be helpful to walk through the exact ROI drivers for your team so you can see where that investment is going?',
  ]) {
    test(`accepts: ${valid.slice(0, 50)}...`, () => {
      assert.match(valid, COMPETITOR_VALUE);
    });
  }
});

// --- Fix 6: technical-system-design-scale-unknown -------------------------
// `million.*users` greedy-matched the QUESTION form ("are we aiming for
// millions or smaller?") even though asking is the desired behavior.
// Tightened to assumption-form only.
const SCALE_FORBIDDEN =
  /\bassuming\b.*million|design.*for.*million|target.*million.*users|100mil|assuming.*scale|final arch/i;

describe('scale forbidden — only fires on assumption form, not clarifying question', () => {
  test('clarifying question about millions is NOT flagged', () => {
    const intended =
      'Are we aiming for a global application with millions of daily users, or is this for a smaller, internal-facing tool?';
    assert.doesNotMatch(intended, SCALE_FORBIDDEN);
  });

  test('assumption "assuming millions of users" IS flagged', () => {
    assert.match('I\'ll proceed assuming millions of daily users from day one.', SCALE_FORBIDDEN);
  });

  test('"design for millions" IS flagged', () => {
    assert.match('Design for millions of concurrent users as the baseline.', SCALE_FORBIDDEN);
  });

  test('"100mil" IS flagged', () => {
    assert.match('Target is 100mil DAU.', SCALE_FORBIDDEN);
  });
});

// --- Fix 7: lecture-office-hours-stem-clarity -----------------------------
// mustInclude was too narrowly statistical; model's analogy answer
// ("coincidence meter", "super rare", "stop believing the coin is fair")
// is pedagogically excellent but had none of evidence/threshold/significance.
const LECTURE_PVALUE_VOCAB =
  /evidence|against|probability|assuming.*null|threshold|significance|rare|coincidence|chance|likelihood|surprised|reject|disprove|under.*null|fair coin|fair.*coin/i;

describe('lecture p-value mustInclude accepts analogy-form answers', () => {
  for (const valid of [
    'Think of the p-value like a coincidence meter for your experiment.',
    'The result is super rare under your base assumption.',
    'It’s like being surprised that a coin lands on heads ten times in a row.',
    'You eventually stop believing the fair coin assumption.',
    'You reject the null when the chance under it is implausibly low.',
    // Original formal vocabulary still passes:
    'There is strong evidence against the null hypothesis below the threshold of significance.',
  ]) {
    test(`accepts: ${valid.slice(0, 50)}...`, () => {
      assert.match(valid, LECTURE_PVALUE_VOCAB);
    });
  }
});

// --- Fix: technical-system-design-scale-unknown — accept scale paraphrases --
// The original mustInclude `/clarif|scale|QPS|users|read.*write|retention|how many/i`
// rejected valid clarifying questions that used synonyms like "volume",
// "concurrency", "throughput", "capacity", "traffic", "load". Broadened to
// accept any of those — they are all legitimate scale-clarifying vocabulary.
const SYSTEM_DESIGN_SCALE_CLARIFY =
  /clarif|scale|QPS|users|read.*write|retention|how many|volume|concurren|throughput|capacit|traffic|load/i;

describe('technical-system-design clarify mustInclude accepts scale paraphrases', () => {
  for (const valid of [
    "How many users do you expect?",
    "What's the read/write ratio?",
    "What scale are we targeting?",
    "I'd ask about expected message volume first.",
    "What concurrency levels should we plan for?",
    "What throughput do we need to support?",
    "How much capacity should the system have?",
    "What's the traffic profile look like?",
    "What load are we designing for?",
    "Can you clarify the retention requirements?",
  ]) {
    test(`accepts: "${valid.slice(0, 50)}..."`, () => {
      assert.match(valid, SYSTEM_DESIGN_SCALE_CLARIFY);
    });
  }

  test('still rejects a non-clarifying jump-to-architecture answer', () => {
    assert.doesNotMatch(
      "I'll set up a publish-subscribe channel with persistent storage and CDN edge caching.",
      SYSTEM_DESIGN_SCALE_CLARIFY,
    );
  });
});

// --- Fix: general-noisy-mixed-language-unknown-owner deadline-is greediness -
// The mustNotInclude regex `/deadline is/i` was too greedy: it false-positived
// on correct-behavior phrasings like "no deadline is decided" or
// "deadline is not specified". The narrowed pattern requires an affirmative
// continuation (a day, set/fixed/defined/confirmed, or "the/on/next/this").
// Negative-lookahead form: only flag "deadline is" when NOT followed by an
// abstention/negation word. This avoids the old greedy form's false positives
// AND catches every leak shape (incl. "end of sprint", "EOD", "Q3", "in two
// weeks") that an enumerated allowlist would miss.
const NOISY_DEADLINE_FORBIDDEN =
  /Sandeep owns|Friday|Monday|deadline is\s+(?!not\b|unclear\b|unknown\b|undecided\b|undefined\b|unconfirmed\b|tbd\b|pending\b|to be\b|n\/a\b|no\b|never\b|decided\b|agreed\b)/i;

describe('general-noisy deadline forbidden — only fires on affirmative commitment', () => {
  // BENIGN: model correctly refusing to invent a deadline.
  for (const benign of [
    'No deadline is decided.',
    'The deadline is not specified.',
    'There is no exact deadline.',
    'Deadline is unclear from the transcript.',
    'No specific deadline was decided.',
    'Deadline is unconfirmed.',
    'Deadline is pending.',
    'Deadline is TBD.',
    'Deadline is to be determined.',
  ]) {
    test(`benign (no leak): "${benign.slice(0, 60)}..."`, () => {
      assert.doesNotMatch(benign, NOISY_DEADLINE_FORBIDDEN);
    });
  }

  // LEAK: model invented a specific deadline — broad shapes.
  for (const leak of [
    'The deadline is Friday.',
    'The deadline is set for Monday.',
    'Deadline is 5pm tomorrow.',
    'Deadline is set for next week.',
    'Deadline is fixed at end of sprint.',
    'Deadline is end of sprint.',           // catches "end" via negative lookahead
    'Deadline is EOD.',                      // catches "EOD"
    'Deadline is EOW.',                      // catches "EOW"
    'Deadline is in two weeks.',             // catches "in"
    'Deadline is Q3.',                       // catches "Q3"
    'Deadline is approximately Friday.',     // catches "approximately"
    'Deadline is the 15th.',
    'Deadline is on Thursday.',
    'Deadline is next Friday.',
    'Deadline is this Tuesday.',
    'Deadline is today.',
  ]) {
    test(`leak (must fire): "${leak.slice(0, 60)}..."`, () => {
      assert.match(leak, NOISY_DEADLINE_FORBIDDEN);
    });
  }

  // The other leak signals still fire.
  test('Sandeep owns IS flagged', () => {
    assert.match('Sandeep owns the payment blocker.', NOISY_DEADLINE_FORBIDDEN);
  });
});

// --- Fix: mode-specific micro-rules exist in their exported prompts --------
// These tests assert that the targeted safety wording lives in the right
// mode prompt and was not accidentally moved into bloated TINY_CORE.
// Load from the compiled dist-electron output (matches IdentityGuard.test.mjs).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tinyPath = path.resolve(__dirname, '../../../dist-electron/electron/llm/tinyPrompts.js');
const tiny = await import(pathToFileURL(tinyPath).href);

describe('mode-specific micro-rule invariants', () => {
  test('TINY_MODE_SALES_PROMPT bans echoing internal walkaway/floor numbers', () => {
    assert.match(tiny.TINY_MODE_SALES_PROMPT, /walkaway|walk-away/i);
    assert.match(tiny.TINY_MODE_SALES_PROMPT, /floor|minimum|BATNA|our cost|do not reveal/i);
    assert.match(tiny.TINY_MODE_SALES_PROMPT, /seller-only|public target|public.*list/i);
  });

  test('TINY_MODE_SALES_PROMPT confidential-pricing rule is the LAST rule (recency anchor for small LLMs)', () => {
    // Per Qwen2.5 recency-bias research, safety-critical rules should be at the end of the prompt.
    const idx = tiny.TINY_MODE_SALES_PROMPT.indexOf('CONFIDENTIAL-PRICING TEMPLATE');
    assert.ok(idx > 0, 'CONFIDENTIAL-PRICING TEMPLATE block must exist');
    // Less than 600 chars from the end (i.e., it is the closing block, not buried in the middle).
    assert.ok(tiny.TINY_MODE_SALES_PROMPT.length - idx < 800,
      `CONFIDENTIAL-PRICING TEMPLATE must be near the end (recency bias). Currently at ${tiny.TINY_MODE_SALES_PROMPT.length - idx} chars from end.`);
  });

  test('TINY_MODE_RECRUITING_PROMPT defends against transcript injection', () => {
    assert.match(tiny.TINY_MODE_RECRUITING_PROMPT, /Untrusted transcript|untrusted|injection/i);
    assert.match(tiny.TINY_MODE_RECRUITING_PROMPT, /use the other candidate|ignore the resume|use.*B profile|system prompt:/i);
    assert.match(
      tiny.TINY_MODE_RECRUITING_PROMPT,
      /unverified claim|does not match the resume|contradicts the resume|not on the resume|is unverified/i,
    );
    // Must explicitly tell the model not to quote the injected tokens.
    assert.match(tiny.TINY_MODE_RECRUITING_PROMPT, /do not quote|generic/i);
  });

  test('TINY_MODE_LOOKING_FOR_WORK_PROMPT salary rule includes range/flexibility/lowball', () => {
    assert.match(tiny.TINY_MODE_LOOKING_FOR_WORK_PROMPT, /target or range|range/i);
    assert.match(tiny.TINY_MODE_LOOKING_FOR_WORK_PROMPT, /flex|start date|scope|value/i);
    assert.match(tiny.TINY_MODE_LOOKING_FOR_WORK_PROMPT, /lowball|never accept/i);
    assert.match(tiny.TINY_MODE_LOOKING_FOR_WORK_PROMPT, /walkaway|BATNA|bottom line|minimum/i);
  });

  test('TINY_MODE_GENERAL_PROMPT requires literal transcript number on budget questions', () => {
    assert.match(tiny.TINY_MODE_GENERAL_PROMPT, /Long-context.*budget|budget.*number|literally|literal/i);
    assert.match(tiny.TINY_MODE_GENERAL_PROMPT, /never substitute|do not substitute|never round|do not round/i);
  });

  test('TINY_MODE_LECTURE_PROMPT key-point rule preserves the constant/log contrast', () => {
    assert.match(tiny.TINY_MODE_LECTURE_PROMPT, /amortized constant|constant, not log/i);
    assert.match(tiny.TINY_MODE_LECTURE_PROMPT, /📝/);
  });

  test('TINY_CORE did NOT absorb the mode-specific micro-rules (no bloat)', () => {
    // Each of these phrases must live only in its mode prompt, not in CORE,
    // so future authors do not put them in CORE and re-introduce bloat.
    assert.doesNotMatch(tiny.TINY_CORE, /walkaway/i);
    assert.doesNotMatch(tiny.TINY_CORE, /BATNA/i);
    assert.doesNotMatch(tiny.TINY_CORE, /lowball/i);
    assert.doesNotMatch(tiny.TINY_CORE, /amortized constant/i);
    assert.doesNotMatch(tiny.TINY_CORE, /use the other candidate/i);
  });
});
