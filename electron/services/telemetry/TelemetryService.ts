import fs from 'fs';
import path from 'path';

export type TelemetryEventName =
  | 'app_start'
  | 'meeting_start'
  | 'meeting_stop'
  | 'mode_selected'
  | 'mode_switched'
  | 'dynamic_action_detected'
  | 'dynamic_action_shown'
  | 'dynamic_action_accepted'
  | 'dynamic_action_dismissed'
  | 'dynamic_action_completed'
  | 'llm_request_started'
  | 'llm_first_token_latency'
  | 'llm_completed'
  | 'provider_fallback'
  | 'provider_error'
  | 'stt_started'
  | 'stt_partial_latency'
  | 'stt_final_latency'
  | 'stt_reconnect'
  | 'stt_error'
  | 'rag_query'
  | 'rag_hit'
  | 'rag_miss'
  | 'rag_lexical_fallback'
  | 'screen_context_captured'
  | 'screen_context_error'
  | 'post_call_summary_started'
  | 'post_call_summary_completed'
  | 'post_call_summary_failed';

export type TelemetrySinkName = 'local-jsonl' | 'posthog' | 'axiom' | 'sentry';

export interface TelemetrySinkConfig {
  name: TelemetrySinkName;
  enabled: boolean;
  endpoint?: string;
  projectId?: string;
}

export interface TelemetryConfig {
  enabled?: boolean;
  localEnabled?: boolean;
  userDataPath?: string;
  logFilePath?: string;
  sinks?: TelemetrySinkConfig[];
}

export interface TelemetryEventInput {
  name: TelemetryEventName | string;
  sessionId?: string;
  modeId?: string;
  provider?: string;
  durationMs?: number;
  status?: string;
  properties?: Record<string, unknown>;
}

export interface TelemetryRecord {
  name: string;
  timestamp: string;
  sessionId?: string;
  modeId?: string;
  provider?: string;
  durationMs?: number;
  status?: string;
  properties: Record<string, unknown>;
}

const DEFAULT_FILE_NAME = 'telemetry.jsonl';
const REDACTED = '[REDACTED]';
const REMOVED = '[REMOVED]';

// Sensitive-key match: any property whose name ends with one of these tokens
// is REDACTED. The list intentionally includes everything that has ever
// carried verbatim user content (queries, chunks, transcripts, prompts,
// error bodies, free-form error messages). Add to this list when introducing
// any new free-text property — telemetry should never carry raw user input.
const SENSITIVE_KEY_RE = /(api[_-]?key|authorization|bearer|token|secret|password|credential|raw[_-]?(transcript|prompt|reference|content|query)|transcript(text)?|prompt|reference(content)?|evidence(text)?|screenshot(path)?|image(path)?|error(body|response|message)?|responsebody|body|query(text|string)?|user(input|message)|chunk(text|content)?|snippet(text)?)$/i;
// REMOVE_VALUE_KEY_RE matches a strict subset of the above for which we drop
// the value entirely (not just redact). Used for keys that are guaranteed-
// bulky raw text — we don't want a 16KB transcript field in a log line even
// with [REDACTED] in place.
const REMOVE_VALUE_KEY_RE = /(raw[_-]?(transcript|prompt|reference|content|query)|transcript(text)?|prompt|reference(content)?|evidence(text)?|screenshot(path)?|image(path)?|error(body|response)?|responsebody|body|query(text|string)?|user(input|message)|chunk(text|content)?|snippet(text)?)$/i;
const API_KEY_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+\/=:-]{12,}/gi,
  /natively_sk_[A-Za-z0-9._-]+/gi,
  /sk-[A-Za-z0-9]{20,}/gi,
  /gsk_[A-Za-z0-9]{20,}/gi,
  /dg_[A-Za-z0-9]{20,}/gi,
  /[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,}/g,
];

export class TelemetryService {
  private enabled: boolean;
  private localEnabled: boolean;
  private logFilePath: string;
  private sinks: TelemetrySinkConfig[];

  constructor(config: TelemetryConfig = {}) {
    this.enabled = config.enabled !== false;
    this.localEnabled = config.localEnabled !== false;
    this.sinks = config.sinks ?? [];
    this.logFilePath = config.logFilePath ?? path.join(config.userDataPath ?? process.cwd(), 'logs', DEFAULT_FILE_NAME);
  }

  /**
   * Phase 6 — runtime reconfiguration so the shared singleton can switch from
   * a process.cwd()-relative log path to the real Electron userData path once
   * the app is ready. Settings changes (enable/disable telemetry) also flow
   * through here. Never mutates the in-memory log buffer — old events stay
   * where they were written.
   */
  configure(config: TelemetryConfig): void {
    if (typeof config.enabled === 'boolean') this.enabled = config.enabled;
    if (typeof config.localEnabled === 'boolean') this.localEnabled = config.localEnabled;
    if (Array.isArray(config.sinks)) this.sinks = config.sinks;
    if (config.logFilePath) {
      this.logFilePath = config.logFilePath;
    } else if (config.userDataPath) {
      this.logFilePath = path.join(config.userDataPath, 'logs', DEFAULT_FILE_NAME);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }

  track(input: TelemetryEventInput): void {
    if (!this.enabled) return;

    const record: TelemetryRecord = {
      name: String(input.name),
      timestamp: new Date().toISOString(),
      properties: sanitizeTelemetryProperties(input.properties ?? {}),
    };

    if (input.sessionId) record.sessionId = String(input.sessionId);
    if (input.modeId) record.modeId = String(input.modeId);
    if (input.provider) record.provider = String(input.provider);
    if (typeof input.durationMs === 'number' && Number.isFinite(input.durationMs)) record.durationMs = input.durationMs;
    if (input.status) record.status = String(input.status);

    if (this.localEnabled) {
      this.appendLocal(record);
    }

    for (const sink of this.sinks) {
      if (!sink.enabled || sink.name === 'local-jsonl') continue;
      // Placeholder for future SDK-backed sinks. Intentionally no-op to avoid dependencies
      // and to preserve local-only default telemetry behavior.
    }
  }

  private appendLocal(record: TelemetryRecord): void {
    try {
      fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
      fs.appendFileSync(this.logFilePath, `${JSON.stringify(record)}\n`, 'utf8');
    } catch (error) {
      // Telemetry must never break app behavior.
    }
  }
}

export function sanitizeTelemetryProperties(properties: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(properties, new WeakSet()) as Record<string, unknown>;
}

function sanitizeObject(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return Number.isNaN(value) ? null : value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return value.map(item => sanitizeObject(item, seen)).filter(item => item !== undefined);
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (REMOVE_VALUE_KEY_RE.test(key)) {
        output[key] = REMOVED;
      } else if (SENSITIVE_KEY_RE.test(key)) {
        output[key] = REDACTED;
      } else {
        const sanitized = sanitizeObject(child, seen);
        if (sanitized !== undefined) output[key] = sanitized;
      }
    }
    return output;
  }

  return undefined;
}

function redactString(value: string): string {
  let redacted = value;
  for (const pattern of API_KEY_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, REDACTED);
  }
  return redacted;
}

export const telemetryService = new TelemetryService();
