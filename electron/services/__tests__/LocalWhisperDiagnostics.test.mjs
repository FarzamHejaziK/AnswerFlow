import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../../audio/LocalWhisperSTT.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

const resetStart = source.indexOf('    private resetDiagnostics(): void');
const resetEnd = source.indexOf('    private recordAudioDiagnostics', resetStart);
const resetSource = source.slice(resetStart, resetEnd);

const recordStart = source.indexOf('    private recordAudioDiagnostics');
const recordEnd = source.indexOf('    private logDiagnostics', recordStart);
const recordSource = source.slice(recordStart, recordEnd);

const logStart = source.indexOf('    private logDiagnostics');
const logEnd = source.indexOf('    /**\n     * Set a context-biasing prompt', logStart);
const logSource = source.slice(logStart, logEnd);

const lifecycleStart = source.indexOf('    start(): void');
const lifecycleEnd = source.indexOf('    /*', source.indexOf('    finalize(): void'));
const lifecycleSource = source.slice(lifecycleStart, lifecycleEnd);

const partialStart = source.indexOf('    private handleStreamingPartial');
const partialEnd = source.indexOf('    private recordFirstPartialLatencyOnce', partialStart);
const partialSource = source.slice(partialStart, partialEnd);

const dispatchStart = source.indexOf('    private dispatchFinal');
const dispatchEnd = source.indexOf('    private sendTranscribe', dispatchStart);
const dispatchSource = source.slice(dispatchStart, dispatchEnd);

const listenerStart = source.indexOf('    private attachWorkerListeners(): void');
const listenerEnd = source.indexOf('    private flushPending(): void', listenerStart);
const listenerSource = source.slice(listenerStart, listenerEnd);

test('LocalWhisperSTT logs non-sensitive audio and VAD diagnostics', () => {
  assert.ok(resetStart >= 0, 'resetDiagnostics should exist');
  assert.ok(recordStart >= 0, 'recordAudioDiagnostics should exist');
  assert.ok(logStart >= 0, 'logDiagnostics should exist');

  assert.match(source, /DIAGNOSTIC_LOG_EVERY_MS = 10_000/);
  for (const counter of [
    'audioChunkCount',
    'totalInputAudioMs',
    'totalResampledAudioMs',
    'rmsAccumulator',
    'peakAccumulator',
    'nearSilentChunkCount',
    'vadClosedSegmentCount',
    'gapFlushCount',
    'softCommitCount',
    'finalDispatchCount',
    'partialEmitCount',
    'finalEmitCount',
    'filteredPartialCount',
    'filteredFinalCount',
  ]) {
    assert.match(resetSource, new RegExp(`this\\.${counter} = 0;`));
  }

  assert.match(recordSource, /this\.audioChunkCount\+\+;/);
  assert.match(recordSource, /this\.totalInputAudioMs \+=/);
  assert.match(recordSource, /this\.totalResampledAudioMs \+=/);
  assert.match(recordSource, /Math\.sqrt\(sumSquares \/ resampled\.length\)/);
  assert.match(recordSource, /rms < 0\.001 && peak < 0\.003/);
  assert.match(recordSource, /this\.logDiagnostics\('interval'\)/);

  for (const field of [
    'chunks',
    'inputAudioMs',
    'resampledAudioMs',
    'avgRms',
    'peak',
    'nearSilentChunks',
    'vadClosedSegments',
    'gapFlushes',
    'softCommits',
    'finalDispatches',
    'partialEmits',
    'finalEmits',
    'filteredPartials',
    'filteredFinals',
    'streamingIntervalMs',
    'streamingMinAudioMs',
    'skipAgreement',
  ]) {
    assert.match(logSource, new RegExp(`${field}:`));
  }
});

test('LocalWhisperSTT diagnostics are emitted at lifecycle and transcript boundaries', () => {
  assert.match(lifecycleSource, /this\.resetDiagnostics\(\);\s+this\.logDiagnostics\('start'\);/);
  assert.match(lifecycleSource, /this\.recordAudioDiagnostics\(chunk, f32\);/);
  assert.match(lifecycleSource, /this\.vadClosedSegmentCount \+= segs\.length;/);
  assert.match(lifecycleSource, /this\.softCommitCount\+\+;/);
  assert.match(lifecycleSource, /this\.gapFlushCount\+\+;/);
  assert.match(lifecycleSource, /this\.logDiagnostics\('finalize'\);/);
  assert.match(lifecycleSource, /this\.logDiagnostics\('stop'\);/);

  assert.match(dispatchSource, /this\.finalDispatchCount\+\+;/);
  assert.match(partialSource, /this\.filteredPartialCount\+\+;/);
  assert.match(partialSource, /this\.partialEmitCount\+\+;/);
  assert.match(listenerSource, /this\.finalEmitCount\+\+;/);
  assert.match(listenerSource, /this\.filteredFinalCount\+\+;/);
});
