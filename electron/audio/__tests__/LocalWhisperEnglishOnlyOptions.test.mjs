import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const workerSource = readFileSync(
  path.join(root, 'electron/audio/whisper/whisperWorker.ts'),
  'utf8',
);

test('English-only local ASR models omit task and language generation options', () => {
  assert.match(
    workerSource,
    /const englishOnly = ENGLISH_ONLY_MODELS\.has\(loadedModelId\);/,
    'worker should identify English-only models at transcription time',
  );
  assert.match(
    workerSource,
    /const language: string \| null = englishOnly \? null : \(LANG_MAP\[msg\.language\] \?\? null\);/,
    'English-only models should not receive an explicit language option',
  );
  assert.doesNotMatch(
    workerSource,
    /language\s*=\s*['"]english['"]/,
    'Transformers v3 rejects explicit language for English-only models',
  );
  assert.match(
    workerSource,
    /if \(!englishOnly\) \{\s*opts\.task = ['"]transcribe['"];\s*if \(language\) opts\.language = language;\s*\}/,
    'task/language should only be attached for multilingual models',
  );
});
