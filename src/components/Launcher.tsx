import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ToggleLeft, ToggleRight, Search, Calendar, ArrowRight, ArrowLeft, MoreHorizontal, Globe, Clock, ChevronRight, Settings, LayoutGrid, RefreshCw, Eye, EyeOff, Ghost, Plus, Mail, Link as LinkIcon, ChevronDown, Trash2, Bell, Check, Download, DownloadCloud, CheckCircle, AlertCircle, User, UserSearch, Sparkles, ArrowUpRight, ArrowUp, Brain, Mic, ShieldCheck } from 'lucide-react';
import { generateMeetingPDF } from '../utils/pdfGenerator';
import icon from "./icon.png";
import ConnectCalendarButton from './ui/ConnectCalendarButton';
import TopSearchPill from './TopSearchPill';
import GlobalChatOverlay from './GlobalChatOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../lib/analytics/analytics.service'; // Added analytics import
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { useStreamBuffer } from '../hooks/useStreamBuffer';
import { isMac } from '../utils/platformUtils';
import WindowControls from './WindowControls';
import { SHOW_PROMOTIONAL_SURFACES } from '../lib/promoSurfaceFlags';
import { genMessageId } from '../utils/messageId';

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
    active?: boolean; // UI state
    time?: string; // Optional for compatibility
}

interface LauncherProps {
    onStartMeeting: () => void;
    onOpenSettings: (tab?: string) => void;
    onOpenProfile?: () => void;
    onOpenModes?: () => void;
    onPageChange?: (isMain: boolean) => void;
    ollamaPullStatus?: 'idle' | 'downloading' | 'complete' | 'failed';
    ollamaPullPercent?: number;
    ollamaPullMessage?: string;
}

type PermissionValue = 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
type ReadinessStatus = 'ready' | 'warning' | 'missing';

interface SessionReadiness {
    aiProvider: string;
    aiModel: string;
    aiReady: boolean;
    sttProvider: string;
    sttReady: boolean;
    sttHint: string;
    audioReady: boolean;
    micPermission: PermissionValue;
    screenPermission: PermissionValue;
    calendarEmail?: string;
    loading: boolean;
}

const INITIAL_READINESS: SessionReadiness = {
    aiProvider: 'AI',
    aiModel: 'Checking...',
    aiReady: false,
    sttProvider: 'Speech',
    sttReady: false,
    sttHint: 'Checking...',
    audioReady: false,
    micPermission: 'unknown',
    screenPermission: 'unknown',
    loading: true,
};

const providerLabels: Record<string, string> = {
    ollama: 'Ollama',
    gemini: 'Gemini',
    custom: 'Custom',
    'codex-cli': 'Codex CLI',
    natively: 'Natively API',
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
    natively: 'Natively API',
};

const inferProviderLabel = (provider: string | undefined, model: string | undefined) => {
    const modelId = (model || '').toLowerCase();
    if (modelId === 'natively') return 'Natively API';
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

const hasConfiguredStt = (creds: any) => {
    const provider = creds?.sttProvider || 'none';
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
        const systemPrompt = `You are answering questions about one selected meeting. Use only the meeting content below. Keep answers concise and clear. If the answer is not present in the meeting content, say that it is not in this session.\n\n${context}`;

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
            updateAssistant(assistantMessageId, finalContent || 'I could not find enough context in this session.', false);
            setState('idle');
            resetStreamBuffer();
            tokenCleanup?.();
            doneCleanup?.();
            errorCleanup?.();
        });

        errorCleanup = window.electronAPI?.onGeminiStreamError((error: string) => {
            console.error('[LauncherMeetingChat] fallback stream error:', error);
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            setErrorMessage("Couldn't answer from this session. Check your model settings and try again.");
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
                updateAssistant(assistantMessageId, finalContent || 'I could not find enough context in this session.', false);
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
                setErrorMessage("Couldn't answer from this session. Try again.");
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
            setErrorMessage("Couldn't answer from this session. Try again.");
            setState('error');
            resetStreamBuffer();
        }
    }, [appendToken, draft, fallbackToContextChat, getBufferedContent, meeting.id, resetStreamBuffer, state, updateAssistant]);

    const busy = state === 'waiting' || state === 'streaming';

    return (
        <div className={`shrink-0 border-t border-border-subtle px-5 py-4 ${isLight ? 'bg-bg-secondary' : 'bg-[#101011]'}`}>
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

            <div className={`session-chat-composer rounded-2xl border shadow-sm transition-colors ${isLight ? 'bg-white border-border-muted focus-within:border-border-muted' : 'bg-[#2B2B2D] border-white/8 focus-within:border-white/15'} overflow-hidden`}>
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
                    placeholder="Ask about this session"
                    className="block w-full resize-none bg-transparent outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 px-4 pt-3 pb-1 text-[14px] leading-5 text-text-primary placeholder:text-text-tertiary max-h-28"
                />
                <div className="h-10 px-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                        <Sparkles size={13} className="text-blue-500" />
                        <span>{busy ? 'Thinking' : 'Uses selected transcript'}</span>
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

const TranscriptTimeline: React.FC<TranscriptTimelineProps> = ({ meeting, isLight }) => {
    const items = buildTranscriptTimeline(meeting);
    const isFinalizing = meeting.title === 'Processing...';
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
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">AI</span>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
                {items.length === 0 ? (
                    <div className="h-full flex items-center justify-center px-8 text-center">
                        <div>
                            <Mic size={24} className="mx-auto text-text-tertiary mb-3" />
                            <p className="text-[14px] font-medium text-text-primary">No transcript saved</p>
                            <p className="mt-1 text-[12px] text-text-tertiary">No speech or AI response history was saved for this session.</p>
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
                                    ? 'bg-blue-50 border-blue-100 text-slate-900'
                                    : 'bg-blue-500/10 border-blue-400/20 text-blue-50'
                                : isMe
                                    ? isLight
                                        ? 'bg-emerald-50 border-emerald-100 text-slate-900'
                                        : 'bg-emerald-500/10 border-emerald-400/20 text-emerald-50'
                                    : isLight
                                        ? 'bg-bg-elevated border-border-subtle text-text-primary'
                                        : 'bg-bg-secondary border-border-subtle text-text-primary';
                            const badgeTone = isAi
                                ? 'text-blue-500'
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

const Launcher: React.FC<LauncherProps> = ({ onStartMeeting, onOpenSettings, onOpenProfile, onOpenModes, onPageChange, ollamaPullStatus = 'idle', ollamaPullPercent = 0, ollamaPullMessage = '' }) => {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isDetectable, setIsDetectable] = useState(false);
    const [isMeetingActive, setIsMeetingActive] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [isCalendarConnected, setIsCalendarConnected] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [readiness, setReadiness] = useState<SessionReadiness>(INITIAL_READINESS);

    // Global search state (for AI chat overlay)
    const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
    const [submittedGlobalQuery, setSubmittedGlobalQuery] = useState('');

    const [showModesOnboarding, setShowModesOnboarding] = useState(false);
    const [showProfileOnboarding, setShowProfileOnboarding] = useState(false);

    const fetchMeetings = () => {
        if (window.electronAPI && window.electronAPI.getRecentMeetings) {
            window.electronAPI.getRecentMeetings().then(setMeetings).catch(err => console.error("Failed to fetch meetings:", err));
        }
    };

    const fetchEvents = () => {
        if (window.electronAPI && window.electronAPI.getUpcomingEvents) {
            window.electronAPI.getUpcomingEvents().then(setUpcomingEvents).catch(err => console.error("Failed to fetch events:", err));
        }
    }

    const refreshReadiness = async () => {
        if (!window.electronAPI) return;

        setReadiness(prev => ({ ...prev, loading: true }));

        const [
            llmResult,
            credsResult,
            audioResult,
            permissionsResult,
            calendarResult,
        ] = await Promise.allSettled([
            window.electronAPI.getCurrentLlmConfig?.(),
            window.electronAPI.getStoredCredentials?.(),
            window.electronAPI.getNativeAudioStatus?.(),
            window.electronAPI.checkPermissions?.(),
            window.electronAPI.getCalendarStatus?.(),
        ]);

        const llm = (llmResult.status === 'fulfilled' ? llmResult.value : null) as any;
        const creds = (credsResult.status === 'fulfilled' ? credsResult.value : null) as any;
        const audio = (audioResult.status === 'fulfilled' ? audioResult.value : null) as any;
        const permissions = (permissionsResult.status === 'fulfilled' ? permissionsResult.value : null) as any;
        const calendarStatus = (calendarResult.status === 'fulfilled' ? calendarResult.value : null) as any;
        const sttProvider = creds?.sttProvider || 'none';
        const sttReady = hasConfiguredStt(creds);
        const calendarConnected = !!calendarStatus?.connected;

        setIsCalendarConnected(calendarConnected);
        setReadiness({
            aiProvider: inferProviderLabel(llm?.provider, llm?.model),
            aiModel: llm?.model || 'Choose a model',
            aiReady: hasConfiguredAi(llm?.provider, llm?.model, creds),
            sttProvider: sttProviderLabels[sttProvider] || sttProvider,
            sttReady,
            sttHint: sttProvider === 'none' ? 'Choose provider' : sttReady ? 'Configured' : 'Add credentials',
            audioReady: audio?.connected !== false,
            micPermission: (permissions?.microphone || 'unknown') as PermissionValue,
            screenPermission: (permissions?.screen || 'unknown') as PermissionValue,
            calendarEmail: calendarStatus?.email,
            loading: false,
        });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        analytics.trackCommandExecuted('refresh_calendar');
        try {
            if (window.electronAPI && window.electronAPI.calendarRefresh) {
                setShowNotification(true);
                await window.electronAPI.calendarRefresh();
                fetchEvents();
                fetchMeetings();
                refreshReadiness();
                setTimeout(() => {
                    setShowNotification(false);
                }, 3000);
            } else {
                console.warn("electronAPI.calendarRefresh not found");
            }
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

        if (SHOW_PROMOTIONAL_SURFACES) {
            const hasSeenModesOnboarding = localStorage.getItem('natively_seen_modes_onboarding_v5');
            if (!hasSeenModesOnboarding) {
                setTimeout(() => {
                    if (mounted) setShowModesOnboarding(true);
                }, 8000);
            }

            const hasSeenProfileOnboarding = localStorage.getItem('natively_seen_profile_onboarding_v1');
            if (!hasSeenProfileOnboarding && hasSeenModesOnboarding) {
                setTimeout(() => {
                    if (mounted) setShowProfileOnboarding(true);
                }, 9000);
            } else if (!hasSeenProfileOnboarding && !hasSeenModesOnboarding) {
                 setTimeout(() => {
                    if (mounted) setShowProfileOnboarding(true);
                }, 18000);
            }
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
        fetchEvents();
        refreshReadiness();

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
                setIsMeetingActive(isActive);
            });
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
        const removeMeetingsListener = window.electronAPI.onMeetingsUpdated(() => {
            console.log("Received meetings-updated event");
            fetchMeetings();
        });

        // Simple polling for events every minute
        const interval = setInterval(fetchEvents, 60000);

        return () => {
            mounted = false;
            if (removeMeetingsListener) removeMeetingsListener();
            if (removeUndetectableListener) removeUndetectableListener();
            if (removeMeetingStateListener) removeMeetingStateListener();
            if (removeModelListener) removeModelListener();
            if (removeCredentialsListener) removeCredentialsListener();
            if (removeSttConfigListener) removeSttConfigListener();
            clearInterval(interval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount-only: stable setup that must run exactly once

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

    // Upcoming meetings (in-progress up to 5 min ago, or any future event in the API's 7-day
    // window), sorted soonest-first. Cap at 3 for the right-side calendar card peek stack.
    const upcomingMeetings = upcomingEvents
        .filter(e => new Date(e.startTime).getTime() - Date.now() > -5 * 60000)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const visibleMeetings = upcomingMeetings.slice(0, 3);
    const nextMeeting = visibleMeetings[0];
    const moreMeetingsCount = Math.max(0, upcomingMeetings.length - visibleMeetings.length);

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
                    setSelectedMeeting(fullMeeting);
                    return;
                }
            } catch (err) {
                console.error("[Launcher] Failed to fetch meeting details:", err);
            }
        } else {
            console.warn("[Launcher] getMeetingDetails not available on electronAPI");
        }
        // Fallback to list-view data if fetch fails
        setSelectedMeeting(meeting);
    };

    const handleBack = () => {
        setForwardMeeting(selectedMeeting);
        setSelectedMeeting(null);
    };

    const handleForward = () => {
        if (forwardMeeting) {
            setSelectedMeeting(forwardMeeting);
            setForwardMeeting(null);
        }
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
    const readinessSummary = readiness.loading
        ? 'Checking setup'
        : missingReadinessCount > 0
            ? `${missingReadinessCount} setup item${missingReadinessCount === 1 ? '' : 's'} need attention`
            : warningReadinessCount > 0
                ? 'Ready with notes'
                : 'Ready for session';

    return (
        <div className="h-full w-full flex flex-col bg-bg-primary text-text-primary font-sans overflow-hidden selection:bg-accent-secondary/30">
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
                    <div className="relative group/profile-btn select-none">
                        <button
                            onClick={() => {
                                setShowProfileOnboarding(false);
                                localStorage.setItem('natively_seen_profile_onboarding_v1', 'true');
                                onOpenProfile?.();
                            }}
                            title="Profile Intelligence"
                            className={`p-2 text-text-secondary hover:text-text-primary transition-all duration-300 ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                        >
                            <UserSearch size={18} />
                        </button>
                        
                        <AnimatePresence>
                            {SHOW_PROMOTIONAL_SURFACES && showProfileOnboarding && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.96, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -2, scale: 0.98, filter: "blur(2px)", transition: { duration: 0.15, ease: "easeOut" } }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
                                    className={`absolute top-[38px] right-2 w-[270px] rounded-[20px] p-4 z-[300] origin-top-right backdrop-blur-[40px] saturate-[180%] transform-gpu ${
                                        isLight 
                                        ? 'bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]' 
                                        : 'bg-[#18181A]/70 shadow-[0_8px_30px_rgb(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]'
                                    }`}
                                >
                                    {/* Triangle Pointer */}
                                    <div className={`absolute -top-[5px] right-[14px] w-2.5 h-2.5 rotate-45 rounded-tl-[3px] ${
                                        isLight 
                                        ? 'bg-white/70 border-t border-l border-black/5 backdrop-blur-[40px]' 
                                        : 'bg-[#18181A]/70 border-t border-l border-white/5 backdrop-blur-[40px]'
                                    }`} />
                                    
                                    <div className="relative flex gap-3">
                                        <div className={`w-9 h-9 flex items-center justify-center shrink-0 rounded-full ${
                                            isLight
                                            ? 'bg-blue-500 bg-opacity-10 text-blue-500'
                                            : 'bg-blue-500 bg-opacity-15 text-blue-400'
                                        }`}>
                                            <UserSearch size={18} />
                                        </div>
                                        <div className="flex-1 pt-[2px]">
                                            <h3 className="text-[14px] font-semibold tracking-[-0.015em] mb-1 flex items-center gap-2">
                                                <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>Profile Intel</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-[1px] rounded-[5px] ${
                                                    isLight
                                                    ? 'bg-blue-50 text-blue-600 border border-blue-100/50'
                                                    : 'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                    Beta
                                                </span>
                                            </h3>
                                            <p className={`text-[12px] leading-[1.35] mb-3.5 tracking-[-0.01em] ${
                                                isLight ? 'text-slate-500' : 'text-slate-400'
                                            }`}>
                                                Manage your persona, career history, and active job description.
                                            </p>
                                            <div className="flex justify-end gap-1.5 isolate">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setShowProfileOnboarding(false); 
                                                        localStorage.setItem('natively_seen_profile_onboarding_v1', 'true'); 
                                                    }}
                                                    className={`text-[12px] font-medium px-3.5 py-[6px] rounded-full transition-all active:scale-95 ${
                                                        isLight
                                                        ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                                                    }`}
                                                >
                                                    Dismiss
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        onOpenProfile?.(); 
                                                        setShowProfileOnboarding(false); 
                                                        localStorage.setItem('natively_seen_profile_onboarding_v1', 'true'); 
                                                    }}
                                                    className={`text-[12px] font-medium px-4 py-[6px] rounded-full transition-all active:scale-95 shadow-sm ${
                                                        isLight
                                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                        : 'bg-slate-100 text-slate-900 hover:bg-white'
                                                    }`}
                                                >
                                                    Try it out
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="relative group/modes-btn select-none">
                        <button
                            onClick={() => {
                                setShowModesOnboarding(false);
                                localStorage.setItem('natively_seen_modes_onboarding_v5', 'true');
                                onOpenModes?.();
                            }}
                            title="Modes"
                            className={`p-2 text-text-secondary hover:text-text-primary transition-all duration-300 ${isLight ? 'hover:drop-shadow-[0_0_6px_rgba(0,0,0,0.25)]' : 'hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                        >
                            <svg width={18} height={18} viewBox="0 0 14 14" fill="none">
                                <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.35"/>
                            </svg>
                        </button>
                        
                        <AnimatePresence>
                            {SHOW_PROMOTIONAL_SURFACES && showModesOnboarding && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.96, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -2, scale: 0.98, filter: "blur(2px)", transition: { duration: 0.15, ease: "easeOut" } }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
                                    className={`absolute top-[38px] right-2 w-[270px] rounded-[20px] p-4 z-[300] origin-top-right backdrop-blur-[40px] saturate-[180%] transform-gpu ${
                                        isLight 
                                        ? 'bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]' 
                                        : 'bg-[#18181A]/70 shadow-[0_8px_30px_rgb(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]'
                                    }`}
                                >
                                    {/* Triangle Pointer */}
                                    <div className={`absolute -top-[5px] right-[14px] w-2.5 h-2.5 rotate-45 rounded-tl-[3px] ${
                                        isLight 
                                        ? 'bg-white/70 border-t border-l border-black/5 backdrop-blur-[40px]' 
                                        : 'bg-[#18181A]/70 border-t border-l border-white/5 backdrop-blur-[40px]'
                                    }`} />
                                    
                                    <div className="relative flex gap-3">
                                        <div className={`w-9 h-9 flex items-center justify-center shrink-0 rounded-full ${
                                            isLight
                                            ? 'bg-orange-500 bg-opacity-10 text-orange-500'
                                            : 'bg-orange-500 bg-opacity-15 text-orange-400'
                                        }`}>
                                            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                                                <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                                <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                                <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                                <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.4"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1 pt-[2px]">
                                            <h3 className="text-[14px] font-semibold tracking-[-0.015em] mb-1 flex items-center gap-2">
                                                <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>Modes</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-[1px] rounded-[5px] ${
                                                    isLight
                                                    ? 'bg-orange-50 text-orange-600 border border-orange-100/50'
                                                    : 'bg-orange-500/10 text-orange-400'
                                                }`}>
                                                    Beta
                                                </span>
                                            </h3>
                                            <p className={`text-[12px] leading-[1.35] mb-3.5 tracking-[-0.01em] ${
                                                isLight ? 'text-slate-500' : 'text-slate-400'
                                            }`}>
                                                Custom instructions and formulas designed for different meeting contexts.
                                            </p>
                                            <div className="flex justify-end gap-1.5 isolate">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setShowModesOnboarding(false); 
                                                        localStorage.setItem('natively_seen_modes_onboarding_v5', 'true'); 
                                                    }}
                                                    className={`text-[12px] font-medium px-3.5 py-[6px] rounded-full transition-all active:scale-95 ${
                                                        isLight
                                                        ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                                                    }`}
                                                >
                                                    Dismiss
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        onOpenModes?.(); 
                                                        setShowModesOnboarding(false); 
                                                        localStorage.setItem('natively_seen_modes_onboarding_v5', 'true'); 
                                                    }}
                                                    className={`text-[12px] font-medium px-4 py-[6px] rounded-full transition-all active:scale-95 shadow-sm ${
                                                        isLight
                                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                        : 'bg-slate-100 text-slate-900 hover:bg-white'
                                                    }`}
                                                >
                                                    Try it out
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                <motion.div
                    key="launcher"
                    className="flex-1 flex flex-col overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >

                            <div className={`h-full min-h-0 grid grid-cols-[260px_minmax(0,1fr)_300px] ${isLight ? 'bg-bg-primary' : 'bg-[#101011]'}`}>
                                <aside className={`min-h-0 border-r border-border-subtle flex flex-col ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
                                    <div className="h-[54px] px-4 flex items-center justify-between border-b border-border-subtle">
                                        <div>
                                            <h2 className="text-[13px] font-semibold text-text-primary">Sessions</h2>
                                            <p className="text-[11px] text-text-tertiary">{meetings.length} saved</p>
                                        </div>
                                        <button
                                            onClick={handleRefresh}
                                            disabled={isRefreshing}
                                            title="Refresh sessions"
                                            className={`h-8 w-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                        >
                                            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 py-3">
                                        {sortedGroups.map((label) => (
                                            <section key={label} className="mb-4">
                                                <h3 className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</h3>
                                                <div className="space-y-1">
                                                    {groupedMeetings[label].map((m) => (
                                                        <motion.div
                                                            key={m.id}
                                                            layoutId={`meeting-${m.id}`}
                                                            className={`group relative px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                                                                selectedMeeting?.id === m.id
                                                                    ? isLight
                                                                        ? 'bg-bg-elevated shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]'
                                                                        : 'bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                                                                    : isLight
                                                                        ? 'hover:bg-bg-elevated'
                                                                        : 'hover:bg-white/6'
                                                            }`}
                                                            onClick={() => handleOpenMeeting(m)}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className={`min-w-0 flex-1 truncate text-[13px] font-medium ${m.title === 'Processing...' ? 'text-blue-400 italic animate-pulse' : 'text-text-primary'}`}>
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
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-[11px] text-text-tertiary">
                                                                {m.title === 'Processing...' ? (
                                                                    <>
                                                                        <RefreshCw size={11} className="animate-spin text-blue-500" />
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
                                                                        className={`absolute right-2 top-8 w-[96px] backdrop-blur-xl rounded-lg shadow-2xl z-50 overflow-hidden border ${isLight ? 'bg-bg-elevated border-border-muted shadow-[0_8px_24px_rgba(0,0,0,0.12)]' : 'bg-[#1E1E1E]/90 border-white/10'}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onMouseEnter={() => setMenuEntered(true)}
                                                                        onMouseLeave={() => {
                                                                            if (menuEntered) setActiveMenuId(null);
                                                                        }}
                                                                    >
                                                                        <div className="p-1 flex flex-col gap-0.5">
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
                                                    ))}
                                                </div>
                                            </section>
                                        ))}
                                        {meetings.length === 0 && (
                                            <div className="px-3 py-8 text-center text-[13px] text-text-tertiary">No recent meetings.</div>
                                        )}
                                    </div>
                                </aside>

                                <main className="min-h-0 flex flex-col">
                                    <div className="h-[54px] px-5 flex items-center justify-between border-b border-border-subtle">
	                                        <div className="min-w-0">
	                                            <h1 className="text-[15px] font-semibold text-text-primary truncate">
                                                    {selectedMeeting ? selectedMeeting.title : 'Current session'}
                                                </h1>
	                                            <p className="text-[11px] text-text-tertiary truncate">
                                                    {selectedMeeting
                                                        ? `${new Date(selectedMeeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${formatDurationPill(selectedMeeting.duration)}`
                                                        : readinessSummary}
                                                </p>
	                                        </div>
	                                        <div className="flex items-center gap-2">
                                                {selectedMeeting ? (
                                                    <button
                                                        onClick={handleBack}
                                                        className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                    >
                                                        Clear
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => onOpenProfile?.()}
                                                            className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                        >
                                                            <UserSearch size={14} />
                                                            Profile
                                                        </button>
                                                        <button
                                                            onClick={() => onOpenModes?.()}
                                                            className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                        >
                                                            <LayoutGrid size={14} />
                                                            Modes
                                                        </button>
                                                    </>
                                                )}
	                                        </div>
	                                    </div>
	                                    <div className={`flex-1 min-h-0 ${selectedMeeting ? 'overflow-hidden' : 'p-5 overflow-y-auto custom-scrollbar'}`}>
                                        {selectedMeeting ? (
                                            <TranscriptTimeline
                                                key={selectedMeeting.id}
                                                meeting={selectedMeeting}
                                                isLight={isLight}
                                            />
                                        ) : (
                                            <div className={`h-full min-h-[360px] rounded-lg border border-border-subtle ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'} flex flex-col`}>
                                                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                                                    <div className={`mb-5 h-12 w-12 rounded-xl flex items-center justify-center ${isMeetingActive ? 'bg-emerald-500/12 text-emerald-400' : 'bg-blue-500/12 text-blue-400'}`}>
                                                        {isMeetingActive ? <Clock size={22} /> : <img src={icon} alt="" className="w-6 h-6 object-contain" />}
                                                    </div>
                                                    <h2 className="text-[24px] font-semibold tracking-tight text-text-primary">
                                                        {isMeetingActive ? 'Meeting is live' : 'Ready to start'}
                                                    </h2>
                                                    <p className="mt-2 max-w-[430px] text-[13px] leading-relaxed text-text-secondary">
                                                        {isMeetingActive
                                                            ? 'Return to the overlay to follow the transcript, ask for answers, and capture screen context.'
                                                            : 'Start a session when your audio, model, and permissions look right in the context panel.'}
                                                    </p>
                                                    <motion.button
                                                        onClick={() => {
                                                            if (isMeetingActive) {
                                                                window.electronAPI?.setWindowMode?.('overlay', true);
                                                                analytics.trackCommandExecuted('resume_meeting_from_launcher');
                                                            } else {
                                                                onStartMeeting();
                                                                analytics.trackCommandExecuted('start_natively_cta');
                                                            }
                                                        }}
                                                        whileHover={{ scale: 1.01 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        className={`mt-7 h-12 px-6 rounded-lg inline-flex items-center gap-2 text-[14px] font-semibold text-white shadow-sm ${
                                                            isMeetingActive
                                                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                                                : 'bg-blue-600 hover:bg-blue-500'
                                                        } transition-colors`}
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
                                                                Start Natively
                                                            </>
                                                        )}
                                                    </motion.button>
                                                </div>

                                                <div className="border-t border-border-subtle px-5 py-4 grid grid-cols-3 gap-3">
                                                    <div className={`rounded-md border border-border-subtle px-3 py-2 ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'}`}>
                                                        <p className="text-[10px] uppercase tracking-wide font-semibold text-text-tertiary">AI</p>
                                                        <p className="mt-1 text-[12px] font-medium text-text-primary truncate">{readiness.aiProvider} · {readiness.aiModel}</p>
                                                    </div>
                                                    <div className={`rounded-md border border-border-subtle px-3 py-2 ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'}`}>
                                                        <p className="text-[10px] uppercase tracking-wide font-semibold text-text-tertiary">Speech</p>
                                                        <p className="mt-1 text-[12px] font-medium text-text-primary truncate">{readiness.sttProvider}</p>
                                                    </div>
                                                    <div className={`rounded-md border border-border-subtle px-3 py-2 ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'}`}>
                                                        <p className="text-[10px] uppercase tracking-wide font-semibold text-text-tertiary">Window</p>
                                                        <p className="mt-1 text-[12px] font-medium text-text-primary truncate">{isDetectable ? 'Detectable' : 'Undetectable'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </main>

                                <aside className={`min-h-0 border-l border-border-subtle flex flex-col ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
                                    <div className="h-[54px] px-4 flex items-center justify-between border-b border-border-subtle">
                                        <div>
                                            <h2 className="text-[13px] font-semibold text-text-primary">Context</h2>
                                            <p className="text-[11px] text-text-tertiary">Session inputs</p>
                                        </div>
                                        <button
                                            onClick={refreshReadiness}
                                            title="Refresh context"
                                            className={`h-8 w-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                        >
                                            <RefreshCw size={15} className={readiness.loading ? 'animate-spin text-blue-400' : ''} />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                        <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-[12px] font-semibold text-text-primary">Readiness</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                    missingReadinessCount > 0
                                                        ? 'bg-amber-500/12 text-amber-500'
                                                        : 'bg-emerald-500/12 text-emerald-500'
                                                }`}>
                                                    {missingReadinessCount > 0 ? 'Needs setup' : 'Ready'}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {readinessRows.map((item) => {
                                                    const Icon = item.icon;
                                                    const isReady = item.status === 'ready';
                                                    const isWarning = item.status === 'warning';
                                                    return (
                                                        <div key={item.key} className="flex items-start gap-2.5 py-1.5">
                                                            <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${
                                                                isReady
                                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                                    : isWarning
                                                                        ? 'bg-sky-500/10 text-sky-500'
                                                                        : 'bg-amber-500/10 text-amber-500'
                                                            }`}>
                                                                <Icon size={14} strokeWidth={2.2} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-[11px] font-semibold text-text-secondary">{item.label}</p>
                                                                    <button
                                                                        onClick={() => onOpenSettings(item.tab)}
                                                                        title={`Open ${item.label} settings`}
                                                                        className={`h-5 w-5 shrink-0 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary ${isLight ? 'hover:bg-black/8' : 'hover:bg-white/10'}`}
                                                                    >
                                                                        <Settings size={11.5} strokeWidth={2.3} />
                                                                    </button>
                                                                </div>
                                                                <p className="mt-0.5 text-[12px] text-text-primary truncate">{item.value}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-[12px] font-semibold text-text-primary">Calendar</h3>
                                                {isCalendarConnected && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-semibold">
                                                        Linked
                                                    </span>
                                                )}
                                            </div>
                                            {isCalendarConnected ? (
                                                <div className="space-y-2">
                                                    {visibleMeetings.length > 0 ? (
                                                        visibleMeetings.map((event) => {
                                                            const start = new Date(event.startTime);
                                                            const time = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                                                            return (
                                                                <div key={event.id} className={`rounded-md px-2.5 py-2 ${isLight ? 'bg-bg-secondary' : 'bg-bg-primary'}`}>
                                                                    <p className="text-[12px] font-medium text-text-primary truncate">{event.title}</p>
                                                                    <p className="mt-0.5 text-[11px] text-text-tertiary">{time}</p>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <p className="text-[12px] text-text-tertiary">No upcoming events.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="text-[12px] text-text-secondary leading-relaxed">Link Google Calendar to see upcoming meetings beside your session controls.</p>
                                                    <ConnectCalendarButton
                                                        className="w-full justify-center"
                                                        onConnect={() => {
                                                            setIsCalendarConnected(true);
                                                            refreshReadiness();
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </section>

                                        <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                            <h3 className="text-[12px] font-semibold text-text-primary mb-2">Quick actions</h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => onOpenSettings('audio')} className={`h-8 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary ${isLight ? 'bg-bg-secondary hover:bg-black/8' : 'bg-bg-primary hover:bg-white/8'}`}>Audio</button>
                                                <button onClick={() => onOpenSettings('ai-providers')} className={`h-8 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary ${isLight ? 'bg-bg-secondary hover:bg-black/8' : 'bg-bg-primary hover:bg-white/8'}`}>Models</button>
                                                <button onClick={() => onOpenSettings('calendar')} className={`h-8 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary ${isLight ? 'bg-bg-secondary hover:bg-black/8' : 'bg-bg-primary hover:bg-white/8'}`}>Calendar</button>
                                                <button onClick={toggleDetectable} className={`h-8 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary ${isLight ? 'bg-bg-secondary hover:bg-black/8' : 'bg-bg-primary hover:bg-white/8'}`}>{isDetectable ? 'Hide' : 'Show'}</button>
                                            </div>
                                        </section>

                                        {ollamaPullStatus !== 'idle' && (
                                            <section className={`rounded-lg border border-border-subtle ${isLight ? 'bg-bg-elevated' : 'bg-bg-secondary'} p-3`}>
                                                <div className="flex items-center gap-2">
                                                    {ollamaPullStatus === 'downloading' ? (
                                                        <DownloadCloud size={14} className="text-blue-400 animate-pulse shrink-0" />
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
                                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${ollamaPullPercent}%` }} />
                                                    </div>
                                                )}
                                            </section>
                                        )}
                                    </div>
                                </aside>
                            </div>
                </motion.div>
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
                        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-b from-blue-400/20 to-blue-600/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/5">
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md" />
                            <RefreshCw size={15} className="text-blue-300 animate-[spin_2s_linear_infinite] drop-shadow-[0_0_5px_rgba(59,130,246,0.6)]" />
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] font-semibold text-text-primary leading-none tracking-tight">Refreshed</span>
                            <span className="text-[11px] text-text-tertiary font-medium leading-none tracking-wide">Synced with calendar</span>
                        </div>

                        {/* Specular Highlight Overlay */}
                        <div className="absolute inset-0 rounded-[18px] bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
                    </motion.div>
                )}
            </AnimatePresence>

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
