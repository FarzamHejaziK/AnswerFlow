// Generates real PNG fixtures used by OcrRealFixtures.test.mjs and the screen-understanding
// benchmark. Output: tests/fixtures/screen/{ocr_simple_text,ocr_code_problem,ocr_error_log,ocr_table}.png
//
// We render text into PNG via sharp's SVG input — that avoids native font dependencies and
// produces images Tesseract.js can recognise reliably on CI as well as a dev laptop.
//
// Run directly (`node tests/fixtures/screen/generateOcrFixtures.mjs`) or import
// `ensureFixtures()` from the test suite.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Each fixture: id, dimensions, lines, and expectedWords (the test asserts each is present).
export const FIXTURES = [
  {
    id: 'ocr_simple_text',
    width: 900,
    height: 240,
    fontSize: 44,
    lineHeight: 56,
    lines: [
      'Hello Natively',
      'Screen understanding works',
    ],
    expectedWords: ['Hello', 'Natively', 'Screen', 'understanding', 'works'],
  },
  {
    id: 'ocr_code_problem',
    width: 1100,
    height: 480,
    fontSize: 30,
    lineHeight: 42,
    monospace: true,
    lines: [
      'def two_sum(nums, target):',
      '    seen = {}',
      '    for i, n in enumerate(nums):',
      '        if target - n in seen:',
      '            return [seen[target - n], i]',
      '        seen[n] = i',
      '    return []',
    ],
    expectedWords: ['two_sum', 'target', 'seen', 'return'],
  },
  {
    id: 'ocr_error_log',
    width: 1100,
    height: 320,
    fontSize: 28,
    lineHeight: 40,
    monospace: true,
    lines: [
      'TypeError: Cannot read property',
      '"value" of undefined',
      'at handleSubmit (Form.tsx:42)',
      'at HTMLButtonElement.onClick',
    ],
    expectedWords: ['TypeError', 'Cannot', 'undefined', 'handleSubmit'],
  },
  {
    id: 'ocr_table',
    width: 900,
    height: 320,
    fontSize: 32,
    lineHeight: 44,
    monospace: true,
    lines: [
      'Plan      Price',
      'Basic     $10',
      'Pro       $20',
      'Business  $50',
    ],
    expectedWords: ['Plan', 'Price', 'Basic', 'Pro', 'Business'],
  },
];

function svgFor(fixture) {
  // Single-quoted attribute to allow internal double-quotes in font-family fallback lists.
  const fontFamily = fixture.monospace
    ? "Menlo, 'DejaVu Sans Mono', Consolas, monospace"
    : 'Helvetica, Arial, sans-serif';
  const lines = fixture.lines
    .map((line, i) => {
      const y = 60 + i * fixture.lineHeight;
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      return `<text x="40" y="${y}" font-family="${fontFamily}" font-size="${fixture.fontSize}" fill="#0a0a0a">${escaped}</text>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${fixture.width}" height="${fixture.height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${lines}
</svg>`;
}

export async function renderFixture(fixture, outputDir) {
  const svg = Buffer.from(svgFor(fixture));
  const outPath = path.join(outputDir, `${fixture.id}.png`);
  await sharp(svg).png({ compressionLevel: 6 }).toFile(outPath);
  return outPath;
}

// Render all fixtures only if they are missing or stale. Returns the absolute path
// for every fixture in declaration order so callers can index into it.
export async function ensureFixtures(outputDir = __dirname) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const paths = [];
  for (const fixture of FIXTURES) {
    const outPath = path.join(outputDir, `${fixture.id}.png`);
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      await renderFixture(fixture, outputDir);
    }
    paths.push(outPath);
  }
  return paths;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureFixtures(__dirname)
    .then(paths => {
      console.log(`Generated ${paths.length} OCR fixtures:`);
      for (const p of paths) console.log(`  ${p}`);
    })
    .catch(err => {
      console.error('Failed to generate fixtures:', err);
      process.exit(1);
    });
}
