import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..', '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

test('MeetingPersistence no longer iterates reference file bodies inline for summary', () => {
  const src = read('electron/MeetingPersistence.ts');

  // The legacy inline iteration used a per-file MAX_FILE_CHARS / MAX_TOTAL_CHARS
  // pair plus a getReferenceFiles call directly inside processAndSaveMeeting().
  assert.doesNotMatch(src, /const MAX_FILE_CHARS = 12_000;/);
  assert.doesNotMatch(src, /const MAX_TOTAL_CHARS = 40_000;/);
  assert.doesNotMatch(src, /modesMgr\.getReferenceFiles\(modeSnapshot\.id\)/);
});

test('MeetingPersistence summary uses buildSummarySafeModeContextBlock with scope gating', () => {
  const src = read('electron/MeetingPersistence.ts');

  assert.match(src, /modesMgr\.buildSummarySafeModeContextBlock\(modeSnapshot\.id/);
  assert.match(src, /scopePolicy\?\.post_call_summary !== false/);
  assert.match(src, /scopePolicy\?\.reference_files !== false/);
  assert.match(src, /includeReferenceSnippets: referenceSnippetsAllowed/);
});

test('ModesManager exposes buildSummarySafeModeContextBlock and gates raw bodies', () => {
  const src = read('electron/services/ModesManager.ts');

  assert.match(src, /public buildSummarySafeModeContextBlock\(/);
  assert.match(src, /includeReferenceSnippets\?: boolean/);
  assert.match(src, /this\.modeContextRetriever\.retrieve\(mode, this\.getReferenceFiles\(mode\.id\), \{[\s\S]+query:[\s\S]+transcript:[\s\S]+tokenBudget:[\s\S]+\}\);/);
});

test('buildSummarySafeModeContextBlock returns customContext only when references denied', async () => {
  // Drive the compiled module directly so we exercise the real code path,
  // but stub the DB-backed lookups so the test doesn't require Electron's app.
  const distPath = path.resolve(__dirname, '../../../dist-electron/electron/services/ModesManager.js');
  const url = (await import('node:url')).pathToFileURL(distPath).href;
  const mod = await import(url);
  const mgr = mod.ModesManager.getInstance();

  const FAKE_MODE_ID = 'test-fake-mode';
  const fakeMode = {
    id: FAKE_MODE_ID,
    name: 'Fake',
    templateType: 'sales',
    customContext: 'CUSTOM_CONTEXT_SENTINEL',
    isCustom: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: false,
    isActive: false,
  };
  const fakeFiles = [
    { id: 'rf1', modeId: FAKE_MODE_ID, fileName: 'a.txt', mimeType: 'text/plain', sizeBytes: 100, content: 'RAW_REFERENCE_CANARY_BODY', sortOrder: 0 },
  ];

  const originalGetModes = mgr.getModes.bind(mgr);
  const originalGetReferenceFiles = mgr.getReferenceFiles.bind(mgr);
  mgr.getModes = () => [fakeMode];
  mgr.getReferenceFiles = () => fakeFiles;

  try {
    // With references denied, the canary must NOT appear and customContext MUST appear.
    const denied = mgr.buildSummarySafeModeContextBlock(FAKE_MODE_ID, {
      query: 'meeting summary',
      transcript: 'short transcript',
      includeReferenceSnippets: false,
    });
    assert.ok(denied.includes('CUSTOM_CONTEXT_SENTINEL'), 'customContext must always be present');
    assert.ok(!denied.includes('RAW_REFERENCE_CANARY_BODY'), 'raw reference body must not appear when references denied');

    // With references allowed, retrieval still uses the retriever (snippets only).
    // For an irrelevant query, retrieval should not produce the full raw body.
    const allowedIrrelevant = mgr.buildSummarySafeModeContextBlock(FAKE_MODE_ID, {
      query: 'no overlap query xyz',
      transcript: 'no overlap transcript abc',
      includeReferenceSnippets: true,
    });
    assert.ok(allowedIrrelevant.includes('CUSTOM_CONTEXT_SENTINEL'));
    assert.ok(!allowedIrrelevant.includes('RAW_REFERENCE_CANARY_BODY'),
      'raw reference body must not appear in summary even when retrieval has no relevant matches');
  } finally {
    mgr.getModes = originalGetModes;
    mgr.getReferenceFiles = originalGetReferenceFiles;
  }
});

test('legacy buildActiveModeContextBlock still exists for non-summary paths', () => {
  const src = read('electron/services/ModesManager.ts');
  assert.match(src, /public buildActiveModeContextBlock\(\): string \{/);
});
