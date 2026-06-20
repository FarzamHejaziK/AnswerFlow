import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const credentialsSource = fs.readFileSync(
  path.join(root, 'electron/services/CredentialsManager.ts'),
  'utf8',
);
const ipcSource = fs.readFileSync(path.join(root, 'electron/ipcHandlers.ts'), 'utf8');
const modelSelectorWindowSource = fs.readFileSync(
  path.join(root, 'src/components/ModelSelectorWindow.tsx'),
  'utf8',
);

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `could not locate ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `could not locate ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
}

test('default model resolves to the first configured provider, with OpenAI before Gemini', () => {
  assert.match(credentialsSource, /openai:\s*'chat-latest'/);
  assert.match(credentialsSource, /const CONFIGURED_PROVIDER_ORDER = \['natively', 'openai', 'gemini', 'claude', 'groq', 'deepseek'\]/);
  assert.match(
    credentialsSource,
    /public getDefaultModel\(\): string \{\s*return this\.resolveDefaultModel\(\) \|\| FALLBACK_DEFAULT_MODEL;\s*\}/,
    'getDefaultModel must use configured-provider resolution, not a hardcoded Gemini fallback',
  );

  const resolver = sliceBetween(
    credentialsSource,
    'private resolveDefaultModel(): string | null {',
    '    private ensureDefaultModelCanRun(): void {',
  );
  assert.match(
    resolver,
    /if \(current && this\.isProviderConfigured\(this\.getProviderForModel\(current\)\)\) return current;/,
    'saved defaults should only be honored when their provider is configured',
  );
  assert.match(
    resolver,
    /return this\.firstConfiguredDefaultModel\(\);/,
    'stale saved defaults should fall through to first configured provider',
  );
});

test('saving provider keys repairs stale defaults and broadcasts the effective runtime model', () => {
  const providers = [
    ['Gemini', 'Gemini'],
    ['Groq', 'Groq'],
    ['Openai', 'OpenAI'],
    ['Claude', 'Claude'],
    ['Deepseek', 'DeepSeek'],
  ];
  for (const [methodProvider, logProvider] of providers) {
    const methodBody = sliceBetween(
      credentialsSource,
      `public set${methodProvider}ApiKey(key: string): void {`,
      `        console.log('[CredentialsManager] ${logProvider} API Key updated');`,
    );
    assert.match(
      methodBody,
      /this\.ensureDefaultModelCanRun\(\);[\s\S]*this\.saveCredentials\(\);/,
      `set${methodProvider}ApiKey should repair stale default model before saving`,
    );
  }

  const openaiHandler = sliceBetween(
    ipcSource,
    "safeHandle('set-openai-api-key'",
    "safeHandle('set-claude-api-key'",
  );
  assert.match(openaiHandler, /const defaultModel = cm\.getDefaultModel\(\);/);
  assert.match(openaiHandler, /llmHelper\.setModel\(defaultModel, allProviders\);/);
  assert.match(openaiHandler, /appState\.sendModelChanged\(defaultModel\);/);
});

test('model selector window does not preselect stale cached models before credentials load', () => {
  assert.doesNotMatch(modelSelectorWindowSource, /cached-current-model/);
  assert.doesNotMatch(modelSelectorWindowSource, /cached-models/);
  assert.match(
    modelSelectorWindowSource,
    /const \[isLoading, setIsLoading\] = useState<boolean>\(true\);/,
    'model picker should show a live loading state instead of stale provider cache',
  );
});
