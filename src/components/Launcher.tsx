import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ToggleLeft, ToggleRight, Search, ArrowRight, ArrowLeft, MoreHorizontal, Globe, Clock, ChevronRight, Settings, RefreshCw, Ghost, Plus, Mail, Link as LinkIcon, ChevronDown, Trash2, Bell, Check, Download, DownloadCloud, CheckCircle, AlertCircle, User, Sparkles, ArrowUpRight, ArrowUp, Brain, Mic, ShieldCheck, Paperclip, X, Speaker, Pencil, KeyRound, Monitor, HelpCircle } from 'lucide-react';
import { generateMeetingPDF } from '../utils/pdfGenerator';
import icon from "./icon.png";
import { ModelSelector } from './ui/ModelSelector';
import TopSearchPill from './TopSearchPill';
import GlobalChatOverlay from './GlobalChatOverlay';
import HelpAssistant from './help/HelpAssistant';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../lib/analytics/analytics.service'; // Added analytics import
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { useStreamBuffer } from '../hooks/useStreamBuffer';
import { isMac } from '../utils/platformUtils';
import WindowControls from './WindowControls';
import { genMessageId } from '../utils/messageId';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Meeting {
    id: string;
    title: string;
    date: string;
    duration: string;
    summary: string;
    detailedSummary?: {
        actionItems: string[];
        keyPoints: string[];
    };
    transcript?: Array<{
        speaker: string;
        text: string;
        timestamp: number;
    }>;
    usage?: Array<{
        type: 'assist' | 'followup' | 'chat' | 'followup_questions';
        timestamp: number;
        question?: string;
        answer?: string;
        items?: string[];
    }>;
    isProcessed?: boolean;
    active?: boolean; // UI state
    time?: string; // Optional for compatibility
}

const isMeetingFinalizing = (meeting?: Meeting | null) =>
    Boolean(meeting && (meeting.isProcessed === false || meeting.title === 'Processing...'));

interface LauncherProps {
    onStartMeeting: (metadata?: any) => void;
    onOpenSettings: (tab?: string) => void;
    onPageChange?: (isMain: boolean) => void;
    ollamaPullStatus?: 'idle' | 'downloading' | 'complete' | 'failed';
    ollamaPullPercent?: number;
    ollamaPullMessage?: string;
}

type PermissionValue = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
type ReadinessStatus = 'ready' | 'warning' | 'missing';
type PreflightStep = 'providers' | 'permissions';
type ProviderKeyId = 'openai' | 'claude' | 'gemini';
type ProviderKeyDrafts = Record<ProviderKeyId, string>;
type ProviderKeyStatus = Record<ProviderKeyId, boolean>;

interface SessionReadiness {
    aiProvider: string;
    aiModel: string;
    aiReady: boolean;
    hasAnyProvider: boolean;
    sttProvider: string;
    sttReady: boolean;
    sttHint: string;
    audioReady: boolean;
    micPermission: PermissionValue;
    screenPermission: PermissionValue;
    accessibilityPermission: PermissionValue;
    loading: boolean;
}

const INITIAL_READINESS: SessionReadiness = {
    aiProvider: 'AI',
    aiModel: 'Checking...',
    aiReady: false,
    hasAnyProvider: false,
    sttProvider: 'Speech',
    sttReady: false,
    sttHint: 'Checking...',
    audioReady: false,
    micPermission: 'unknown',
    screenPermission: 'unknown',
    accessibilityPermission: 'unknown',
    loading: true,
};

const EMPTY_PROVIDER_KEY_DRAFTS: ProviderKeyDrafts = {
    openai: '',
    claude: '',
    gemini: '',
};

const EMPTY_PROVIDER_KEY_STATUS: ProviderKeyStatus = {
    openai: false,
    claude: false,
    gemini: false,
};

const providerLabels: Record<string, string> = {
    ollama: 'Ollama',
    gemini: 'Gemini',
    custom: 'Custom',
    'codex-cli': 'Codex CLI',
    natively: 'AnswerFlow API',
    groq: 'Groq',
    openai: 'OpenAI',
    claude: 'Claude',
    deepseek: 'DeepSeek',
};

const sttProviderLabels: Record<string, string> = {
    none: 'Not selected',
    google: 'Google Speech',
    groq: 'Groq Whisper',
    openai: 'OpenAI Whisper',
    deepgram: 'Deepgram',
    elevenlabs: 'ElevenLabs',
    azure: 'Azure Speech',
    ibmwatson: 'IBM Watson',
    soniox: 'Soniox',
    natively: 'AnswerFlow API',
    'local-whisper': 'Moonshine Base',
};

const inferProviderLabel = (provider: string | undefined, model: string | undefined) => {
    const modelId = (model || '').toLowerCase();
    if (modelId === 'natively') return 'AnswerFlow API';
    if (modelId.includes('gpt') || modelId.includes('openai')) return 'OpenAI';
    if (modelId.includes('claude')) return 'Claude';
    if (modelId.includes('deepseek')) return 'DeepSeek';
    if (modelId.includes('gemini')) return 'Gemini';
    if (modelId.includes('moonshot') || modelId.includes('kimi')) return 'Moonshot';
    return providerLabels[provider || ''] || 'AI';
};

const hasConfiguredAi = (provider: string | undefined, model: string | undefined, creds: any) => {
    const modelId = (model || '').toLowerCase();
    if (!modelId) return false;
    if (provider === 'ollama' || provider === 'custom' || provider === 'codex-cli') return true;
    if (modelId === 'natively') return !!creds?.hasNativelyKey;
    if (modelId.includes('gpt') || modelId.includes('openai')) return !!creds?.hasOpenaiKey;
    if (modelId.includes('claude')) return !!creds?.hasClaudeKey;
    if (modelId.includes('deepseek')) return !!creds?.hasDeepseekKey;
    if (modelId.includes('groq') || modelId.includes('llama') || modelId.includes('mixtral')) return !!creds?.hasGroqKey;
    if (modelId.includes('gemini')) return !!creds?.hasGeminiKey;
    return true;
};

const hasAnyConfiguredAiProvider = (provider: string | undefined, creds: any) => {
    if (provider === 'ollama' || provider === 'custom' || provider === 'codex-cli') return true;
    return !!(
        creds?.hasNativelyKey ||
        creds?.hasGeminiKey ||
        creds?.hasGroqKey ||
        creds?.hasOpenaiKey ||
        creds?.hasClaudeKey ||
        creds?.hasDeepseekKey
    );
};

const hasConfiguredStt = (creds: any) => {
    const provider = creds?.sttProvider || 'local-whisper';
    switch (provider) {
        case 'google': return !!creds?.googleServiceAccountPath;
        case 'groq': return !!creds?.hasSttGroqKey;
        case 'openai': return !!creds?.hasSttOpenaiKey;
        case 'deepgram': return !!creds?.hasDeepgramKey;
        case 'elevenlabs': return !!creds?.hasElevenLabsKey;
        case 'azure': return !!creds?.hasAzureKey && !!creds?.azureRegion;
        case 'ibmwatson': return !!creds?.hasIbmWatsonKey && !!creds?.ibmWatsonRegion;
        case 'soniox': return !!creds?.hasSonioxKey;
        case 'natively': return !!creds?.hasNativelyKey;
        case 'local-whisper': return true;
        default: return false;
    }
};

const permissionLabel = (value: PermissionValue) => {
    if (value === 'granted') return 'Granted';
    if (value === 'denied') return 'Denied';
    if (value === 'restricted') return 'Restricted';
    if (value === 'not-determined') return 'Not granted';
    return 'Unknown';
};

type TimelineRole = 'interviewer' | 'me' | 'ai';

interface TranscriptTimelineItem {
    id: string;
    role: TimelineRole;
    label: string;
    timestamp: number;
    text: string;
    question?: string;
    interactionType?: string;
    isLivePartial?: boolean;
}

type MeetingUsage = NonNullable<Meeting['usage']>[number];

const isAssistantSpeaker = (speaker: string | undefined) => {
    const normalized = (speaker || '').toLowerCase();
    return ['assistant', 'ai', 'model'].includes(normalized);
};

const speakerRole = (speaker: string | undefined): TimelineRole => {
    const normalized = (speaker || '').toLowerCase();
    if (normalized === 'user' || normalized === 'me' || normalized === 'candidate') return 'me';
    if (isAssistantSpeaker(normalized)) return 'ai';
    return 'interviewer';
};

const roleLabel = (role: TimelineRole) => {
    if (role === 'me') return 'Me';
    if (role === 'ai') return 'AI response';
    return 'Interviewer';
};

const usageLabel = (type: string | undefined) => {
    switch (type) {
        case 'chat':
            return 'AI chat';
        case 'followup':
        case 'followup_questions':
            return 'AI follow-up';
        case 'assist':
        default:
            return 'AI response';
    }
};

const usageText = (usage: MeetingUsage) => {
    const answer = (usage as any).answer;
    if (Array.isArray(answer)) return answer.join('\n');
    if (typeof answer === 'string' && answer.trim()) return answer;
    if (usage.items?.length) return usage.items.map(item => `- ${item}`).join('\n');
    return '';
};

const normalizeTimestampForSort = (timestamp: number, meetingDate: string) => {
    if (!Number.isFinite(timestamp)) return 0;
    if (timestamp > 946684800000) return timestamp;
    const start = Date.parse(meetingDate);
    return Number.isFinite(start) ? start + timestamp : timestamp;
};

const formatTimelineTime = (timestamp: number) => {
    if (!Number.isFinite(timestamp)) return '';
    if (timestamp > 946684800000) {
        return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    }

    const totalSeconds = Math.max(0, Math.floor(timestamp / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const buildTranscriptTimeline = (meeting: Meeting): TranscriptTimelineItem[] => {
    const transcript = meeting.transcript || [];
    const usage = meeting.usage || [];

    const humanSpeech = transcript
        .filter(item => item.text?.trim() && !isAssistantSpeaker(item.speaker))
        .map((item, index) => {
            const role = speakerRole(item.speaker);
            return {
                id: `speech-${index}-${item.timestamp}`,
                role,
                label: roleLabel(role),
                timestamp: item.timestamp,
                text: item.text.trim(),
            };
        });

    const aiInteractions = usage
        .map((item, index) => {
            const text = usageText(item).trim();
            if (!text && !item.question?.trim()) return null;
            return {
                id: `ai-${index}-${item.timestamp}`,
                role: 'ai' as TimelineRole,
                label: usageLabel(item.type),
                timestamp: item.timestamp,
                text,
                question: item.question?.trim(),
                interactionType: item.type,
            };
        })
        .filter(Boolean) as TranscriptTimelineItem[];

    const fallbackAssistantSpeech = aiInteractions.length > 0
        ? []
        : transcript
            .filter(item => item.text?.trim() && isAssistantSpeaker(item.speaker))
            .map((item, index) => ({
                id: `assistant-${index}-${item.timestamp}`,
                role: 'ai' as TimelineRole,
                label: 'AI response',
                timestamp: item.timestamp,
                text: item.text.trim(),
            }));

    return [...humanSpeech, ...aiInteractions, ...fallbackAssistantSpeech]
        .sort((a, b) => normalizeTimestampForSort(a.timestamp, meeting.date) - normalizeTimestampForSort(b.timestamp, meeting.date));
};

interface TranscriptTimelineProps {
    meeting: Meeting;
    isLight: boolean;
}

interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

type ConversationState = 'idle' | 'waiting' | 'streaming' | 'error';
type InterviewContextDocumentKind = 'resume' | 'project' | 'other';

const documentKindLabels: Record<InterviewContextDocumentKind, string> = {
    resume: 'Resume',
    project: 'Project',
    other: 'Other',
};

interface InterviewContextDocument {
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

interface LauncherAudioDevice {
    id: string;
    name: string;
}

interface PrepMessageAttachment {
    id: string;
    name: string;
    fileType: InterviewContextDocument['fileType'];
    contextKind?: InterviewContextDocumentKind;
    sizeBytes: number;
}

interface PrepMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
    phase?: 'before' | 'during' | 'after';
    isStreaming?: boolean;
    attachments?: PrepMessageAttachment[];
}

interface InterviewWorkspaceState {
    id: string;
    meetingId?: string;
    status: 'draft' | 'active' | 'complete';
    messages: PrepMessage[];
    selectedDocumentIds: string[];
    contextMarkdown?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface LiveTranscriptSegment {
    id: string;
    speaker: string;
    text: string;
    timestamp: number;
    final: boolean;
}

const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatMessageTime = (timestamp: number) => {
    if (!Number.isFinite(timestamp)) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
};

const docToPrepAttachment = (doc: InterviewContextDocument): PrepMessageAttachment => ({
    id: doc.id,
    name: doc.name,
    fileType: doc.fileType,
    contextKind: doc.contextKind,
    sizeBytes: doc.sizeBytes,
});

const INTERVIEW_WORKSPACE_CHAT_PROMPT = `You are the user's interview workspace assistant.

Your job is to help before and after the live interview, not to act as the live answer bot.

Use the provided prep conversation, selected document markdown, live/saved transcript, and saved AI responses when relevant.

Before the interview, help the user build useful context, clarify strategy, rehearse likely questions, and identify gaps.

After the interview, answer questions about what happened, summarize, compare against prep context, and suggest follow-ups.

During a live interview, stay brief and supportive if the user asks from this workspace, but do not invent transcript details.

If the answer is not present in the available context, say that clearly and ask for the missing detail.`;

const buildInterviewContextMarkdown = (messages: PrepMessage[], documents: InterviewContextDocument[]) => {
    const parts: string[] = [];
    const chatTurns = messages.filter(message => message.content.trim());

    if (chatTurns.length) {
        parts.push(`## Interview Prep Conversation\n\n${chatTurns.map((message, index) => {
            const label = message.role === 'user' ? 'User' : 'Assistant';
            const attachments = message.attachments?.length
                ? `\n   Attached documents: ${message.attachments.map(doc => `${doc.name}${doc.contextKind ? ` (${documentKindLabels[doc.contextKind]})` : ''}`).join(', ')}`
                : '';
            return `${index + 1}. ${label}: ${message.content.trim()}${attachments}`;
        }).join('\n\n')}`);
    }

    if (documents.length) {
        parts.push(`## Selected Documents\n\n${documents.map((doc) => {
            const markdown = doc.markdown.trim();
            const metadata = [
                `Type: ${doc.contextKind ? documentKindLabels[doc.contextKind] : 'Reference document'}`,
                doc.contextDescription?.trim() ? `Description: ${doc.contextDescription.trim()}` : '',
            ].filter(Boolean).join('\n');
            return `### ${doc.name}\n\n${metadata}\n\n${markdown}`;
        }).join('\n\n---\n\n')}`);
    }

    return parts.join('\n\n').trim();
};

const buildLiveTranscriptTimeline = (segments: LiveTranscriptSegment[]): TranscriptTimelineItem[] => {
    return segments
        .filter(segment => segment.text.trim())
        .map(segment => {
            const role = speakerRole(segment.speaker);
            return {
                id: segment.id,
                role,
                label: roleLabel(role),
                timestamp: segment.timestamp,
                text: segment.text.trim(),
                isLivePartial: !segment.final,
            };
        });
};

const formatWorkspaceConversation = (messages: PrepMessage[]) => {
    const turns = messages.filter(message => message.content.trim()).slice(-40);
    if (!turns.length) return '';
    return turns.map(message => {
        const phase = message.phase || 'before';
        const label = message.role === 'user' ? 'User' : 'Assistant';
        const attachments = message.attachments?.length
            ? `\nAttached documents: ${message.attachments.map(doc => `${doc.name}${doc.contextKind ? ` (${documentKindLabels[doc.contextKind]})` : ''}`).join(', ')}`
            : '';
        return `[${phase.toUpperCase()} ${label}]: ${message.content.trim()}${attachments}`;
    }).join('\n');
};

const buildInterviewWorkspaceChatContext = (
    messages: PrepMessage[],
    documents: InterviewContextDocument[],
    meeting: Meeting | null,
    liveTranscript: LiveTranscriptSegment[],
    phase: 'before' | 'during' | 'after',
) => {
    const parts: string[] = [`WORKSPACE PHASE: ${phase}`];

    const documentContext = buildInterviewContextMarkdown([], documents);
    if (documentContext) {
        parts.push(documentContext);
    }

    const conversation = formatWorkspaceConversation(messages);
    if (conversation) {
        parts.push(`## Workspace Conversation So Far\n\n${conversation}`);
    }

    if (meeting) {
        parts.push(`## Saved Interview\n\n${buildMeetingChatContext(meeting)}`);
    } else if (liveTranscript.length) {
        const liveTimeline = buildLiveTranscriptTimeline(liveTranscript);
        parts.push(`## Live Interview Transcript So Far\n\n${liveTimeline.map(item => {
            const partial = item.isLivePartial ? ' partial' : '';
            return `[${item.label}${partial}] ${item.text}`;
        }).join('\n')}`);
    }

    return parts.join('\n\n').trim();
};

const buildMeetingChatContext = (meeting: Meeting) => {
    const parts: string[] = [`MEETING: ${meeting.title}`];
    if (meeting.summary) parts.push(`SUMMARY:\n${meeting.summary}`);
    if (meeting.detailedSummary?.actionItems?.length) {
        parts.push(`ACTION ITEMS:\n${meeting.detailedSummary.actionItems.map(item => `- ${item}`).join('\n')}`);
    }
    if (meeting.detailedSummary?.keyPoints?.length) {
        parts.push(`KEY POINTS:\n${meeting.detailedSummary.keyPoints.map(item => `- ${item}`).join('\n')}`);
    }

    const timeline = buildTranscriptTimeline(meeting).slice(-120);
    if (timeline.length) {
        parts.push(`TRANSCRIPT AND AI RESPONSES:\n${timeline.map(item => {
            const prompt = item.question ? `\n  Prompt: ${item.question}` : '';
            return `[${item.label}]${prompt}\n  ${item.text}`;
        }).join('\n')}`);
    }

    return parts.join('\n\n');
};

const MeetingConversationPanel: React.FC<{ meeting: Meeting; isLight: boolean }> = ({ meeting, isLight }) => {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [state, setState] = useState<ConversationState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const {
        appendToken,
        getBufferedContent,
        reset: resetStreamBuffer,
    } = useStreamBuffer();

    useEffect(() => {
        setMessages([]);
        setDraft('');
        setState('idle');
        setErrorMessage(null);
        resetStreamBuffer();
    }, [meeting.id, resetStreamBuffer]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, state]);

    const updateAssistant = useCallback((messageId: string, content: string, isStreaming: boolean) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, content, isStreaming } : msg
        ));
    }, []);

    const fallbackToContextChat = useCallback(async (question: string, assistantMessageId: string) => {
        const context = buildMeetingChatContext(meeting);
        const systemPrompt = `You are answering questions about one selected interview. Use only the interview content below. Keep answers concise and clear. If the answer is not present in the interview content, say that it is not in this interview.\n\n${context}`;

        resetStreamBuffer();

        let tokenCleanup: (() => void) | undefined;
        let doneCleanup: (() => void) | undefined;
        let errorCleanup: (() => void) | undefined;

        tokenCleanup = window.electronAPI?.onGeminiStreamToken((token: string) => {
            setState('streaming');
            appendToken(token, (content) => updateAssistant(assistantMessageId, content, true));
        });

        doneCleanup = window.electronAPI?.onGeminiStreamDone(() => {
            const finalContent = getBufferedContent();
            updateAssistant(assistantMessageId, finalContent || 'I could not find enough context in this interview.', false);
            setState('idle');
            resetStreamBuffer();
            tokenCleanup?.();
            doneCleanup?.();
            errorCleanup?.();
        });

        errorCleanup = window.electronAPI?.onGeminiStreamError((error: string) => {
            console.error('[LauncherMeetingChat] fallback stream error:', error);
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            setErrorMessage("Couldn't answer from this interview. Check your model settings and try again.");
            setState('error');
            resetStreamBuffer();
            tokenCleanup?.();
            doneCleanup?.();
            errorCleanup?.();
        });

        await window.electronAPI?.streamGeminiChat(
            question,
            undefined,
            systemPrompt,
            { skipSystemPrompt: true, ignoreKnowledgeMode: true }
        );
    }, [appendToken, getBufferedContent, meeting, resetStreamBuffer, updateAssistant]);

    const submitQuestion = useCallback(async () => {
        const question = draft.trim();
        if (!question || state === 'waiting' || state === 'streaming') return;

        const userMessage: ConversationMessage = { id: genMessageId(), role: 'user', content: question };
        const assistantMessageId = genMessageId();

        setDraft('');
        setErrorMessage(null);
        setMessages(prev => [
            ...prev,
            userMessage,
            { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
        ]);
        setState('waiting');

        let tokenCleanup: (() => void) | undefined;
        let doneCleanup: (() => void) | undefined;
        let errorCleanup: (() => void) | undefined;

        try {
            resetStreamBuffer();

            tokenCleanup = window.electronAPI?.onRAGStreamChunk((data: { meetingId?: string; chunk: string }) => {
                if (data.meetingId && data.meetingId !== meeting.id) return;
                setState('streaming');
                appendToken(data.chunk, (content) => updateAssistant(assistantMessageId, content, true));
            });

            doneCleanup = window.electronAPI?.onRAGStreamComplete((data: { meetingId?: string }) => {
                if (data.meetingId && data.meetingId !== meeting.id) return;
                const finalContent = getBufferedContent();
                updateAssistant(assistantMessageId, finalContent || 'I could not find enough context in this interview.', false);
                setState('idle');
                resetStreamBuffer();
                tokenCleanup?.();
                doneCleanup?.();
                errorCleanup?.();
            });

            errorCleanup = window.electronAPI?.onRAGStreamError((data: { meetingId?: string; error: string }) => {
                if (data.meetingId && data.meetingId !== meeting.id) return;
                console.error('[LauncherMeetingChat] RAG stream error:', data.error);
                setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
                setErrorMessage("Couldn't answer from this interview. Try again.");
                setState('error');
                resetStreamBuffer();
                tokenCleanup?.();
                doneCleanup?.();
                errorCleanup?.();
            });

            const result = await window.electronAPI?.ragQueryMeeting?.(meeting.id, question);
            if (result?.fallback || !result) {
                tokenCleanup?.();
                doneCleanup?.();
                errorCleanup?.();
                await fallbackToContextChat(question, assistantMessageId);
            }
        } catch (error) {
            console.error('[LauncherMeetingChat] submit failed:', error);
            tokenCleanup?.();
            doneCleanup?.();
            errorCleanup?.();
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            setErrorMessage("Couldn't answer from this interview. Try again.");
            setState('error');
            resetStreamBuffer();
        }
    }, [appendToken, draft, fallbackToContextChat, getBufferedContent, meeting.id, resetStreamBuffer, state, updateAssistant]);

    const busy = state === 'waiting' || state === 'streaming';

    return (
        <div className={`shrink-0 border-t border-border-subtle px-5 py-4 ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
            {(messages.length > 0 || errorMessage) && (
                <div className="max-h-[220px] overflow-y-auto custom-scrollbar mb-3 pr-1 space-y-3">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[82%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                                message.role === 'user'
                                    ? 'bg-text-primary text-bg-primary'
                                    : isLight
                                        ? 'bg-white border border-border-subtle text-text-primary'
                                        : 'bg-bg-secondary border border-border-subtle text-text-primary'
                            }`}>
                                {message.content || (message.isStreaming ? 'Thinking...' : '')}
                                {message.isStreaming && message.content && (
                                    <span className="inline-block ml-1 h-3 w-0.5 align-middle bg-text-tertiary animate-pulse" />
                                )}
                            </div>
                        </div>
                    ))}
                    {errorMessage && (
                        <p className="text-[12px] text-red-400">{errorMessage}</p>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className={`session-chat-composer rounded-2xl border shadow-sm transition-colors ${isLight ? 'bg-white border-border-muted focus-within:border-border-muted' : 'bg-bg-input border-white/8 focus-within:border-white/15'} overflow-hidden`}>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitQuestion();
                        }
                    }}
                    rows={2}
                    disabled={busy}
                    placeholder="Ask about this interview"
                    className="block w-full resize-none bg-transparent outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 px-4 pt-3 pb-1 text-[14px] leading-5 text-text-primary placeholder:text-text-tertiary max-h-28"
                />
                <div className="h-10 px-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                        <Sparkles size={13} className="text-accent-primary" />
                        <span>{busy ? 'Thinking' : 'Uses interview transcript'}</span>
                    </div>
                    <button
                        onClick={submitQuestion}
                        disabled={!draft.trim() || busy}
                        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                            draft.trim() && !busy
                                ? isLight
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-slate-100 text-slate-950 hover:bg-white'
                                : isLight
                                    ? 'bg-slate-200 text-slate-400 cursor-default'
                                    : 'bg-white/10 text-white/35 cursor-default'
                        }`}
                    >
                        <ArrowUp size={16} strokeWidth={2.4} />
                    </button>
                </div>
            </div>
        </div>
    );
};

interface InterviewPrepPanelProps {
    isLight: boolean;
    isMeetingActive: boolean;
    meeting: Meeting | null;
    liveTranscript: LiveTranscriptSegment[];
    messages: PrepMessage[];
    draft: string;
    availableDocs: InterviewContextDocument[];
    selectedDocs: InterviewContextDocument[];
    selectedDocIds: string[];
    contextMarkdown: string;
    conversationState: ConversationState;
    errorMessage: string | null;
    isUploadingDoc: boolean;
    docError: string | null;
    onDraftChange: (value: string) => void;
    onSubmit: () => void;
    onStartInterview: () => void;
    onUploadDoc: () => void;
    onToggleDoc: (id: string) => void;
    onDeleteDoc: (id: string) => void;
}

const InterviewPrepPanel: React.FC<InterviewPrepPanelProps> = ({
    isLight,
    isMeetingActive,
    meeting,
    liveTranscript,
    messages,
    draft,
    availableDocs,
    selectedDocs,
    selectedDocIds,
    contextMarkdown,
    conversationState,
    errorMessage,
    isUploadingDoc,
    docError,
    onDraftChange,
    onSubmit,
    onStartInterview,
    onUploadDoc,
    onToggleDoc,
    onDeleteDoc,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const docMenuRef = useRef<HTMLDivElement>(null);
    const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, liveTranscript, meeting?.id, conversationState]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (docMenuRef.current && !docMenuRef.current.contains(event.target as Node)) {
                setIsDocMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userNoteCount = messages.filter(message => message.role === 'user').length;
    const preparedCharCount = contextMarkdown.trim().length;
    const liveItems = buildLiveTranscriptTimeline(liveTranscript);
    const savedItems = meeting ? buildTranscriptTimeline(meeting) : [];
    const transcriptItems = meeting ? savedItems : liveItems;
    const hasInterviewStarted = isMeetingActive || liveItems.length > 0 || Boolean(meeting);
    const isFinalizing = isMeetingFinalizing(meeting);
    const hasInterviewFinished = Boolean(meeting) || (!isMeetingActive && liveItems.length > 0);
    const beforeMessages = messages.filter(message => (message.phase || 'before') === 'before');
    const duringMessages = messages.filter(message => message.phase === 'during');
    const afterMessages = messages.filter(message => message.phase === 'after');
    const busy = conversationState === 'waiting' || conversationState === 'streaming';
    const panelTitle = meeting ? 'Interview history' : isMeetingActive ? 'Live interview' : 'Prepare interview';
    const panelSubtitle = meeting
        ? 'Transcript, AI responses, and follow-up chat stay in one place.'
        : isMeetingActive
            ? 'Live transcript is added below your prep context.'
            : 'Chat notes and selected docs become live interview context.';
    const composerPlaceholder = meeting
        ? 'Ask about this interview'
        : isMeetingActive
            ? 'Ask while the interview is live'
            : 'What should I know about your interview? How should I answer the questions?';

    const renderMessageAttachments = (message: PrepMessage) => {
        if (!message.attachments?.length) return null;

        return (
            <div className={`flex flex-wrap gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.attachments.map(doc => (
                    <div
                        key={doc.id}
                        className={`w-[150px] h-[72px] rounded-xl border overflow-hidden shadow-sm ${isLight ? 'bg-white border-slate-200' : 'bg-[#171719] border-white/12'}`}
                        title={`${doc.name} · ${doc.fileType.toUpperCase()} · ${formatBytes(doc.sizeBytes)} · attached ${formatMessageTime(message.createdAt)}`}
                    >
                        <div className={`h-9 px-2.5 flex items-center gap-2 ${isLight ? 'bg-slate-50' : 'bg-black/30'}`}>
                            <div className={`h-6 w-6 rounded-md shrink-0 flex items-center justify-center ${isLight ? 'bg-accent-secondary text-accent-primary' : 'bg-accent-secondary text-accent-primary'}`}>
                                <Paperclip size={13} />
                            </div>
                            <span className="truncate text-[11.5px] font-semibold text-text-primary">{doc.name}</span>
                        </div>
                        <div className="h-[35px] px-2.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[10.5px] text-text-tertiary">
                                {doc.contextKind ? documentKindLabels[doc.contextKind] : 'Document'}
                            </span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/8 text-white/60'}`}>
                                {doc.fileType.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderChatMessages = (items: PrepMessage[]) => items.map((message) => (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                {renderMessageAttachments(message)}
                <div className={`rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    message.role === 'user'
                        ? 'bg-text-primary text-bg-primary'
                        : isLight
                            ? 'bg-white border border-border-subtle text-text-primary'
                            : 'bg-bg-secondary border border-border-subtle text-text-primary'
                }`}>
                    {message.role === 'assistant' ? (
                        <div className="markdown-content">
                            {message.content ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }: any) => <h1 className="text-[16px] font-semibold text-text-primary mt-3 mb-2 first:mt-0" {...props} />,
                                        h2: ({ node, ...props }: any) => <h2 className="text-[15px] font-semibold text-text-primary mt-3 mb-2 first:mt-0" {...props} />,
                                        h3: ({ node, ...props }: any) => <h3 className="text-[14px] font-semibold text-text-primary mt-2.5 mb-1.5 first:mt-0" {...props} />,
                                        p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                                        ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2 space-y-1 last:mb-0" {...props} />,
                                        ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mb-2 space-y-1 last:mb-0" {...props} />,
                                        li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                                        strong: ({ node, ...props }: any) => <strong className="font-semibold text-text-primary" {...props} />,
                                        a: ({ node, ...props }: any) => <a className="text-accent-primary hover:underline" {...props} />,
                                        code: ({ node, inline, className, children, ...props }: any) => {
                                            const isInline = inline ?? !String(children).includes('\n');
                                            return isInline ? (
                                                <code className={`rounded px-1 py-0.5 text-[12px] font-mono ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-white/10 text-white'}`} {...props}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <code className={`block rounded-md p-3 overflow-x-auto text-[12px] leading-relaxed font-mono ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-black/35 text-white'}`} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        pre: ({ node, ...props }: any) => <pre className="my-3 overflow-x-auto" {...props} />,
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            ) : (
                                message.isStreaming ? <span className="text-text-tertiary">Thinking...</span> : null
                            )}
                        </div>
                    ) : (
                        <span className="whitespace-pre-wrap">{message.content || (message.isStreaming ? 'Thinking...' : '')}</span>
                    )}
                    {message.isStreaming && message.content && (
                        <span className="inline-block ml-1 h-3 w-0.5 align-middle bg-text-tertiary animate-pulse" />
                    )}
                </div>
            </div>
        </div>
    ));

    const renderDivider = (label: string, tone: 'started' | 'finished' | 'finalizing') => {
        const toneClass = tone === 'started'
            ? isLight ? 'bg-accent-secondary text-accent-primary border-border-subtle' : 'bg-accent-secondary text-accent-primary border-border-subtle'
            : tone === 'finalizing'
                ? isLight ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-amber-500/10 text-amber-300 border-amber-400/20'
                : isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20';
        const Icon = tone === 'finalizing' ? RefreshCw : tone === 'started' ? Mic : CheckCircle;

        return (
            <div className="py-2">
                <div className="flex items-center gap-3">
                    <div className={`h-px flex-1 ${isLight ? 'bg-border-muted' : 'bg-white/10'}`} />
                    <div className={`shrink-0 rounded-full border px-3 py-1.5 flex items-center gap-2 ${toneClass}`}>
                        <Icon size={13} className={tone === 'finalizing' ? 'animate-spin' : ''} />
                        <span className="text-[11px] font-semibold">{label}</span>
                    </div>
                    <div className={`h-px flex-1 ${isLight ? 'bg-border-muted' : 'bg-white/10'}`} />
                </div>
            </div>
        );
    };

    const renderTranscriptItems = () => {
        if (!transcriptItems.length) {
            return isMeetingActive ? (
                <div className={`rounded-lg border px-4 py-5 text-center ${isLight ? 'bg-bg-elevated border-border-subtle' : 'bg-bg-secondary border-border-subtle'}`}>
                    <Mic size={18} className="mx-auto text-text-tertiary mb-2" />
                    <p className="text-[13px] font-medium text-text-primary">Listening for transcript</p>
                    <p className="mt-1 text-[11px] text-text-tertiary">Interviewer and your voice will appear here when transcription starts.</p>
                </div>
            ) : null;
        }

        return transcriptItems.map((item) => {
            const isMe = item.role === 'me';
            const isAi = item.role === 'ai';
            const Icon = isAi ? Sparkles : isMe ? User : Mic;
            const bubbleTone = isAi
                ? isLight
                    ? 'bg-accent-secondary border-border-subtle text-text-primary'
                    : 'bg-accent-secondary border-border-subtle text-text-primary'
                : isMe
                    ? isLight
                        ? 'bg-emerald-50 border-emerald-100 text-slate-900'
                        : 'bg-emerald-500/10 border-emerald-400/20 text-emerald-50'
                    : isLight
                        ? 'bg-bg-elevated border-border-subtle text-text-primary'
                        : 'bg-bg-secondary border-border-subtle text-text-primary';
            const badgeTone = isAi
                ? 'text-accent-primary'
                : isMe
                    ? 'text-emerald-500'
                    : 'text-text-secondary';

            return (
                <div key={item.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] ${isAi ? 'w-full' : ''}`}>
                        <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold ${isMe ? 'justify-end' : 'justify-start'} ${badgeTone}`}>
                            <Icon size={12} />
                            <span>{item.label}{item.isLivePartial ? ' typing' : ''}</span>
                            <span className="font-normal text-text-tertiary">{formatTimelineTime(item.timestamp)}</span>
                        </div>
                        <div className={`rounded-lg border px-3.5 py-3 ${bubbleTone}`}>
                            {item.question && (
                                <div className={`mb-2 pb-2 border-b ${isLight ? 'border-black/8' : 'border-white/10'}`}>
                                    <p className="text-[10px] uppercase tracking-wide font-semibold opacity-60">Prompt</p>
                                    <p className="mt-1 text-[12px] leading-relaxed whitespace-pre-wrap">{item.question}</p>
                                </div>
                            )}
                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{item.text}</p>
                        </div>
                    </div>
                </div>
            );
        });
    };

    return (
        <div className={`h-full min-h-0 rounded-lg border border-border-subtle ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'} flex flex-col overflow-hidden`}>
            <div className="shrink-0 px-5 py-3 border-b border-border-subtle flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-[14px] font-semibold text-text-primary">{panelTitle}</h2>
                    <p className="text-[11px] text-text-tertiary truncate">{panelSubtitle}</p>
                </div>
                {!meeting && (
                    <button
                        onClick={onStartInterview}
                        className={`h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-semibold text-white transition-colors ${isMeetingActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-accent-primary hover:opacity-90'}`}
                    >
                        {isMeetingActive ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                </span>
                                Return to overlay
                            </>
                        ) : (
                            <>
                                <img src={icon} alt="" className="w-4 h-4 object-contain brightness-0 invert" />
                                Start interview
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6">
                    <div className="mx-auto flex min-h-full w-full max-w-[920px] flex-col gap-3">
                        {messages.length === 0 && !hasInterviewStarted ? (
                            <div className="flex flex-1 items-center justify-center text-center px-8">
                                <div className="max-w-[520px]">
                                    <div className={`mx-auto mb-4 h-12 w-12 rounded-xl flex items-center justify-center ${isLight ? 'bg-accent-secondary text-accent-primary' : 'bg-accent-secondary text-accent-primary'}`}>
                                        <Sparkles size={22} />
                                    </div>
                                    <h3 className="text-[26px] font-semibold tracking-tight text-text-primary">What should I know about your interview?</h3>
                                    <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                                        Tell me the role, company, interview round, likely topics, stories to use, and how you want answers shaped.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {renderChatMessages(beforeMessages)}
                                {hasInterviewStarted && renderDivider('Interview started', 'started')}
                                {renderTranscriptItems()}
                                {duringMessages.length > 0 && renderChatMessages(duringMessages)}
                                {hasInterviewFinished && renderDivider(isFinalizing ? 'Finalizing interview' : 'Interview finished', isFinalizing ? 'finalizing' : 'finished')}
                                {renderChatMessages(afterMessages)}
                                {errorMessage && <p className="text-[12px] text-red-400">{errorMessage}</p>}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className={`shrink-0 border-t border-border-subtle px-5 py-4 ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
                    <div className="mx-auto w-full max-w-[920px]">
                    <div className={`session-chat-composer relative rounded-2xl border shadow-sm transition-colors ${isLight ? 'bg-white border-border-muted focus-within:border-border-muted' : 'bg-bg-input border-white/8 focus-within:border-white/15'} overflow-visible`}>
                        {selectedDocs.length > 0 && (
                            <div className="px-3 pt-3 flex flex-wrap gap-1.5">
                                {selectedDocs.map(doc => (
                                    <span
                                        key={doc.id}
                                        className={`max-w-[220px] h-6 rounded-full px-2 inline-flex items-center gap-1.5 text-[11px] ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/8 text-text-secondary'}`}
                                    >
                                        <Paperclip size={11} className="shrink-0 text-accent-primary" />
                                        {doc.contextKind && <span className="shrink-0 font-semibold">{documentKindLabels[doc.contextKind]}:</span>}
                                        <span className="truncate">{doc.name}</span>
                                        <button
                                            onClick={() => onToggleDoc(doc.id)}
                                            className={`h-4 w-4 shrink-0 rounded-full inline-flex items-center justify-center ${isLight ? 'hover:bg-slate-200' : 'hover:bg-white/12'}`}
                                            title="Remove document"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <textarea
                            value={draft}
                            onChange={(e) => onDraftChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onSubmit();
                                }
                            }}
                            rows={2}
                            disabled={busy}
                            placeholder={composerPlaceholder}
                            className="block w-full resize-none bg-transparent outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 px-4 pt-3 pb-1 text-[14px] leading-5 text-text-primary placeholder:text-text-tertiary max-h-28"
                        />
                        <div className="h-10 px-3 pb-2 flex items-center justify-between">
                            <div className="min-w-0 flex items-center gap-2" ref={docMenuRef}>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDocMenuOpen(prev => !prev)}
                                        className={`relative h-7 w-7 rounded-md inline-flex items-center justify-center transition-colors ${isDocMenuOpen ? isLight ? 'bg-slate-100 text-text-primary' : 'bg-white/10 text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
                                        title="Add context documents"
                                    >
                                        <Plus size={17} strokeWidth={2} />
                                    </button>

                                    {isDocMenuOpen && (
                                        <div className={`absolute left-0 bottom-[calc(100%+10px)] z-[80] w-[340px] rounded-xl border shadow-2xl overflow-hidden ${isLight ? 'bg-white border-border-muted shadow-[0_16px_40px_rgba(0,0,0,0.16)]' : 'bg-[#202023] border-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.55)]'}`}>
                                            <div className="p-2 border-b border-border-subtle">
                                                <button
                                                    onClick={() => {
                                                        setIsDocMenuOpen(false);
                                                        onUploadDoc();
                                                    }}
                                                    disabled={isUploadingDoc}
                                                    className={`w-full min-h-9 rounded-lg px-3 flex items-center gap-2 text-left text-[13px] font-medium transition-colors ${isLight ? 'hover:bg-slate-100 text-text-primary' : 'hover:bg-white/8 text-text-primary'}`}
                                                >
                                                    {isUploadingDoc ? <RefreshCw size={15} className="animate-spin shrink-0" /> : <Paperclip size={15} className="shrink-0 text-text-secondary" />}
                                                    <span className="min-w-0 flex-1">Add document</span>
                                                </button>
                                                {docError && <p className="mt-2 px-3 text-[11px] leading-relaxed text-red-400">{docError}</p>}
                                            </div>

                                            <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                {availableDocs.length === 0 ? (
                                                    <div className="px-3 py-3 text-[12px] text-text-tertiary">No documents yet.</div>
                                                ) : (
                                                    availableDocs.map(doc => {
                                                        const selected = selectedDocIds.includes(doc.id);
                                                        return (
                                                            <div
                                                                key={doc.id}
                                                                className={`group rounded-lg px-2.5 py-2 transition-colors ${selected ? isLight ? 'bg-accent-secondary' : 'bg-accent-secondary' : isLight ? 'hover:bg-slate-100' : 'hover:bg-white/8'}`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setIsDocMenuOpen(false);
                                                                            onToggleDoc(doc.id);
                                                                        }}
                                                                        className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${selected ? 'bg-accent-primary border-accent-primary text-white' : 'border-border-muted text-transparent'}`}
                                                                        title={selected ? 'Remove from interview context' : 'Use in interview context'}
                                                                    >
                                                                        <Check size={11} strokeWidth={3} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setIsDocMenuOpen(false);
                                                                            onToggleDoc(doc.id);
                                                                        }}
                                                                        className="min-w-0 flex-1 text-left"
                                                                    >
                                                                        <p className="truncate text-[12px] font-medium text-text-primary">{doc.name}</p>
                                                                        <p className="text-[10.5px] text-text-tertiary">
                                                                            {doc.fileType.toUpperCase()} · {formatBytes(doc.sizeBytes)}
                                                                            {doc.contextKind ? ` · ${documentKindLabels[doc.contextKind]}` : ''}
                                                                        </p>
                                                                    </button>
                                                                    <button
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            onDeleteDoc(doc.id);
                                                                        }}
                                                                        className={`h-6 w-6 shrink-0 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-text-tertiary hover:text-red-400 ${isLight ? 'hover:bg-red-50' : 'hover:bg-red-500/10'}`}
                                                                        title="Delete document"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex items-center gap-1.5 text-[11px] text-text-tertiary">
                                    <Brain size={13} className="shrink-0 text-accent-primary" />
                                <span className="truncate">
                                    {userNoteCount} note{userNoteCount === 1 ? '' : 's'} · {selectedDocs.length} doc{selectedDocs.length === 1 ? '' : 's'}
                                    {preparedCharCount > 0 ? ` · ${preparedCharCount.toLocaleString()} chars prepared` : ''}
                                </span>
                                </div>
                            </div>
                            <button
                                onClick={onSubmit}
                                disabled={!draft.trim() || busy}
                                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                                    draft.trim() && !busy
                                        ? isLight
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-slate-100 text-slate-950 hover:bg-white'
                                        : isLight
                                            ? 'bg-slate-200 text-slate-400 cursor-default'
                                            : 'bg-white/10 text-white/35 cursor-default'
                                }`}
                            >
                                <ArrowUp size={16} strokeWidth={2.4} />
                            </button>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface DocumentDetailsModalProps {
    isLight: boolean;
    document: InterviewContextDocument | null;
    isSaving: boolean;
    error: string | null;
    onClose: () => void;
    onSave: (metadata: { contextKind: InterviewContextDocumentKind; contextDescription?: string }) => void;
}

const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
    isLight,
    document,
    isSaving,
    error,
    onClose,
    onSave,
}) => {
    const [contextKind, setContextKind] = useState<InterviewContextDocumentKind>('resume');
    const [contextDescription, setContextDescription] = useState('');
    const [isKindMenuOpen, setIsKindMenuOpen] = useState(false);

    useEffect(() => {
        if (!document) return;
        setContextKind(document.contextKind || 'resume');
        setContextDescription(document.contextDescription || '');
        setIsKindMenuOpen(false);
    }, [document?.id, document?.contextKind, document?.contextDescription]);

    if (!document) return null;

    const descriptionRequired = contextKind === 'other';
    const canSave = !isSaving && (!descriptionRequired || contextDescription.trim().length > 0);

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4 bg-black/55 backdrop-blur-sm">
            <div className={`w-full max-w-[420px] rounded-xl border shadow-2xl ${isLight ? 'bg-white border-black/10' : 'bg-[#18181A] border-white/10'}`}>
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-text-primary">What is this document?</h3>
                        <p className="mt-0.5 text-[11px] text-text-tertiary truncate">{document.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="space-y-1.5">
                        <span className="text-[12px] font-semibold text-text-primary">Document type</span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsKindMenuOpen(prev => !prev)}
                                className={`w-full h-10 rounded-md border px-3 flex items-center justify-between gap-2 text-[13px] outline-none transition-colors ${
                                    isLight
                                        ? 'bg-white border-border-muted text-slate-900 hover:bg-slate-50'
                                        : 'bg-bg-primary border-white/10 text-white hover:bg-white/6'
                                }`}
                            >
                                <span>{documentKindLabels[contextKind]}</span>
                                <ChevronDown size={14} className={`shrink-0 text-text-tertiary transition-transform ${isKindMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isKindMenuOpen && (
                                <div className={`absolute left-0 right-0 top-[calc(100%+6px)] z-[510] rounded-md border p-1 shadow-xl ${isLight ? 'bg-white border-border-muted' : 'bg-bg-primary border-white/10'}`}>
                                    {(['resume', 'project', 'other'] as InterviewContextDocumentKind[]).map(kind => (
                                        <button
                                            key={kind}
                                            type="button"
                                            onClick={() => {
                                                setContextKind(kind);
                                                setIsKindMenuOpen(false);
                                            }}
                                            className={`w-full h-8 rounded px-2.5 flex items-center justify-between text-left text-[12.5px] transition-colors ${
                                                contextKind === kind
                                                    ? isLight
                                                        ? 'bg-accent-secondary text-accent-primary'
                                                        : 'bg-accent-secondary text-accent-primary'
                                                    : isLight
                                                        ? 'text-slate-700 hover:bg-slate-100'
                                                        : 'text-text-secondary hover:bg-white/8 hover:text-text-primary'
                                            }`}
                                        >
                                            <span>{documentKindLabels[kind]}</span>
                                            {contextKind === kind && <Check size={12} strokeWidth={2.5} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {contextKind === 'other' && (
                        <label className="block space-y-1.5">
                            <span className="text-[12px] font-semibold text-text-primary">Describe it</span>
                            <textarea
                                value={contextDescription}
                                onChange={(event) => setContextDescription(event.target.value)}
                                rows={3}
                                placeholder="Example: company notes, job description, portfolio brief..."
                                className={`w-full resize-none rounded-md border px-3 py-2 text-[13px] leading-5 outline-none ${isLight ? 'bg-white border-border-muted text-slate-900 placeholder:text-slate-400' : 'bg-bg-primary border-white/10 text-white placeholder:text-white/35'}`}
                            />
                        </label>
                    )}

                    {error && <p className="text-[12px] leading-relaxed text-red-400">{error}</p>}
                </div>

                <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-end gap-2">
                    <button
                        onClick={onClose}
                        className={`h-9 px-3 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ contextKind, contextDescription: contextDescription.trim() })}
                        disabled={!canSave}
                        className={`h-9 px-4 rounded-md text-[12px] font-semibold transition-colors ${
                            canSave
                                ? 'bg-accent-primary text-white hover:opacity-90'
                                : isLight
                                    ? 'bg-slate-200 text-slate-400 cursor-default'
                                    : 'bg-white/10 text-white/35 cursor-default'
                        }`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface LauncherAudioSelectProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    options: LauncherAudioDevice[];
    placeholder: string;
    onChange: (value: string) => void;
}

const LauncherAudioSelect: React.FC<LauncherAudioSelectProps> = ({
    label,
    icon,
    value,
    options,
    placeholder,
    onChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(device => device.id === value)?.name || placeholder;

    return (
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle" ref={containerRef}>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-text-secondary">{icon}</span>
                <label className="text-xs font-medium text-text-primary uppercase tracking-wide">{label}</label>
            </div>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(prev => !prev)}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary flex items-center justify-between hover:bg-bg-elevated transition-colors"
                >
                    <span className="truncate pr-4 text-left">{selectedLabel}</span>
                    <ChevronDown size={14} className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-bg-elevated border border-border-subtle rounded-lg shadow-xl z-[80] max-h-48 overflow-y-auto custom-scrollbar">
                        <div className="p-1 space-y-0.5">
                        {options.length > 0 ? (
                            options.map(device => (
                                <button
                                    key={device.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(device.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between group transition-colors ${value === device.id ? 'bg-bg-input hover:bg-bg-elevated text-text-primary' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                >
                                    <span className="truncate">{device.name || `Device ${device.id.slice(0, 5)}...`}</span>
                                    {value === device.id && <Check size={14} className="text-accent-primary" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-gray-500 italic">No devices found</div>
                        )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TranscriptTimeline: React.FC<TranscriptTimelineProps> = ({ meeting, isLight }) => {
    const items = buildTranscriptTimeline(meeting);
    const isFinalizing = isMeetingFinalizing(meeting);
    const StatusIcon = isFinalizing ? RefreshCw : CheckCircle;

    return (
        <div className={`h-full min-h-0 flex flex-col rounded-lg border border-border-subtle ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
            <div className="shrink-0 px-5 py-3 border-b border-border-subtle flex items-center justify-between">
                <div>
                    <h2 className="text-[13px] font-semibold text-text-primary">Transcript</h2>
                    <p className="text-[11px] text-text-tertiary">{items.length} turns · speech and AI responses</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="px-2 py-1 rounded-full bg-slate-500/10 text-text-secondary">Interviewer</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">Me</span>
                    <span className="px-2 py-1 rounded-full bg-accent-secondary text-accent-primary">AI</span>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
                {items.length === 0 ? (
                    <div className="h-full flex items-center justify-center px-8 text-center">
                        <div>
                            <Mic size={24} className="mx-auto text-text-tertiary mb-3" />
                            <p className="text-[14px] font-medium text-text-primary">No transcript saved</p>
                            <p className="mt-1 text-[12px] text-text-tertiary">No speech or AI response history was saved for this interview.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {items.map((item) => {
                            const isMe = item.role === 'me';
                            const isAi = item.role === 'ai';
                            const Icon = isAi ? Sparkles : isMe ? User : Mic;
                            const bubbleTone = isAi
                                ? isLight
                                    ? 'bg-accent-secondary border-border-subtle text-text-primary'
                                    : 'bg-accent-secondary border-border-subtle text-text-primary'
                                : isMe
                                    ? isLight
                                        ? 'bg-emerald-50 border-emerald-100 text-slate-900'
                                        : 'bg-emerald-500/10 border-emerald-400/20 text-emerald-50'
                                    : isLight
                                        ? 'bg-bg-elevated border-border-subtle text-text-primary'
                                        : 'bg-bg-secondary border-border-subtle text-text-primary';
                            const badgeTone = isAi
                                ? 'text-accent-primary'
                                : isMe
                                    ? 'text-emerald-500'
                                    : 'text-text-secondary';

                            return (
                                <div key={item.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[82%] ${isAi ? 'w-full' : ''}`}>
                                        <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold ${isMe ? 'justify-end' : 'justify-start'} ${badgeTone}`}>
                                            <Icon size={12} />
                                            <span>{item.label}</span>
                                            <span className="font-normal text-text-tertiary">{formatTimelineTime(item.timestamp)}</span>
                                        </div>
                                        <div className={`rounded-lg border px-3.5 py-3 ${bubbleTone}`}>
                                            {item.question && (
                                                <div className={`mb-2 pb-2 border-b ${isLight ? 'border-black/8' : 'border-white/10'}`}>
                                                    <p className="text-[10px] uppercase tracking-wide font-semibold opacity-60">Prompt</p>
                                                    <p className="mt-1 text-[12px] leading-relaxed whitespace-pre-wrap">{item.question}</p>
                                                </div>
                                            )}
                                            {item.text ? (
                                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{item.text}</p>
                                            ) : (
                                                <p className="text-[13px] leading-relaxed italic opacity-70">No saved response text.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-1 pb-2">
                            <div className="flex items-center gap-3">
                                <div className={`h-px flex-1 ${isLight ? 'bg-border-muted' : 'bg-white/10'}`} />
                                <div className={`shrink-0 rounded-full border px-3 py-1.5 flex items-center gap-2 ${isFinalizing
                                    ? isLight ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-amber-500/10 text-amber-300 border-amber-400/20'
                                    : isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20'
                                }`}>
                                    <StatusIcon
                                        size={13}
                                        className={isFinalizing ? 'animate-spin' : ''}
                                    />
                                    <span className="text-[11px] font-semibold">
                                        {isFinalizing ? 'Finalizing interview' : 'Interview finished'}
                                    </span>
                                </div>
                                <div className={`h-px flex-1 ${isLight ? 'bg-border-muted' : 'bg-white/10'}`} />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <MeetingConversationPanel meeting={meeting} isLight={isLight} />
        </div>
    );
};

// Helper to format date groups
const getGroupLabel = (dateStr: string) => {
    if (dateStr === "Today") return "Today"; // Backward compatibility

    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (checkDate.getTime() === today.getTime()) return "Today";
    if (checkDate.getTime() === yesterday.getTime()) return "Yesterday";

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Helper to format time (e.g. 3:14pm)
const formatTime = (dateStr: string) => {
    if (dateStr === "Today") return "Just now"; // Legacy
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
};

const Launcher: React.FC<LauncherProps> = ({ onStartMeeting, onOpenSettings, onPageChange, ollamaPullStatus = 'idle', ollamaPullPercent = 0, ollamaPullMessage = '' }) => {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isDetectable, setIsDetectable] = useState(false);
    const [isMeetingActive, setIsMeetingActive] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [readiness, setReadiness] = useState<SessionReadiness>(INITIAL_READINESS);
    const [currentModel, setCurrentModel] = useState('natively');
    const [preflightStep, setPreflightStep] = useState<PreflightStep>('providers');
    const [providerKeyDrafts, setProviderKeyDrafts] = useState<ProviderKeyDrafts>(EMPTY_PROVIDER_KEY_DRAFTS);
    const [providerKeyStatus, setProviderKeyStatus] = useState<ProviderKeyStatus>(EMPTY_PROVIDER_KEY_STATUS);
    const [providerKeyError, setProviderKeyError] = useState<string | null>(null);
    const [isSavingProviderKeys, setIsSavingProviderKeys] = useState(false);
    const [interviewDocs, setInterviewDocs] = useState<InterviewContextDocument[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [docError, setDocError] = useState<string | null>(null);
    const [docDetailsTargetId, setDocDetailsTargetId] = useState<string | null>(null);
    const [docDetailsMode, setDocDetailsMode] = useState<'upload' | 'select' | null>(null);
    const [docDetailsError, setDocDetailsError] = useState<string | null>(null);
    const [isSavingDocDetails, setIsSavingDocDetails] = useState(false);
    const [prepMessages, setPrepMessages] = useState<PrepMessage[]>([]);
    const [prepDraft, setPrepDraft] = useState('');
    const [workspaceStateId, setWorkspaceStateId] = useState(() => genMessageId());
    const [workspaceContextDocIds, setWorkspaceContextDocIds] = useState<string[]>([]);
    const [workspaceConversationState, setWorkspaceConversationState] = useState<ConversationState>('idle');
    const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState<string | null>(null);
    const [renamingMeetingId, setRenamingMeetingId] = useState<string | null>(null);
    const [renameOrigin, setRenameOrigin] = useState<'header' | 'sidebar' | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [isSavingRename, setIsSavingRename] = useState(false);
    const [renameError, setRenameError] = useState<string | null>(null);
    const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptSegment[]>([]);
    const [inputDevices, setInputDevices] = useState<LauncherAudioDevice[]>([]);
    const [outputDevices, setOutputDevices] = useState<LauncherAudioDevice[]>([]);
    const [selectedInputDeviceId, setSelectedInputDeviceId] = useState('');
    const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState('');
    const [audioDevicesLoading, setAudioDevicesLoading] = useState(false);
    const [audioDevicesError, setAudioDevicesError] = useState<string | null>(null);
    const [micLevel, setMicLevel] = useState(0);
    const [systemAudioLevel, setSystemAudioLevel] = useState(0);
    const [systemAudioError, setSystemAudioError] = useState('');
    const [deviceFallbackNotice, setDeviceFallbackNotice] = useState<{
        kind: 'input' | 'output';
        requested: string | null;
        actual: string | null;
        reason?: string;
    } | null>(null);

    // Global search state (for AI chat overlay)
    const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
    const [submittedGlobalQuery, setSubmittedGlobalQuery] = useState('');

    const pendingOpenLatestInterviewRef = useRef(false);
    const selectedMeetingRef = useRef<Meeting | null>(null);
    const {
        appendToken: appendWorkspaceToken,
        getBufferedContent: getWorkspaceBufferedContent,
        reset: resetWorkspaceStreamBuffer,
    } = useStreamBuffer();

    const selectMeeting = useCallback((meeting: Meeting | null) => {
        selectedMeetingRef.current = meeting;
        setSelectedMeeting(meeting);
    }, []);

    const hydrateWorkspaceForMeeting = useCallback(async (meetingId: string) => {
        setWorkspaceConversationState('idle');
        setWorkspaceErrorMessage(null);
        setSelectedDocIds([]);
        resetWorkspaceStreamBuffer();

        try {
            const state = await window.electronAPI?.interviewWorkspaceGetByMeeting?.(meetingId) as InterviewWorkspaceState | null | undefined;
            if (state?.id) {
                setWorkspaceStateId(state.id);
                setPrepMessages((Array.isArray(state.messages) ? state.messages : []).map(message => ({
                    ...message,
                    isStreaming: false,
                })));
                setWorkspaceContextDocIds(Array.isArray(state.selectedDocumentIds) ? state.selectedDocumentIds : []);
                return;
            }
        } catch (error) {
            console.error('[Launcher] Failed to load saved interview workspace:', error);
        }

        setWorkspaceStateId(`meeting-${meetingId}`);
        setPrepMessages([]);
        setWorkspaceContextDocIds([]);
    }, [resetWorkspaceStreamBuffer]);

    const hydrateDraftWorkspace = useCallback(async () => {
        const draftId = localStorage.getItem('answerflow_current_interview_workspace_id') || genMessageId();
        localStorage.setItem('answerflow_current_interview_workspace_id', draftId);
        setWorkspaceStateId(draftId);
        setWorkspaceConversationState('idle');
        setWorkspaceErrorMessage(null);
        resetWorkspaceStreamBuffer();

        try {
            const state = await window.electronAPI?.interviewWorkspaceGetById?.(draftId) as InterviewWorkspaceState | null | undefined;
            if (state && !state.meetingId && state.status !== 'complete') {
                const docIds = Array.isArray(state.selectedDocumentIds) ? state.selectedDocumentIds : [];
                setPrepMessages((Array.isArray(state.messages) ? state.messages : []).map(message => ({
                    ...message,
                    isStreaming: false,
                })));
                setSelectedDocIds(docIds);
                setWorkspaceContextDocIds(docIds);
                return;
            }
        } catch (error) {
            console.error('[Launcher] Failed to load draft interview workspace:', error);
        }

        setPrepMessages([]);
        setSelectedDocIds([]);
        setWorkspaceContextDocIds([]);
    }, [resetWorkspaceStreamBuffer]);

    useEffect(() => {
        selectedMeetingRef.current = selectedMeeting;
    }, [selectedMeeting]);

    const refreshSelectedMeetingDetails = useCallback(async (meetingId: string) => {
        if (!window.electronAPI?.getMeetingDetails) return;

        try {
            const fullMeeting = await window.electronAPI.getMeetingDetails(meetingId);
            if (fullMeeting && selectedMeetingRef.current?.id === meetingId) {
                selectMeeting(fullMeeting);
            }
        } catch (error) {
            console.error("[Launcher] Failed to refresh selected interview:", error);
        }
    }, [selectMeeting]);

    useEffect(() => {
        const finalizingMeeting = selectedMeeting;
        if (!finalizingMeeting || !isMeetingFinalizing(finalizingMeeting)) return;

        const meetingId = finalizingMeeting.id;
        let cancelled = false;
        const refresh = async () => {
            if (!cancelled) {
                await refreshSelectedMeetingDetails(meetingId);
            }
        };

        refresh();
        const intervalId = window.setInterval(refresh, 2500);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [selectedMeeting?.id, selectedMeeting?.isProcessed, selectedMeeting?.title, refreshSelectedMeetingDetails]);

    const fetchMeetings = () => {
        if (window.electronAPI && window.electronAPI.getRecentMeetings) {
            window.electronAPI.getRecentMeetings()
                .then(async (recentMeetings) => {
                    const nextMeetings = Array.isArray(recentMeetings) ? recentMeetings : [];
                    setMeetings(nextMeetings);

                    if (pendingOpenLatestInterviewRef.current && nextMeetings[0]) {
                        pendingOpenLatestInterviewRef.current = false;
                        try {
                            const fullMeeting = await window.electronAPI?.getMeetingDetails?.(nextMeetings[0].id);
                            const meetingToOpen = fullMeeting || nextMeetings[0];
                            selectMeeting(meetingToOpen);
                            await hydrateWorkspaceForMeeting(meetingToOpen.id);
                        } catch (error) {
                            console.error("[Launcher] Failed to open latest finished interview:", error);
                            selectMeeting(nextMeetings[0]);
                            await hydrateWorkspaceForMeeting(nextMeetings[0].id);
                        }
                        return;
                    }

                    const currentSelectedMeeting = selectedMeetingRef.current;
                    if (
                        currentSelectedMeeting?.id &&
                        nextMeetings.some(meeting => meeting.id === currentSelectedMeeting.id)
                    ) {
                        await refreshSelectedMeetingDetails(currentSelectedMeeting.id);
                    }
                })
                .catch(err => console.error("Failed to fetch meetings:", err));
        }
    };

    const fetchInterviewDocs = () => {
        window.electronAPI?.interviewDocsList?.()
            .then((docs: InterviewContextDocument[]) => setInterviewDocs(Array.isArray(docs) ? docs : []))
            .catch(err => {
                console.error("Failed to fetch interview documents:", err);
                setInterviewDocs([]);
            });
    };

    const getWorkspaceDocumentIds = useCallback((
        messages: PrepMessage[],
        selectedIds: string[],
        contextIds: string[] = workspaceContextDocIds,
    ) => Array.from(new Set([
        ...contextIds,
        ...selectedIds,
        ...messages.flatMap(message => message.attachments?.map(doc => doc.id) || []),
    ])), [workspaceContextDocIds]);

    const persistWorkspaceState = useCallback(async (overrides: {
        id?: string;
        meetingId?: string;
        messages?: PrepMessage[];
        selectedDocumentIds?: string[];
        status?: InterviewWorkspaceState['status'];
    } = {}) => {
        const id = overrides.id || workspaceStateId;
        if (!id || !window.electronAPI?.interviewWorkspaceSave) return null;

        const messages = overrides.messages ?? prepMessages;
        const selectedDocumentIds = getWorkspaceDocumentIds(
            messages,
            overrides.selectedDocumentIds ?? selectedDocIds,
        );
        const meetingId = overrides.meetingId ?? selectedMeeting?.id;
        const status = overrides.status ?? (meetingId ? 'complete' : isMeetingActive ? 'active' : 'draft');
        const documentsForContext = interviewDocs.filter(doc => selectedDocumentIds.includes(doc.id));
        const contextMarkdown = buildInterviewContextMarkdown(messages, documentsForContext);
        const persistedMessages = messages.map(message => ({
            ...message,
            isStreaming: false,
        }));

        const result = await window.electronAPI.interviewWorkspaceSave({
            id,
            meetingId,
            status,
            messages: persistedMessages,
            selectedDocumentIds,
            contextMarkdown,
        });

        if (!result?.success) {
            console.error('[Launcher] Failed to save interview workspace:', result?.error);
        }
        return result;
    }, [
        getWorkspaceDocumentIds,
        interviewDocs,
        isMeetingActive,
        prepMessages,
        selectedDocIds,
        selectedMeeting?.id,
        workspaceStateId,
    ]);

    useEffect(() => {
        const savedDraftId = localStorage.getItem('answerflow_current_interview_workspace_id');
        if (!savedDraftId) {
            localStorage.setItem('answerflow_current_interview_workspace_id', workspaceStateId);
            return;
        }

        setWorkspaceStateId(savedDraftId);
        window.electronAPI?.interviewWorkspaceGetById?.(savedDraftId)
            .then((state: InterviewWorkspaceState | null) => {
                if (!state || state.meetingId || state.status === 'complete') return;
                setPrepMessages((Array.isArray(state.messages) ? state.messages : []).map(message => ({
                    ...message,
                    isStreaming: false,
                })));
                const docIds = Array.isArray(state.selectedDocumentIds) ? state.selectedDocumentIds : [];
                setSelectedDocIds(docIds);
                setWorkspaceContextDocIds(docIds);
            })
            .catch(error => console.error('[Launcher] Failed to restore draft interview workspace:', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadAudioDevices = useCallback(async () => {
        if (!window.electronAPI) return;

        setAudioDevicesLoading(true);
        setAudioDevicesError(null);
        try {
            const [inputs, outputs] = await Promise.all([
                window.electronAPI.getInputDevices?.() || Promise.resolve([]),
                window.electronAPI.getOutputDevices?.() || Promise.resolve([]),
            ]);
            const normalizedInputs = Array.isArray(inputs) ? inputs : [];
            const normalizedOutputs = Array.isArray(outputs) ? outputs : [];
            const savedInput = localStorage.getItem('preferredInputDeviceId') || '';
            const savedOutput = localStorage.getItem('preferredOutputDeviceId') || '';

            setInputDevices(normalizedInputs);
            setOutputDevices(normalizedOutputs);
            setSelectedInputDeviceId(
                normalizedInputs.find(device => device.id === savedInput)?.id ||
                normalizedInputs[0]?.id ||
                ''
            );
            setSelectedOutputDeviceId(
                normalizedOutputs.find(device => device.id === savedOutput)?.id ||
                normalizedOutputs[0]?.id ||
                ''
            );
        } catch (error) {
            console.error('[Launcher] failed to load audio devices:', error);
            setAudioDevicesError('Could not load audio devices.');
        } finally {
            setAudioDevicesLoading(false);
        }
    }, []);

    const refreshReadiness = async () => {
        if (!window.electronAPI) return;

        setReadiness(prev => ({ ...prev, loading: true }));

        const [
            llmResult,
            credsResult,
            audioResult,
            permissionsResult,
        ] = await Promise.allSettled([
            window.electronAPI.getCurrentLlmConfig?.(),
            window.electronAPI.getStoredCredentials?.(),
            window.electronAPI.getNativeAudioStatus?.(),
            window.electronAPI.checkPermissions?.(),
        ]);

        const llm = (llmResult.status === 'fulfilled' ? llmResult.value : null) as any;
        const creds = (credsResult.status === 'fulfilled' ? credsResult.value : null) as any;
        const audio = (audioResult.status === 'fulfilled' ? audioResult.value : null) as any;
        const permissions = (permissionsResult.status === 'fulfilled' ? permissionsResult.value : null) as any;
        const sttProvider = creds?.sttProvider || 'local-whisper';
        const sttReady = hasConfiguredStt(creds);
        const model = llm?.model || 'answerflow';

        setCurrentModel(model);
        setProviderKeyStatus({
            openai: !!creds?.hasOpenaiKey,
            claude: !!creds?.hasClaudeKey,
            gemini: !!creds?.hasGeminiKey,
        });
        setReadiness({
            aiProvider: inferProviderLabel(llm?.provider, llm?.model),
            aiModel: model || 'Choose a model',
            aiReady: hasConfiguredAi(llm?.provider, llm?.model, creds),
            hasAnyProvider: hasAnyConfiguredAiProvider(llm?.provider, creds),
            sttProvider: sttProviderLabels[sttProvider] || sttProvider,
            sttReady,
            sttHint: sttReady ? 'Packaged local model' : 'Unavailable',
            audioReady: audio?.connected !== false,
            micPermission: (permissions?.microphone || 'unknown') as PermissionValue,
            screenPermission: (permissions?.screen || 'unknown') as PermissionValue,
            accessibilityPermission: (permissions?.accessibility || 'unknown') as PermissionValue,
            loading: false,
        });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        analytics.trackCommandExecuted('refresh_launcher');
        try {
            setShowNotification(true);
            fetchMeetings();
            fetchInterviewDocs();
            loadAudioDevices();
            refreshReadiness();
            setTimeout(() => {
                setShowNotification(false);
            }, 3000);
        } catch (e) {
            console.error("Refresh failed in handleRefresh:", e);
        } finally {
            // Ensure distinct feedback provided (min 500ms spin)
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    // Keybinds
    const { isShortcutPressed } = useShortcuts();
    const isLight = useResolvedTheme() === 'light';
    useEffect(() => {
        let mounted = true;
        console.log("Launcher mounted");
        // Seed demo data if needed (safe to call always — runs ONCE on mount)
        if (window.electronAPI && window.electronAPI.seedDemo) {
            window.electronAPI.seedDemo().catch(err => console.error("Failed to seed demo:", err));
        }

        // Sync initial undetectable state
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then((undetectable) => {
                if (mounted) setIsDetectable(!undetectable);
            });
        }

        // Listen for undetectable changes
        let removeUndetectableListener: (() => void) | undefined;
        if (window.electronAPI?.onUndetectableChanged) {
            removeUndetectableListener = window.electronAPI.onUndetectableChanged((undetectable) => {
                setIsDetectable(!undetectable);
            });
        }

        fetchMeetings();
        fetchInterviewDocs();
        refreshReadiness();
        loadAudioDevices();

        // Sync initial meeting active state — guarded so unmounted component isn't written to
        if (window.electronAPI?.getMeetingActive) {
            window.electronAPI.getMeetingActive()
                .then((active) => { if (mounted) setIsMeetingActive(active); })
                .catch(() => {});
        }

        // Listen for meeting state changes (e.g. meeting started/ended from overlay)
        let removeMeetingStateListener: (() => void) | undefined;
        if (window.electronAPI?.onMeetingStateChanged) {
            removeMeetingStateListener = window.electronAPI.onMeetingStateChanged(({ isActive }) => {
                setIsMeetingActive((wasActive) => {
                    if (isActive) {
                        pendingOpenLatestInterviewRef.current = false;
                        selectMeeting(null);
                        setLiveTranscript([]);
                    } else if (wasActive) {
                        pendingOpenLatestInterviewRef.current = true;
                    }
                    return isActive;
                });
            });
        }

        let removeLiveTranscriptListener: (() => void) | undefined;
        if (window.electronAPI?.onNativeAudioTranscript) {
            removeLiveTranscriptListener = window.electronAPI.onNativeAudioTranscript((transcript) => {
                const text = transcript.text?.trim();
                const speaker = transcript.speaker;
                if (!text || (speaker !== 'interviewer' && speaker !== 'user')) return;

                const partialId = `live-partial-${speaker}`;
                setLiveTranscript(prev => {
                    const withoutPartial = prev.filter(item => item.id !== partialId);
                    if (!transcript.final) {
                        return [
                            ...withoutPartial,
                            {
                                id: partialId,
                                speaker,
                                text,
                                timestamp: Date.now(),
                                final: false,
                            },
                        ].slice(-200);
                    }

                    return [
                        ...withoutPartial,
                        {
                            id: genMessageId(),
                            speaker,
                            text,
                            timestamp: Date.now(),
                            final: true,
                        },
                    ].slice(-200);
                });
            });
        }

        const liveAiCleanups: Array<() => void> = [];
        const addLiveAiResponse = (text: string | undefined | null) => {
            const content = text?.trim();
            if (!content) return;
            setLiveTranscript(prev => [
                ...prev.filter(item => item.id !== 'live-partial-assistant'),
                {
                    id: genMessageId(),
                    speaker: 'assistant',
                    text: content,
                    timestamp: Date.now(),
                    final: true,
                },
            ].slice(-200));
        };

        if (window.electronAPI?.onIntelligenceSuggestedAnswer) {
            liveAiCleanups.push(window.electronAPI.onIntelligenceSuggestedAnswer((data) => addLiveAiResponse(data.answer)));
        }
        if (window.electronAPI?.onIntelligenceManualResult) {
            liveAiCleanups.push(window.electronAPI.onIntelligenceManualResult((data) => addLiveAiResponse(data.answer)));
        }
        if (window.electronAPI?.onIntelligenceRefinedAnswer) {
            liveAiCleanups.push(window.electronAPI.onIntelligenceRefinedAnswer((data) => addLiveAiResponse(data.answer)));
        }
        if (window.electronAPI?.onIntelligenceRecap) {
            liveAiCleanups.push(window.electronAPI.onIntelligenceRecap((data) => addLiveAiResponse(data.summary)));
        }
        if (window.electronAPI?.onIntelligenceClarify) {
            liveAiCleanups.push(window.electronAPI.onIntelligenceClarify((data) => addLiveAiResponse(data.clarification)));
        }

        let removeModelListener: (() => void) | undefined;
        if (window.electronAPI?.onModelChanged) {
            removeModelListener = window.electronAPI.onModelChanged(() => {
                refreshReadiness();
            });
        }

        let removeCredentialsListener: (() => void) | undefined;
        if (window.electronAPI?.onCredentialsChanged) {
            removeCredentialsListener = window.electronAPI.onCredentialsChanged(() => {
                refreshReadiness();
            });
        }

        let removeSttConfigListener: (() => void) | undefined;
        if (window.electronAPI?.onSttConfigChanged) {
            removeSttConfigListener = window.electronAPI.onSttConfigChanged(() => {
                refreshReadiness();
            });
        }

        // Listen for background updates (e.g. after meeting processing finishes)
        let removeMeetingsListener: (() => void) | undefined;
        if (window.electronAPI?.onMeetingsUpdated) {
            removeMeetingsListener = window.electronAPI.onMeetingsUpdated(() => {
                console.log("Received meetings-updated event");
                fetchMeetings();
            });
        }

        return () => {
            mounted = false;
            if (removeMeetingsListener) removeMeetingsListener();
            if (removeUndetectableListener) removeUndetectableListener();
            if (removeMeetingStateListener) removeMeetingStateListener();
            if (removeLiveTranscriptListener) removeLiveTranscriptListener();
            liveAiCleanups.forEach(cleanup => cleanup());
            if (removeModelListener) removeModelListener();
            if (removeCredentialsListener) removeCredentialsListener();
            if (removeSttConfigListener) removeSttConfigListener();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount-only: stable setup that must run exactly once

    useEffect(() => {
        if (!window.electronAPI?.onDeviceSelectionApplied) return;
        const unsubscribe = window.electronAPI.onDeviceSelectionApplied((payload) => {
            if (payload.fellBack) {
                setDeviceFallbackNotice({
                    kind: payload.kind,
                    requested: payload.requested,
                    actual: payload.actual,
                    reason: payload.reason,
                });
            } else {
                setDeviceFallbackNotice(prev =>
                    prev && prev.kind === payload.kind ? null : prev
                );
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!window.electronAPI || isMeetingActive) {
            setMicLevel(0);
            setSystemAudioLevel(0);
            setSystemAudioError('');
            window.electronAPI?.stopAudioTest?.().catch((error) => {
                console.error("Error stopping native microphone test:", error);
            });
            return;
        }

        const unsubscribe = window.electronAPI.onAudioTestLevel?.((level) => {
            setMicLevel(Math.max(0, Math.min(100, level * 100)));
        });
        const unsubscribeSystemLevel = window.electronAPI.onAudioTestSystemLevel?.((level) => {
            setSystemAudioError('');
            setSystemAudioLevel(Math.max(0, Math.min(100, level * 100)));
        });
        const unsubscribeSystemError = window.electronAPI.onAudioTestSystemError?.((error) => {
            setSystemAudioError(error);
            setSystemAudioLevel(0);
        });

        window.electronAPI.startAudioTest?.(
            selectedInputDeviceId || undefined,
            selectedOutputDeviceId || undefined,
        ).catch((error) => {
            console.error("Error starting native microphone test:", error);
            setMicLevel(0);
            setSystemAudioLevel(0);
        });

        return () => {
            unsubscribe?.();
            unsubscribeSystemLevel?.();
            unsubscribeSystemError?.();
            window.electronAPI?.stopAudioTest?.().catch((error) => {
                console.error("Error stopping native microphone test:", error);
            });
            setMicLevel(0);
            setSystemAudioLevel(0);
            setSystemAudioError('');
        };
    }, [isMeetingActive, selectedInputDeviceId, selectedOutputDeviceId]);

    // Separate effect for keyboard listener — re-registers when isShortcutPressed changes
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isShortcutPressed(e, 'toggleVisibility')) {
                e.preventDefault();
                window.electronAPI.toggleWindow();
            } else if (isShortcutPressed(e, 'moveWindowUp')) {
                e.preventDefault();
                window.electronAPI.moveWindowUp?.();
            } else if (isShortcutPressed(e, 'moveWindowDown')) {
                e.preventDefault();
                window.electronAPI.moveWindowDown?.();
            } else if (isShortcutPressed(e, 'moveWindowLeft')) {
                e.preventDefault();
                window.electronAPI.moveWindowLeft?.();
            } else if (isShortcutPressed(e, 'moveWindowRight')) {
                e.preventDefault();
                window.electronAPI.moveWindowRight?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isShortcutPressed]);

    if (!window.electronAPI) {
        return <div className="text-white p-10">Error: Electron API not initialized. Check preload script.</div>;
    }

    const toggleDetectable = () => {
        const newState = !isDetectable;
        setIsDetectable(newState);
        window.electronAPI?.setUndetectable(!newState); // Note: setUndetectable takes the *undetectable* state, which is inverse of *detectable*
        analytics.trackModeSelected(newState ? 'launcher' : 'undetectable'); // If visible (detectable), mode is normal/launcher. If not detectable, mode is undetectable.
    };

    // Group meetings
    const groupedMeetings = meetings.reduce((acc, meeting) => {
        const label = getGroupLabel(meeting.date);
        if (!acc[label]) acc[label] = [];
        acc[label].push(meeting);
        return acc;
    }, {} as Record<string, Meeting[]>);

    // Group order (Today, Yesterday, then others sorted new to old is implicit via API return order ideally, 
    // but JS object key order isn't guaranteed. We can use a Map or just known keys.)
    // Simple sort for keys:
    const sortedGroups = Object.keys(groupedMeetings).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        // Approximation for others: parse date
        return new Date(b).getTime() - new Date(a).getTime();
    });


    const [forwardMeeting, setForwardMeeting] = useState<Meeting | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuEntered, setMenuEntered] = useState(false);

    useEffect(() => {
        setMenuEntered(false);
    }, [activeMenuId]);

    // Global click listener to close menu
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // The three-column shell remains the main launcher view. Selecting a meeting
    // only changes the middle pane.
    useEffect(() => {
        if (onPageChange) {
            onPageChange(!isGlobalChatOpen);
        }
    }, [isGlobalChatOpen, onPageChange]);

    const handleOpenMeeting = async (meeting: Meeting) => {
        setForwardMeeting(null); // Clear forward history on new navigation
        setPrepMessages([]);
        setPrepDraft('');
        setSelectedDocIds([]);
        setWorkspaceContextDocIds([]);
        setWorkspaceConversationState('idle');
        setWorkspaceErrorMessage(null);
        setLiveTranscript([]);
        resetWorkspaceStreamBuffer();
        console.log("[Launcher] Opening meeting:", meeting.id);
        analytics.trackCommandExecuted('open_meeting_details');

        // Fetch full meeting details including transcript and usage
        if (window.electronAPI && window.electronAPI.getMeetingDetails) {
            try {
                console.log("[Launcher] Fetching full meeting details...");
                const fullMeeting = await window.electronAPI.getMeetingDetails(meeting.id);
                console.log("[Launcher] Got meeting details:", fullMeeting);
                console.log("[Launcher] Transcript count:", fullMeeting?.transcript?.length);
                console.log("[Launcher] Usage count:", fullMeeting?.usage?.length);
                if (fullMeeting) {
                    selectMeeting(fullMeeting);
                    await hydrateWorkspaceForMeeting(fullMeeting.id);
                    return;
                }
            } catch (err) {
                console.error("[Launcher] Failed to fetch meeting details:", err);
            }
        } else {
            console.warn("[Launcher] getMeetingDetails not available on electronAPI");
        }
        // Fallback to list-view data if fetch fails
        selectMeeting(meeting);
        await hydrateWorkspaceForMeeting(meeting.id);
    };

    const handleBack = async () => {
        setForwardMeeting(selectedMeeting);
        selectMeeting(null);
        await hydrateDraftWorkspace();
    };

    const handleForward = async () => {
        if (forwardMeeting) {
            selectMeeting(forwardMeeting);
            await hydrateWorkspaceForMeeting(forwardMeeting.id);
            setForwardMeeting(null);
        }
    };

    const selectedDocs = interviewDocs.filter(doc => selectedDocIds.includes(doc.id));
    const attachedDocIds = new Set(
        prepMessages.flatMap(message => message.attachments?.map(doc => doc.id) || []),
    );
    const contextDocs = interviewDocs.filter(doc =>
        selectedDocIds.includes(doc.id) ||
        workspaceContextDocIds.includes(doc.id) ||
        attachedDocIds.has(doc.id)
    );
    const docDetailsTarget = interviewDocs.find(doc => doc.id === docDetailsTargetId) || null;
    const prepContextMarkdown = buildInterviewContextMarkdown(prepMessages, contextDocs);

    const handleNewInterview = () => {
        const nextWorkspaceId = genMessageId();
        localStorage.setItem('answerflow_current_interview_workspace_id', nextWorkspaceId);
        setWorkspaceStateId(nextWorkspaceId);
        selectMeeting(null);
        setForwardMeeting(null);
        setActiveMenuId(null);
        setSelectedDocIds([]);
        setWorkspaceContextDocIds([]);
        setPrepMessages([]);
        setPrepDraft('');
        setWorkspaceConversationState('idle');
        setWorkspaceErrorMessage(null);
        setLiveTranscript([]);
        pendingOpenLatestInterviewRef.current = false;
        resetWorkspaceStreamBuffer();
        window.electronAPI?.interviewWorkspaceSave?.({
            id: nextWorkspaceId,
            status: 'draft',
            messages: [],
            selectedDocumentIds: [],
            contextMarkdown: '',
        }).catch(error => console.error('[Launcher] Failed to create draft interview workspace:', error));
        analytics.trackCommandExecuted('new_interview_ready_from_sidebar');
    };

    const handleModelSelect = async (modelId: string) => {
        setCurrentModel(modelId);
        const result = await window.electronAPI?.setModel?.(modelId);
        if (!result?.success) {
            console.error('[Launcher] Failed to set model:', result?.error);
        }
        refreshReadiness();
    };

    const handleProviderKeyDraftChange = (provider: ProviderKeyId, value: string) => {
        setProviderKeyDrafts(prev => ({ ...prev, [provider]: value }));
        setProviderKeyError(null);
    };

    const getPreferredPreflightModel = (status: ProviderKeyStatus) => {
        if (status.openai) return 'chat-latest';
        if (status.claude) return 'claude-sonnet-4-6';
        if (status.gemini) return 'gemini-3.5-flash';
        return null;
    };

    const handleSaveProviderKeys = async () => {
        const trimmedDrafts: ProviderKeyDrafts = {
            openai: providerKeyDrafts.openai.trim(),
            claude: providerKeyDrafts.claude.trim(),
            gemini: providerKeyDrafts.gemini.trim(),
        };
        const alreadyHasKey = providerKeyStatus.openai || providerKeyStatus.claude || providerKeyStatus.gemini;
        const hasNewKey = Boolean(trimmedDrafts.openai || trimmedDrafts.claude || trimmedDrafts.gemini);

        if (!alreadyHasKey && !hasNewKey) {
            setProviderKeyError('Add at least one provider key to continue.');
            return;
        }

        if (!hasNewKey) {
            setPreflightStep('permissions');
            return;
        }

        if (!window.electronAPI) {
            setProviderKeyError('Desktop APIs are not available in this window.');
            return;
        }

        setIsSavingProviderKeys(true);
        setProviderKeyError(null);

        try {
            const saveTasks: Array<Promise<{ provider: ProviderKeyId; success: boolean; error?: string }>> = [];
            if (trimmedDrafts.openai) {
                saveTasks.push(window.electronAPI.setOpenaiApiKey(trimmedDrafts.openai).then(result => ({
                    provider: 'openai' as const,
                    success: !!result?.success,
                    error: result?.error,
                })));
            }
            if (trimmedDrafts.claude) {
                saveTasks.push(window.electronAPI.setClaudeApiKey(trimmedDrafts.claude).then(result => ({
                    provider: 'claude' as const,
                    success: !!result?.success,
                    error: result?.error,
                })));
            }
            if (trimmedDrafts.gemini) {
                saveTasks.push(window.electronAPI.setGeminiApiKey(trimmedDrafts.gemini).then(result => ({
                    provider: 'gemini' as const,
                    success: !!result?.success,
                    error: result?.error,
                })));
            }

            const results = await Promise.all(saveTasks);
            const failed = results.find(result => !result.success);
            if (failed) {
                setProviderKeyError(failed.error || `Could not save the ${failed.provider} key.`);
                return;
            }

            const nextStatus: ProviderKeyStatus = {
                openai: providerKeyStatus.openai || Boolean(trimmedDrafts.openai),
                claude: providerKeyStatus.claude || Boolean(trimmedDrafts.claude),
                gemini: providerKeyStatus.gemini || Boolean(trimmedDrafts.gemini),
            };
            const preferredModel = !readiness.aiReady ? getPreferredPreflightModel(nextStatus) : null;
            if (preferredModel) {
                setCurrentModel(preferredModel);
                await window.electronAPI.setModel?.(preferredModel);
            }

            setProviderKeyDrafts(EMPTY_PROVIDER_KEY_DRAFTS);
            setProviderKeyStatus(nextStatus);
            setPreflightStep('permissions');
            await refreshReadiness();
        } catch (error) {
            setProviderKeyError(error instanceof Error ? error.message : 'Could not save provider keys.');
        } finally {
            setIsSavingProviderKeys(false);
        }
    };

    const handleRequestMicPermission = async () => {
        await window.electronAPI?.requestMicPermission?.();
        await refreshReadiness();
    };

    const openPermissionSettings = async (permission: 'screen' | 'accessibility') => {
        if (!isMac) {
            await refreshReadiness();
            return;
        }

        const url = permission === 'screen'
            ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
            : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';
        await window.electronAPI?.openExternal?.(url);
    };

    const handleInputDeviceSelect = (deviceId: string) => {
        setSelectedInputDeviceId(deviceId);
        localStorage.setItem('preferredInputDeviceId', deviceId);
        analytics.trackCommandExecuted('launcher_input_device_selected');
    };

    const handleOutputDeviceSelect = (deviceId: string) => {
        setSelectedOutputDeviceId(deviceId);
        localStorage.setItem('preferredOutputDeviceId', deviceId);
        analytics.trackCommandExecuted('launcher_output_device_selected');
    };

    const beginRenameMeeting = (meeting: Meeting, origin: 'header' | 'sidebar' = 'header') => {
        if (isMeetingFinalizing(meeting)) return;
        setRenamingMeetingId(meeting.id);
        setRenameOrigin(origin);
        setRenameDraft(meeting.title || '');
        setRenameError(null);
        setActiveMenuId(null);
    };

    const cancelRenameMeeting = () => {
        setRenamingMeetingId(null);
        setRenameOrigin(null);
        setRenameDraft('');
        setRenameError(null);
    };

    const saveRenameMeeting = async () => {
        const meetingId = renamingMeetingId;
        const nextTitle = renameDraft.trim();
        if (!meetingId || isSavingRename) return;
        if (!nextTitle) {
            setRenameError('Interview title cannot be empty.');
            return;
        }

        const currentTitle = meetings.find(meeting => meeting.id === meetingId)?.title
            || selectedMeetingRef.current?.title
            || '';
        if (nextTitle === currentTitle) {
            cancelRenameMeeting();
            return;
        }

        setIsSavingRename(true);
        setRenameError(null);
        try {
            const success = await window.electronAPI?.updateMeetingTitle?.(meetingId, nextTitle);
            if (!success) {
                setRenameError('Could not rename interview.');
                return;
            }

            setMeetings(prev => prev.map(meeting =>
                meeting.id === meetingId ? { ...meeting, title: nextTitle } : meeting
            ));
            setForwardMeeting(prev => prev?.id === meetingId ? { ...prev, title: nextTitle } : prev);

            const currentSelectedMeeting = selectedMeetingRef.current;
            if (currentSelectedMeeting?.id === meetingId) {
                selectMeeting({ ...currentSelectedMeeting, title: nextTitle });
            }

            cancelRenameMeeting();
            analytics.trackCommandExecuted('rename_interview');
        } catch (error) {
            console.error('[Launcher] Failed to rename interview:', error);
            setRenameError('Could not rename interview.');
        } finally {
            setIsSavingRename(false);
        }
    };

    const resetDeviceFallback = () => {
        if (!deviceFallbackNotice) return;
        if (deviceFallbackNotice.kind === 'input') {
            localStorage.removeItem('preferredInputDeviceId');
            setSelectedInputDeviceId('default');
        } else {
            localStorage.removeItem('preferredOutputDeviceId');
            setSelectedOutputDeviceId('default');
        }
        setDeviceFallbackNotice(null);
    };

    const handleUploadInterviewDoc = async () => {
        setDocError(null);
        setIsUploadingDoc(true);
        try {
            const result = await window.electronAPI?.interviewDocsUpload?.();
            if (result?.cancelled) return;
            if (!result?.success || !result.document) {
                setDocError(result?.error || 'Could not upload document.');
                return;
            }
            setInterviewDocs(prev => [result.document, ...prev]);
            setDocDetailsTargetId(result.document.id);
            setDocDetailsMode('upload');
            setDocDetailsError(null);
            analytics.trackCommandExecuted('interview_doc_uploaded');
        } catch (error) {
            console.error('[Launcher] document upload failed:', error);
            setDocError('Could not upload document.');
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteInterviewDoc = async (id: string) => {
        const result = await window.electronAPI?.interviewDocsDelete?.(id);
        if (result?.success) {
            setInterviewDocs(prev => prev.filter(doc => doc.id !== id));
            setSelectedDocIds(prev => prev.filter(docId => docId !== id));
            setWorkspaceContextDocIds(prev => prev.filter(docId => docId !== id));
            if (docDetailsTargetId === id) {
                setDocDetailsTargetId(null);
                setDocDetailsMode(null);
                setDocDetailsError(null);
            }
        }
    };

    const toggleSelectedDoc = (id: string) => {
        setSelectedDocIds(prev => {
            const next = prev.includes(id)
                ? prev.filter(docId => docId !== id)
                : [...prev, id];
            persistWorkspaceState({ selectedDocumentIds: next }).catch(error => {
                console.error('[Launcher] Failed to persist selected document:', error);
            });
            return next;
        });
    };

    const saveDocDetails = async (metadata: { contextKind: InterviewContextDocumentKind; contextDescription?: string }) => {
        if (!docDetailsTargetId) return;

        setIsSavingDocDetails(true);
        setDocDetailsError(null);
        try {
            const result = await window.electronAPI?.interviewDocsUpdateMetadata?.(docDetailsTargetId, metadata);
            if (!result?.success || !result.document) {
                setDocDetailsError(result?.error || 'Could not save document details.');
                return;
            }

            setInterviewDocs(prev => prev.map(doc => doc.id === result.document.id ? result.document : doc));
            setSelectedDocIds(prev => {
                const next = prev.includes(result.document.id) ? prev : [...prev, result.document.id];
                persistWorkspaceState({ selectedDocumentIds: next }).catch(error => {
                    console.error('[Launcher] Failed to persist document details:', error);
                });
                return next;
            });
            setDocDetailsTargetId(null);
            setDocDetailsMode(null);
        } catch (error) {
            console.error('[Launcher] document metadata update failed:', error);
            setDocDetailsError('Could not save document details.');
        } finally {
            setIsSavingDocDetails(false);
        }
    };

    const cancelDocDetails = async () => {
        const id = docDetailsTargetId;
        const mode = docDetailsMode;

        setDocDetailsTargetId(null);
        setDocDetailsMode(null);
        setDocDetailsError(null);
        if (id) {
            setSelectedDocIds(prev => prev.filter(docId => docId !== id));
        }

        if (id && mode === 'upload') {
            try {
                await window.electronAPI?.interviewDocsDelete?.(id);
            } catch (error) {
                console.error('[Launcher] failed to delete cancelled upload:', error);
            }
            setInterviewDocs(prev => prev.filter(doc => doc.id !== id));
        }
    };

    const updateWorkspaceAssistant = useCallback((messageId: string, content: string, isStreaming: boolean) => {
        setPrepMessages(prev => prev.map(message =>
            message.id === messageId ? { ...message, content, isStreaming } : message
        ));
    }, []);

    const submitPrepMessage = useCallback(async () => {
        const note = prepDraft.trim();
        if (!note || workspaceConversationState === 'waiting' || workspaceConversationState === 'streaming') return;

        const phase: PrepMessage['phase'] = selectedMeeting ? 'after' : isMeetingActive ? 'during' : 'before';
        const messageAttachments = selectedDocs.map(docToPrepAttachment);
        const userMessage: PrepMessage = {
            id: genMessageId(),
            role: 'user',
            content: note,
            createdAt: Date.now(),
            phase,
            attachments: messageAttachments,
        };
        const assistantMessageId = genMessageId();
        const assistantPlaceholder: PrepMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            phase,
            isStreaming: true,
        };
        const nextMessages = [...prepMessages, userMessage, assistantPlaceholder];
        const nextContextDocIds = getWorkspaceDocumentIds([...prepMessages, userMessage], []);
        setPrepDraft('');
        setSelectedDocIds([]);
        setWorkspaceContextDocIds(nextContextDocIds);
        setWorkspaceErrorMessage(null);
        setPrepMessages(nextMessages);
        setWorkspaceConversationState('waiting');
        persistWorkspaceState({
            messages: nextMessages,
            selectedDocumentIds: nextContextDocIds,
        }).catch(error => console.error('[LauncherWorkspaceChat] failed to persist outgoing message:', error));

        let tokenCleanup: (() => void) | undefined;
        let doneCleanup: (() => void) | undefined;
        let errorCleanup: (() => void) | undefined;

        try {
            resetWorkspaceStreamBuffer();
            const messagesForContext = [...prepMessages, userMessage];
            const messageAttachmentIds = new Set(messageAttachments.map(doc => doc.id));
            const documentsForContext = interviewDocs.filter(doc =>
                selectedDocIds.includes(doc.id) ||
                messageAttachmentIds.has(doc.id) ||
                prepMessages.some(message => message.attachments?.some(attachment => attachment.id === doc.id)),
            );
            const context = buildInterviewWorkspaceChatContext(
                messagesForContext,
                documentsForContext,
                selectedMeeting,
                liveTranscript,
                phase || 'before',
            );

            tokenCleanup = window.electronAPI?.onGeminiStreamToken((token: string) => {
                setWorkspaceConversationState('streaming');
                appendWorkspaceToken(token, (content) => updateWorkspaceAssistant(assistantMessageId, content, true));
            });

            doneCleanup = window.electronAPI?.onGeminiStreamDone(() => {
                const finalContent = getWorkspaceBufferedContent();
                const finalAssistantContent = finalContent || "I couldn't generate a response from the available context.";
                setPrepMessages(prev => {
                    const updated = prev.map(message =>
                        message.id === assistantMessageId
                            ? { ...message, content: finalAssistantContent, isStreaming: false }
                            : message
                    );
                    persistWorkspaceState({
                        messages: updated,
                        selectedDocumentIds: nextContextDocIds,
                    }).catch(error => console.error('[LauncherWorkspaceChat] failed to persist assistant response:', error));
                    return updated;
                });
                setWorkspaceConversationState('idle');
                resetWorkspaceStreamBuffer();
                tokenCleanup?.();
                doneCleanup?.();
                errorCleanup?.();
            });

            errorCleanup = window.electronAPI?.onGeminiStreamError((error: string) => {
                console.error('[LauncherWorkspaceChat] stream error:', error);
                setPrepMessages(prev => {
                    const updated = prev.filter(message => message.id !== assistantMessageId);
                    persistWorkspaceState({
                        messages: updated,
                        selectedDocumentIds: nextContextDocIds,
                    }).catch(saveError => console.error('[LauncherWorkspaceChat] failed to persist stream error state:', saveError));
                    return updated;
                });
                setWorkspaceErrorMessage("Couldn't answer from this interview workspace. Check your model settings and try again.");
                setWorkspaceConversationState('error');
                resetWorkspaceStreamBuffer();
                tokenCleanup?.();
                doneCleanup?.();
                errorCleanup?.();
            });

            await window.electronAPI?.streamGeminiChat(
                note,
                undefined,
                context,
                {
                    systemPrompt: INTERVIEW_WORKSPACE_CHAT_PROMPT,
                    ignoreKnowledgeMode: true,
                    recordInSession: false,
                },
            );
        } catch (error) {
            console.error('[LauncherWorkspaceChat] submit failed:', error);
            tokenCleanup?.();
            doneCleanup?.();
            errorCleanup?.();
            setPrepMessages(prev => {
                const updated = prev.filter(message => message.id !== assistantMessageId);
                persistWorkspaceState({
                    messages: updated,
                    selectedDocumentIds: nextContextDocIds,
                }).catch(saveError => console.error('[LauncherWorkspaceChat] failed to persist submit error state:', saveError));
                return updated;
            });
            setWorkspaceErrorMessage("Couldn't answer from this interview workspace. Check your model settings and try again.");
            setWorkspaceConversationState('error');
            resetWorkspaceStreamBuffer();
        }
    }, [
        appendWorkspaceToken,
        getWorkspaceBufferedContent,
        getWorkspaceDocumentIds,
        isMeetingActive,
        liveTranscript,
        persistWorkspaceState,
        prepDraft,
        prepMessages,
        resetWorkspaceStreamBuffer,
        interviewDocs,
        selectedDocs,
        selectedDocIds,
        selectedMeeting,
        updateWorkspaceAssistant,
        workspaceConversationState,
    ]);

    const startPreparedInterview = async () => {
        if (isMeetingActive) {
            window.electronAPI?.setWindowMode?.('overlay', true);
            analytics.trackCommandExecuted('resume_meeting_from_launcher');
            return;
        }

        analytics.trackCommandExecuted('start_prepared_interview');
        const interviewDocumentIds = Array.from(new Set([
            ...selectedDocIds,
            ...workspaceContextDocIds,
            ...prepMessages.flatMap(message => message.attachments?.map(doc => doc.id) || []),
        ]));
        await persistWorkspaceState({
            messages: prepMessages,
            selectedDocumentIds: interviewDocumentIds,
            status: 'active',
        });
        onStartMeeting({
            source: 'manual',
            interviewContext: {
                workspaceStateId,
                contextMarkdown: prepContextMarkdown,
                selectedDocumentIds: interviewDocumentIds,
                messageCount: prepMessages.filter(message => message.role === 'user').length,
            },
        });
    };

    // Helper to format duration to mm:ss or mmm:ss
    // Helper to format duration to mm:ss or mmm:ss
    const formatDurationPill = (durationStr: string) => {
        if (!durationStr) return "00:00";

        // Check if it's already in colon format (e.g. "5:30", "105:20")
        if (durationStr.includes(':')) {
            const parts = durationStr.split(':');
            const mins = parts[0];
            const secs = parts[1] || "00";

            // Allow 3 digits for mins if >= 100, otherwise pad to 2
            const formattedMins = mins.length >= 3 ? mins : mins.padStart(2, '0');
            return `${formattedMins}:${secs}`;
        }

        // Fallback for "X min" format (legacy)
        const minutes = parseInt(durationStr.replace('min', '').trim()) || 0;
        const mm = minutes.toString().padStart(2, '0');
        return `${mm}:00`;
    };

    const hasPreflightLlmKey = providerKeyStatus.openai || providerKeyStatus.claude || providerKeyStatus.gemini;
    const preflightPermissionsReady = readiness.micPermission === 'granted' &&
        readiness.screenPermission === 'granted' &&
        readiness.accessibilityPermission === 'granted';
    const showPreflight = !hasPreflightLlmKey || !preflightPermissionsReady;
    const permissionsReady = readiness.micPermission === 'granted' && readiness.screenPermission === 'granted';
    const captureReady = readiness.audioReady && permissionsReady;
    const readinessRows: Array<{
        key: string;
        label: string;
        value: string;
        status: ReadinessStatus;
        icon: any;
        tab: string;
    }> = [
        {
            key: 'ai',
            label: 'AI model',
            value: readiness.aiReady
                ? `${readiness.aiProvider} · ${readiness.aiModel}`
                : `${readiness.aiProvider}: configure key`,
            status: readiness.aiReady ? 'ready' : 'missing',
            icon: Brain,
            tab: 'ai-providers',
        },
        {
            key: 'speech',
            label: 'Speech',
            value: readiness.sttReady
                ? `${readiness.sttProvider} ready`
                : `${readiness.sttProvider}: ${readiness.sttHint}`,
            status: readiness.sttReady ? 'ready' : 'missing',
            icon: Mic,
            tab: 'audio',
        },
        {
            key: 'capture',
            label: 'Capture',
            value: captureReady
                ? 'Mic + screen ready'
                : `Mic ${permissionLabel(readiness.micPermission)}, screen ${permissionLabel(readiness.screenPermission)}`,
            status: captureReady ? 'ready' : 'missing',
            icon: ShieldCheck,
            tab: 'audio',
        },
        {
            key: 'visibility',
            label: 'Visibility',
            value: isDetectable ? 'Detectable window' : 'Undetectable window',
            status: isDetectable ? 'warning' : 'ready',
            icon: Ghost,
            tab: 'general',
        },
    ];
    const missingReadinessCount = readinessRows.filter(row => row.status === 'missing').length;
    const warningReadinessCount = readinessRows.filter(row => row.status === 'warning').length;
    const providerMissing = !readiness.hasAnyProvider;
    const micMissing = readiness.micPermission !== 'granted';
    const screenMissing = readiness.screenPermission !== 'granted';
    const accessibilityMissing = readiness.accessibilityPermission !== 'granted';
    const coreSetupIssueCount = [providerMissing, micMissing, screenMissing, accessibilityMissing].filter(Boolean).length;
    const readinessSummary = readiness.loading
        ? 'Checking setup'
        : coreSetupIssueCount > 0
            ? `${coreSetupIssueCount} setup item${coreSetupIssueCount === 1 ? '' : 's'} need attention`
            : warningReadinessCount > 0
                ? 'Ready with notes'
                : 'Ready for interview';
    const setupIssues = [
        providerMissing
            ? {
                key: 'provider',
                label: 'Add an AI provider key',
                detail: 'At least one cloud provider key or local provider is needed.',
                tab: 'ai-providers',
            }
            : null,
        micMissing
            ? {
                key: 'mic',
                label: 'Grant microphone',
                detail: `Microphone is ${permissionLabel(readiness.micPermission).toLowerCase()}.`,
                tab: 'audio',
            }
            : null,
        screenMissing
            ? {
                key: 'screen',
                label: 'Grant screen recording',
                detail: `Screen recording is ${permissionLabel(readiness.screenPermission).toLowerCase()}.`,
                tab: 'audio',
            }
            : null,
        accessibilityMissing
            ? {
                key: 'accessibility',
                label: 'Grant accessibility',
                detail: `Accessibility is ${permissionLabel(readiness.accessibilityPermission).toLowerCase()}.`,
                tab: 'general',
            }
            : null,
    ].filter(Boolean) as Array<{ key: string; label: string; detail: string; tab: string }>;

    useEffect(() => {
        if (readiness.loading) return;
        if (!hasPreflightLlmKey) {
            setPreflightStep('providers');
            return;
        }
        if (!preflightPermissionsReady) {
            setPreflightStep('permissions');
        }
    }, [hasPreflightLlmKey, preflightPermissionsReady, readiness.loading]);

    const preflightProviderFields: Array<{
        id: ProviderKeyId;
        label: string;
        placeholder: string;
    }> = [
        {
            id: 'openai',
            label: 'OpenAI',
            placeholder: 'sk-...',
        },
        {
            id: 'claude',
            label: 'Claude',
            placeholder: 'sk-ant-...',
        },
        {
            id: 'gemini',
            label: 'Google Gemini',
            placeholder: 'AIza...',
        },
    ];

    const preflightPermissionItems: Array<{
        key: string;
        label: string;
        detail: string;
        status: PermissionValue;
        icon: any;
        actionLabel: string;
        action: () => void | Promise<void>;
    }> = [
        {
            key: 'microphone',
            label: 'Microphone',
            detail: 'Capture your voice during the interview.',
            status: readiness.micPermission,
            icon: Mic,
            actionLabel: readiness.micPermission === 'granted' ? 'Granted' : 'Request',
            action: handleRequestMicPermission,
        },
        {
            key: 'screen',
            label: 'Screen Recording',
            detail: 'Read meeting windows and shared screens.',
            status: readiness.screenPermission,
            icon: Monitor,
            actionLabel: readiness.screenPermission === 'granted' ? 'Granted' : 'Open Settings',
            action: () => openPermissionSettings('screen'),
        },
        {
            key: 'accessibility',
            label: 'Accessibility',
            detail: 'Let the app use local shortcuts and window controls.',
            status: readiness.accessibilityPermission,
            icon: ShieldCheck,
            actionLabel: readiness.accessibilityPermission === 'granted' ? 'Granted' : 'Open Settings',
            action: () => openPermissionSettings('accessibility'),
        },
    ];

    return (
        <div className="h-full w-full flex flex-col bg-bg-primary text-text-primary font-sans overflow-hidden selection:bg-[var(--accent-muted)]">
            {/* 1. Header (Static) */}
            <header className={`relative w-full h-[40px] shrink-0 flex items-center justify-between pl-0 drag-region select-none ${isLight ? 'bg-bg-primary' : 'bg-bg-secondary'} border-b border-border-subtle z-[200]`}>
                {/* Left: Spacing for Traffic Lights + Navigation Arrows */}
                <div className="flex items-center gap-1 no-drag">
                    {isMac && <div className="w-[70px]" />} {/* Traffic Light Spacer (macOS only) */}

                    {/* Back Button */}
                    <button
                        onClick={selectedMeeting ? handleBack : undefined}
                        disabled={!selectedMeeting}
                        className={`
                            transition-all duration-300 p-1 flex items-center justify-center mt-1 ml-2
                            ${selectedMeeting
                                ? `text-text-secondary hover:text-text-primary ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`
                                : 'text-text-tertiary opacity-50 cursor-default'}
                        `}
                    >
                        <ArrowLeft size={16} />
                    </button>

                    {/* Forward Button */}
                    <button
                        onClick={handleForward}
                        disabled={!forwardMeeting}
                        className={`
                            transition-all duration-300 p-1 flex items-center justify-center mt-1
                            ${forwardMeeting
                                ? `text-text-secondary hover:text-text-primary ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`
                                : 'text-text-tertiary opacity-0 cursor-default'}
                        `}
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>


                {/* Center: Spotlight-style Search Pill */}
                <TopSearchPill
                    meetings={meetings}
                    onAIQuery={(query) => {
                        analytics.trackCommandExecuted('ai_query_search');
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onLiteralSearch={(query) => {
                        // For now, also use AI query for literal search
                        // Could be enhanced to do fuzzy filtering in the UI
                        analytics.trackCommandExecuted('literal_search');
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onOpenMeeting={(meetingId) => {
                        const meeting = meetings.find(m => m.id === meetingId);
                        if (meeting) {
                            handleOpenMeeting(meeting);
                            analytics.trackCommandExecuted('open_meeting_from_search');
                        }
                    }}
                />

                {/* Right: Actions */}
                <div className={`flex items-center gap-1 no-drag shrink-0 ${isMac ? 'mr-1' : ''}`}>
                    <button
                        onClick={() => {
                            try {
                                localStorage.removeItem('answerflow_help_assistant_dismissed_v1');
                            } catch {
                                /* localStorage can fail in constrained environments */
                            }
                            window.dispatchEvent(new CustomEvent('answerflow-help-assistant-show', { detail: { open: true } }));
                        }}
                        title="Help"
                        className={`p-2 text-text-secondary hover:text-text-primary transition-all duration-300 ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                        aria-label="Open help"
                    >
                        <HelpCircle size={18} />
                    </button>
                    <button
                        onClick={() => {
                            onOpenSettings();
                        }}
                        title="Settings"
                        className={`p-2 text-text-secondary hover:text-text-primary transition-all duration-300 ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                    >
                        <Settings size={18} />
                    </button>
                    {!isMac && <WindowControls />}
                </div>
            </header>

            <div className="relative flex-1 flex flex-col overflow-hidden">
                {!isDetectable && (
                    <div className={`absolute inset-1 border-2 border-dashed rounded-2xl pointer-events-none z-[100] ${isLight ? 'border-black/15' : 'border-white/20'}`} />
                )}
                {showPreflight ? (
                    <motion.div
                        key="preflight"
                        className={`flex-1 overflow-y-auto custom-scrollbar ${isLight ? 'bg-bg-primary' : 'bg-bg-primary'}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <main className="min-h-full px-6 py-8 flex items-center justify-center">
                            <div className="w-full max-w-[980px]">
                                <div className="mb-5 flex items-center gap-2 text-[12px] font-semibold text-text-tertiary">
                                    <span className={`rounded-full px-3 py-1.5 ${preflightStep === 'providers' ? 'bg-accent-secondary text-accent-primary' : hasPreflightLlmKey ? 'bg-emerald-500/12 text-emerald-400' : 'bg-bg-secondary text-text-tertiary'}`}>
                                        1. Model keys
                                    </span>
                                    <ChevronRight size={14} />
                                    <span className={`rounded-full px-3 py-1.5 ${preflightStep === 'permissions' ? 'bg-accent-secondary text-accent-primary' : 'bg-bg-secondary text-text-tertiary'}`}>
                                        2. Permissions
                                    </span>
                                </div>

                                <section className={`rounded-xl border ${isLight ? 'bg-white border-border-muted shadow-sm' : 'bg-bg-primary border-border-subtle'} overflow-hidden`}>
                                    {preflightStep === 'providers' ? (
                                        <div className="grid min-h-[520px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] max-lg:grid-cols-1">
                                            <div className={`p-8 flex flex-col justify-between border-r max-lg:border-r-0 max-lg:border-b ${isLight ? 'border-border-muted bg-bg-secondary/60' : 'border-border-subtle bg-bg-secondary/40'}`}>
                                                <div>
                                                    <div className="h-12 w-12 rounded-xl bg-accent-secondary text-accent-primary flex items-center justify-center mb-6">
                                                        <KeyRound size={24} />
                                                    </div>
                                                    <h1 className="text-[28px] leading-tight font-semibold text-text-primary">Set up model keys</h1>
                                                    <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                                                        Save at least one LLM key before starting interviews.
                                                    </p>
                                                </div>
                                                <p className="text-[12px] leading-relaxed text-text-tertiary">
                                                    Keys are stored in local encrypted app data. The app does not need macOS Keychain for this setup.
                                                </p>
                                            </div>

                                            <div className="p-8 flex flex-col justify-center gap-4">
                                                {preflightProviderFields.map(field => {
                                                    const saved = providerKeyStatus[field.id];
                                                    return (
                                                        <div
                                                            key={field.id}
                                                            className={`rounded-lg border p-3.5 ${isLight ? 'bg-bg-secondary/70 border-border-muted' : 'bg-bg-secondary border-border-subtle'}`}
                                                        >
                                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                                <label className="text-[13px] font-semibold text-text-primary" htmlFor={`preflight-${field.id}`}>
                                                                    {field.label}
                                                                </label>
                                                                {saved && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                                                                        <Check size={12} />
                                                                        Saved
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <input
                                                                id={`preflight-${field.id}`}
                                                                type="password"
                                                                autoComplete="off"
                                                                spellCheck={false}
                                                                value={providerKeyDrafts[field.id]}
                                                                onChange={(event) => handleProviderKeyDraftChange(field.id, event.target.value)}
                                                                placeholder={saved ? 'Saved. Paste a new key to replace it.' : field.placeholder}
                                                                className={`h-11 w-full rounded-md border px-3 text-[13px] outline-none transition-colors ${isLight ? 'bg-white border-border-muted text-text-primary placeholder:text-text-tertiary focus:border-accent-primary' : 'bg-bg-input border-border-subtle text-text-primary placeholder:text-text-tertiary focus:border-accent-primary'}`}
                                                            />
                                                        </div>
                                                    );
                                                })}

                                                {providerKeyError && (
                                                    <div className="rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                                                        {providerKeyError}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between gap-3 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenSettings('ai-providers')}
                                                        className="text-[12px] font-medium text-text-tertiary hover:text-text-primary transition-colors"
                                                    >
                                                        Advanced provider settings
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveProviderKeys}
                                                        disabled={isSavingProviderKeys}
                                                        className="h-10 rounded-md bg-accent-primary px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isSavingProviderKeys ? (
                                                            <>
                                                                <RefreshCw size={14} className="animate-spin" />
                                                                Saving
                                                            </>
                                                        ) : (
                                                            <>
                                                                {hasPreflightLlmKey && !Object.values(providerKeyDrafts).some(Boolean) ? 'Continue' : 'Save and continue'}
                                                                <ArrowRight size={14} />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid min-h-[520px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] max-lg:grid-cols-1">
                                            <div className={`p-8 flex flex-col justify-between border-r max-lg:border-r-0 max-lg:border-b ${isLight ? 'border-border-muted bg-bg-secondary/60' : 'border-border-subtle bg-bg-secondary/40'}`}>
                                                <div>
                                                    <div className="h-12 w-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-6">
                                                        <ShieldCheck size={24} />
                                                    </div>
                                                    <h1 className="text-[28px] leading-tight font-semibold text-text-primary">Grant permissions</h1>
                                                    <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                                                        These are needed before the assistant can listen and follow the interview.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={refreshReadiness}
                                                    className="self-start inline-flex items-center gap-2 text-[12px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                                                >
                                                    <RefreshCw size={13} className={readiness.loading ? 'animate-spin' : ''} />
                                                    Refresh status
                                                </button>
                                            </div>

                                            <div className="p-8 flex flex-col justify-center gap-3">
                                                {preflightPermissionItems.map(item => {
                                                    const Icon = item.icon;
                                                    const granted = item.status === 'granted';
                                                    return (
                                                        <div
                                                            key={item.key}
                                                            className={`rounded-lg border p-4 flex items-center gap-4 ${granted ? 'border-emerald-500/25 bg-emerald-500/8' : isLight ? 'bg-bg-secondary/70 border-border-muted' : 'bg-bg-secondary border-border-subtle'}`}
                                                        >
                                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${granted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-accent-secondary text-accent-primary'}`}>
                                                                <Icon size={20} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-[14px] font-semibold text-text-primary">{item.label}</h3>
                                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${granted ? 'bg-emerald-500/12 text-emerald-400' : 'bg-amber-500/12 text-amber-400'}`}>
                                                                        {permissionLabel(item.status)}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{item.detail}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={item.action}
                                                                disabled={granted}
                                                                className={`h-9 shrink-0 rounded-md px-3 text-[12px] font-semibold transition-colors ${granted ? 'text-emerald-400 cursor-default' : 'bg-accent-primary text-white hover:opacity-90'}`}
                                                            >
                                                                {item.actionLabel}
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                <div className="flex justify-between items-center pt-3 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreflightStep('providers')}
                                                        className="text-[12px] font-medium text-text-tertiary hover:text-text-primary transition-colors"
                                                    >
                                                        Back to keys
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={refreshReadiness}
                                                        disabled={!preflightPermissionsReady}
                                                        className="h-10 rounded-md bg-accent-primary px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Continue to app
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </main>
                    </motion.div>
                ) : (
                    <motion.div
                    key="launcher"
                    className="flex-1 flex flex-col overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >

                            <div className={`h-full min-h-0 grid grid-cols-[300px_minmax(0,1fr)_360px] ${isLight ? 'bg-bg-primary' : 'bg-bg-primary'}`}>
                                <aside className={`min-h-0 border-r border-border-subtle flex flex-col ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
                                    <div className="shrink-0 px-3 py-3 border-b border-border-subtle">
                                        <button
                                            onClick={handleNewInterview}
                                            className={`w-full h-9 rounded-md px-3 flex items-center gap-2 text-[13px] font-semibold transition-colors ${
                                                isLight
                                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                    : 'bg-slate-100 text-slate-950 hover:bg-white'
                                            }`}
                                        >
                                            <Plus size={15} strokeWidth={2.3} />
                                            <span>New interview</span>
                                        </button>
                                    </div>

                                    <div className="shrink-0 px-3 py-2 border-b border-border-subtle flex items-center justify-between">
                                        <div>
                                            <h2 className="text-[13px] font-semibold text-text-primary">Interviews</h2>
                                            <p className="text-[11px] text-text-tertiary">{meetings.length} saved</p>
                                        </div>
                                        <button
                                            onClick={handleRefresh}
                                            disabled={isRefreshing}
                                            title="Refresh interviews"
                                            className={`h-8 w-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                        >
                                            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-accent-primary' : ''} />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 py-3">
                                        {sortedGroups.map((label) => (
                                            <section key={label} className="mb-4">
                                                <h3 className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</h3>
                                                <div className="space-y-1">
                                                    {groupedMeetings[label].map((m) => {
                                                        const rowFinalizing = isMeetingFinalizing(m);
                                                        const rowRenaming = renamingMeetingId === m.id && renameOrigin === 'sidebar';

                                                        return (
                                                        <motion.div
                                                            key={m.id}
                                                            layoutId={`meeting-${m.id}`}
                                                            className={`group relative px-2.5 py-2 rounded-md transition-colors ${rowRenaming ? 'cursor-default' : 'cursor-pointer'} ${
                                                                selectedMeeting?.id === m.id
                                                                    ? isLight
                                                                        ? 'bg-bg-elevated shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]'
                                                                        : 'bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                                                                    : isLight
                                                                        ? 'hover:bg-bg-elevated'
                                                                        : 'hover:bg-white/6'
                                                            }`}
                                                            onClick={() => {
                                                                if (!rowRenaming) handleOpenMeeting(m);
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                {rowRenaming ? (
                                                                    <div className="min-w-0 flex-1 flex items-center gap-1">
                                                                        <input
                                                                            value={renameDraft}
                                                                            onChange={(event) => {
                                                                                setRenameDraft(event.target.value);
                                                                                setRenameError(null);
                                                                            }}
                                                                            onClick={(event) => event.stopPropagation()}
                                                                            onKeyDown={(event) => {
                                                                                if (event.key === 'Enter') {
                                                                                    event.preventDefault();
                                                                                    saveRenameMeeting();
                                                                                } else if (event.key === 'Escape') {
                                                                                    event.preventDefault();
                                                                                    cancelRenameMeeting();
                                                                                }
                                                                            }}
                                                                            onFocus={(event) => event.currentTarget.select()}
                                                                            disabled={isSavingRename}
                                                                            autoFocus
                                                                            className={`h-7 min-w-0 flex-1 rounded-md border px-2 text-[13px] font-medium outline-none ${isLight ? 'bg-white border-border-muted text-text-primary focus:border-accent-primary' : 'bg-bg-input border-border-subtle text-text-primary focus:border-accent-primary'}`}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation();
                                                                                saveRenameMeeting();
                                                                            }}
                                                                            disabled={isSavingRename}
                                                                            title="Save title"
                                                                            className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-50 ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                                        >
                                                                            {isSavingRename ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation();
                                                                                cancelRenameMeeting();
                                                                            }}
                                                                            disabled={isSavingRename}
                                                                            title="Cancel rename"
                                                                            className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-50 ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <p className={`min-w-0 flex-1 truncate text-[13px] font-medium ${rowFinalizing ? 'text-accent-primary italic animate-pulse' : 'text-text-primary'}`}>
                                                                            {m.title}
                                                                        </p>
                                                                        <button
                                                                            className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-item-active transition-all"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveMenuId(activeMenuId === m.id ? null : m.id);
                                                                            }}
                                                                        >
                                                                            <MoreHorizontal size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
                                                                {rowRenaming && renameError ? (
                                                                    <span className="truncate text-red-400">{renameError}</span>
                                                                ) : rowFinalizing ? (
                                                                    <>
                                                                        <RefreshCw size={11} className="animate-spin text-accent-primary" />
                                                                        <span>Finalizing</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>{formatTime(m.date)}</span>
                                                                        <span className="h-1 w-1 rounded-full bg-text-tertiary/50" />
                                                                        <span>{formatDurationPill(m.duration)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <AnimatePresence>
                                                                {activeMenuId === m.id && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.96, y: 4 }}
                                                                        transition={{ duration: 0.1 }}
                                                                        className={`absolute right-2 top-8 w-[116px] backdrop-blur-xl rounded-lg shadow-2xl z-50 overflow-hidden border ${isLight ? 'bg-bg-elevated border-border-muted shadow-[0_8px_24px_rgba(0,0,0,0.12)]' : 'bg-[#1E1E1E]/90 border-white/10'}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onMouseEnter={() => setMenuEntered(true)}
                                                                        onMouseLeave={() => {
                                                                            if (menuEntered) setActiveMenuId(null);
                                                                        }}
                                                                    >
                                                                        <div className="p-1 flex flex-col gap-0.5">
                                                                            {!rowFinalizing && (
                                                                                <button
                                                                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary rounded-md transition-colors text-left ${isLight ? 'hover:bg-bg-item-surface' : 'hover:bg-white/10'}`}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        beginRenameMeeting(m, 'sidebar');
                                                                                    }}
                                                                                >
                                                                                    <Pencil size={13} />
                                                                                    Rename
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary rounded-md transition-colors text-left ${isLight ? 'hover:bg-bg-item-surface' : 'hover:bg-white/10'}`}
                                                                                onClick={async () => {
                                                                                    setActiveMenuId(null);
                                                                                    analytics.trackPdfExported();
                                                                                    if (window.electronAPI && window.electronAPI.getMeetingDetails) {
                                                                                        try {
                                                                                            const fullMeeting = await window.electronAPI.getMeetingDetails(m.id);
                                                                                            generateMeetingPDF(fullMeeting || m);
                                                                                        } catch (e) {
                                                                                            console.error("Failed to fetch details for PDF", e);
                                                                                            generateMeetingPDF(m);
                                                                                        }
                                                                                    } else {
                                                                                        generateMeetingPDF(m);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Download size={13} />
                                                                                Export
                                                                            </button>
                                                                            <button
                                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors text-left"
                                                                                onClick={async () => {
                                                                                    if (window.electronAPI && window.electronAPI.deleteMeeting) {
                                                                                        const success = await window.electronAPI.deleteMeeting(m.id);
                                                                                        if (success) {
                                                                                            setMeetings(prev => prev.filter(meeting => meeting.id !== m.id));
                                                                                        }
                                                                                    }
                                                                                    setActiveMenuId(null);
                                                                                }}
                                                                            >
                                                                                <Trash2 size={13} />
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        ))}
                                        {meetings.length === 0 && (
                                            <div className="px-3 py-8 text-center text-[13px] text-text-tertiary">No interviews yet.</div>
                                        )}
                                    </div>
                                </aside>

                                <main className="min-h-0 flex flex-col">
                                    <div className="h-[54px] px-5 flex items-center justify-between border-b border-border-subtle">
	                                        <div className="min-w-0 flex-1">
                                                {selectedMeeting && renamingMeetingId === selectedMeeting.id && renameOrigin === 'header' ? (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <input
                                                            value={renameDraft}
                                                            onChange={(event) => {
                                                                setRenameDraft(event.target.value);
                                                                setRenameError(null);
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter') {
                                                                    event.preventDefault();
                                                                    saveRenameMeeting();
                                                                } else if (event.key === 'Escape') {
                                                                    event.preventDefault();
                                                                    cancelRenameMeeting();
                                                                }
                                                            }}
                                                            onFocus={(event) => event.currentTarget.select()}
                                                            disabled={isSavingRename}
                                                            autoFocus
                                                            className={`h-8 min-w-0 flex-1 rounded-md border px-2.5 text-[14px] font-semibold outline-none transition-colors ${isLight ? 'bg-white border-border-muted text-text-primary focus:border-accent-primary' : 'bg-bg-input border-border-subtle text-text-primary focus:border-accent-primary'}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={saveRenameMeeting}
                                                            disabled={isSavingRename}
                                                            title="Save title"
                                                            className={`h-8 w-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                        >
                                                            {isSavingRename ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelRenameMeeting}
                                                            disabled={isSavingRename}
                                                            title="Cancel rename"
                                                            className={`h-8 w-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <h1 className="min-w-0 text-[15px] font-semibold text-text-primary truncate">
                                                            {selectedMeeting ? selectedMeeting.title : 'Current interview'}
                                                        </h1>
                                                        {selectedMeeting && !isMeetingFinalizing(selectedMeeting) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => beginRenameMeeting(selectedMeeting, 'header')}
                                                                title="Rename interview"
                                                                className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {renameError && selectedMeeting && renamingMeetingId === selectedMeeting.id && renameOrigin === 'header' ? (
                                                    <p className="text-[11px] text-red-400 truncate">{renameError}</p>
                                                ) : (
	                                            <p className="text-[11px] text-text-tertiary truncate">
	                                                    {selectedMeeting
	                                                        ? `${new Date(selectedMeeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${formatDurationPill(selectedMeeting.duration)}`
	                                                        : readinessSummary}
	                                                </p>
                                                )}
		                                        </div>
		                                        <div className="flex items-center gap-2">
                                                {selectedMeeting ? (
                                                    <button
                                                        onClick={handleBack}
                                                        className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                    >
                                                        Clear
                                                    </button>
                                                ) : null}
	                                        </div>
	                                    </div>
			                                    <div className="flex-1 min-h-0 p-5 overflow-hidden">
		                                        <InterviewPrepPanel
                                                    key={selectedMeeting?.id || 'current-interview-workspace'}
                                                    isLight={isLight}
                                                    isMeetingActive={isMeetingActive}
                                                    meeting={selectedMeeting}
                                                    liveTranscript={liveTranscript}
                                                    messages={prepMessages}
                                                    draft={prepDraft}
                                                    availableDocs={interviewDocs}
                                                    selectedDocs={selectedDocs}
                                                    selectedDocIds={selectedDocIds}
                                                    contextMarkdown={prepContextMarkdown}
                                                    conversationState={workspaceConversationState}
                                                    errorMessage={workspaceErrorMessage}
                                                    isUploadingDoc={isUploadingDoc}
                                                    docError={docError}
                                                    onDraftChange={setPrepDraft}
                                                    onSubmit={submitPrepMessage}
                                                    onStartInterview={startPreparedInterview}
                                                    onUploadDoc={handleUploadInterviewDoc}
                                                    onToggleDoc={toggleSelectedDoc}
                                                    onDeleteDoc={handleDeleteInterviewDoc}
                                                />
		                                    </div>
                                </main>

                                <aside className={`min-h-0 border-l border-border-subtle flex flex-col ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                        {setupIssues.length > 0 && (
                                            <section className={`rounded-lg border border-amber-500/25 ${isLight ? 'bg-amber-50/80' : 'bg-amber-500/8'} p-3 space-y-2.5`}>
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <AlertCircle size={15} />
                                                    <h3 className="text-[12px] font-semibold">Setup needed</h3>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {setupIssues.map(issue => (
                                                        <button
                                                            key={issue.key}
                                                            onClick={() => onOpenSettings(issue.tab)}
                                                            className={`w-full rounded-md px-2.5 py-2 text-left transition-colors ${isLight ? 'hover:bg-white/70' : 'hover:bg-white/8'}`}
                                                        >
                                                            <p className="text-[12px] font-semibold text-text-primary">{issue.label}</p>
                                                            <p className="mt-0.5 text-[11px] leading-relaxed text-text-tertiary">{issue.detail}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-[12px] font-semibold text-text-primary">Model</h3>
                                                    <p className="text-[10.5px] text-text-tertiary truncate">{readiness.aiProvider} · {readiness.aiModel}</p>
                                                </div>
                                                <button
                                                    onClick={() => refreshReadiness()}
                                                    title="Refresh model"
                                                    className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                >
                                                    <RefreshCw size={12} className={readiness.loading ? 'animate-spin text-accent-primary' : ''} />
                                                </button>
                                            </div>
                                            <ModelSelector
                                                currentModel={currentModel}
                                                onSelectModel={handleModelSelect}
                                                placement="down"
                                                className="w-full !max-w-none justify-between"
                                            />
                                        </section>

                                        <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div className="min-w-0">
                                                    <h3 className="text-[12px] font-semibold text-text-primary">Audio Configuration</h3>
                                                    <p className="text-[10.5px] text-text-tertiary truncate">Manage input and output devices.</p>
                                                </div>
                                                <button
                                                    onClick={loadAudioDevices}
                                                    title="Refresh audio devices"
                                                    className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                >
                                                    <RefreshCw size={12} className={audioDevicesLoading ? 'animate-spin text-accent-primary' : ''} />
                                                </button>
                                            </div>
                                            {deviceFallbackNotice && (
                                                <div className="mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                    <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs text-amber-200/90 leading-snug">
                                                            Selected {deviceFallbackNotice.kind === 'input' ? 'microphone' : 'output device'}
                                                            {deviceFallbackNotice.requested ? ` "${deviceFallbackNotice.requested}"` : ''} couldn't be opened
                                                            — using <span className="font-medium">{deviceFallbackNotice.actual ?? 'no device'}</span> instead.
                                                        </p>
                                                        {deviceFallbackNotice.reason && (
                                                            <p className="text-[11px] text-amber-200/60 mt-1 font-mono break-all">{deviceFallbackNotice.reason}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={resetDeviceFallback}
                                                        className="shrink-0 text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>
                                            )}
                                            <div className="space-y-4">
                                                <LauncherAudioSelect
                                                    label="Input Device"
                                                    icon={<Mic size={16} />}
                                                    value={selectedInputDeviceId}
                                                    options={inputDevices}
                                                    placeholder={audioDevicesLoading ? 'Loading microphones...' : 'Default Microphone'}
                                                    onChange={handleInputDeviceSelect}
                                                />
                                                <div>
                                                    <div className="flex justify-between text-xs text-text-secondary mb-2 px-1">
                                                        <span>Input Level</span>
                                                    </div>
                                                    <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 transition-all duration-100 ease-out"
                                                            style={{ width: `${micLevel}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="h-px bg-border-subtle my-2" />

                                                <LauncherAudioSelect
                                                    label="Output Device"
                                                    icon={<Speaker size={16} />}
                                                    value={selectedOutputDeviceId}
                                                    options={outputDevices}
                                                    placeholder={audioDevicesLoading ? 'Loading speakers...' : 'Default Speakers'}
                                                    onChange={handleOutputDeviceSelect}
                                                />
                                                <div>
                                                    <div className="flex justify-between text-xs text-text-secondary mb-2 px-1">
                                                        <span>System Audio Level</span>
                                                    </div>
                                                    <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-accent-primary transition-all duration-100 ease-out"
                                                            style={{ width: `${systemAudioLevel}%` }}
                                                        />
                                                    </div>
                                                    {systemAudioError && (
                                                        <p className="mt-2 text-xs text-red-400 leading-snug">{systemAudioError}</p>
                                                    )}
                                                </div>

                                                {audioDevicesError && (
                                                    <p className="text-[11px] leading-relaxed text-red-400">{audioDevicesError}</p>
                                                )}
                                            </div>
                                        </section>

                                        <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                            <div className={`rounded-xl p-4 border border-border-subtle flex items-center justify-between gap-3 transition-all ${isLight ? 'bg-bg-card' : 'bg-bg-item-surface'} ${!isDetectable ? 'shadow-lg shadow-[0_0_24px_rgba(249,115,22,0.12)]' : ''}`}>
                                                <div className="min-w-0 flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Ghost size={16} className="shrink-0 text-text-primary" />
                                                        <h3 className="text-[14px] font-bold text-text-primary">
                                                            {isDetectable ? 'Detectable' : 'Undetectable'}
                                                        </h3>
                                                    </div>
                                                    <p className="text-[11px] leading-relaxed text-text-secondary">
                                                        AnswerFlow is currently {isDetectable ? 'detectable' : 'undetectable'} by screen sharing.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={!isDetectable}
                                                    aria-label={isDetectable ? 'Turn on undetectable mode' : 'Turn off undetectable mode'}
                                                    onClick={toggleDetectable}
                                                    className={`w-11 h-6 rounded-full relative shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${!isDetectable ? 'bg-accent-primary' : 'bg-bg-toggle-switch border border-border-muted'}`}
                                                >
                                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${!isDetectable ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </section>

                                        {ollamaPullStatus !== 'idle' && (
                                            <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                                <div className="flex items-center gap-2">
                                                    {ollamaPullStatus === 'downloading' ? (
                                                        <DownloadCloud size={14} className="text-accent-primary animate-pulse shrink-0" />
                                                    ) : ollamaPullStatus === 'complete' ? (
                                                        <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                                    ) : (
                                                        <AlertCircle size={14} className="text-red-400 shrink-0" />
                                                    )}
                                                    <span className="text-[12px] font-medium text-text-secondary truncate">
                                                        {ollamaPullStatus === 'downloading' ? `Setting up AI memory... ${ollamaPullPercent}%` : ollamaPullMessage}
                                                    </span>
                                                </div>
                                                {ollamaPullStatus === 'downloading' && (
                                                    <div className="w-full h-[3px] bg-white/10 rounded-full mt-2 overflow-hidden">
                                                        <div className="h-full bg-accent-primary rounded-full transition-all duration-300" style={{ width: `${ollamaPullPercent}%` }} />
                                                    </div>
                                                )}
                                            </section>
                                        )}
                                    </div>
                                </aside>
                            </div>
                    </motion.div>
                )}
            </div>



            {/* Notification Toast - Liquid Glass (macOS 26 Tahoe Concept) */}
            <AnimatePresence>
                {showNotification && (
                    <motion.div
                        initial={{ x: 300, opacity: 0, scale: 0.9 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: 300, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30, mass: 1 }}
                        className={`fixed bottom-10 right-10 z-[2000] flex items-center gap-4 pl-4 pr-6 py-3.5 rounded-[18px] backdrop-blur-xl saturate-[180%] ring-1 ring-black/10 ${isLight ? 'bg-bg-elevated/90 border border-border-muted shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]' : 'bg-[#2A2A2E]/40 border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(255,255,255,0.05)]'}`}
                    >
                        {/* Liquid Icon Orb */}
                        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-b from-orange-400/20 to-orange-600/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/5">
                            <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-md" />
                            <RefreshCw size={15} className="text-orange-300 animate-[spin_2s_linear_infinite] drop-shadow-[0_0_5px_rgba(249,115,22,0.6)]" />
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] font-semibold text-text-primary leading-none tracking-tight">Refreshed</span>
                            <span className="text-[11px] text-text-tertiary font-medium leading-none tracking-wide">Controls updated</span>
                        </div>

                        {/* Specular Highlight Overlay */}
                        <div className="absolute inset-0 rounded-[18px] bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
                    </motion.div>
                )}
            </AnimatePresence>

            <DocumentDetailsModal
                isLight={isLight}
                document={docDetailsTarget}
                isSaving={isSavingDocDetails}
                error={docDetailsError}
                onClose={cancelDocDetails}
                onSave={saveDocDetails}
            />

            <HelpAssistant />

            {/* Global Chat Overlay */}
            <GlobalChatOverlay
                isOpen={isGlobalChatOpen}
                onClose={() => {
                    setIsGlobalChatOpen(false);
                    setSubmittedGlobalQuery('');
                }}
                initialQuery={submittedGlobalQuery}
            />
        </div >
    );
};

export default Launcher;
