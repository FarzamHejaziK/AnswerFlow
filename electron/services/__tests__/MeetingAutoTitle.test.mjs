import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('meeting auto-title is generated from interview content with selected model path', () => {
  const src = read('electron/MeetingPersistence.ts');

  assert.match(src, /function buildInterviewTitleContext/);
  assert.match(src, /<interview_preparation_context>/);
  assert.match(src, /<live_interview_transcript>/);
  assert.match(src, /<ai_interactions>/);
  assert.match(src, /Generate a concise title for this interview/);
  assert.match(src, /Never output "Untitled Interview"/);
  assert.match(src, /this\.llmHelper\.generateMeetingSummary\(titlePrompt, titleContext, groqTitlePrompt\)/);
  assert.match(src, /cleanGeneratedMeetingTitle\(generatedTitle\) \|\| fallbackInterviewTitle/);
  assert.match(src, /titleSource = 'auto'/);
});

test('meeting title source protects manual renames from async generated saves', () => {
  const db = read('electron/db/DatabaseManager.ts');

  assert.match(db, /title_source TEXT DEFAULT 'auto'/);
  assert.match(db, /Applying migration v15 → v16: Add meeting title_source/);
  assert.match(db, /const shouldPreserveManualTitle = existingMeeting\?\.title_source === 'manual'/);
  assert.match(db, /UPDATE meetings SET title = \?, title_source = 'manual'/);
});
