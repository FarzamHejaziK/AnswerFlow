import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const importDist = rel => import(pathToFileURL(path.join(repoRoot, 'dist-electron/electron', rel)).href);

test('standard cloud model list exposes the API-valid GPT 5.5 Instant and Gemini 3.5 Flash IDs', () => {
  const src = read('src/utils/modelUtils.ts');

  assert.match(src, /ids:\s*\['chat-latest', 'gpt-5\.4'\]/);
  assert.match(src, /names:\s*\['GPT 5\.5 Instant', 'GPT 5\.4'\]/);
  assert.match(src, /ids:\s*\['gemini-3.5-flash', 'gemini-3\.1-flash-lite-preview', 'gemini-3\.1-pro-preview'\]/);
  assert.match(src, /names:\s*\['Gemini 3\.5 Flash', 'Gemini 3\.1 Flash', 'Gemini 3\.1 Pro'\]/);
});

test('OpenAI and Gemini defaults stay aligned across runtime constants and connection tests', () => {
  const llmHelper = read('electron/LLMHelper.ts');
  const ipcHandlers = read('electron/ipcHandlers.ts');

  assert.match(llmHelper, /const OPENAI_MODEL = "chat-latest"/);
  assert.match(llmHelper, /const GEMINI_FLASH_MODEL = "gemini-3.5-flash"/);
  assert.match(ipcHandlers, /model:\s*'chat-latest'/);
  assert.match(ipcHandlers, /max_completion_tokens:\s*10/);
  assert.match(ipcHandlers, /models\/gemini-3.5-flash:generateContent/);
});

test('OpenAI chat-latest alias is classified as cloud, OpenAI, and vision-capable', async () => {
  const { getModelCapabilities } = await importDist('llm/modelCapabilities.js');
  const { parseModelVersion, classifyModel, classifyTextModel, ModelFamily, TextModelFamily } =
    await importDist('services/ModelVersionManager.js');

  assert.deepEqual(parseModelVersion('chat-latest'), { major: 5, minor: 5, patch: 0, raw: 'chat-latest' });
  assert.deepEqual(parseModelVersion('gemini-3.5-flash'), { major: 3, minor: 5, patch: 0, raw: 'gemini-3.5-flash' });
  assert.equal(classifyModel('chat-latest'), ModelFamily.OPENAI);
  assert.equal(classifyTextModel('chat-latest'), TextModelFamily.OPENAI);

  const caps = getModelCapabilities('chat-latest', false);
  assert.equal(caps.tier, 'cloud');
  assert.equal(caps.supportsImages, true);
});

test('ProviderRouter defaults route OpenAI and Gemini to the updated model IDs', async () => {
  const { ProviderRouter } = await importDist('llm/ProviderRouter.js');
  const router = new ProviderRouter();

  const openai = router.selectProvider({
    actionType: 'summary',
    providerHealth: { claude: 'down', openai: 'healthy', gemini: 'down' },
  });
  assert.equal(openai.provider, 'openai');
  assert.equal(openai.model, 'chat-latest');

  const gemini = router.selectProvider({
    preferLowLatency: true,
    providerHealth: { groq: 'down', gemini: 'healthy' },
  });
  assert.equal(gemini.provider, 'gemini');
  assert.equal(gemini.model, 'gemini-3.5-flash');
});
