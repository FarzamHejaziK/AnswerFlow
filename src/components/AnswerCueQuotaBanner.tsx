// src/components/AnswerCueQuotaBanner.tsx
// Startup banner shown when any AnswerCue quota bucket reaches ≥90% usage.
// Checks on every startup — no throttle.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ArrowUpRight } from 'lucide-react';

interface QuotaBucket { used: number; limit: number; remaining: number; }

interface NearLimitBucket {
    label: string;
    used: number;
    limit: number;
    pct: number;
}

const STARTUP_DELAY_MS = 3000;
const THRESHOLD_PCT    = 90;
const UPGRADE_URL      = 'https://checkout.dodopayments.com/buy/pdt_0NbFixGmD8CSeawb5qvVl';

export const AnswerCueQuotaBanner: React.FC = () => {
    const [nearLimitBuckets, setNearLimitBuckets] = useState<NearLimitBucket[]>([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            await new Promise(r => setTimeout(r, STARTUP_DELAY_MS));
            if (cancelled) return;

            try {
                const result = await window.electronAPI?.getAnswerCueUsage?.();
                console.log('[AnswerCueQuotaBanner] usage:', JSON.stringify(result));

                if (cancelled || !result?.ok || !result.quota) {
                    console.log('[AnswerCueQuotaBanner] no quota data — skipping');
                    return;
                }

                const { transcription, ai, search } = result.quota as {
                    transcription: QuotaBucket;
                    ai: QuotaBucket;
                    search: QuotaBucket;
                };

                const near: NearLimitBucket[] = (
                    [
                        { label: 'AI requests',   bucket: ai            },
                        { label: 'Transcription', bucket: transcription },
                        { label: 'Web searches',  bucket: search        },
                    ] as Array<{ label: string; bucket: QuotaBucket }>
                )
                    .filter(({ bucket }) => bucket.limit > 0 && (bucket.used / bucket.limit) * 100 >= THRESHOLD_PCT)
                    .map(({ label, bucket }) => ({
                        label,
                        used:  bucket.used,
                        limit: bucket.limit,
                        pct:   Math.round((bucket.used / bucket.limit) * 100),
                    }));

                console.log('[AnswerCueQuotaBanner] near-limit:', near);

                if (near.length === 0) return;

                setNearLimitBuckets(near);
                setVisible(true);
            } catch (e: any) {
                console.log('[AnswerCueQuotaBanner] error:', e?.message);
            }
        };

        check();
        return () => { cancelled = true; };
    }, []);

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: 16,  scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className="fixed bottom-6 right-6 z-[9999] pointer-events-auto w-[320px]"
            >
                <div className="bg-[#1A1A1A] border border-amber-500/25 shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-[1px]" strokeWidth={2} />
                            <span className="text-[13px] font-semibold text-[#E0E0E0]">AnswerCue quota almost full</span>
                        </div>
                        <button
                            onClick={() => setVisible(false)}
                            className="text-white/30 hover:text-white/70 transition-colors shrink-0 cursor-pointer"
                        >
                            <X size={14} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Bucket list */}
                    <div className="flex flex-col gap-1.5">
                        {nearLimitBuckets.map(({ label, used, limit, pct }) => (
                            <div key={label} className="flex items-center justify-between">
                                <span className="text-[12px] text-white/50">{label}</span>
                                <span className={`text-[12px] font-medium tabular-nums ${pct >= 100 ? 'text-red-400' : 'text-amber-400'}`}>
                                    {used.toLocaleString()} / {limit.toLocaleString()} ({pct}%)
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] text-white/30">Resets on your next billing date</span>
                        <button
                            onClick={() => (window.electronAPI as any)?.openExternal?.(UPGRADE_URL)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                            Upgrade <ArrowUpRight size={11} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
