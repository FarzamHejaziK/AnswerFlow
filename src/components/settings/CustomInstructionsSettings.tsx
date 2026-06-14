import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, RefreshCw, Sparkles, Upload, X } from 'lucide-react';

const FILE_BLOCK_START = '<!-- custom-instructions-file:start';
const FILE_BLOCK_END = '<!-- custom-instructions-file:end -->';
const FILE_BLOCK_REGEX = /<!-- custom-instructions-file:start[\s\S]*?<!-- custom-instructions-file:end -->/g;
const LEGACY_FILE_BLOCK_REGEX = /<custom_instruction_file\b[^>]*>[\s\S]*?<\/custom_instruction_file>/g;

const escapeFileName = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const unescapeFileName = (value: string) =>
    value
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

const stripFileBlocks = (value: string) =>
    value
        .replace(FILE_BLOCK_REGEX, '')
        .replace(LEGACY_FILE_BLOCK_REGEX, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const extractFileBlock = (value: string) => {
    const modern = value.match(FILE_BLOCK_REGEX)?.[0] || '';
    if (modern) return modern.trim();
    return value.match(LEGACY_FILE_BLOCK_REGEX)?.[0]?.trim() || '';
};

const extractFileName = (block: string) => {
    const modern = block.match(/name="([^"]+)"/)?.[1];
    if (modern) return unescapeFileName(modern);
    const legacy = block.match(/<custom_instruction_file\b[^>]*name="([^"]+)"/)?.[1];
    if (legacy) return unescapeFileName(legacy);
    return '';
};

const buildFileBlock = (fileName: string, content: string) => {
    const safeName = escapeFileName(fileName || 'custom-instructions.md');
    return [
        `${FILE_BLOCK_START} name="${safeName}" -->`,
        `<custom_instruction_file name="${safeName}">`,
        content.trim(),
        '</custom_instruction_file>',
        FILE_BLOCK_END,
    ].join('\n');
};

const combineInstructions = (manualInstructions: string, fileBlock: string) => {
    const parts = [manualInstructions.trim(), fileBlock.trim()].filter(Boolean);
    return parts.join('\n\n');
};

export const CustomInstructionsSettings: React.FC = () => {
    const [manualInstructions, setManualInstructions] = useState('');
    const [fileBlock, setFileBlock] = useState('');
    const [persona, setPersona] = useState('');
    const [instructionsSaved, setInstructionsSaved] = useState(false);
    const [personaSaved, setPersonaSaved] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState('');
    const instructionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const personaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const attachedFileName = useMemo(() => extractFileName(fileBlock), [fileBlock]);

    useEffect(() => {
        window.electronAPI?.profileGetNotes?.()
            .then((result) => {
                if (!result?.success) return;
                const content = result.content || '';
                setManualInstructions(stripFileBlocks(content));
                setFileBlock(extractFileBlock(content));
            })
            .catch(() => {});

        window.electronAPI?.profileGetPersona?.()
            .then((result) => {
                if (result?.success) setPersona(result.content || '');
            })
            .catch(() => {});

        return () => {
            if (instructionsDebounceRef.current) clearTimeout(instructionsDebounceRef.current);
            if (personaDebounceRef.current) clearTimeout(personaDebounceRef.current);
        };
    }, []);

    const saveInstructions = async (nextManual: string, nextFileBlock = fileBlock) => {
        const content = combineInstructions(nextManual, nextFileBlock);
        const result = await window.electronAPI?.profileSaveNotes?.(content);
        if (result && !result.success) {
            setError(result.error || 'Could not save custom instructions.');
            return;
        }
        setInstructionsSaved(true);
        setTimeout(() => setInstructionsSaved(false), 1800);
    };

    const handleManualChange = (value: string) => {
        setManualInstructions(value);
        setInstructionsSaved(false);
        setError('');
        if (instructionsDebounceRef.current) clearTimeout(instructionsDebounceRef.current);
        instructionsDebounceRef.current = setTimeout(() => {
            saveInstructions(value).catch((err) => setError(err?.message || 'Could not save custom instructions.'));
        }, 700);
    };

    const handleImportFile = async () => {
        setError('');
        setIsImporting(true);
        try {
            const result = await window.electronAPI?.profileImportMarkdownContext?.();
            if (!result || result.cancelled) return;
            if (!result.success) {
                setError(result.error || 'Could not import the selected file.');
                return;
            }

            const nextFileBlock = buildFileBlock(result.fileName || 'custom-instructions.md', result.content || '');
            if (instructionsDebounceRef.current) clearTimeout(instructionsDebounceRef.current);
            setFileBlock(nextFileBlock);
            await saveInstructions(manualInstructions, nextFileBlock);
        } catch (err: any) {
            setError(err?.message || 'Could not import the selected file.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleRemoveFile = async () => {
        setError('');
        if (instructionsDebounceRef.current) clearTimeout(instructionsDebounceRef.current);
        setFileBlock('');
        await saveInstructions(manualInstructions, '');
    };

    const handlePersonaChange = (value: string) => {
        setPersona(value);
        setPersonaSaved(false);
        setError('');
        if (personaDebounceRef.current) clearTimeout(personaDebounceRef.current);
        personaDebounceRef.current = setTimeout(async () => {
            try {
                const result = await window.electronAPI?.profileSavePersona?.(value);
                if (result && !result.success) {
                    setError(result.error || 'Could not save AI persona.');
                    return;
                }
                setPersonaSaved(true);
                setTimeout(() => setPersonaSaved(false), 1800);
            } catch (err: any) {
                setError(err?.message || 'Could not save AI persona.');
            }
        }, 700);
    };

    return (
        <div className="space-y-5 animated fadeIn pb-10">
            <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">Custom Instructions</h2>
                <p className="text-xs text-text-secondary">Set the context and persona the assistant should use across interviews.</p>
            </div>

            <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
                            <FileText size={17} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-text-primary">Custom Instructions</h3>
                                {instructionsSaved && (
                                    <span className="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wide flex items-center gap-1">
                                        <Check size={8} /> Saved
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-text-secondary mt-0.5">Write instructions directly, or attach one local document to ingest as Markdown.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleImportFile}
                        disabled={isImporting}
                        className="shrink-0 h-8 px-2.5 rounded-lg bg-bg-input border border-border-subtle text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:border-[var(--accent-border)] transition-colors flex items-center gap-1.5 disabled:opacity-60"
                    >
                        {isImporting ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>{attachedFileName ? 'Change file' : 'Choose file'}</span>
                    </button>
                </div>

                {attachedFileName && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-input px-3 py-2">
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{attachedFileName}</p>
                            <p className="text-[10px] text-text-tertiary">Ingested into these custom instructions. Choosing another file replaces this one.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove attached file"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                <textarea
                    value={manualInstructions}
                    onChange={(event) => handleManualChange(event.target.value)}
                    placeholder="Example: Prefer concise interview answers. Use my selected docs as background. When unsure, say what context is missing."
                    rows={8}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-all resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between px-0.5">
                    <p className="text-[10px] text-text-tertiary">Auto-saved. File content is saved with the instructions as Markdown.</p>
                    <span className="text-[10px] tabular-nums text-text-tertiary">{manualInstructions.length} chars</span>
                </div>
            </div>

            <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-bg-input border border-border-subtle flex items-center justify-center text-accent-primary shrink-0">
                        <Sparkles size={17} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary">AI Persona</h3>
                            {personaSaved && (
                                <span className="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wide flex items-center gap-1">
                                    <Check size={8} /> Saved
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">Set the assistant's behavior, voice, and role.</p>
                    </div>
                </div>
                <textarea
                    value={persona}
                    onChange={(event) => handlePersonaChange(event.target.value)}
                    placeholder="Example: Act as a senior interview coach. Be direct, calm, and practical. Answer as me when the interviewer asks a question."
                    rows={6}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-all resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between px-0.5">
                    <p className="text-[10px] text-text-tertiary">Auto-saved.</p>
                    <span className="text-[10px] tabular-nums text-text-tertiary">{persona.length} chars</span>
                </div>
            </div>

            {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-[11px] text-red-500 font-medium">
                    <X size={12} /> {error}
                </div>
            )}
        </div>
    );
};
