import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const answerCueSource = fs.readFileSync(
  path.join(root, 'src/components/AnswerCueInterface.tsx'),
  'utf8',
);
const helpSource = fs.readFileSync(
  path.join(root, 'src/components/settings/HelpSettings.tsx'),
  'utf8',
);
const ipcSource = fs.readFileSync(path.join(root, 'electron/ipcHandlers.ts'), 'utf8');
const preloadSource = fs.readFileSync(path.join(root, 'electron/preload.ts'), 'utf8');
const electronTypesSource = fs.readFileSync(path.join(root, 'src/types/electron.d.ts'), 'utf8');
const mainSource = fs.readFileSync(path.join(root, 'electron/main.ts'), 'utf8');
const sessionSource = fs.readFileSync(path.join(root, 'electron/SessionTracker.ts'), 'utf8');
const dbSource = fs.readFileSync(path.join(root, 'electron/db/DatabaseManager.ts'), 'utf8');
const launcherSource = fs.readFileSync(path.join(root, 'src/components/Launcher.tsx'), 'utf8');
const meetingDetailsSource = fs.readFileSync(
  path.join(root, 'src/components/MeetingDetails.tsx'),
  'utf8',
);

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `could not locate ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `could not locate ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
}

test('screenshot attachment stays in the pending tray until it is used by a turn', () => {
  const attachBody = sliceBetween(
    answerCueSource,
    'const handleScreenshotAttach = (data: { path: string; preview: string }) => {',
    '  // STT Status listener',
  );

  assert.doesNotMatch(
    attachBody,
    /setMessages\(/,
    'taking a screenshot should not create a standalone empty chat-history row',
  );
  assert.match(
    attachBody,
    /setAttachedContext\(\(prev\)\s*=>\s*{\s*if\s*\(prev\.some\(\(s\)\s*=>\s*s\.path\s*===\s*data\.path\)\)\s*return prev;/,
    'screenshot attach should dedupe pending attachments by path',
  );
  assert.match(
    attachBody,
    /return updated\.slice\(-5\);/,
    'screenshot attach should cap the pending attachment tray',
  );
  assert.match(
    answerCueSource,
    /onClick=\{\(\) =>\s*onOpenScreenshot\(\{ path: msg\.screenshotPath, preview: msg\.screenshotPreview! \}\)\s*\}[\s\S]*src=\{msg\.screenshotPreview\}[\s\S]*alt="Screenshot preview"/,
    'message rows should render the screenshot thumbnail, not only a text label',
  );
});

test('chat screenshot thumbnails open in-app previews, can be saved, and used attachments render on the user turn', () => {
  assert.match(
    answerCueSource,
    /const handleOpenScreenshot = useCallback\(\(screenshot: ScreenshotPreviewAttachment\) => \{[\s\S]*setSelectedScreenshot\(screenshot\);/,
    'renderer should open clicked screenshots in the in-app preview',
  );
  assert.match(
    answerCueSource,
    /const handleSaveScreenshot = useCallback\(async \(screenshot: ScreenshotPreviewAttachment\) => \{[\s\S]*saveScreenshotFile\?\.\(screenshot\)/,
    'renderer should save screenshots through the narrow screenshot save IPC',
  );
  assert.match(
    answerCueSource,
    /const appendUserMessage = useCallback\([\s\S]*existing\.intent === 'screenshot_attachment'[\s\S]*consumedPaths\.has\(existing\.screenshotPath\)/,
    'append helper should still collapse any legacy pending screenshot rows before appending the user turn',
  );
  assert.match(
    answerCueSource,
    /appendUserMessage\([\s\S]*screenshotPreview: currentAttachments\[0\]\.preview[\s\S]*currentAttachments,\s*\);/,
    'screenshot quick actions should use the duplicate-filtering append helper',
  );
  assert.match(
    answerCueSource,
    /const latestVisibleScreenshotRef = useRef<ScreenshotAttachment \| null>\(null\);/,
    'renderer should remember the latest visible screenshot attachment',
  );
  assert.match(
    answerCueSource,
    /latestVisibleScreenshotRef\.current = latestScreenshot[\s\S]*path: latestScreenshot\.screenshotPath![\s\S]*preview: latestScreenshot\.screenshotPreview!/,
    'visible screenshot tracking should keep both path and preview available',
  );
  assert.match(
    answerCueSource,
    /if \(currentAttachments\.length === 0 && latestVisibleScreenshotRef\.current\?\.path\) \{[\s\S]*currentAttachments = \[latestVisibleScreenshotRef\.current\];[\s\S]*\}/,
    'live answer/chat paths should reuse the latest visible screenshot when no pending screenshot remains',
  );
  assert.match(
    answerCueSource,
    /onClick=\{\(\) => handleOpenScreenshot\(ctx\)\}[\s\S]*alt=\{`Screenshot \$\{idx \+ 1\}`\}/,
    'pending screenshot thumbnails should also be clickable',
  );

  assert.match(
    ipcSource,
    /safeHandle\([\s\S]*'save-screenshot-file'[\s\S]*validateImagePath\(sourcePath, userDataDir\)[\s\S]*dialog\.showSaveDialog[\s\S]*fs\.promises\.writeFile\(targetPath, buffer\)/,
    'save-screenshot-file IPC should validate app-owned screenshot paths before writing the chosen save target',
  );
  assert.match(
    preloadSource,
    /saveScreenshotFile: \(screenshot: \{ path\?: string; preview\?: string \}\) =>\s*ipcRenderer\.invoke\('save-screenshot-file', screenshot\)/,
    'preload should expose the narrow screenshot saver',
  );
  assert.match(
    electronTypesSource,
    /saveScreenshotFile: \(screenshot: \{[\s\S]*path\?: string[\s\S]*preview\?: string[\s\S]*\}\) => Promise<\{ success: boolean; error\?: string; canceled\?: boolean; path\?: string \}>/,
    'renderer ElectronAPI type should include saveScreenshotFile',
  );
});

test('normal screenshot UX points to full-screen capture, while selective capture remains explicit', () => {
  assert.match(
    answerCueSource,
    /Ask anything on screen or conversation/,
    'chat input should keep the simple screen/conversation placeholder',
  );

  const hintBlock = sliceBetween(
    answerCueSource,
    '{showLiveActionHint && (',
    '<DynamicActionBar',
  );

  assert.match(
    hintBlock,
    /label: 'Screenshot'[\s\S]*keys:\s*shortcuts\.takeScreenshot\s*\|\|\s*\[getModifierSymbol\('cmd'\),\s*'H'\]/,
    'shortcut hint should advertise the full-screen screenshot shortcut',
  );
  assert.match(
    hintBlock,
    /shortcuts\.takeScreenshot\s*\|\|\s*\[getModifierSymbol\('cmd'\),\s*'H'\]/,
    'shortcut hint should use the full-screen screenshot shortcut',
  );
  assert.doesNotMatch(
    hintBlock,
    /shortcuts\.selectiveScreenshot|for selective screenshot/,
    'shortcut hint must not route users to the cropper shortcut for normal screenshots',
  );
  assert.match(helpSource, /\{ label: 'Screenshot', kbd: `\$\{cmd\}\+H` \},/);
  assert.doesNotMatch(helpSource, /for selective screenshot|Screenshot & Ask/);
  assert.match(
    helpSource,
    /title: 'Screenshot'[\s\S]*kbd: \['⌘', 'H'\][\s\S]*Captures the whole screen/,
    'help quick-action card should describe Cmd/Ctrl+H as whole-screen capture',
  );
});

test('screenshots taken during a meeting are persisted and rendered in interview history', () => {
  assert.match(
    sessionSource,
    /logScreenshot\(path: string, preview: string, captureKind: 'full' \| 'selective' = 'full'\)/,
    'SessionTracker should expose screenshot usage logging',
  );
  assert.match(
    ipcSource,
    /safeHandle\('take-screenshot'[\s\S]*recordScreenshotUsage\(screenshotPath, preview, 'full'\);/,
    'normal screenshot IPC should record screenshot usage for active meetings',
  );
  assert.match(
    ipcSource,
    /safeHandle\('take-selective-screenshot'[\s\S]*recordScreenshotUsage\(screenshotPath, preview, 'selective'\);/,
    'selective screenshot IPC should record screenshot usage for active meetings',
  );
  assert.match(
    mainSource,
    /general:capture-and-process'[\s\S]*this\.recordScreenshotUsage\(screenshotPath, preview, 'full'\);/,
    'capture-and-process shortcut should persist its screenshot event',
  );
  assert.match(
    dbSource,
    /usage\.metadata && typeof usage\.metadata === 'object'[\s\S]*metadata = JSON\.stringify\(usage\.metadata\);/,
    'DatabaseManager should serialize screenshot metadata',
  );
  assert.match(
    launcherSource,
    /item\.type === 'screenshot'[\s\S]*screenshotPreview: item\.screenshotPreview \|\| metadata\.screenshotPreview/,
    'Launcher should reconstruct screenshot timeline items from saved usage',
  );
  assert.match(
    launcherSource,
    /setSelectedScreenshotPreview\(\{[\s\S]*path: item\.screenshotPath,[\s\S]*preview: item\.screenshotPreview \|\| '',[\s\S]*\}\)[\s\S]*src=\{item\.screenshotPreview\}[\s\S]*alt="Screenshot preview"/,
    'Interview history timeline should render clickable screenshot thumbnails',
  );
  assert.match(
    launcherSource,
    /const ScreenshotPreviewDialog[\s\S]*saveScreenshotFile\?\.\(screenshot\)[\s\S]*title="Save screenshot"/,
    'Interview history preview dialog should expose screenshot saving',
  );
  assert.match(
    meetingDetailsSource,
    /setSelectedScreenshotPreview\(\{[\s\S]*path: interaction\.screenshotPath,[\s\S]*preview: interaction\.screenshotPreview \|\| '',[\s\S]*\}\)[\s\S]*src=\{interaction\.screenshotPreview\}[\s\S]*alt="Screenshot preview"/,
    'Meeting details usage history should render clickable screenshot thumbnails',
  );
  assert.match(
    meetingDetailsSource,
    /handleSaveScreenshot\(selectedScreenshotPreview\)[\s\S]*title="Save screenshot"/,
    'Meeting details preview dialog should expose screenshot saving',
  );
});
