import { app } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

export type InterviewContextDocumentKind = 'resume' | 'project' | 'other';

export interface InterviewContextDocument {
  id: string;
  name: string;
  fileType: 'md' | 'txt' | 'pdf' | 'docx';
  markdown: string;
  contextKind?: InterviewContextDocumentKind;
  contextDescription?: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface IngestedMarkdownDocument {
  fileName: string;
  fileType: InterviewContextDocument['fileType'];
  markdown: string;
  sizeBytes: number;
}

const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.pdf', '.docx']);
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const PARSE_TIMEOUT_MS = 15_000;
let pdfWorkerConfigured = false;

function configurePdfWorker(PDFParse: any): void {
  if (pdfWorkerConfigured || typeof PDFParse?.setWorker !== 'function') return;

  const workerCandidates = [
    path.join(__dirname, 'pdf.worker.mjs'),
    path.join(process.cwd(), 'node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs'),
  ];

  const workerPath = workerCandidates.find(candidate => fs.existsSync(candidate));
  if (workerPath) {
    PDFParse.setWorker(pathToFileURL(workerPath).href);
    pdfWorkerConfigured = true;
    console.log('[InterviewContextDocsManager] PDF worker configured:', workerPath);
  } else {
    console.warn('[InterviewContextDocsManager] PDF worker not found; PDF upload may fail.');
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function decodeTextFile(buffer: Buffer, fileName: string, ext: string): string {
  if (buffer.length === 0) {
    throw new Error(`"${fileName}" is empty.`);
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buffer.length - 2);
    for (let i = 2; i + 1 < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1];
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8');
  }

  const sniffWindow = buffer.subarray(0, Math.min(2048, buffer.length));
  if (sniffWindow.includes(0)) {
    throw new Error(`"${fileName}" looks like a binary file even though its extension is ${ext}.`);
  }

  return buffer.toString('utf8');
}

function normalizeMarkdown(input: string, fileName: string): string {
  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  if (!normalized) {
    throw new Error(`"${fileName}" parsed to empty text.`);
  }

  return normalized;
}

function plainTextToMarkdown(input: string, fileName: string): string {
  const body = normalizeMarkdown(input, fileName)
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .join('\n\n');
  return body;
}

function extensionToFileType(ext: string): InterviewContextDocument['fileType'] {
  if (ext === '.markdown') return 'md';
  return ext.replace('.', '') as InterviewContextDocument['fileType'];
}

export class InterviewContextDocsManager {
  private static instance: InterviewContextDocsManager;
  private readonly docsPath: string;

  private constructor() {
    const dir = path.join(app.getPath('userData'), 'interview-context');
    fs.mkdirSync(dir, { recursive: true });
    this.docsPath = path.join(dir, 'documents.json');
  }

  public static getInstance(): InterviewContextDocsManager {
    if (!InterviewContextDocsManager.instance) {
      InterviewContextDocsManager.instance = new InterviewContextDocsManager();
    }
    return InterviewContextDocsManager.instance;
  }

  public listDocuments(): InterviewContextDocument[] {
    try {
      if (!fs.existsSync(this.docsPath)) return [];
      const parsed = JSON.parse(fs.readFileSync(this.docsPath, 'utf8'));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(doc => doc && typeof doc.id === 'string' && typeof doc.markdown === 'string')
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    } catch (error) {
      console.error('[InterviewContextDocsManager] failed to list documents:', error);
      return [];
    }
  }

  public deleteDocument(id: string): boolean {
    const docs = this.listDocuments();
    const next = docs.filter(doc => doc.id !== id);
    if (next.length === docs.length) return false;
    this.saveDocuments(next);
    return true;
  }

  public updateDocumentMetadata(
    id: string,
    metadata: { contextKind?: InterviewContextDocumentKind; contextDescription?: string },
  ): InterviewContextDocument | null {
    const docs = this.listDocuments();
    const index = docs.findIndex(doc => doc.id === id);
    if (index < 0) return null;

    const contextKind = metadata.contextKind;
    if (contextKind && !['resume', 'project', 'other'].includes(contextKind)) {
      throw new Error('Unsupported document type.');
    }

    const contextDescription = String(metadata.contextDescription || '').trim();
    if (contextKind === 'other' && !contextDescription) {
      throw new Error('Please describe what this document is.');
    }

    const nextDoc: InterviewContextDocument = {
      ...docs[index],
      contextKind,
      contextDescription: contextKind === 'other' ? contextDescription : contextDescription || undefined,
      updatedAt: new Date().toISOString(),
    };

    docs[index] = nextDoc;
    this.saveDocuments(docs);
    return nextDoc;
  }

  public async addDocumentFromFile(filePath: string): Promise<InterviewContextDocument> {
    const { fileName, fileType, markdown, sizeBytes } = await ingestMarkdownDocument(filePath);

    const now = new Date().toISOString();
    const doc: InterviewContextDocument = {
      id: crypto.randomUUID(),
      name: fileName,
      fileType,
      markdown,
      sizeBytes,
      createdAt: now,
      updatedAt: now,
    };

    const docs = this.listDocuments();
    this.saveDocuments([doc, ...docs]);
    return doc;
  }

  private saveDocuments(documents: InterviewContextDocument[]): void {
    const tmpPath = `${this.docsPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(documents, null, 2));
    fs.renameSync(tmpPath, this.docsPath);
  }
}

export async function ingestMarkdownDocument(filePath: string): Promise<IngestedMarkdownDocument> {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type "${ext || 'none'}". Supported formats: MD, TXT, PDF, DOCX.`);
  }

  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(filePath);
  } catch {
    throw new Error('Could not read the selected file. It may have moved or been deleted.');
  }

  if (!stats.isFile()) {
    throw new Error('Selected path is not a regular file.');
  }

  if (stats.size > MAX_FILE_BYTES) {
    const mb = (stats.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File is ${mb} MB; the maximum is 15 MB.`);
  }

  let markdown = '';
  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    configurePdfWorker(PDFParse);
    const parser = new PDFParse({ data: fs.readFileSync(filePath) });
    const data = await withTimeout<any>(parser.getText(), PARSE_TIMEOUT_MS, 'PDF parse');
    markdown = plainTextToMarkdown(data.text || '', fileName);
  } else if (ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await withTimeout<any>(
      mammoth.convertToMarkdown({ path: filePath }),
      PARSE_TIMEOUT_MS,
      'DOCX parse',
    );
    markdown = normalizeMarkdown(result.value || '', fileName);
  } else {
    const content = decodeTextFile(fs.readFileSync(filePath, { encoding: null }), fileName, ext);
    markdown = ext === '.md' || ext === '.markdown'
      ? normalizeMarkdown(content, fileName)
      : plainTextToMarkdown(content, fileName);
  }

  return {
    fileName,
    fileType: extensionToFileType(ext),
    markdown,
    sizeBytes: stats.size,
  };
}
