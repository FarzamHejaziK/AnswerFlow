import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('CredentialsManager does not persist plaintext fallback credentials when encryption is unavailable', () => {
  const source = read('electron/services/CredentialsManager.ts');
  const saveStart = source.indexOf('    private saveCredentials(): void');
  const saveEnd = source.indexOf('    private loadCredentials(): void', saveStart);
  const saveSource = source.slice(saveStart, saveEnd);

  assert.ok(saveStart >= 0, 'saveCredentials should exist');
  assert.match(saveSource, /Encryption not available; credentials kept in memory only/);
  assert.doesNotMatch(saveSource, /falling back to plaintext/);
  assert.doesNotMatch(saveSource, /const plainPath/);
  assert.doesNotMatch(saveSource, /tmpPlain/);
  assert.doesNotMatch(saveSource, /writeFileSync\([^\n]*plain/i);
  assert.doesNotMatch(saveSource, /const plainPath = CREDENTIALS_PATH \+ '\.json'/);
  assert.doesNotMatch(saveSource, /fs\.writeFileSync\(tmpPlain, JSON\.stringify\(this\.credentials\)\)/);
});

test('CredentialsManager removes plaintext fallback files instead of loading them', () => {
  const source = read('electron/services/CredentialsManager.ts');
  const loadStart = source.indexOf('    private loadCredentials(): void');
  const loadSource = source.slice(loadStart);

  assert.ok(loadStart >= 0, 'loadCredentials should exist');
  assert.match(loadSource, /Removed plaintext credential file/);
  assert.doesNotMatch(loadSource, /Loaded plaintext credentials/);
  assert.doesNotMatch(loadSource, /readFileSync\(plaintextPath/);
  const plaintextSectionStart = loadSource.indexOf("const plaintextPath = CREDENTIALS_PATH + '.json';", loadSource.indexOf('// Try encrypted file first') + 1);
  const plaintextSection = loadSource.slice(plaintextSectionStart);
  assert.doesNotMatch(plaintextSection, /const data = fs\.readFileSync/);
  assert.doesNotMatch(plaintextSection, /JSON\.parse\(data\)/);
  assert.doesNotMatch(plaintextSection, /this\.credentials = parsed/);
});

test('SettingsManager does not log full settings JSON', () => {
  const source = read('electron/services/SettingsManager.ts');

  assert.match(source, /Settings loaded successfully', \{ keys: Object\.keys\(this\.settings\)\.length \}/);
  assert.doesNotMatch(source, /JSON\.stringify\(this\.settings\)/);
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\([^\n]*,\s*this\.settings\s*[),]/);
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\([^\n]*,\s*parsed\s*[),]/);
});
