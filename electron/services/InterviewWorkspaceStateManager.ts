import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export type InterviewWorkspacePhase = 'before' | 'during' | 'after';
export type InterviewWorkspaceStatus = 'draft' | 'active' | 'complete';

export interface InterviewWorkspaceAttachment {
  id: string;
  name: string;
  fileType: 'md' | 'txt' | 'pdf' | 'docx';
  contextKind?: 'resume' | 'project' | 'other';
  sizeBytes: number;
}

export interface InterviewWorkspaceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  phase?: InterviewWorkspacePhase;
  attachments?: InterviewWorkspaceAttachment[];
}

export interface InterviewWorkspaceState {
  id: string;
  meetingId?: string;
  status: InterviewWorkspaceStatus;
  messages: InterviewWorkspaceMessage[];
  selectedDocumentIds: string[];
  contextMarkdown?: string;
  createdAt: string;
  updatedAt: string;
}

const MAX_WORKSPACES = 300;
const MAX_CONTEXT_MARKDOWN_CHARS = 250_000;
const VALID_PHASES = new Set(['before', 'during', 'after']);
const VALID_STATUSES = new Set(['draft', 'active', 'complete']);

interface WorkspaceStore {
  version: 1;
  workspaces: InterviewWorkspaceState[];
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeDocumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim())));
}

function normalizeAttachment(raw: any): InterviewWorkspaceAttachment | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;

  const fileType = ['md', 'txt', 'pdf', 'docx'].includes(raw.fileType) ? raw.fileType : 'txt';
  const contextKind = ['resume', 'project', 'other'].includes(raw.contextKind) ? raw.contextKind : undefined;

  return {
    id: raw.id,
    name: raw.name,
    fileType,
    contextKind,
    sizeBytes: Number.isFinite(raw.sizeBytes) ? raw.sizeBytes : 0,
  };
}

function normalizeMessage(raw: any): InterviewWorkspaceMessage | null {
  if (!raw || typeof raw.id !== 'string') return null;
  if (raw.role !== 'user' && raw.role !== 'assistant') return null;

  const phase = VALID_PHASES.has(raw.phase) ? raw.phase : undefined;
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.map(normalizeAttachment).filter(Boolean) as InterviewWorkspaceAttachment[]
    : [];

  return {
    id: raw.id,
    role: raw.role,
    content: normalizeString(raw.content),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    phase,
    attachments: attachments.length ? attachments : undefined,
  };
}

function normalizeState(raw: any, existing?: InterviewWorkspaceState): InterviewWorkspaceState {
  const now = new Date().toISOString();
  const status = VALID_STATUSES.has(raw?.status) ? raw.status : existing?.status || 'draft';
  const messages = Array.isArray(raw?.messages)
    ? raw.messages.map(normalizeMessage).filter(Boolean) as InterviewWorkspaceMessage[]
    : existing?.messages || [];
  const contextMarkdown = normalizeString(raw?.contextMarkdown).slice(0, MAX_CONTEXT_MARKDOWN_CHARS);

  return {
    id: normalizeString(raw?.id || existing?.id),
    meetingId: normalizeString(raw?.meetingId || existing?.meetingId) || undefined,
    status,
    messages,
    selectedDocumentIds: normalizeDocumentIds(raw?.selectedDocumentIds ?? existing?.selectedDocumentIds),
    contextMarkdown: contextMarkdown || undefined,
    createdAt: existing?.createdAt || normalizeString(raw?.createdAt) || now,
    updatedAt: now,
  };
}

export class InterviewWorkspaceStateManager {
  private static instance: InterviewWorkspaceStateManager;
  private readonly statePath: string;

  private constructor() {
    const dir = path.join(app.getPath('userData'), 'interview-context');
    fs.mkdirSync(dir, { recursive: true });
    this.statePath = path.join(dir, 'workspaces.json');
  }

  public static getInstance(): InterviewWorkspaceStateManager {
    if (!InterviewWorkspaceStateManager.instance) {
      InterviewWorkspaceStateManager.instance = new InterviewWorkspaceStateManager();
    }
    return InterviewWorkspaceStateManager.instance;
  }

  public getWorkspace(id: string): InterviewWorkspaceState | null {
    const workspaceId = normalizeString(id).trim();
    if (!workspaceId) return null;
    return this.readStore().workspaces.find(workspace => workspace.id === workspaceId) || null;
  }

  public getWorkspaceForMeeting(meetingId: string): InterviewWorkspaceState | null {
    const id = normalizeString(meetingId).trim();
    if (!id) return null;
    const matches = this.readStore().workspaces.filter(workspace => workspace.meetingId === id);
    return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
  }

  public saveWorkspace(input: Partial<InterviewWorkspaceState> & { id: string }): InterviewWorkspaceState {
    const store = this.readStore();
    const existing = store.workspaces.find(workspace => workspace.id === input.id);
    const normalized = normalizeState(input, existing);

    if (!normalized.id) {
      throw new Error('Workspace id is required.');
    }

    const nextWorkspaces = store.workspaces
      .filter(workspace => workspace.id !== normalized.id)
      .filter(workspace => !normalized.meetingId || workspace.meetingId !== normalized.meetingId || workspace.id === normalized.id);

    nextWorkspaces.unshift(normalized);
    this.writeStore({ version: 1, workspaces: nextWorkspaces.slice(0, MAX_WORKSPACES) });
    return normalized;
  }

  public attachMeeting(
    workspaceId: string,
    meetingId: string,
    patch: Partial<Pick<InterviewWorkspaceState, 'contextMarkdown' | 'selectedDocumentIds'>> = {},
  ): InterviewWorkspaceState | null {
    const id = normalizeString(workspaceId).trim();
    const attachedMeetingId = normalizeString(meetingId).trim();
    if (!id || !attachedMeetingId) return null;

    const existing = this.getWorkspace(id) || {
      id,
      status: 'active' as InterviewWorkspaceStatus,
      messages: [],
      selectedDocumentIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const definedPatch: Partial<Pick<InterviewWorkspaceState, 'contextMarkdown' | 'selectedDocumentIds'>> = {};
    if (patch.contextMarkdown !== undefined) definedPatch.contextMarkdown = patch.contextMarkdown;
    if (patch.selectedDocumentIds !== undefined) definedPatch.selectedDocumentIds = patch.selectedDocumentIds;

    return this.saveWorkspace({
      ...existing,
      ...definedPatch,
      id,
      meetingId: attachedMeetingId,
      status: 'complete',
    });
  }

  private readStore(): WorkspaceStore {
    try {
      if (!fs.existsSync(this.statePath)) return { version: 1, workspaces: [] };
      const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      const rawWorkspaces = Array.isArray(parsed?.workspaces)
        ? parsed.workspaces
        : Array.isArray(parsed)
          ? parsed
          : [];
      const workspaces = rawWorkspaces
        .map((workspace: any) => {
          try {
            return normalizeState(workspace);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as InterviewWorkspaceState[];
      return { version: 1, workspaces };
    } catch (error) {
      console.error('[InterviewWorkspaceStateManager] failed to read workspace state:', error);
      return { version: 1, workspaces: [] };
    }
  }

  private writeStore(store: WorkspaceStore): void {
    const tmpPath = `${this.statePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2));
    fs.renameSync(tmpPath, this.statePath);
  }
}
