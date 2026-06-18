import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Command, Monitor, Mic, Settings, Zap, Key, User, Play, Image, ArrowUp, FileText, Sparkles, Search, ChevronUp, Copy,
    FileJson, MessageSquare, Briefcase, Eye, EyeOff, Ghost, ChevronDown, ChevronRight, HelpCircle, Upload, CheckCircle2,
    RefreshCw, Trash2, Check, ExternalLink, Volume2, Globe, Brain, Cpu, Calendar, Star, CreditCard, X, Pencil, Lightbulb,
    SlidersHorizontal, PointerOff, ArrowRight, LayoutGrid, Smartphone, Wifi, Lock
} from 'lucide-react';
import { SiOpenai, SiGoogle } from 'react-icons/si';
import { useShortcuts } from '../../hooks/useShortcuts';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { isMac, getModifierSymbol } from '../../utils/platformUtils';
import answerflowIcon from '../icon.png';

// ----------------------
// Animations & Mocks
// ----------------------

const CMD_SYMBOL = getModifierSymbol('cmd');
const MOCK_BUTTONS = [
    { icon: Pencil, label: 'What to answer?', kbd: `${CMD_SYMBOL}1`, color: 'blue' },
    { icon: MessageSquare, label: 'Clarify', kbd: `${CMD_SYMBOL}2`, color: 'indigo' },
    { icon: RefreshCw, label: 'Recap', kbd: `${CMD_SYMBOL}7`, color: 'amber' },
    { icon: HelpCircle, label: 'Follow Up Question', kbd: `${CMD_SYMBOL}4`, color: 'teal' },
    { icon: Zap, label: 'Answer', kbd: `${CMD_SYMBOL}5`, color: 'emerald' },
] as const;

const colorMap: Record<string, string> = {
    blue: 'bg-accent-secondary text-accent-primary border-border-subtle',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
    teal: 'bg-teal-500/10 text-teal-500 border-teal-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
};

const MockAppInterface = () => {
    const [activeBtn, setActiveBtn] = useState(0);
    const isLight = useResolvedTheme() === 'light';

    useEffect(() => {
        const id = setInterval(() => setActiveBtn(i => (i + 1) % MOCK_BUTTONS.length), 1600);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex flex-col items-center w-full max-w-[600px] mx-auto opacity-100 relative h-[380px] overflow-hidden">
            <div className="flex flex-col items-center w-[600px] transform scale-[0.8] origin-top absolute top-0 pt-2">
                {/* Top Pill Replica */}
                <div className="flex justify-center mb-2 select-none z-50">
                    <div className="flex items-center gap-2 rounded-full backdrop-blur-md pl-1.5 pr-1.5 py-1.5 bg-bg-item-surface border border-border-subtle shadow-sm">
                        {/* Logo Button */}
                        <div className="w-8 h-8 rounded-full bg-bg-item-active flex items-center justify-center border border-border-muted overflow-hidden">
                            <img
                                src={answerflowIcon}
                                alt="AnswerFlow"
                                className="w-[20px] h-[20px] object-contain"
                                style={{ filter: isLight ? 'brightness(0)' : 'brightness(0) invert(1)', opacity: 0.9 }}
                            />
                        </div>
                        {/* Center Segment */}
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg-item-surface text-text-primary text-[12px] font-medium border border-border-muted">
                            <ChevronUp className="w-3.5 h-3.5 opacity-70" />
                            <span className="tracking-wide opacity-80">Hide</span>
                        </div>
                        {/* Stop Button */}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-bg-item-active text-text-primary border border-border-muted">
                            <div className="w-3.5 h-3.5 rounded-[3px] bg-current opacity-80" />
                        </div>
                    </div>
                </div>

                {/* Main Window */}
                <div className="relative w-full backdrop-blur-[30px] border border-border-subtle rounded-[24px] overflow-hidden flex flex-col bg-bg-item-surface shadow-2xl">

                    {/* Rolling Transcript Bar — replica of RollingTranscript.tsx */}
                    <div className="relative w-[90%] mx-auto pt-2">
                        <div
                            className="overflow-hidden whitespace-nowrap text-right"
                            style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
                        >
                            <span className="text-text-secondary inline-flex items-center text-[13px] italic leading-7 opacity-60">
                                ...and I'd also consider a distributed cache layer for horizontal scaling
                                <span className="inline-flex items-center ml-2">
                                    <span className="w-1 h-1 bg-green-500/60 rounded-full animate-pulse" />
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Chat History */}
                    <div className="p-4 space-y-3 pb-2 flex-1 overflow-y-auto max-h-[220px]">
                        <div className="flex justify-start">
                            <div className="max-w-[85%] px-4 py-3 text-[14px] leading-relaxed font-normal text-text-primary">
                                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-medium uppercase tracking-wider text-text-secondary opacity-70">
                                    Interviewer
                                </div>
                                <span className="text-text-secondary italic">So how would you optimize the current algorithm?</span>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <div className="max-w-[72.25%] px-[13.6px] py-[10.2px] text-[14px] leading-relaxed whitespace-pre-wrap bg-accent-secondary border border-border-muted text-accent-primary rounded-[20px] rounded-tr-[4px] shadow-sm font-medium">
                                <span className="font-semibold text-emerald-500 block mb-1 text-[12px]">🎯 Answer</span>
                                A good approach would be to use a hash map to cache intermediate results and reduce time complexity to O(N).
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions — cycling highlight */}
                    <div className="flex flex-nowrap justify-center items-center gap-1.5 px-4 pb-3 pt-3 overflow-x-hidden">
                        {MOCK_BUTTONS.map((btn, idx) => {
                            const Icon = btn.icon;
                            const isActive = activeBtn === idx;
                            return (
                                <button key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-300 whitespace-nowrap shrink-0 ${isActive ? colorMap[btn.color] : 'bg-bg-item-surface text-text-primary border-border-subtle'}`}>
                                    <Icon className="w-3 h-3 opacity-70" /> {btn.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 pt-0">
                        <div className="relative">
                            <div className="w-full border border-border-subtle rounded-xl pl-3 pr-10 py-2.5 text-[13px] leading-relaxed bg-bg-input shadow-inner flex items-center h-[46px]">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-[13px] text-text-secondary opacity-60">
                                    <span className="hidden sm:inline">Ask anything on screen or conversation, or</span>
                                    <div className="flex items-center gap-1 opacity-80 sm:ml-0.5">
                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center bg-bg-item-surface border-border-subtle text-text-primary shadow-sm">{getModifierSymbol('cmd')}</kbd>
                                        <span className="text-[10px]">+</span>
                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center bg-bg-item-surface border-border-subtle text-text-primary shadow-sm">{getModifierSymbol('shift')}</kbd>
                                        <span className="text-[10px]">+</span>
                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center bg-bg-item-surface border-border-subtle text-text-primary shadow-sm">H</kbd>
                                    </div>
                                    <span className="hidden sm:inline">for selective screenshot</span>
                                </div>
                            </div>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-20 text-text-primary">
                                <span className="text-[10px]">↵</span>
                            </div>
                        </div>
                        {/* Bottom Row */}
                        <div className="flex items-center justify-between mt-3 px-0.5">
                            <div className="flex items-center gap-1.5">
                                <button className="flex items-center gap-2 px-3 py-1.5 border border-border-subtle rounded-lg bg-bg-item-surface text-text-primary text-xs font-medium w-[140px] shadow-sm">
                                    <span className="truncate min-w-0 flex-1 text-left">Gemini 3.1 Flash</span>
                                    <ChevronDown size={14} className="shrink-0 opacity-70" />
                                </button>
                                <div className="h-3 w-px bg-border-subtle mx-1" />
                                <button className="w-8 h-8 flex items-center justify-center border border-border-subtle rounded-lg bg-bg-item-surface text-text-primary shadow-sm">
                                    <SlidersHorizontal size={14} className="opacity-70" />
                                </button>
                                <div className="h-3 w-px bg-border-subtle mx-1" />
                                <button className="w-8 h-8 flex items-center justify-center border border-border-subtle rounded-lg bg-bg-item-surface text-text-primary shadow-sm">
                                    <PointerOff size={14} className="opacity-70" />
                                </button>
                            </div>
                            <button className="w-7 h-7 rounded-full flex items-center justify-center bg-bg-item-surface border border-border-subtle shadow-sm text-text-secondary">
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MockMeetingInterfaceAnim = () => {
    const [tab, setTab] = useState('summary');

    useEffect(() => {
        const tabs = ['summary', 'transcript', 'usage'];
        let i = 0;
        const interval = setInterval(() => { i = (i + 1) % tabs.length; setTab(tabs[i]); }, 3500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full aspect-[3/2] bg-bg-secondary rounded-[20px] border border-border-subtle overflow-hidden flex flex-col relative shadow-lg select-none pointer-events-none">

            {/* Header */}
            <div className="px-6 pt-5 pb-0 shrink-0">
                <div className="text-xs text-text-tertiary font-medium mb-0.5">Today · 47 min</div>
                <h1 className="text-xl font-bold text-text-primary tracking-tight">System Design Interview</h1>
            </div>

            {/* Tabs row */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3 shrink-0">
                <div className="p-1 rounded-xl inline-flex items-center gap-0.5 bg-bg-input border border-border-subtle">
                    {['summary', 'transcript', 'usage'].map((t) => (
                        <button key={t} className={`relative px-3 py-1 text-[12px] font-medium rounded-lg z-10 transition-colors ${tab === t ? 'text-text-primary bg-bg-elevated shadow-sm border border-border-subtle' : 'text-text-tertiary'}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary opacity-70">
                    <Copy size={12} /> Copy full {tab}
                </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden px-6 pb-14">
                <AnimatePresence mode="wait">
                    {tab === 'summary' && (
                        <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            {/* Overview — plain paragraph + border-b, matches MeetingDetails prose block */}
                            <div className="mb-5 pb-5 border-b border-border-subtle">
                                <p className="text-sm text-text-secondary leading-relaxed">Discussed microservice architecture for the new payment gateway. Analyzed Redis vs Memcached for caching with a focus on data persistence to prevent race conditions during checkout.</p>
                            </div>
                            {/* Action Items — h2 heading + dot-bullet list, matches MeetingDetails exactly */}
                            <section className="mb-6">
                                <h2 className="text-base font-semibold text-text-primary mb-3">Action Items</h2>
                                <ul className="space-y-3">
                                    {['Draft Redis implementation constraints doc.', 'Schedule follow-up on Memcached benchmarks.'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-text-secondary shrink-0" />
                                            <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                            {/* Key Points */}
                            <section>
                                <h2 className="text-base font-semibold text-text-primary mb-3">Key Points</h2>
                                <ul className="space-y-3">
                                    {['Redis chosen for sorted set support enabling O(log N) rate limiting.', 'Horizontal scaling via distributed cache layer discussed.'].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-text-secondary shrink-0" />
                                            <p className="text-sm text-text-secondary leading-relaxed">{item}</p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </motion.div>
                    )}
                    {tab === 'transcript' && (
                        <motion.div key="transcript" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                            {/* Matches MeetingDetails: speaker + timestamp inline, then text below — no card/border */}
                            {[
                                { speaker: 'Them', time: '10:32', text: 'Why did you use Redis over Memcached for the cart session?' },
                                { speaker: 'Me', time: '10:33', text: 'Because we needed sorted sets for rate limiting and automatic expiry without custom cron jobs.' },
                            ].map((entry, i) => (
                                <div key={i}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-text-secondary">{entry.speaker}</span>
                                        <span className="text-xs text-text-tertiary font-mono">{entry.time}</span>
                                    </div>
                                    <p className="text-text-secondary text-sm leading-relaxed">{entry.text}</p>
                                </div>
                            ))}
                        </motion.div>
                    )}
                    {tab === 'usage' && (
                        <motion.div key="usage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                            <div className="flex justify-end pt-2">
                                <div className="bg-accent-primary text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[75%] text-xs leading-relaxed shadow-sm">
                                    Could you elaborate on the Redis rate limiting?
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 w-5 h-5 rounded-full bg-bg-input flex items-center justify-center border border-border-subtle shrink-0">
                                    <img src={answerflowIcon} alt="AI" className="w-3 h-3 opacity-50 object-contain force-black-icon" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-text-tertiary mb-1 font-medium">10:35 AM</div>
                                    <p className="text-xs text-text-secondary leading-relaxed">You mentioned Redis Sorted Sets for the sliding rate window — efficient because it auto-expires stale records while keeping operations strictly O(log N).</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating ask bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center">
                <div className="w-full max-w-[440px] flex items-center relative">
                    <div className="w-full pl-4 pr-11 py-2.5 bg-bg-item-surface shadow-sm border border-border-subtle rounded-full text-xs text-text-tertiary/70">Ask about this meeting...</div>
                    <div className="absolute right-2 p-1.5 rounded-full bg-bg-item-active text-text-primary border border-border-subtle shadow-sm">
                        <ArrowUp size={13} className="rotate-45" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const MockMeetingChatAnim = () => {
    return (
        <div className="w-full bg-bg-secondary rounded-[20px] border border-border-subtle overflow-hidden flex flex-col select-none pointer-events-none shadow-lg max-h-[280px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2 text-text-tertiary">
                    <img src={answerflowIcon} className="w-3.5 h-3.5 force-black-icon opacity-50" alt="logo" />
                    <span className="text-[13px] font-medium">Search this meeting</span>
                </div>
                <X size={16} className="text-text-tertiary" />
            </div>

            {/* Messages */}
            <div className="p-5 space-y-5">
                <div className="flex justify-end">
                    <div className="bg-accent-primary text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[75%] text-sm leading-relaxed shadow-sm">
                        What API dependencies did they mention?
                    </div>
                </div>
                <div className="flex flex-col items-start">
                    <p className="text-sm text-text-primary leading-relaxed max-w-[85%]">
                        Based on the transcript near 10:45 AM, they explicitly mentioned integrating <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-[12px] font-mono text-text-primary border border-border-subtle">Stripe Payment Intents</code> to handle the recurring tier logic securely.
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 text-xs text-text-tertiary">
                        <Copy size={13} /> Copy message
                    </div>
                </div>
            </div>
        </div>
    );
};

const MockSearchPillAnim = () => {
    const isLight = useResolvedTheme() === 'light';
    return (
        <div className="flex justify-center flex-col items-center py-10 rounded-[26px] border border-border-subtle relative overflow-hidden h-[340px] bg-bg-card">
            <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]" />
            <motion.div
                initial={{ y: -10, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className={`w-[480px] ${isLight ? 'bg-[#F2F2F7]/90' : 'bg-[#161618]/90'} backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-md overflow-hidden z-10 transform-gpu relative border border-border-subtle`}
            >
                {/* Input Row */}
                <div className="relative flex items-center border-b border-border-muted">
                    <div className="absolute left-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-text-tertiary" />
                    </div>
                    <div className="w-full bg-transparent pl-9 pr-4 py-2.5 text-[13px] text-text-primary outline-none flex items-center h-[38px]">
                        <span className="opacity-90">System</span><motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-[1.5px] h-3.5 bg-accent-primary ml-[2px] inline-block" />
                    </div>
                </div>

                {/* Results Panel mock */}
                <div className="w-[480px]">
                    <div className="py-2">
                        {/* Explore Section */}
                        <div className="px-3 py-1">
                            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                                Explore
                            </div>

                            <div className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left bg-bg-item-active transition-colors">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                    <Sparkles size={12} className="text-white" />
                                </div>
                                <span className="text-[13px] text-text-primary truncate">
                                    System
                                </span>
                            </div>

                            <div className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left hover:bg-bg-item-hover transition-colors">
                                <div className="w-6 h-6 rounded-md bg-bg-item-surface flex items-center justify-center shrink-0 border border-border-subtle">
                                    <Search size={12} className="text-text-secondary" />
                                </div>
                                <span className="text-[13px] text-text-secondary">
                                    Search for <span className="text-text-primary">"System"</span>
                                </span>
                            </div>
                        </div>

                        {/* Sessions Section */}
                        <div className="px-3 py-1 mt-1">
                            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                                Sessions
                            </div>

                            <div className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left hover:bg-bg-item-hover transition-colors">
                                <div className="w-6 h-6 rounded-md bg-bg-item-surface flex items-center justify-center shrink-0 border border-border-subtle">
                                    <FileText size={12} className="text-text-secondary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] text-text-primary truncate">
                                        System Design Interview
                                    </div>
                                    <div className="text-[11px] text-text-tertiary">
                                        Jan 12
                                    </div>
                                </div>
                            </div>

                            <div className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left hover:bg-bg-item-hover transition-colors">
                                <div className="w-6 h-6 rounded-md bg-bg-item-surface flex items-center justify-center shrink-0 border border-border-subtle">
                                    <FileText size={12} className="text-text-secondary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] text-text-primary truncate">
                                        System Architecture Sync
                                    </div>
                                    <div className="text-[11px] text-text-tertiary">
                                        Jan 08
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const MockPermissionsAnim = () => {
    const [toggled, setToggled] = useState(false);
    useEffect(() => {
        const i = setInterval(() => setToggled(t => !t), 2500);
        return () => clearInterval(i);
    }, []);

    return (
        <div className="flex justify-center flex-col items-center gap-4 py-8 bg-bg-card rounded-xl border border-border-subtle relative overflow-hidden h-[240px]">
            <div className="w-[300px] bg-bg-elevated border border-border-subtle rounded-xl shadow-lg p-4 z-10">
                <div className="flex items-center gap-3 mb-4 border-b border-border-subtle pb-3">
                    <div className="w-8 h-8 rounded-full bg-accent-secondary text-accent-primary flex items-center justify-center">
                        <Monitor className="w-4 h-4" />
                    </div>
                    <div className="font-semibold text-sm text-text-primary">Screen Recording</div>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src={answerflowIcon} alt="AnswerFlow" className="w-6 h-6 object-contain rounded drop-shadow-sm opacity-90" />
                        <span className="text-text-primary text-sm font-medium">AnswerFlow</span>
                    </div>

                    <motion.div
                        initial={false}
                        animate={{ backgroundColor: toggled ? 'var(--accent-primary)' : 'var(--bg-toggle-switch)' }}
                        className="w-10 h-6 rounded-full relative shadow-inner"
                    >
                        <motion.div
                            initial={false}
                            animate={{ x: toggled ? 18 : 2 }}
                            className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                        />
                    </motion.div>
                </div>
            </div>
            <div className="text-xs text-text-secondary text-center max-w-[280px]">
                {isMac
                    ? 'AnswerFlow requires Accessibility and Screen Recording permissions to analyze screen context.'
                    : 'AnswerFlow will ask for microphone access the first time you start a meeting.'}
            </div>
        </div>
    );
};

const MockPillControlsAnim = () => {
    const [windowShowing, setWindowShowing] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => setWindowShowing(prev => !prev), 2400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-4 space-y-2.5">
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-1 mb-3">Pill Controls</div>

            {/* Logo → Launcher */}
            <div className="flex items-center gap-3 p-3 bg-bg-elevated border border-border-subtle rounded-xl">
                <div className="w-8 h-8 rounded-full bg-bg-item-active flex items-center justify-center border border-border-muted shrink-0 shadow-sm">
                    <img src={answerflowIcon} alt="Logo" className="w-[18px] h-[18px] object-contain force-black-icon opacity-90" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <motion.div
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 shrink-0"
                    >
                        <span className="relative flex h-[7px] w-[7px] shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-emerald-400" />
                        </span>
                        <span className="text-[11px] font-medium text-emerald-500">Meeting ongoing</span>
                    </motion.div>
                    <span className="text-[11px] text-text-secondary leading-snug">— clicking this brings you right back</span>
                </div>
            </div>

            {/* Hide / Show toggle */}
            <div className="flex items-center gap-3 p-3 bg-bg-elevated border border-border-subtle rounded-xl">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-item-active border border-border-muted shrink-0 w-[68px]">
                    <motion.div animate={{ rotate: windowShowing ? 0 : 180 }} transition={{ duration: 0.35, ease: 'easeInOut' }}>
                        <ChevronUp className="w-3 h-3 text-text-secondary" />
                    </motion.div>
                    <span className="text-[11px] text-text-secondary font-medium">{windowShowing ? 'Hide' : 'Show'}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative w-14 h-9 shrink-0">
                        <motion.div
                            animate={{ opacity: windowShowing ? 1 : 0 }}
                            transition={{ duration: 0.35 }}
                            className="absolute inset-0 rounded-lg border border-border-subtle bg-bg-item-surface flex items-center justify-center"
                        >
                            <Eye className="w-3.5 h-3.5 text-text-tertiary" />
                        </motion.div>
                        <motion.div
                            animate={{ opacity: windowShowing ? 0 : 0.4 }}
                            transition={{ duration: 0.35 }}
                            className="absolute inset-0 rounded-lg border border-dashed border-border-subtle flex items-center justify-center"
                        >
                            <EyeOff className="w-3.5 h-3.5 text-text-tertiary" />
                        </motion.div>
                    </div>
                    <span className="text-[11px] text-text-secondary leading-snug">Toggles entire window — keeps you <strong className="text-text-primary">purely stealth</strong></span>
                </div>
            </div>

            {/* Stop → end session */}
            <div className="flex items-center gap-3 p-3 bg-bg-elevated border border-border-subtle rounded-xl">
                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 rounded-[2.5px] bg-red-400" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <motion.span
                        animate={{ opacity: [1, 0.25, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-[11px] text-red-400 font-medium shrink-0"
                    >
                        Session ends instantly
                    </motion.span>
                    <span className="text-[11px] text-text-tertiary">— returns to launcher</span>
                </div>
            </div>

        </div>
    );
};

const MockFastModeAnim = () => {
    return (
        <div className="flex justify-center items-center py-8 bg-bg-card rounded-xl border border-border-subtle relative overflow-hidden h-[240px]">
            <div className="flex flex-col items-center gap-4 z-10">
                <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                    animate={{ rotate: 360 }}
                    transition={{ ease: "linear", duration: 8, repeat: Infinity }}
                >
                    <Zap className="w-8 h-8 text-white" />
                </motion.div>
                <div className="text-center">
                    <div className="font-bold text-lg text-text-primary">Fast Mode Enabled</div>
                    <div className="text-xs text-text-secondary mt-1">Routing via Groq LPU (Response &lt; 0.5s)</div>
                </div>
            </div>

            {/* Background pulses */}
            <motion.div
                className="absolute inset-0 border-[6px] border-orange-500/20 rounded-xl"
                animate={{ scale: [1, 1.05, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </div>
    );
};

// Audio Mock Animations

const getBadgeStyle = (color?: string) => {
    switch (color) {
        case 'blue': return 'bg-accent-secondary text-accent-primary border-border-subtle';
        case 'orange': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'purple': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'teal': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
        case 'cyan': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
        case 'indigo': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        case 'green': return 'bg-green-500/10 text-green-500 border-green-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
};

const getIconStyle = (color?: string, isSelectedItem: boolean = false) => {
    if (isSelectedItem) return 'bg-accent-primary text-white shadow-sm';
    switch (color) {
        case 'blue': return 'bg-accent-secondary text-accent-primary';
        case 'orange': return 'bg-orange-500/10 text-orange-600';
        case 'purple': return 'bg-purple-500/10 text-purple-600';
        case 'teal': return 'bg-teal-500/10 text-teal-600';
        case 'cyan': return 'bg-cyan-500/10 text-cyan-600';
        case 'indigo': return 'bg-indigo-500/10 text-indigo-600';
        case 'green': return 'bg-green-500/10 text-green-600';
        default: return 'bg-gray-500/10 text-gray-600';
    }
};

const MockProviderSelectionAnim = () => (
    <div className="flex justify-center flex-col items-center py-6 bg-bg-card rounded-xl border border-border-subtle relative overflow-hidden h-[220px]">
        <div className="w-[340px] rounded-xl border border-green-500/20 bg-green-500/10 p-4 font-sans">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-green-500/10 text-green-400">
                    <Cpu size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-text-primary truncate leading-tight">Moonshine Base</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${getBadgeStyle('green')}`}>Local</span>
                    </div>
                    <span className="text-[12px] text-text-secondary block leading-relaxed mt-1">
                        Local transcription downloads during setup. Configure only your microphone and meeting audio devices.
                    </span>
                </div>
            </div>
        </div>
    </div>
);

const MockApiKeyFlowAnim = () => {
    const [stage, setStage] = useState(0); // 0: enter key, 1: saving, 2: test, 3: connected, 4: trash
    useEffect(() => {
        const i = setInterval(() => setStage(s => (s + 1) % 5), 2000);
        return () => clearInterval(i);
    }, []);

    return (
        <div className="flex justify-center flex-col items-center gap-2 py-8 bg-bg-card rounded-xl border border-border-subtle relative overflow-hidden h-[240px]">
            <div className="w-[380px] space-y-2 relative z-10">
                <label className="text-xs font-medium text-text-secondary block">Groq API Key</label>
                <div className="flex gap-2">
                    <div className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary flex items-center shadow-inner">
                        <span className={stage > 0 ? "opacity-100" : "opacity-40"}>
                            {stage > 0 ? "gsk_a8B2c..." : "Enter API key"}
                        </span>
                        {stage === 0 && <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.5 h-4 bg-accent-primary ml-0.5" />}
                    </div>
                    <div className="px-5 py-2 rounded-lg text-xs font-medium bg-bg-elevated border border-border-subtle flex items-center justify-center transition-colors shadow-sm">
                        {stage === 1 ? <Check size={14} className="text-green-500" /> : 'Save'}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                        <div className="text-xs bg-bg-input px-3 py-1.5 rounded-md flex items-center gap-2 border border-border-subtle shadow-sm">
                            {stage === 2 ? <RefreshCw size={12} className="text-accent-primary animate-spin" /> : stage > 2 ? <Check size={12} className="text-green-500" /> : <Play size={12} className="text-text-tertiary" />}
                            <span className={stage > 2 ? "text-green-500" : "text-text-primary"}>
                                {stage === 2 ? 'Testing...' : stage > 2 ? 'Connected' : 'Test API Key'}
                            </span>
                        </div>
                    </div>
                    <div className={`p-2 rounded-lg ${stage === 4 ? 'bg-red-500/20 text-red-500' : 'text-text-tertiary'} border border-transparent`}>
                        <Trash2 size={16} />
                    </div>
                </div>
            </div>

            {/* Animated Cursor */}
            <motion.div
                className="absolute w-5 h-5 z-20 drop-shadow-lg"
                animate={{
                    x: stage === 0 ? 0 : stage === 1 ? 140 : stage === 2 ? -80 : stage === 4 ? 170 : 170,
                    y: stage === 0 ? 20 : stage === 1 ? 20 : stage === 2 ? 65 : stage === 4 ? 65 : 65
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5"><path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L6.35 3.35a.5.5 0 0 0-.85.35Z" /></svg>
            </motion.div>
        </div>
    );
};

const ElevenLabsPermissionsMock = () => {
    return (
        <div className="w-full flex justify-center py-4 bg-bg-elevated rounded-xl border border-border-subtle mb-3 mt-2 shadow-sm">
            <div className="flex items-center justify-between w-full max-w-[360px]">
                <span className="text-[14.5px] text-text-primary font-medium tracking-tight">Speech to Text</span>
                <div className="flex items-center bg-bg-main p-[3px] rounded-lg border border-border-subtle shadow-inner">
                    <div className="px-3.5 py-1.5 text-[13px] font-medium text-text-secondary">No Access</div>
                    <div className="px-3.5 py-1.5 text-[13px] font-medium text-black bg-white rounded-md shadow-sm relative z-10 before:absolute before:inset-0 before:rounded-md before:border-[1.5px] before:border-black before:opacity-90 before:-m-[1px]">Access</div>
                </div>
            </div>
        </div>
    );
};

// ----------------------
// Reusable Components
// ----------------------

interface AccordionSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border rounded-xl mb-4 overflow-hidden transition-all duration-200 bg-bg-card border-border-subtle shadow-sm`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 transition-colors hover:bg-bg-item-surface group`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-bg-item-surface border border-border-subtle group-hover:border-border-muted transition-colors text-text-secondary`}>
                        {icon}
                    </div>
                    <span className={`font-semibold text-sm text-text-primary`}>{title}</span>
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5 text-text-tertiary" /> : <ChevronRight className="w-5 h-5 text-text-tertiary" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        <div className={`p-5 border-t border-border-subtle text-sm leading-relaxed text-text-secondary`}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SetupGuide = () => {
    const cmd = getModifierSymbol('cmd');
    const shift = getModifierSymbol('shift');
    const steps = [
        {
            title: 'Grant Permissions',
            desc: isMac
                ? 'Enable Screen Recording and Accessibility for AnswerFlow in macOS Privacy & Security.'
                : 'Approve the microphone prompt the first time you start a meeting (Settings → Privacy → Microphone).',
        },
        {
            title: 'Set Up Audio',
            desc: 'Open Settings → Audio and choose the microphone plus the output device where your meeting audio plays.',
        },
        {
            title: 'Connect an AI Model',
            desc: 'Open Settings → AI Providers and choose a built-in model, or add a Groq or OpenRouter key.',
        },
        {
            title: 'Personalize (Optional)',
            desc: 'Open Settings → Custom Instructions to add instructions, attach one local document, and set the AI persona.',
        },
        {
            title: "You're all set.",
            desc: null,
        },
    ];

    const hotkeys = [
        { label: 'Toggle', kbd: `${cmd}H` },
        { label: 'Screenshot', kbd: `${cmd}${shift}H` },
        { label: 'Chat', kbd: `${cmd}K` },
    ];

    return (
        <div className="mb-10">
            <div className="mb-7">
                <h3 className="text-[20px] font-bold text-text-primary tracking-tight leading-tight">Quick Start</h3>
                <p className="text-[13px] text-text-tertiary mt-0.5">Get AnswerFlow running in four steps.</p>
            </div>

            <div>
                {steps.map((step, i) => {
                    const isLast = i === steps.length - 1;
                    return (
                        <div key={i} className="flex gap-4">
                            {/* Step indicator column */}
                            <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                                <div className="w-7 h-7 rounded-full bg-accent-primary flex items-center justify-center shrink-0">
                                    <span className="text-[11px] font-bold text-white leading-none">{i + 1}</span>
                                </div>
                                {!isLast && (
                                    <div className="w-px bg-border-subtle flex-1" style={{ minHeight: 32, marginTop: 5, marginBottom: 5 }} />
                                )}
                            </div>

                            {/* Content */}
                            <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-6'}`} style={{ paddingTop: 3 }}>
                                <p className="text-[14px] font-semibold text-text-primary leading-snug">{step.title}</p>
                                {step.desc && (
                                    <p className="text-[13px] text-text-secondary leading-relaxed mt-0.5">{step.desc}</p>
                                )}
                                {isLast && (
                                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                                        {hotkeys.map((h, hi) => (
                                            <React.Fragment key={h.kbd}>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[12px] text-text-secondary">{h.label}</span>
                                                    <kbd className="font-mono text-[11px] font-semibold text-text-primary bg-bg-item-surface border border-border-subtle rounded-md px-1.5 py-0.5 leading-none">{h.kbd}</kbd>
                                                </div>
                                                {hi < hotkeys.length - 1 && <span className="text-border-subtle text-[12px] select-none">·</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
export const HelpSettings: React.FC = () => {
    const { shortcuts } = useShortcuts();
    const isLight = useResolvedTheme() === 'light';
    const [floatingHelpRestored, setFloatingHelpRestored] = useState(false);

    const restoreFloatingHelp = () => {
        try {
            localStorage.removeItem('answerflow_help_assistant_dismissed_v1');
        } catch {
            /* localStorage can fail in constrained environments */
        }
        window.dispatchEvent(new Event('answerflow-help-assistant-show'));
        setFloatingHelpRestored(true);
        window.setTimeout(() => setFloatingHelpRestored(false), 1600);
    };

    // Kbd class applying theme variables.
    const kbdClass = `px-1.5 py-0.5 rounded text-[10px] font-mono border inline-block bg-bg-item-surface border-border-subtle text-text-secondary shadow-sm`;

    return (
        <div className="w-full h-full flex flex-col animated fadeIn pb-10">
            <div className="mb-6 shrink-0">
                <h2 className={`text-2xl font-bold text-text-primary flex items-center gap-3`}>
                    <HelpCircle className="w-6 h-6 text-accent-primary" />
                    Help & Setup Guide
                </h2>
                <p className={`text-sm text-text-secondary mt-3 max-w-2xl`}>
                    Learn how to deeply configure AnswerFlow. Everything from providing the right API scopes to executing conversational interviews seamlessly is covered below.
                </p>
                <button
                    type="button"
                    onClick={restoreFloatingHelp}
                    className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${isLight ? 'border-border-muted bg-bg-elevated text-text-primary hover:bg-bg-item-hover' : 'border-white/10 bg-white/6 text-text-primary hover:bg-white/10'}`}
                >
                    <HelpCircle size={14} />
                    {floatingHelpRestored ? 'Floating help restored' : 'Show floating Help button'}
                </button>
            </div>

            <div className="flex-1 space-y-2">

                <SetupGuide />

                <div className="h-10" />
                <div className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-3">
                    <h3 className="text-[20px] font-bold text-text-primary tracking-tight leading-tight">Help Guide</h3>
                </div>

                <AccordionSection title="1. App Permissions Setup" icon={<Monitor className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <p>
                            {isMac
                                ? 'AnswerFlow operates entirely on-device, but requires OS permissions to tap into your screen context and global keystrokes. Here is how your system should look:'
                                : 'AnswerFlow operates entirely on-device. Windows will prompt you for microphone access the first time you start a meeting — no other OS permissions are required.'}
                        </p>
                        {isMac && <MockPermissionsAnim />}
                        <div className="space-y-3 mt-4">
                            <h4 className="font-bold text-base text-text-primary border-b border-border-subtle pb-2">Hardware & Engine Configurations</h4>

                            <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2`}>
                                <h5 className={`font-semibold text-[13px] text-text-primary flex items-center gap-2`}>
                                    <Mic size={14} className="text-accent-primary" /> Microphone & Speaker Loopback Selection
                                </h5>
                                <p className="text-[11px] opacity-90 leading-relaxed text-text-secondary">
                                    AnswerFlow can capture both what you say and what you hear globally. At the top of the Audio Settings, use the Dropdowns to explicitly select your hardware Input (e.g. your physical microphone) and Output capture (what the speakers play). By default, AnswerFlow utilizes the <strong>System Default</strong>, so audio routing will automatically follow your OS preferences.
                                </p>
                            </div>

                            {false && isMac && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2`}>
                                        <h5 className={`font-semibold text-[13px] text-text-primary flex items-center gap-2`}>
                                            <Monitor size={14} className="text-accent-primary" /> ScreenCaptureKit (SCK)
                                        </h5>
                                        <p className="text-[11px] opacity-90 leading-relaxed text-text-secondary">
                                            The recommended backend for macOS 13.0+. Uses Apple's modern, highly optimized internal framework for 0-latency loopback speaker capture securely.
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2`}>
                                        <h5 className={`font-semibold text-[13px] text-text-primary flex items-center gap-2`}>
                                            <Volume2 size={14} className="text-orange-500" /> CoreAudio (Legacy)
                                        </h5>
                                        <p className="text-[11px] opacity-90 leading-relaxed text-text-secondary">
                                            Fallback engine for older hardware. Relies on internal device aggregation to trap output audio. Only use this if SCK repeatedly drops speaker packets.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2`}>
                                <h5 className={`font-semibold text-[13px] text-text-primary flex items-center gap-2`}>
                                    <Globe size={14} className="text-green-500" /> Language & Regional Accents
                                </h5>
                                <p className="text-[11px] opacity-90 leading-relaxed text-text-secondary">
                                    AnswerFlow uses the local Moonshine Base transcription model downloaded during setup. The main setup requirement is device routing: choose the microphone you speak into and the output device where meeting audio plays.
                                </p>
                            </div>
                        </div>

                        {isMac ? (
                            <div className="flex flex-col gap-3 mt-6">
                                <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle`}>
                                    <h4 className={`font-semibold text-sm mb-2 text-text-primary flex items-center gap-2`}>
                                        <Monitor className="w-4 h-4 text-accent-primary" /> Screen Recording
                                    </h4>
                                    <p className="text-xs opacity-90 mb-2">Provides AnswerFlow the ability to read your screen temporarily when you capture context.</p>
                                    <p className="text-[11px] text-text-tertiary">System Settings &gt; Privacy & Security &gt; Screen Recording</p>
                                </div>

                                <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle`}>
                                    <h4 className={`font-semibold text-sm mb-2 text-text-primary flex items-center gap-2`}>
                                        <Command className="w-4 h-4 text-purple-500" /> Accessibility
                                    </h4>
                                    <p className="text-xs opacity-90 mb-2">Required for AnswerFlow to detect the global keyboard shortcuts below, regardless of what window is focused.</p>
                                    <p className="text-[11px] text-text-tertiary">System Settings &gt; Privacy & Security &gt; Accessibility</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 mt-6">
                                <div className={`p-4 rounded-xl border bg-bg-item-surface border-border-subtle`}>
                                    <h4 className={`font-semibold text-sm mb-2 text-text-primary flex items-center gap-2`}>
                                        <Mic className="w-4 h-4 text-accent-primary" /> Microphone
                                    </h4>
                                    <p className="text-xs opacity-90 mb-2">Required to capture what you say during meetings. Windows prompts the first time you start a meeting.</p>
                                    <p className="text-[11px] text-text-tertiary">Settings &gt; Privacy &gt; Microphone</p>
                                </div>
                            </div>
                        )}
                    </div>
                </AccordionSection>

                <AccordionSection title="2. Audio Setup (Microphone and Meeting Audio)" icon={<Mic className="w-4 h-4" />}>
                    <div className="space-y-6">
                        <p>AnswerFlow uses the local Moonshine Base model for transcription after it is downloaded during setup. In the Audio tab, configure the microphone and the output device where your meeting audio is playing.</p>

                        <MockProviderSelectionAnim />

                        <div className="space-y-4 pt-2">
                            <h4 className="font-bold text-lg text-text-primary border-b border-border-subtle pb-2">Audio Checks</h4>
                            <p className="text-xs text-text-secondary">Before a live interview, confirm the microphone and meeting output meters move when each side speaks.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h5 className="font-semibold text-sm text-text-primary mb-1">Microphone</h5>
                                    <p className="text-xs text-text-secondary">Select the input device you will speak into and verify the input meter moves.</p>
                                </div>
                                <div className="p-3 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h5 className="font-semibold text-sm text-text-primary mb-1">Meeting Audio</h5>
                                    <p className="text-xs text-text-secondary">Select the same output device used by Zoom, Teams, Meet, or the browser tab.</p>
                                </div>
                            </div>
                        </div>

                        {false && (
                        <div className="space-y-3 pt-4">
                            <h4 className="font-bold text-lg text-text-primary border-b border-border-subtle pb-2">Specific Provider Setup</h4>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>1. Google Cloud STT</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://console.cloud.google.com/apis/credentials') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Uses a Service Account JSON instead of an API Key. You must build a GCP Project, activate the Cloud Speech API, and create a Service Account under IAM. Download the JSON Key, and drag-and-drop it into the box in the Audio Settings.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>2. ElevenLabs</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://elevenlabs.io/app/settings/api-keys') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    When creating a Custom API key for the "Conversational AI" streaming integration, you must explicitly enable <strong>convai.conversations.create</strong> and <strong>assistants.list</strong>.
                                    Crucially, you must also allow <strong>Speech to Text: Access</strong> as seen below in the ElevenLabs UI:
                                </p>
                                <ElevenLabsPermissionsMock />
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>3. Groq</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://console.groq.com/keys') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Provides ultra-fast Whisper responses via LPUs. Starts with <span className={kbdClass}>gsk_</span>. No special permissions required.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>4. OpenAI</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://platform.openai.com/api-keys') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Uses standard OpenAI keys (<span className={kbdClass}>sk-</span>). Remember: this Audio key is isolated from your AI Generation key under "AI Providers".
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>5. Deepgram</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://console.deepgram.com/') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Extremely accurate streaming transcription (Nova-2 model). Key is generated on-demand in the Deepgram Console.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>6. Azure</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://portal.azure.com/') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Requires establishing Azure Speech Services. <strong>Important</strong>: You must also specify an Azure Region alongside your key (e.g. <em>eastus</em>, <em>westeurope</em>) or requests will bounce.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>7. IBM Watson</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://cloud.ibm.com/catalog/services/speech-to-text') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Create a Watson Speech to Text resource in IBM Cloud and generate a set of API credentials.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle space-y-2">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center">
                                    <span>8. Soniox</span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://console.soniox.com/') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Link</button>
                                </h5>
                                <p className="text-xs opacity-90 leading-relaxed text-text-secondary">
                                    Provides high-end medical/law tier transcriptions using their standard dashboard API Key.
                                </p>
                            </div>
                        </div>
                        )}

                    </div>
                </AccordionSection>

                <AccordionSection title="3. AI Providers & Prompt Engine" icon={<Key className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <p className="text-sm">
                            AnswerFlow uses your selected main LLM for prep chat, live interview answers, post-interview chat, and Help Assistant replies. Configure one provider first, confirm it works, then add another only if you want a backup.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl border bg-bg-item-surface border-border-subtle hover:border-border-muted transition-colors">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center mb-1">
                                    <span className="flex items-center gap-2">
                                        <SiOpenai className={`w-3.5 h-3.5 ${isLight ? 'text-black' : 'text-white'}`} /> OpenAI
                                    </span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://platform.openai.com/api-keys') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Get Key</button>
                                </h5>
                                <p className="text-[11px] opacity-80 mb-2">Use for GPT models and general-purpose interview reasoning.</p>
                                <span className={kbdClass}>sk-...</span>
                            </div>
                            <div className="p-3 rounded-xl border bg-bg-item-surface border-border-subtle hover:border-border-muted transition-colors">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center mb-1">
                                    <span className="flex items-center gap-2">
                                        <SiGoogle className="w-3.5 h-3.5 text-accent-primary" /> Google Gemini
                                    </span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://aistudio.google.com/app/apikey') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Get Key</button>
                                </h5>
                                <p className="text-[11px] opacity-80 mb-2">Use for Gemini models with large context windows.</p>
                                <span className={kbdClass}>AIza...</span>
                            </div>
                            <div className="p-3 rounded-xl border bg-bg-item-surface border-border-subtle hover:border-border-muted transition-colors">
                                <h5 className="font-semibold text-sm text-text-primary flex justify-between items-center mb-1">
                                    <span className="flex items-center gap-2">
                                        <img src="https://cdn.simpleicons.org/anthropic/000000" style={{ filter: isLight ? '' : 'invert(1)' }} alt="Anthropic" className="w-4 h-4 object-contain" /> Anthropic
                                    </span>
                                    <button onClick={() => { (window as any).electronAPI?.openExternal('https://console.anthropic.com/settings/keys') }} className="text-accent-primary hover:underline text-[10px] flex items-center gap-1"><ExternalLink size={10} /> Get Key</button>
                                </h5>
                                <p className="text-[11px] opacity-80 mb-2">Use for Claude models and structured reasoning.</p>
                                <span className={kbdClass}>sk-ant-...</span>
                            </div>
                        </div>

                        <div className="p-4 mt-2 rounded-xl border border-border-subtle bg-bg-item-surface">
                            <h5 className="font-semibold text-[13px] text-text-primary mb-1">What The Live Prompt Includes</h5>
                            <p className="text-[11px] text-text-secondary leading-relaxed">
                                Live interview answers include Custom Instructions, AI Persona, prep chat, selected document Markdown, transcript so far, prior AI responses, and the current answer request. This is why the prep chat and selected documents matter before you click Start interview.
                            </p>
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="4. Interview Workspace" icon={<Monitor className="w-4 h-4" />}>
                    <div className="space-y-6">
                        <p className="text-[13px]">The main workspace is organized around interviews: the left panel lists interviews, the middle panel contains prep chat, transcript, and post-interview chat, and the right panel contains setup status, model, audio, and detectability controls.</p>

                        <div className="relative w-full flex flex-col p-2 sm:p-5 bg-bg-main rounded-[26px] border border-border-subtle shadow-inner">
                            <MockAppInterface />
                            <MockPillControlsAnim />
                        </div>

                        {/* Quick Actions & Hotkeys */}
                        <div className="mt-4 mb-3 flex items-center gap-3">
                            <div className="flex-1 h-px bg-border-subtle" />
                            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-widest">Quick Actions & Hotkeys</span>
                            <div className="flex-1 h-px bg-border-subtle" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {([
                                { Icon: Pencil, color: 'blue', title: 'What to Answer?', badge: null, bc: '', kbd: ['⌘', '1'], desc: 'Reads the active transcript and screen, then streams a precise response to read aloud.' },
                                { Icon: Lightbulb, color: 'violet', title: 'Brainstorm', badge: 'Interview ON', bc: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', kbd: ['⌘', '3'], desc: 'Recap becomes Brainstorm when Interview Mode is ON — deep multi-step strategies.' },
                                { Icon: HelpCircle, color: 'teal', title: 'Follow Up', badge: null, bc: '', kbd: ['⌘', '4'], desc: 'Suggests the next logical question to keep conversation flowing gracefully.' },
                                { Icon: Zap, color: 'emerald', title: 'Answer Now', badge: null, bc: '', kbd: ['⌘', '5'], desc: 'Records your mic + screen context and fires an immediate AI query.' },
                                { Icon: MessageSquare, color: 'indigo', title: 'Clarify', badge: null, bc: '', kbd: ['⌘', '2'], desc: 'Generates sharp probing questions from latent audio when a topic is unclear.' },
                                { Icon: RefreshCw, color: 'amber', title: 'Recap', badge: 'Interview OFF', bc: 'bg-red-500/10 text-red-400 border-red-500/30', kbd: ['⌘', '3'], desc: 'Condenses the last 5 minutes into bullet points when you lose the thread.' },
                                { Icon: Sparkles, color: 'sky', title: 'Code Hint', badge: null, bc: '', kbd: ['⌘', '6'], desc: 'Reads your screen and nudges you toward the correct code implementation.' },
                                { Icon: Monitor, color: 'rose', title: 'Screenshot & Ask', badge: null, bc: '', kbd: ['⌘', '⇧', 'H'], desc: 'Forces a full-screen capture and immediately processes it through the LLM.' },
                                { Icon: EyeOff, color: 'slate', title: 'Stealth Execute', badge: null, bc: '', kbd: ['⌘', '↵'], desc: 'Processes context in the background without ever revealing the interface.' },
                            ] as Array<{ Icon: React.ElementType; color: 'blue' | 'violet' | 'teal' | 'emerald' | 'indigo' | 'amber' | 'sky' | 'rose' | 'slate'; title: string; badge: string | null; bc: string; kbd: string[]; desc: string }>).map(({ Icon, color, title, badge, bc, kbd, desc }) => {
                                const resolvedKbd = kbd.map(k =>
                                    k === '⌘' ? getModifierSymbol('cmd')
                                  : k === '⇧' ? getModifierSymbol('shift')
                                  : k === '⌥' ? getModifierSymbol('option')
                                  : k
                                );
                                const t = {
                                    blue: { bg: 'bg-accent-secondary', text: 'text-accent-primary', border: 'border-border-muted', glow: 'group-hover:shadow-[0_0_0_1px_rgba(249,115,22,0.16),0_4px_12px_rgba(249,115,22,0.06)]' },
                                    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_4px_12px_rgba(139,92,246,0.07)]' },
                                    teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(20,184,166,0.2),0_4px_12px_rgba(20,184,166,0.07)]' },
                                    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_4px_12px_rgba(16,185,129,0.07)]' },
                                    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(99,102,241,0.2),0_4px_12px_rgba(99,102,241,0.07)]' },
                                    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2),0_4px_12px_rgba(245,158,11,0.07)]' },
                                    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(14,165,233,0.2),0_4px_12px_rgba(14,165,233,0.07)]' },
                                    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(244,63,94,0.2),0_4px_12px_rgba(244,63,94,0.07)]' },
                                    slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', glow: 'group-hover:shadow-[0_0_0_1px_rgba(100,116,139,0.2),0_4px_12px_rgba(100,116,139,0.07)]' },
                                }[color];

                                return (
                                    <div key={title} className={`group flex flex-col gap-1.5 p-3 rounded-xl border border-border-subtle bg-bg-item-surface hover:bg-bg-elevated transition-all duration-200 cursor-default ${t.glow}`}>

                                        {/* Line 1 — Icon + Name */}
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded-md ${t.bg} border ${t.border} flex items-center justify-center shrink-0`}>
                                                <Icon className={`w-3 h-3 ${t.text}`} strokeWidth={2.5} />
                                            </div>
                                            <span className="text-[12px] font-bold text-text-primary tracking-tight leading-none truncate">{title}</span>
                                        </div>

                                        {/* Line 2 — Interview mode badge */}
                                        <div className="flex items-center">
                                            {badge ? (
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-[2px] border rounded leading-none ${bc}`}>{badge}</span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-text-tertiary/50 uppercase tracking-wider leading-none">Always active</span>
                                            )}
                                        </div>

                                        {/* Line 3 — Shortcut */}
                                        <div className="flex items-center gap-1">
                                            {resolvedKbd.map((key, i) => (
                                                <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono inline-block bg-bg-elevated text-text-secondary">{key}</span>
                                            ))}
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-border-subtle to-transparent" />

                                        {/* Description */}
                                        <p className="text-[11px] text-text-secondary leading-[1.5]">{desc}</p>
                                    </div>
                                );
                            })}
                        </div>


                    </div>
                </AccordionSection>

                <AccordionSection title="5. Interview History" icon={<Calendar className="w-4 h-4" />}>
                    <div className="space-y-6">
                        <p className="text-[13px]">When an interview concludes, AnswerFlow saves the prep chat, selected docs, transcript, AI responses, interview-finished boundary, and follow-up chat so the interview can be reopened later.</p>

                        <MockMeetingInterfaceAnim />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-accent-primary group-hover:scale-110 transition-transform" /> Summary Execution
                                </h4>
                                <p className="text-[12px] text-text-secondary leading-relaxed">
                                    AnswerFlow keeps the full interview transcript and makes it available to the post-interview chat. Generated responses should render Markdown cleanly.
                                </p>
                            </div>

                            <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                    <Volume2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" /> Raw Transcripts
                                </h4>
                                <p className="text-[12px] text-text-secondary leading-relaxed">
                                    Dive into the exact dialogue timeline. Speaker separation attempts to classify "Me" vs "Them" using volume thresholds, capturing everything physically said alongside timestamps.
                                </p>
                            </div>

                            <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                    <Cpu className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" /> Usage & Storage
                                </h4>
                                <p className="text-[12px] text-text-secondary leading-relaxed">
                                    Selected documents and prep chat stay linked to the interview so follow-up questions can use the same context.
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-border-subtle pt-6">
                            <h4 className="font-bold text-sm text-text-primary flex items-center gap-2 mb-4">
                                <MessageSquare className="w-4 h-4 text-accent-primary" /> Post-Interview Chat
                            </h4>
                            <p className="text-[13px] mb-6">After the interview finished boundary, continue chatting with the assistant. It should answer using prep notes, selected docs, transcript, and AI responses from that interview.</p>

                            <MockMeetingChatAnim />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                                <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                    <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                        <Search className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" /> Contextual Semantic Search
                                    </h4>
                                    <p className="text-[12px] text-text-secondary leading-relaxed">
                                        Ask direct follow-up questions such as "How did I answer the system design question?" or "What should I improve next time?"
                                    </p>
                                </div>

                                <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                    <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                        <Brain className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" /> Memory Isolation
                                    </h4>
                                    <p className="text-[12px] text-text-secondary leading-relaxed">
                                        Conversations stay scoped to the selected interview so context from another interview does not leak into this one.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="6. Global Search & Shortcuts" icon={<Search className="w-4 h-4" />}>
                    <div className="space-y-6">
                        <p className="text-[13px]">Hit <span className={kbdClass}>{isMac ? 'Cmd+K' : 'Ctrl+K'}</span> anywhere on your computer to invoke the AnswerFlow Global Palette. This acts as your Spotlight overlay for interacting directly with the system backbone.</p>

                        <MockSearchPillAnim />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 mb-4">
                            <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                    <Briefcase className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" /> Instant Meeting Traversal
                                </h4>
                                <p className="text-[12px] text-text-secondary leading-relaxed">
                                    Typing any text instantly fuzzy matches across all your previous meeting titles, summaries, and internal files. Hitting enter jumps you straight into the intelligence viewer for that topic.
                                </p>
                            </div>

                            <div className="p-4 bg-bg-item-surface border border-border-subtle rounded-xl shadow-sm hover:border-border-muted transition-colors group">
                                <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" /> Conversational Fallback
                                </h4>
                                <p className="text-[12px] text-text-secondary leading-relaxed">
                                    If your query doesn't match an existing document, the palette offers a direct jump to spark off a standard LLM chat conversation passing through your exact typed intent.
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-border-subtle pt-6">
                            <h4 className="font-bold text-sm text-text-primary border-b border-border-subtle pb-1">Global System Shortcuts</h4>
                            <p className="text-[11px] text-text-secondary mt-1 mb-3">These hotkeys work anywhere on your operating system, regardless of whether AnswerFlow is focused or completely hidden. Change them via <strong>Settings &gt; Hotkeys</strong>.</p>

                            <div className="grid gap-3">
                                <div className="flex items-center justify-between p-4 rounded-xl border bg-bg-item-surface border-border-subtle group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded shrink-0 bg-bg-input border border-border-subtle flex items-center justify-center mt-0.5">
                                            <Eye className="w-4 h-4 text-text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-text-primary">Show / Hide Interface</div>
                                            <div className="text-xs text-text-secondary mt-1">Quickly toggle the window visibility. Used as an immediate panic hide.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {(shortcuts.toggleVisibility || [getModifierSymbol('cmd'), 'B']).map((key: string, i: number) => <span key={i} className={kbdClass}>{key}</span>)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl border bg-bg-item-surface border-border-subtle group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded shrink-0 bg-bg-input border border-border-subtle flex items-center justify-center mt-0.5">
                                            <Image className="w-4 h-4 text-text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-text-primary">Capture Contextual Screenshot</div>
                                            <div className="text-xs text-text-secondary mt-1">Takes a silent screenshot in the background, feeding the visual data to the LLM context flow.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {(shortcuts.takeScreenshot || [getModifierSymbol('cmd'), 'H']).map((key: string, i: number) => <span key={i} className={kbdClass}>{key}</span>)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl border bg-bg-item-surface border-border-subtle group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded shrink-0 bg-bg-input border border-border-subtle flex items-center justify-center mt-0.5">
                                            <MessageSquare className="w-4 h-4 text-text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-text-primary">Process Captured Context (Execute)</div>
                                            <div className="text-xs text-text-secondary mt-1">Triggers AnswerFlow to analyze the captured screenshots and text from the rolling buffer.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {(shortcuts.processScreenshots || [getModifierSymbol('cmd'), 'Enter']).map((key: string, i: number) => <span key={i} className={kbdClass}>{key}</span>)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl border bg-bg-item-surface border-border-subtle group">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded shrink-0 bg-bg-input border border-border-subtle flex items-center justify-center mt-0.5">
                                            <Zap className="w-4 h-4 text-text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-text-primary">Capture + Execute Instantly</div>
                                            <div className="text-xs text-text-secondary mt-1">Captures a screenshot AND processes it in one fluid action.</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        {(shortcuts.captureAndProcess || [getModifierSymbol('cmd'), getModifierSymbol('shift'), 'Enter']).map((key: string, i: number) => <span key={i} className={kbdClass}>{key}</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>



                <AccordionSection title="7. Custom Instructions" icon={<Star className="w-4 h-4" />}>
                    <div className="space-y-6">
                        <div>
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                                <h4 className="text-[13px] font-semibold text-amber-500 flex items-center gap-2 mb-1">
                                    <User size={14} /> Custom Instructions
                                </h4>
                                <p className="text-[11px] text-text-secondary leading-relaxed mb-0">
                                    Use Custom Instructions to give the assistant durable context. You can type instructions directly, attach one local file, and set the AI Persona from one settings tab.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-accent-primary" /> What It Controls
                                    </h4>
                                    <ul className="text-[11px] text-text-secondary space-y-1 list-disc pl-4">
                                        <li><strong>Custom Instructions:</strong> durable context that the assistant should remember.</li>
                                        <li><strong>Attached File:</strong> one MD, TXT, PDF, or DOCX file ingested locally into Markdown.</li>
                                        <li><strong>AI Persona:</strong> the assistant's role, tone, and answer style.</li>
                                    </ul>
                                </div>

                                <div className="p-4 rounded-xl border bg-accent-secondary border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-accent-primary" /> How to Use
                                    </h4>
                                    <ol className="text-[11px] text-text-secondary space-y-1 list-decimal pl-4 mb-0">
                                        <li>Open <strong>Settings → Custom Instructions</strong>.</li>
                                        <li>Write your instructions or choose a local file.</li>
                                        <li>Set the AI Persona for voice and behavior.</li>
                                        <li>Everything auto-saves.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border-subtle pt-5 mt-2">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                                <h4 className="text-[13px] font-semibold text-emerald-500 flex items-center gap-2 mb-1">
                                    <FileText size={14} /> Attached Instruction File
                                </h4>
                                <p className="text-[11px] text-text-secondary leading-relaxed mb-0">
                                    The file picker supports MD, TXT, PDF, and DOCX. Files are ingested locally into Markdown and saved inside Custom Instructions. Choosing another file replaces the existing attached file.
                                </p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                        <Upload className="w-4 h-4 text-emerald-500" /> File Behavior
                                    </h4>
                                    <ul className="text-[11px] text-text-secondary space-y-1 list-disc pl-4">
                                        <li>Only one Custom Instructions file is attached at a time.</li>
                                        <li>Use <strong>Change file</strong> to replace the current file.</li>
                                        <li>Use the remove button to keep typed instructions but clear the file.</li>
                                        <li>The ingested Markdown is saved with your instructions.</li>
                                    </ul>
                                </div>
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500" /> AI Persona
                                    </h4>
                                    <ul className="text-[11px] text-text-secondary space-y-1 list-disc pl-4">
                                        <li>Tell the assistant what role to play.</li>
                                        <li>Describe the tone, answer length, or directness you prefer.</li>
                                        <li>Use it for interview-coach behavior separate from factual context.</li>
                                        <li>Persona is saved independently from Custom Instructions.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                {false && <AccordionSection title="8. Miscellaneous" icon={<Settings className="w-4 h-4" />}>
                    <div className="space-y-6">
                        {/* Calendar */}
                        <div>
                            <div className="p-3 bg-accent-secondary border border-border-muted rounded-xl mb-4">
                                <h4 className="text-[13px] font-semibold text-accent-primary flex items-center gap-2 mb-1">
                                    <Calendar size={14} /> What is Calendar Intelligence?
                                </h4>
                                <p className="text-[11px] text-text-secondary leading-relaxed mb-0">
                                    By connecting your Google Calendar directly to AnswerFlow, the AI automatically gains context on your upcoming meetings, syncs the event data, and reads attendee lists to hyper-personalize your interactions.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary">How to Set it Up</h4>
                                    <ul className="text-[11px] text-text-secondary space-y-1 list-disc pl-4">
                                        <li>Navigate to the <strong>Calendar</strong> tab in settings.</li>
                                        <li>Click <strong>Connect Google Calendar</strong> and authenticate securely.</li>
                                        <li>AnswerFlow will quietly background-sync your schedule.</li>
                                    </ul>
                                </div>
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary">Follow-Up System</h4>
                                    <p className="text-[11px] text-text-secondary">
                                        When tracking live meetings, AnswerFlow uses the connected calendar context to instantly figure out <strong>who you are talking to</strong>. This powers the Follow-Up Email system, letting you auto-draft post-meeting notes to confirmed attendees.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-accent-primary" /> Launcher Peek Stack
                                    </h4>
                                    <p className="text-[11px] text-text-secondary">
                                        The Launcher's Calendar card now displays your <strong>next real meeting</strong> with a stacked-card visual hinting at what comes after it — no need to switch tabs to see what's queued.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                    <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4 text-emerald-500" /> One-Click Join
                                    </h4>
                                    <p className="text-[11px] text-text-secondary">
                                        Each upcoming event shows a <strong>Join Now</strong> button that opens the meeting link in your <strong>system default browser</strong> (so it lands in the right Chrome/Safari profile), not an in-app webview.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border-subtle my-5"></div>

                        {/* Fast Mode */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-500" /> Fast Mode (Hardware LPU)
                            </h4>
                            <MockFastModeAnim />
                            <div className="p-4 rounded-xl border bg-orange-500/10 border-orange-500/20">
                                <h4 className="font-semibold text-sm mb-2 text-orange-500 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> How Fast Mode Works
                                </h4>
                                <p className="text-xs text-orange-400/80 m-0">
                                    Fast Mode activates highly efficient models (like Llama 3 8B) layered over Groq hardware LPUs instead of GPUs. This brings latency down from 2-3 seconds to less than 500ms. To enable Fast Mode, navigate to Settings &gt; General Settings popup overlay, and click the Lightning Icon.
                                </p>
                            </div>
                        </div>
                    </div>
                </AccordionSection>}

                {false && <AccordionSection title="10. Phone Mirror" icon={<Smartphone className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl mb-2">
                            <h4 className="text-[13px] font-semibold text-sky-400 flex items-center gap-2 mb-1">
                                <Smartphone size={14} /> Stream AnswerFlow to Your Phone
                            </h4>
                            <p className="text-[11px] text-text-secondary leading-relaxed mb-0">
                                Phone Mirror spins up a small local web server so you can watch AnswerFlow's live transcript and AI answers from your phone or tablet — handy when your screen is being shared and you don't want the overlay visible.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-sky-500" /> Enable & Connect
                                </h4>
                                <ul className="text-[11px] text-text-secondary space-y-1 list-disc pl-4">
                                    <li>Open <strong>Settings → Phone Mirror</strong></li>
                                    <li>Toggle on, then scan the generated QR code from your phone</li>
                                    <li>Loopback by default — flip <strong>Expose on LAN</strong> to reach it from another device on the same Wi-Fi</li>
                                </ul>
                            </div>
                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle">
                                <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-amber-500" /> Token-Gated Security
                                </h4>
                                <p className="text-[11px] text-text-secondary">
                                    Every session is protected by a single-use bearer token baked into the QR. If a device leaves your trust circle, hit <strong>Rotate Token</strong> to invalidate every existing connection in one tap.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-lg">
                            <p className="text-[10px] text-orange-400 m-0">
                                <strong>⚠️ LAN exposure:</strong> Only enable <em>Expose on LAN</em> on networks you trust. The token stops casual snoops, but anyone who captures the QR or copies the URL can read your live transcript until you rotate.
                            </p>
                        </div>
                    </div>
                </AccordionSection>}

                <AccordionSection title="11. Stealth & Window Control" icon={<Ghost className="w-4 h-4" />}>
                    <div className="space-y-4">
                        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                            <h4 className="text-[13px] font-semibold text-indigo-400 flex items-center gap-2 mb-1">
                                <Ghost size={14} /> Process Disguise & Undetectability
                            </h4>
                            <p className="text-[11px] text-text-secondary leading-relaxed mb-0">
                                AnswerFlow is heavily geared towards power users seeking minimalistic operation. The process completely disguises itself and remains undetectable/invisible to standard screen-recording applications and desktop sharing utilities.
                            </p>
                        </div>

                        <div className="grid gap-3">
                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle group">
                                <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                    <EyeOff className="w-4 h-4 text-text-secondary" /> Dynamic UI Opacity
                                </h4>
                                <p className="text-xs text-text-secondary">
                                    Decrease your visual footprint to near-zero. Navigate to the General Settings overlay and dynamically drag the <strong>Opacity Slider</strong> down to make the interface completely translucent against your underlying native applications.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-bg-item-surface border-border-subtle group">
                                <h4 className="font-semibold text-sm mb-2 text-text-primary flex items-center gap-2">
                                    <Monitor className="w-4 h-4 text-text-secondary" /> Mouse Pass-Through Mode
                                </h4>
                                <p className="text-[11px] text-text-secondary mb-2">
                                    Do you want the AI prompt completely fused into your screen without obstructing your clicks? Activate <strong>Mouse Pass-through</strong> inside the UI toggle menu.
                                </p>
                                <div className="p-2 border border-orange-500/20 bg-orange-500/5 rounded-lg">
                                    <p className="text-[10px] text-orange-400 m-0">
                                        <strong>⚠️ Warning:</strong> This renders the AnswerFlow overlay completely unclickable. You MUST memorize the Global Hotkeys (e.g. <strong>{isMac ? 'Cmd' : 'Ctrl'}+Shift+Arrows</strong> to move, <strong>{isMac ? 'Cmd' : 'Ctrl'}+B</strong> to hide, <strong>{isMac ? 'Cmd' : 'Ctrl'}+1-7</strong> for actions) to control the application once this is active.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>

            </div>
        </div>
    );
};
