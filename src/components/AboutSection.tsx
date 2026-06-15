import React from 'react';
import {
    Bug,
    Cpu,
    Database,
    DownloadCloud,
    LayoutGrid,
    MicOff,
    Monitor,
    Shield,
    Star,
    Volume2,
    Zap,
} from 'lucide-react';
import packageJson from '../../package.json';

interface AboutSectionProps { }

const REPO_URL = 'https://github.com/FarzamHejaziK/AnswerFlow';

export const AboutSection: React.FC<AboutSectionProps> = () => {
    const handleOpenLink = (event: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        event.preventDefault();
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="space-y-6 animated fadeIn pb-10">
            <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">About AnswerFlow</h3>
                <p className="text-sm text-text-secondary">
                    A desktop interview workspace for preparation, live transcription, AI-guided answers, and post-interview follow-up.
                </p>
                <p className="mt-2 text-xs text-text-tertiary">Version {packageJson.version}</p>
            </div>

            <div>
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">What's New in v{packageJson.version}</h4>
                <div className="bg-bg-item-surface rounded-xl border border-border-subtle overflow-hidden">
                    <FeatureRow
                        icon={<LayoutGrid size={20} />}
                        color="text-indigo-400"
                        bg="bg-indigo-500/10"
                        title="Interview-first workspace"
                        description="The launcher now follows a three-pane interview flow with prep chat, selected documents, transcript history, and post-interview chat separated clearly."
                    />
                    <FeatureRow
                        icon={<Volume2 size={20} />}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                        title="Packaged local transcription"
                        description="Audio setup is simplified around the bundled Moonshine Base transcription model, with input and output device controls shown where users need them."
                    />
                    <FeatureRow
                        icon={<Cpu size={20} />}
                        color="text-purple-400"
                        bg="bg-purple-500/10"
                        title="Focused model support"
                        description="AI provider setup now centers on OpenAI, Google Gemini, and Anthropic, with Claude limited to supported Opus and Sonnet 4.6 models."
                    />
                    <FeatureRow
                        icon={<DownloadCloud size={20} />}
                        color="text-sky-400"
                        bg="bg-sky-500/10"
                        title="Inline app updates"
                        description="AnswerFlow checks GitHub Releases and shows a quiet sidebar update row when a newer version is available."
                        last
                    />
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">How AnswerFlow Works</h4>
                <div className="bg-bg-item-surface rounded-xl border border-border-subtle overflow-hidden">
                    <FeatureRow
                        icon={<Database size={20} />}
                        color="text-emerald-400"
                        bg="bg-emerald-500/10"
                        title="Context before the interview"
                        description="Prep chat, uploaded documents, custom instructions, and selected document markdown become live interview context."
                    />
                    <FeatureRow
                        icon={<Monitor size={20} />}
                        color="text-cyan-400"
                        bg="bg-cyan-500/10"
                        title="Live interview assistance"
                        description="AnswerFlow captures microphone and meeting audio, keeps interviewer and candidate transcript messages distinct, and generates fast answer support."
                    />
                    <FeatureRow
                        icon={<Zap size={20} />}
                        color="text-amber-400"
                        bg="bg-amber-500/10"
                        title="Follow-up after the interview"
                        description="The saved interview can be reopened later with prep chat, selected docs, transcript, and AI responses available as chat context."
                        last
                    />
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Privacy & Data</h4>
                <div className="bg-bg-item-surface rounded-xl border border-border-subtle p-5 space-y-4">
                    <InfoRow
                        icon={<Shield size={16} className="text-green-400 mt-0.5" />}
                        title="User-controlled context"
                        description="You choose which documents, instructions, and interview notes are used. Local document ingestion converts supported files into markdown before they are added to context."
                    />
                    <InfoRow
                        icon={<MicOff size={16} className="text-red-400 mt-0.5" />}
                        title="No always-on recording"
                        description="AnswerFlow listens only during active interview flows and does not take screenshots or analyze the screen without an explicit command."
                    />
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Platforms</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <PlatformCard title="macOS" detail="Apple Silicon and Intel builds via DMG and ZIP." />
                    <PlatformCard title="Windows" detail="Intel x64 NSIS installer with in-place updates." />
                    <PlatformCard title="Linux" detail="AppImage and Debian package targets remain configured." />
                </div>
            </div>

            <div>
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2 px-1">Project</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionCard
                        href={REPO_URL}
                        onOpen={handleOpenLink}
                        icon={<Star size={20} className="transition-all group-hover:fill-current" />}
                        title="Star on GitHub"
                        description="Follow AnswerFlow development and releases."
                        color="text-yellow-500"
                        bg="bg-yellow-500/10"
                    />
                    <ActionCard
                        href={`${REPO_URL}/issues`}
                        onOpen={handleOpenLink}
                        icon={<Bug size={20} />}
                        title="Report an Issue"
                        description="Found a bug or release problem? Open an issue."
                        color="text-red-500"
                        bg="bg-red-500/10"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-border-subtle">
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Core Technology</h4>
                <div className="flex flex-wrap gap-2">
                    {['Electron', 'React', 'Rust', 'Sharp', 'TypeScript', 'Tailwind CSS', 'Vite', 'SQLite', 'OpenAI', 'Gemini', 'Claude'].map(tech => (
                        <span key={tech} className="px-2.5 py-1 rounded-md bg-bg-input border border-border-subtle text-[11px] font-medium text-text-secondary">
                            {tech}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const FeatureRow: React.FC<{
    icon: React.ReactNode;
    color: string;
    bg: string;
    title: string;
    description: string;
    last?: boolean;
}> = ({ icon, color, bg, title, description, last = false }) => (
    <div className={`p-3 bg-bg-card/50 ${last ? '' : 'border-b border-border-subtle'}`}>
        <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center ${color} shrink-0`}>
                {icon}
            </div>
            <div>
                <h5 className="text-sm font-bold text-text-primary mb-1">{title}</h5>
                <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
            </div>
        </div>
    </div>
);

const InfoRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
}> = ({ icon, title, description }) => (
    <div className="flex items-start gap-3">
        {icon}
        <div>
            <h5 className="text-sm font-medium text-text-primary">{title}</h5>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</p>
        </div>
    </div>
);

const PlatformCard: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
    <div className="bg-bg-item-surface border border-border-subtle rounded-xl p-4">
        <h5 className="text-sm font-bold text-text-primary">{title}</h5>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{detail}</p>
    </div>
);

const ActionCard: React.FC<{
    href: string;
    onOpen: (event: React.MouseEvent<HTMLAnchorElement>, url: string) => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    bg: string;
}> = ({ href, onOpen, icon, title, description, color, bg }) => (
    <a
        href={href}
        onClick={(event) => onOpen(event, href)}
        className="bg-bg-item-surface border border-border-subtle rounded-xl p-5 transition-all group flex items-center gap-4 h-full hover:bg-white/10"
    >
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center ${color} shrink-0 group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <h5 className="text-sm font-bold text-text-primary">{title}</h5>
            <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>
    </a>
);
