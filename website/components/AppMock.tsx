/**
 * A stylized mock of the AnswerCue live-interview UI. Pure CSS/JSX — no image —
 * so it stays crisp at any size and sells the actual product experience.
 */
export default function AppMock() {
  return (
    <div className="relative">
      {/* glow behind the window */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand-gradient opacity-25 blur-3xl" />

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b14]/90 shadow-2xl backdrop-blur">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-2 text-xs font-medium text-white/50">AnswerCue — Live Interview</div>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-purple" /> Claude
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-400 ring-1 ring-red-500/30">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-red-500" /> REC
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-px bg-white/5 sm:grid-cols-[1.1fr_1fr]">
          {/* Transcript column */}
          <div className="space-y-3 bg-[#0b0b14] p-4 sm:p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
              Live transcript
            </div>
            <Bubble who="Interviewer" tone="them">
              Can you walk me through how you’d design a rate limiter for our API?
            </Bubble>
            <Bubble who="You" tone="me">
              Sure — I’d start with the requirements…
            </Bubble>
            <Bubble who="Interviewer" tone="them">
              What about distributed traffic across regions?
            </Bubble>
            <div className="flex items-center gap-1.5 pl-1 pt-1 text-white/40">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white/50" />
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white/50 [animation-delay:200ms]" />
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white/50 [animation-delay:400ms]" />
              <span className="ml-1 text-[11px]">listening…</span>
            </div>
          </div>

          {/* AI answer column */}
          <div className="relative space-y-3 bg-[#0c0c16] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                AnswerCue suggests
              </div>
              <span className="text-[10px] text-white/30">using your prep + 2 docs</span>
            </div>

            <div className="relative rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="glow-ring opacity-60" />
              <p className="text-[13px] leading-relaxed text-white/80">
                Use a <span className="text-brand-pink">token-bucket</span> per client, backed by{" "}
                <span className="text-brand-blue">Redis</span> for shared state. For multi-region,
                replicate counters with a short TTL and reconcile async — trading a little accuracy
                for low latency.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Mentions your Redis project", "Stays concise", "Technical persona"].map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-brand-indigo/15 px-2 py-0.5 text-[10px] font-medium text-brand-blue ring-1 ring-brand-indigo/25"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                Context attached
              </div>
              <div className="mt-2 space-y-1.5 text-[11px] text-white/60">
                <div className="flex items-center gap-2">
                  <Dot /> Resume_2026.pdf
                </div>
                <div className="flex items-center gap-2">
                  <Dot /> Job_description.md
                </div>
                <div className="flex items-center gap-2">
                  <Dot /> Prep notes
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  who,
  tone,
  children,
}: {
  who: string;
  tone: "them" | "me";
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">{who}</div>
      <div
        className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
          tone === "them"
            ? "bg-white/[0.05] text-white/80"
            : "bg-brand-indigo/15 text-white/85 ring-1 ring-brand-indigo/20"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gradient" />;
}
