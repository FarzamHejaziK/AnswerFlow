import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { STANDARD_CLOUD_MODELS, prettifyModelId } from '../../utils/modelUtils';
import { ProviderCard } from './ProviderCard';

type ProviderId = 'openai' | 'gemini' | 'claude';
type ProviderDataScopeKey = 'transcript' | 'screenshots' | 'reference_files' | 'profile_history' | 'embeddings' | 'post_call_summary';
type ProviderDataScopes = Partial<Record<ProviderDataScopeKey, boolean>>;

interface ModelOption {
    id: string;
    name: string;
}

interface ModelSelectProps {
    value: string;
    options: ModelOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const PROVIDER_ORDER: ProviderId[] = ['openai', 'gemini', 'claude'];
const PROVIDER_DATA_SCOPE_OPTIONS: Array<{ key: ProviderDataScopeKey; label: string; description: string }> = [
    { key: 'transcript', label: 'Transcript', description: 'Live interview and meeting text.' },
    { key: 'screenshots', label: 'Screenshots', description: 'Screen context used for visual answers.' },
    { key: 'reference_files', label: 'Reference files', description: 'Selected docs and uploaded context.' },
    { key: 'profile_history', label: 'Profile history', description: 'Saved profile and prior interview context.' },
    { key: 'embeddings', label: 'Embeddings', description: 'Document chunks sent for vector indexing.' },
    { key: 'post_call_summary', label: 'Post-call summary', description: 'Finished interview summaries.' },
];

const PROVIDER_LABELS: Record<ProviderId, string> = {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
};

const PROVIDER_KEY_PLACEHOLDERS: Record<ProviderId, string> = {
    openai: 'sk-...',
    gemini: 'AIzaSy...',
    claude: 'sk-ant-...',
};

const PROVIDER_KEY_URLS: Record<ProviderId, string> = {
    openai: 'https://platform.openai.com/api-keys',
    gemini: 'https://aistudio.google.com/app/apikey',
    claude: 'https://console.anthropic.com/settings/keys',
};

const ModelSelect: React.FC<ModelSelectProps> = ({ value, options, onChange, placeholder = 'Select model', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(option => option.id === value);
    const paddingClass = className.includes('py-') ? '' : 'py-1.5';

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-48 bg-bg-input border border-border-subtle rounded-lg px-3 ${paddingClass} ${className} text-xs text-text-primary focus:outline-none focus:border-accent-primary flex items-center justify-between hover:bg-bg-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                type="button"
                disabled={options.length === 0}
            >
                <span className="truncate pr-2">{selectedOption ? selectedOption.name : placeholder}</span>
                <ChevronDown size={14} className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-full bg-bg-elevated border border-border-subtle rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animated fadeIn">
                    <div className="p-1 space-y-0.5">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    onChange(option.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between group transition-colors ${value === option.id ? 'bg-bg-input hover:bg-bg-elevated text-text-primary' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                type="button"
                            >
                                <span className="truncate">{option.name}</span>
                                {value === option.id && <Check size={14} className="text-accent-primary shrink-0 ml-2" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const AIProvidersSettings: React.FC = () => {
    const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>({
        openai: '',
        gemini: '',
        claude: '',
    });
    const [hasStoredKey, setHasStoredKey] = useState<Record<ProviderId, boolean>>({
        openai: false,
        gemini: false,
        claude: false,
    });
    const [preferredModels, setPreferredModels] = useState<Record<string, string>>({});
    const [defaultModel, setDefaultModel] = useState('');
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({});
    const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});
    const [testError, setTestError] = useState<Record<string, string>>({});
    const [providerDataScopes, setProviderDataScopes] = useState<ProviderDataScopes>({});

    useEffect(() => {
        const loadCredentials = async () => {
            try {
                const creds = await window.electronAPI?.getStoredCredentials?.();
                if (creds) {
                    setHasStoredKey({
                        openai: !!creds.hasOpenaiKey,
                        gemini: !!creds.hasGeminiKey,
                        claude: !!creds.hasClaudeKey,
                    });

                    const nextPreferred: Record<string, string> = {};
                    if (creds.openaiPreferredModel) nextPreferred.openai = creds.openaiPreferredModel;
                    if (creds.geminiPreferredModel) nextPreferred.gemini = creds.geminiPreferredModel;
                    if (creds.claudePreferredModel) nextPreferred.claude = creds.claudePreferredModel;
                    setPreferredModels(nextPreferred);
                }

                const result = await window.electronAPI?.getDefaultModel?.();
                if (result?.model && result.model !== 'natively') {
                    setDefaultModel(result.model);
                }
            } catch (error) {
                console.error('Failed to load AI provider settings:', error);
            } finally {
                setCredentialsLoaded(true);
            }
        };

        loadCredentials();
    }, []);

    useEffect(() => {
        window.electronAPI?.getProviderDataScopes?.().then(setProviderDataScopes).catch(console.error);
        const unsubscribeProviderDataScopes = window.electronAPI?.onProviderDataScopesChanged
            ? window.electronAPI.onProviderDataScopesChanged(setProviderDataScopes)
            : undefined;
        return () => unsubscribeProviderDataScopes?.();
    }, []);

    const defaultModelOptions = useMemo<ModelOption[]>(() => {
        const options: ModelOption[] = [];

        for (const provider of PROVIDER_ORDER) {
            const config = STANDARD_CLOUD_MODELS[provider];
            if (!config || !hasStoredKey[provider]) continue;

            config.ids.forEach((id, index) => {
                options.push({ id, name: config.names[index] || prettifyModelId(id) });
            });

            const preferredModel = preferredModels[provider];
            if (preferredModel && !config.ids.includes(preferredModel)) {
                options.push({ id: preferredModel, name: prettifyModelId(preferredModel) });
            }
        }

        return options;
    }, [hasStoredKey, preferredModels]);

    useEffect(() => {
        if (!credentialsLoaded || defaultModelOptions.length === 0) return;
        if (defaultModel && defaultModelOptions.some(option => option.id === defaultModel)) return;

        const nextModel = defaultModelOptions[0].id;
        setDefaultModel(nextModel);
        window.electronAPI?.setDefaultModel?.(nextModel).catch(console.error);
    }, [credentialsLoaded, defaultModel, defaultModelOptions]);

    const setProviderKey = (provider: ProviderId, value: string) => {
        setApiKeys(prev => ({ ...prev, [provider]: value }));
    };

    const handleSaveKey = async (provider: ProviderId) => {
        const key = apiKeys[provider].trim();
        if (!key) return;

        setSavingStatus(prev => ({ ...prev, [provider]: true }));
        try {
            let result;
            if (provider === 'openai') result = await window.electronAPI?.setOpenaiApiKey?.(key);
            if (provider === 'gemini') result = await window.electronAPI?.setGeminiApiKey?.(key);
            if (provider === 'claude') result = await window.electronAPI?.setClaudeApiKey?.(key);

            if (result?.success) {
                setSavedStatus(prev => ({ ...prev, [provider]: true }));
                setHasStoredKey(prev => ({ ...prev, [provider]: true }));
                setProviderKey(provider, '');
                setTimeout(() => setSavedStatus(prev => ({ ...prev, [provider]: false })), 2000);
            }
        } catch (error) {
            console.error(`Failed to save ${provider} API key:`, error);
        } finally {
            setSavingStatus(prev => ({ ...prev, [provider]: false }));
        }
    };

    const handleRemoveKey = async (provider: ProviderId) => {
        if (!confirm(`Are you sure you want to remove the ${PROVIDER_LABELS[provider]} API key?`)) return;

        try {
            let result;
            if (provider === 'openai') result = await window.electronAPI?.setOpenaiApiKey?.('');
            if (provider === 'gemini') result = await window.electronAPI?.setGeminiApiKey?.('');
            if (provider === 'claude') result = await window.electronAPI?.setClaudeApiKey?.('');

            if (result?.success) {
                setHasStoredKey(prev => ({ ...prev, [provider]: false }));
                setProviderKey(provider, '');
            }
        } catch (error) {
            console.error(`Failed to remove ${provider} API key:`, error);
        }
    };

    const handleTestConnection = async (provider: ProviderId) => {
        const key = apiKeys[provider].trim();
        if (!key && !hasStoredKey[provider]) return;

        setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
        setTestError(prev => ({ ...prev, [provider]: '' }));

        try {
            const result = await window.electronAPI?.testLlmConnection?.(provider, key);
            if (result?.success) {
                setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
                setTimeout(() => setTestStatus(prev => ({ ...prev, [provider]: 'idle' })), 3000);
            } else {
                setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
                setTestError(prev => ({ ...prev, [provider]: result?.error || 'Connection failed' }));
            }
        } catch (error: any) {
            setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
            setTestError(prev => ({ ...prev, [provider]: error.message || 'Connection failed' }));
        }
    };

    const handlePreferredModelChange = (provider: ProviderId, model: string) => {
        setPreferredModels(prev => ({ ...prev, [provider]: model }));
    };

    const handleProviderDataScopeChange = (scope: ProviderDataScopeKey, enabled: boolean) => {
        const next = { ...providerDataScopes, [scope]: enabled };
        setProviderDataScopes(next);
        window.electronAPI?.setProviderDataScopes?.(next).catch(console.error);
    };

    return (
        <div className="space-y-5 animated fadeIn pb-10">
            <div className="space-y-5">
                <div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">Default Model for Chat</h3>
                    <p className="text-xs text-text-secondary mb-2">Choose from configured OpenAI, Google, and Anthropic models.</p>
                </div>

                <div className="bg-bg-item-surface rounded-xl p-5 border border-border-subtle flex items-center justify-between">
                    <div>
                        <label className="block text-xs font-medium text-text-primary uppercase tracking-wide mb-0">Active Model</label>
                        <p className="text-[10px] text-text-secondary">Applies to new chats instantly.</p>
                    </div>
                    <ModelSelect
                        value={defaultModel}
                        options={defaultModelOptions}
                        placeholder={defaultModelOptions.length ? 'Select model' : 'Add a provider key first'}
                        onChange={(value) => {
                            setDefaultModel(value);
                            window.electronAPI?.setDefaultModel?.(value).catch(console.error);
                        }}
                    />
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">AI Providers</h3>
                    <p className="text-xs text-text-secondary mb-2">Add one or more provider keys. Only OpenAI, Google, and Anthropic are shown here.</p>
                </div>

                <div className="space-y-4">
                    {PROVIDER_ORDER.map(provider => (
                        <ProviderCard
                            key={provider}
                            providerId={provider}
                            providerName={PROVIDER_LABELS[provider]}
                            apiKey={apiKeys[provider]}
                            preferredModel={preferredModels[provider]}
                            hasStoredKey={hasStoredKey[provider]}
                            onKeyChange={(value) => setProviderKey(provider, value)}
                            onSaveKey={() => handleSaveKey(provider)}
                            onRemoveKey={() => handleRemoveKey(provider)}
                            onTestConnection={() => handleTestConnection(provider)}
                            testStatus={testStatus[provider] || 'idle'}
                            testError={testError[provider]}
                            savingStatus={!!savingStatus[provider]}
                            savedStatus={!!savedStatus[provider]}
                            keyPlaceholder={PROVIDER_KEY_PLACEHOLDERS[provider]}
                            keyUrl={PROVIDER_KEY_URLS[provider]}
                            onPreferredModelChange={(model) => handlePreferredModelChange(provider, model)}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-text-primary mb-1">Cloud provider data scopes</h3>
                    <p className="text-xs text-text-secondary mb-2">Choose what app context cloud providers may receive.</p>
                </div>
                <div className="bg-bg-item-surface rounded-xl p-4 border border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PROVIDER_DATA_SCOPE_OPTIONS.map(option => (
                        <label
                            key={option.key}
                            className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-input/70 px-3 py-3 cursor-pointer hover:bg-bg-elevated transition-colors"
                        >
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 accent-accent-primary"
                                checked={providerDataScopes[option.key] !== false}
                                onChange={(event) => handleProviderDataScopeChange(option.key, event.target.checked)}
                            />
                            <span className="min-w-0">
                                <span className="block text-xs font-semibold text-text-primary">{option.label}</span>
                                <span className="block text-[10px] leading-snug text-text-secondary">{option.description}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};
