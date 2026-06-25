// Regression test for the live overlay audio-warning UX.
//
// Audio capture failures are still useful diagnostics, but the live interview
// shell should not interrupt the user with warning banners, macOS deep-link
// buttons, or repair controls while they are in an interview.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const tsxPath = path.join(root, 'src/components/AnswerCueInterface.tsx');
const source = fs.readFileSync(tsxPath, 'utf8');

const PERMISSION_HANDLER_RE =
  /onSystemAudioPermissionDenied\?\.\(\((?:[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\)\s*;/g;

const CAPTURE_HANDLER_RE =
  /onAudioCaptureFailed\?\.\(\((?:payload|[^)]*)\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;[\s\S]*?return\s*\(\)\s*=>\s*unsub\?\.\(\)\s*;/g;

describe('UX3: live audio warnings stay diagnostic-only in the overlay', () => {
  it('keeps a system-audio permission subscription for diagnostics', () => {
    const matches = source.match(PERMISSION_HANDLER_RE);
    assert.ok(
      matches && matches.length === 1,
      'expected exactly one onSystemAudioPermissionDenied subscription handler',
    );
    assert.match(matches[0], /Suppressed live audio warning/);
    assert.match(matches[0], /kind:\s*['"]screen-recording-permission['"]/);
    assert.match(matches[0], /channel:\s*['"]system['"]/);
  });

  it('keeps an audio-capture-failed subscription for diagnostics', () => {
    const matches = source.match(CAPTURE_HANDLER_RE);
    assert.ok(
      matches && matches.length === 1,
      'expected exactly one onAudioCaptureFailed subscription handler',
    );
    assert.match(matches[0], /payload\.terminal\s*\|\|\s*payload\.stuck|payload\.stuck\s*\|\|\s*payload\.terminal/);
    assert.match(matches[0], /Suppressed live audio warning/);
    assert.match(matches[0], /kind:\s*['"]audio-capture-failure['"]/);
    assert.match(matches[0], /channel:\s*payload\.channel/);
  });

  it('does not render the removed live warning/deep-link UI', () => {
    assert.doesNotMatch(source, /type\s+SystemAudioWarning\s*=/);
    assert.doesNotMatch(source, /systemAudioWarning/);
    assert.doesNotMatch(source, /setSystemAudioWarning/);
    assert.doesNotMatch(source, /Open Mic Settings|Open Screen Settings/);
    assert.doesNotMatch(source, /x-apple\.systempreferences:/);
  });

  it('warning handlers do not auto-expand the live shell', () => {
    const permissionHandler = source.match(PERMISSION_HANDLER_RE)?.[0] || '';
    const captureHandler = source.match(CAPTURE_HANDLER_RE)?.[0] || '';
    assert.doesNotMatch(permissionHandler, /setIsExpanded\s*\(\s*true\s*\)/);
    assert.doesNotMatch(captureHandler, /setIsExpanded\s*\(\s*true\s*\)/);
  });
});
