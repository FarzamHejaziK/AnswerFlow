// Phase 4 + Phase 9 — source-level wiring tests.
// Phase 4: hybrid retrieval remains available for non-live-answer paths.
//          WhatToAnswerLLM intentionally skips active-mode retrieval so the
//          live answer button goes straight to the final model call.
// Phase 9: stopMeeting must early-return when meetingRetention is 'never'
//          OR when meeting metadata has doNotPersist === true.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

describe('Phase 4 — Hybrid RAG available outside live WhatToAnswerLLM', () => {
  test('ModesManager exposes async buildRetrievedActiveModeContextBlockHybrid', () => {
    const src = read('electron/services/ModesManager.ts');
    assert.match(src, /async buildRetrievedActiveModeContextBlockHybrid\(/, 'must declare async hybrid method');
    assert.match(src, /retrieveHybrid\(/, 'hybrid method must call into ModeContextRetriever.retrieveHybrid');
    // Falls back to sync lexical when hybrid yields nothing.
    assert.match(src, /buildRetrievedActiveModeContextBlock\(/, 'hybrid path must call lexical fallback if empty');
  });

  test('Hybrid wrapper emits rag_query / rag_hit / rag_lexical_fallback / rag_miss telemetry', () => {
    const src = read('electron/services/ModesManager.ts');
    assert.match(src, /name:\s*['"]rag_query['"]/, 'must emit rag_query');
    assert.match(src, /['"]rag_hit['"]/, 'must distinguish hybrid hits');
    assert.match(src, /['"]rag_lexical_fallback['"]/, 'must record lexical fallback');
    assert.match(src, /['"]rag_miss['"]/, 'must record empty result');
  });

  test('WhatToAnswerLLM does not run active-mode retrieval before live answers', () => {
    const src = read('electron/llm/WhatToAnswerLLM.ts');
    assert.match(src, /getActiveModeSystemPromptSuffix\(\)/, 'live answers may still use active-mode instructions');
    assert.doesNotMatch(src, /buildRetrievedActiveModeContextBlockHybrid\?:/, 'live answer type must not expose hybrid retrieval');
    assert.doesNotMatch(src, /buildRetrievedActiveModeContextBlock\(/, 'live answer path must not call lexical retrieval');
    assert.doesNotMatch(src, /retrievedModeContext:\s*modeContextBlock/, 'live answer packet must not include retrieved mode context');
    assert.doesNotMatch(src, /packetScopes\.push\(['"]reference_files['"]\)/, 'live answer should not add reference_files scope via retrieval');
  });
});

describe('Phase 9 — Retention & doNotPersist gate in MeetingPersistence', () => {
  test('SettingsManager exposes meetingRetention setting', () => {
    const src = read('electron/services/SettingsManager.ts');
    assert.match(src, /meetingRetention\?:\s*['"]forever['"]\s*\|\s*['"]7d['"]\s*\|\s*['"]30d['"]\s*\|\s*['"]never['"]/);
  });

  test('SettingsManager exposes telemetryEnabled setting', () => {
    const src = read('electron/services/SettingsManager.ts');
    assert.match(src, /telemetryEnabled\?:\s*boolean/);
  });

  test('stopMeeting short-circuits when meetingRetention is never', () => {
    const src = read('electron/MeetingPersistence.ts');
    // The gate reads the setting and the meta toggle, then early-returns.
    assert.match(src, /SettingsManager\.getInstance\(\)\.get\(['"]meetingRetention['"]\)/);
    assert.match(src, /retention\s*===\s*['"]never['"]/, 'must check for "never" retention');
    // Per-meeting toggle.
    assert.match(src, /doNotPersist/, 'must support per-meeting doNotPersist');
    // Early-return code path: no DB save, no processAndSaveMeeting call.
    const window = src.slice(src.indexOf('public async stopMeeting'), src.indexOf('public async stopMeeting') + 3000);
    assert.match(window, /this\.session\.reset\(\);\s*\n\s*return null;/, 'do-not-persist path must reset and return null without saving');
  });

  test('do-not-persist still emits a sanitized meeting_stop telemetry event', () => {
    const src = read('electron/MeetingPersistence.ts');
    // Find the doNotPersist branch and assert it tracks meeting_stop.
    const idx = src.indexOf('doNotPersist');
    const window = src.slice(idx, idx + 1500);
    assert.match(window, /name:\s*['"]meeting_stop['"]/, 'do-not-persist path should still emit meeting_stop');
    assert.match(window, /persisted:\s*false/, 'event must record persisted:false');
    assert.match(window, /reason:\s*['"]do_not_persist['"]/, 'event must record reason');
    // Must NOT include transcript or summary in properties.
    assert.doesNotMatch(window, /transcript:\s*snapshot\.transcript/);
  });
});
