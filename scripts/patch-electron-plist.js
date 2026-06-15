#!/usr/bin/env node
/**
 * patch-electron-plist.js
 *
 * Patches the development Electron.app Info.plist to add the required
 * NSScreenCaptureUsageDescription, NSMicrophoneUsageDescription, and
 * NSAudioCaptureUsageDescription keys.
 *
 * Without NSScreenCaptureUsageDescription in the Info.plist, macOS silently
 * refuses to show the TCC screen recording permission prompt — or grants it
 * under the generic "com.github.Electron" bundle ID, which means the entry
 * is lost the next time electron is reinstalled / node_modules is cleared.
 *
 * Run this script after every `npm install` via `postinstall` in package.json.
 * It is idempotent — safe to run multiple times.
 */

const fs = require('fs');
const path = require('path');

const APP_NAME = 'AnswerFlow';
const PERMISSIONS = {
  NSScreenCaptureUsageDescription: 'AnswerFlow needs Screen Recording permission to capture system audio for interview transcription.',
  NSAudioCaptureUsageDescription: 'AnswerFlow needs system audio access to transcribe interview audio.',
  NSMicrophoneUsageDescription: 'AnswerFlow needs microphone access to transcribe your voice during interviews.',
};

const plistPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'Info.plist'
);

if (!fs.existsSync(plistPath)) {
  console.log('[patch-electron-plist] Info.plist not found — skipping (non-macOS or missing dist).');
  process.exit(0);
}

let content = fs.readFileSync(plistPath, 'utf8');

let modified = false;

function setStringValue(key, value, insertBeforeKey = null) {
  const keyPattern = new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`);
  if (keyPattern.test(content)) {
    content = content.replace(keyPattern, (_match, prefix, oldValue, suffix) => {
      if (oldValue !== value) {
        modified = true;
        console.log(`[patch-electron-plist] Updated ${key}.`);
      }
      return `${prefix}${value}${suffix}`;
    });
    return;
  }

  if (insertBeforeKey && content.includes(`<key>${insertBeforeKey}</key>`)) {
    content = content.replace(
      `<key>${insertBeforeKey}</key>`,
      `<key>${key}</key>\n\t<string>${value}</string>\n\t<key>${insertBeforeKey}</key>`
    );
    modified = true;
    console.log(`[patch-electron-plist] Added ${key}.`);
  }
}

setStringValue('CFBundleDisplayName', APP_NAME);
setStringValue('CFBundleName', APP_NAME);

setStringValue(
  'NSScreenCaptureUsageDescription',
  PERMISSIONS.NSScreenCaptureUsageDescription,
  'NSMicrophoneUsageDescription'
);

setStringValue(
  'NSAudioCaptureUsageDescription',
  PERMISSIONS.NSAudioCaptureUsageDescription,
  'NSMicrophoneUsageDescription'
);

if (!content.includes('NSMicrophoneUsageDescription')) {
  content = content.replace(
    '</dict>',
    `\t<key>NSMicrophoneUsageDescription</key>\n\t<string>${PERMISSIONS.NSMicrophoneUsageDescription}</string>\n</dict>`
  );
  modified = true;
  console.log('[patch-electron-plist] Added NSMicrophoneUsageDescription.');
}

setStringValue('NSMicrophoneUsageDescription', PERMISSIONS.NSMicrophoneUsageDescription);

if (modified) {
  fs.writeFileSync(plistPath, content, 'utf8');
  console.log('[patch-electron-plist] Info.plist patched successfully.');
} else {
  console.log('[patch-electron-plist] No changes needed.');
}
