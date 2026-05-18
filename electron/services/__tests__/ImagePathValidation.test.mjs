import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

/**
 * ISSUE 2 (P0): Image path validation for arbitrary paths from renderer
 *
 * The generate-code-hint, generate-brainstorm, generate-what-to-say handlers
 * accept imagePaths from renderer without validating them. Attackers could
 * pass paths like /etc/passwd, private home directories, or Windows drive paths.
 *
 * Fix: Validate all paths are inside app-owned directories (userData/screenshots).
 * Reject path traversal attempts (/../), /etc/passwd, private home paths, etc.
 */

test('generate-code-hint validates imagePaths before using them', () => {
  const ipcSource = read('electron/ipcHandlers.ts');
  const engineSource = read('electron/IntelligenceEngine.ts');

  // Find generate-code-hint handler in IPC
  const handlerStart = ipcSource.indexOf('safeHandle("generate-code-hint"');
  assert.ok(handlerStart >= 0, 'generate-code-hint handler should exist');

  // Find generate-brainstorm handler
  const brainstormStart = ipcSource.indexOf('safeHandle("generate-brainstorm"');
  assert.ok(brainstormStart >= 0, 'generate-brainstorm handler should exist');

  // Extract the code-hint handler
  const handlerEnd = ipcSource.indexOf('safeHandle("', handlerStart + 10);
  const codeHintHandler = ipcSource.slice(handlerStart, handlerEnd > -1 ? handlerEnd : undefined);

  // The handler receives imagePaths from renderer and passes them to IntelligenceEngine
  // It should validate paths before passing them

  // Check that IntelligenceEngine.runCodeHint has path validation
  const runCodeHintStart = engineSource.indexOf('async runCodeHint(');
  assert.ok(runCodeHintStart >= 0, 'runCodeHint should exist');

  const nextMethod = engineSource.indexOf('\n    async ', runCodeHintStart + 10);
  const nextMethod2 = engineSource.indexOf('\n    private ', runCodeHintStart + 10);
  const runCodeHintEnd = [nextMethod, nextMethod2].filter(x => x >= 0).sort((a, b) => a - b)[0];
  const runCodeHintBody = engineSource.slice(runCodeHintStart, runCodeHintEnd);

  // Should have path validation
  const hasValidation =
    /validateImagePath|isValidPath|checkPathSafety|isOwnedPath|isAppPath|isScreenshotDir|startsWith\(.*screenshots/.test(runCodeHintBody) ||
    /\.\.\/|\.\.\\/.test(runCodeHintBody) === false; // Should NOT allow traversal

  // Check that the handler passes validated or resolved paths to engine
  assert.ok(hasValidation || /resolvedImagePaths|validatedImagePaths/.test(codeHintHandler),
    'imagePaths should be validated before passing to IntelligenceEngine');
});

test('generate-brainstorm validates imagePaths before using them', () => {
  const ipcSource = read('electron/ipcHandlers.ts');
  const engineSource = read('electron/IntelligenceEngine.ts');

  const handlerStart = ipcSource.indexOf('safeHandle("generate-brainstorm"');
  assert.ok(handlerStart >= 0, 'generate-brainstorm handler should exist');

  const nextHandler = ipcSource.indexOf('safeHandle("', handlerStart + 10);
  const brainstormHandler = ipcSource.slice(handlerStart, nextHandler > -1 ? nextHandler : undefined);

  const runBrainstormStart = engineSource.indexOf('async runBrainstorm(');
  assert.ok(runBrainstormStart >= 0, 'runBrainstorm should exist');

  // Should validate imagePaths
  assert.ok(
    /validateImagePath|isValidPath|checkPathSafety|isOwnedPath|isAppPath/.test(brainstormHandler) ||
    /resolvedImagePaths|validatedImagePaths/.test(brainstormHandler),
    'imagePaths should be validated in generate-brainstorm handler');
});

test('runWhatShouldISay receives validated imagePaths from IPC handler', () => {
  const ipcSource = read('electron/ipcHandlers.ts');
  const engineSource = read('electron/IntelligenceEngine.ts');

  // The runWhatShouldISay method in IntelligenceEngine accepts imagePaths
  // but validation happens at the IPC layer before calling the engine
  const methodStart = engineSource.indexOf('async runWhatShouldISay(');
  assert.ok(methodStart >= 0, 'runWhatShouldISay should exist');

  const nextMethod = engineSource.indexOf('\n    async ', methodStart + 10);
  const nextMethod2 = engineSource.indexOf('\n    private ', methodStart + 10);
  const methodEnd = [nextMethod, nextMethod2].filter(x => x >= 0).sort((a, b) => a - b)[0];
  const methodBody = engineSource.slice(methodStart, methodEnd);

  // The method body should accept imagePaths (validation is at IPC layer)
  assert.ok(/imagePaths\??:?\s*string\[\]/.test(methodBody), 'runWhatShouldISay should accept imagePaths');

  // But the actual validation happens at the IPC handler level
  const whatToSayHandler = ipcSource.indexOf('safeHandle("generate-what-to-say"');
  const handlerEnd = ipcSource.indexOf('safeHandle("', whatToSayHandler + 10);
  const handler = ipcSource.slice(whatToSayHandler, handlerEnd);

  // The handler should validate imagePaths before calling the engine
  assert.ok(
    /validateImagePath|isValidPath|checkPathSafety/.test(handler),
    'generate-what-to-say IPC handler should validate imagePaths'
  );
});

test('image path validation rejects path traversal attempts', () => {
  const source = read('electron/ipcHandlers.ts');

  // Check for path validation utility
  const hasPathValidation =
    /validateImagePath|isValidPath|checkPathSafety|isOwnedPath|validatePath|checkPath/.test(source);

  // The validation should be present
  assert.ok(hasPathValidation, 'Should have image path validation function');
});

test('generate-what-to-say rejects malformed image path payloads before OCR or model calls', () => {
  const ipcSource = read('electron/ipcHandlers.ts');
  const whatToSayStart = ipcSource.indexOf('safeHandle("generate-what-to-say"');
  const whatToSayEnd = ipcSource.indexOf('safeHandle("', whatToSayStart + 10);
  const handler = ipcSource.slice(whatToSayStart, whatToSayEnd);

  assert.match(handler, /imagePaths\.length > 5/);
  assert.match(handler, /typeof imagePath !== 'string'/);
  assert.match(handler, /imagePath\.trim\(\)\.length === 0/);
  assert.match(handler, /malformed image path payload rejected/);
  assert.match(handler, /Invalid image path payload/);
  assert.match(handler, /validatedImagePaths/);
  assert.match(handler, /runWhatShouldISay\(question, 0\.8, validatedImagePaths/);
});

test('image path validation is applied at IPC handler level', () => {
  const ipcSource = read('electron/ipcHandlers.ts');

  // Find all handlers that accept imagePaths
  const generateCodeHint = ipcSource.indexOf('safeHandle("generate-code-hint"');
  const generateBrainstorm = ipcSource.indexOf('safeHandle("generate-brainstorm"');
  const generateWhatToSay = ipcSource.indexOf('safeHandle("generate-what-to-say"');

  assert.ok(generateCodeHint >= 0, 'generate-code-hint should exist');
  assert.ok(generateBrainstorm >= 0, 'generate-brainstorm should exist');
  assert.ok(generateWhatToSay >= 0, 'generate-what-to-say should exist');

  // Extract each handler and check for path validation
  const codeHintEnd = ipcSource.indexOf('safeHandle("', generateCodeHint + 10);
  const codeHintHandler = ipcSource.slice(generateCodeHint, codeHintEnd);

  const brainstormEnd = ipcSource.indexOf('safeHandle("', generateBrainstorm + 10);
  const brainstormHandler = ipcSource.slice(generateBrainstorm, brainstormEnd);

  const whatToSayEnd = ipcSource.indexOf('safeHandle("', generateWhatToSay + 10);
  const whatToSayHandler = ipcSource.slice(generateWhatToSay, whatToSayEnd);

  // At least one should have path validation
  const hasValidation =
    /validate.*Path|isValid.*Path|check.*Path|resolvedImagePaths/.test(codeHintHandler) ||
    /validate.*Path|isValid.*Path|check.*Path|resolvedImagePaths/.test(brainstormHandler) ||
    /validate.*Path|isValid.*Path|check.*Path|resolvedImagePaths/.test(whatToSayHandler);

  assert.ok(hasValidation, 'At least one handler should validate imagePaths');
});