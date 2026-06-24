import Image from "next/image";
import DownloadButton from "@/components/DownloadButton";
import AppMock from "@/components/AppMock";
import Reveal from "@/components/Reveal";
import Spotlight from "@/components/Spotlight";
import { getLatestRelease, REPO_URL } from "@/lib/github";

export const revalidate = 1800;

const GitHubIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
  </svg>
);

const EyeOff = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

const Check = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const STEALTH_POINTS: [string, string][] = [
  ["Hidden from screen sharing", "Share your whole screen on Zoom, Meet, or Teams — AnswerCue stays off the image everyone else sees."],
  ["Invisible in recordings & screenshots", "Screen recordings and screenshots come out clean. The overlay simply isn't in the captured frame."],
  ["No bot in the participant list", "AnswerCue never joins the meeting, so there's no extra name or bot for anyone to notice."],
  ["Skips the share picker", "It doesn't show up as a shareable window when someone chooses what to share."],
  ["Out of the app switcher", "Undetectable Mode keeps it from stealing focus or appearing in ⌘-Tab / Alt-Tab."],
  ["Driven by global hotkeys", "Read answers and move the overlay with keyboard shortcuts — no visible clicking around."],
];

export default async function Home() {
  const release = await getLatestRelease();
  const version = release.tag || "v2.7.4";

  return (
    <main className="relative">
      <Spotlight />
      {/* ---------- Background ambience ---------- */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora animate-drift left-[-12%] top-[-10%] h-[480px] w-[480px] bg-brand-blue/50" />
        <div className="aurora animate-drift right-[-10%] top-[-4%] h-[420px] w-[420px] bg-brand-pink/50 [animation-delay:-5s]" />
        <div className="aurora animate-drift left-[25%] top-[140%] h-[520px] w-[520px] bg-brand-purple/40 [animation-delay:-9s]" />
        <div className="grid-overlay" />
      </div>

      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40">
        <div className="glass border-b border-black/[0.06]">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <a href="#top" className="flex items-center gap-2.5">
              <Image src="/icon.png" alt="AnswerCue" width={32} height={32} className="rounded-lg" />
              <span className="text-lg font-extrabold tracking-tight">
                Answer<span className="gradient-text">Cue</span>
              </span>
            </a>
            <div className="flex items-center gap-2 sm:gap-7">
              <a href="#stealth" className="hidden text-sm font-medium text-ink/60 transition hover:text-ink sm:block">
                Undetectable
              </a>
              <a href="#features" className="hidden text-sm font-medium text-ink/60 transition hover:text-ink sm:block">
                Features
              </a>
              <a href="#pricing" className="hidden text-sm font-medium text-ink/60 transition hover:text-ink sm:block">
                Pricing
              </a>
              <a href="#how" className="hidden text-sm font-medium text-ink/60 transition hover:text-ink sm:block">
                How it works
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 text-sm font-medium text-ink/60 transition hover:text-ink sm:flex"
              >
                <GitHubIcon className="h-4 w-4" /> GitHub
              </a>
              <a
                href="/api/download/mac-arm"
                className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-95"
              >
                Download
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section id="top" className="relative mx-auto max-w-6xl px-6 pb-8 pt-20 text-center sm:pt-28">
        <Reveal>
          <a
            href={`${REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-ink/80 backdrop-blur transition hover:border-black/20"
          >
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-green-500/60" />
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="font-bold text-ink">100% free</span>
            <span className="text-ink/30">·</span> open source
            <span className="text-ink/30">·</span> {version}
            <span className="text-ink/40 transition group-hover:translate-x-0.5">→</span>
          </a>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mx-auto mt-8 max-w-4xl text-balance text-5xl font-extrabold leading-[1.04] tracking-tight sm:text-7xl">
            Ace every interview with
            <br />
            <span className="gradient-text">your own AI copilot</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink/55 sm:text-xl">
            <span className="font-semibold text-ink">Completely free.</span> AnswerCue hears your live
            interview, understands your prep, and helps you answer in real time — with your own model,
            your own docs, and full control over what it remembers and says.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <a
            href="#stealth"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-brand-indigo/25 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/80 shadow-sm backdrop-blur transition hover:border-brand-indigo/50"
          >
            <EyeOff className="h-4 w-4 text-brand-indigo" />
            Invisible to screen-share, recordings &amp; the participant list
            <span className="text-brand-indigo">See how →</span>
          </a>
        </Reveal>

        <Reveal delay={260}>
          <div className="mt-8 flex flex-col items-center gap-5">
            <DownloadButton />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-ink/50 transition hover:text-ink"
            >
              <GitHubIcon className="h-4 w-4" /> Star it on GitHub
            </a>
          </div>
        </Reveal>

        {/* App mockup */}
        <Reveal delay={300}>
          <div className="animate-floaty mx-auto mt-16 max-w-4xl">
            <AppMock />
          </div>
        </Reveal>
      </section>

      {/* ---------- Undetectable ---------- */}
      <section id="stealth" className="relative mx-auto mt-20 max-w-6xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white shadow-2xl sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand-purple/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-brand-blue/25 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  <EyeOff className="h-4 w-4" /> Undetectable by design
                </span>
                <h2 className="mt-5 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
                  They&rsquo;ll never know <span className="gradient-text">it&rsquo;s there</span>
                </h2>
                <p className="mt-4 max-w-md text-white/60">
                  AnswerCue lives in a window that screen-share and recording tools simply can&rsquo;t
                  capture &mdash; using the same OS-level content protection Zoom uses to hide its own
                  windows. No bot joins the call. Nothing shows up on the other side.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Zoom", "Google Meet", "Microsoft Teams", "Screen recordings", "OBS"].map((t) => (
                    <span key={t} className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-white/55 ring-1 ring-white/10">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {STEALTH_POINTS.map(([title, body]) => (
                  <li key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold leading-snug">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/55">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative mt-9 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/40">
              Undetectable Mode uses OS-level capture exclusion (WDA_EXCLUDEFROMCAPTURE on Windows,
              NSWindowSharingNone on macOS). Coverage is broadest on macOS 2020+ and Windows 11 Pro;
              some older OS versions and certain full-screen-share modes aren&rsquo;t covered, and no
              software can stop someone photographing your screen &mdash; so do a quick test run before
              you rely on it.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---------- Model marquee ---------- */}
      <section className="relative mx-auto mt-16 max-w-5xl px-6">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-ink/40">
            Bring your own model — no lock-in
          </p>
          <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="marquee py-2">
              {[...PROVIDERS, ...PROVIDERS].map((p, i) => (
                <span key={i} className="whitespace-nowrap text-xl font-bold text-ink/30">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- Features (bento) ---------- */}
      <section id="features" className="relative mx-auto mt-28 max-w-6xl px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-purple">Yours to shape</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Built around <span className="gradient-text">your</span> interview
            </h2>
            <p className="mt-4 text-lg text-ink/55">Not a one-size-fits-all black box. Every part is under your control.</p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* wide hero feature */}
          <Reveal className="sm:col-span-2 lg:col-span-2">
            <div className="gcard h-full overflow-hidden p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <FeatureIcon path="M12 2l2.4 6.9H22l-6 4.6 2.3 7L12 16.9 5.7 20.5 8 13.5l-6-4.6h7.6z" />
                  <h3 className="mt-5 text-2xl font-bold">Bring any model you want</h3>
                  <p className="mt-2 max-w-md text-ink/55">
                    Plug in your own key for OpenAI, Google Gemini, or Anthropic Claude and switch
                    models per interview. You only ever pay your provider for the tokens you use.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
                  <span key={p} className="rounded-lg border border-black/[0.07] bg-white/70 px-3 py-1.5 text-sm font-medium text-ink/70">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <Feature
              title="Upload docs per interview"
              body="Drop in your resume, the job description, a portfolio, or company research — Markdown, TXT, PDF, or DOCX. Attach exactly the right docs each time."
              icon="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5"
            />
          </Reveal>
          <Reveal delay={120}>
            <Feature
              title="Control what it remembers"
              body="You decide what context it pulls in — prep chat, selected docs, transcript — so it answers with exactly the knowledge you choose."
              icon="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 4v5l3 3"
            />
          </Reveal>
          <Reveal delay={160}>
            <Feature
              title="Control what it says"
              body="Custom instructions and an AI persona tune the tone, depth, and style of every answer — concise and technical, or warm and conversational."
              icon="M4 4h16v12H7l-3 3z"
            />
          </Reveal>
          <Reveal delay={200}>
            <Feature
              title="Private, on-device transcription"
              body="Live speech is transcribed locally with the Moonshine model. Your interview audio never has to leave your machine."
              icon="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm-7 9a7 7 0 0 0 14 0M12 19v3"
            />
          </Reveal>
          <Reveal delay={240}>
            <Feature
              title="Prep → live → follow-up"
              body="Build context before, get real-time answers during, then keep chatting afterward with the full transcript and AI answers as context."
              icon="M3 12h4l3 8 4-16 3 8h4"
            />
          </Reveal>
        </div>
      </section>

      {/* ---------- Pricing / value prop ---------- */}
      <section id="pricing" className="relative mx-auto mt-28 max-w-5xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-black/[0.07] bg-white/70 p-8 shadow-[0_30px_80px_-40px_rgba(124,92,240,0.4)] backdrop-blur sm:p-12">
            <div className="glow-ring opacity-50" />
            <div className="grid items-center gap-10 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-pink">The price</p>
                <h2 className="mt-3 text-5xl font-extrabold sm:text-6xl">
                  <span className="gradient-text">$0</span>. Really.
                </h2>
                <p className="mt-5 text-lg text-ink/60">
                  Other interview copilots lock the good stuff behind{" "}
                  <span className="font-semibold text-ink">$1,000s a year</span> in subscriptions —
                  and force you onto their model and their rules. AnswerCue is free. You only pay your
                  own AI provider for the tokens you actually use.
                </p>
              </div>
              <div className="grid gap-3">
                {/* What YOU pay with AnswerCue */}
                <div className="flex items-center justify-between rounded-2xl bg-brand-gradient px-5 py-4 text-white shadow-glow">
                  <span className="flex items-center gap-2 font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    AnswerCue
                  </span>
                  <span className="font-extrabold">Always free</span>
                </div>

                {/* Competitors — explicitly labelled so nobody thinks these are our prices */}
                <p className="mt-3 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  What other apps charge
                </p>
                {(
                  [
                    ["Typical interview copilot", "$60–$120 / mo"],
                    ["“Pro” annual plans", "$1,000s / yr"],
                  ] as const
                ).map(([name, price]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-2xl bg-ink/[0.04] px-5 py-4 ring-1 ring-black/5"
                  >
                    <span className="font-semibold text-ink/60">{name}</span>
                    <span className="text-ink/40 line-through decoration-ink/30">{price}</span>
                  </div>
                ))}
                <p className="px-1 text-xs leading-relaxed text-ink/45">
                  Those are competitors’ prices — not ours. AnswerCue never charges you; you only pay
                  your own AI provider for tokens.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="relative mx-auto mt-28 max-w-5xl px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-purple">The flow</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">How it works</h2>
            <p className="mt-4 text-lg text-ink/55">From setup to follow-up in four steps.</p>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["01", "Set up once", "Add your AI provider key, pick audio devices, grant permissions."],
              ["02", "Prep the interview", "Chat to build context and attach the docs that matter."],
              ["03", "Go live", "AnswerCue transcribes and suggests answers in real time."],
              ["04", "Follow up", "Keep asking questions with the full interview as context."],
            ] as const
          ).map(([num, title, body], i) => (
            <Reveal key={num} delay={i * 90}>
              <div className="gcard h-full p-6">
                <div className="gradient-text text-4xl font-extrabold">{num}</div>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm text-ink/55">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="relative mx-auto mt-28 max-w-5xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.2rem] border border-black/[0.07] bg-white/70 px-8 py-16 text-center shadow-[0_30px_90px_-40px_rgba(124,92,240,0.5)] backdrop-blur sm:py-20">
            <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-64 w-[80%] rounded-full bg-brand-gradient opacity-30 blur-3xl" />
            <Image src="/icon.png" alt="" width={76} height={76} className="animate-floaty mx-auto rounded-2xl shadow-glow" />
            <h2 className="mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Your next interview, <span className="gradient-text">handled.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink/60">
              Download AnswerCue free, bring your own model, and walk in ready.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/api/download/mac-arm"
                className="rounded-2xl bg-brand-gradient px-8 py-4 text-lg font-bold text-white shadow-glow transition hover:opacity-95"
              >
                Download for Mac
              </a>
              <a
                href="/api/download/windows"
                className="rounded-2xl bg-white px-8 py-4 text-lg font-bold text-ink ring-1 ring-black/10 transition hover:bg-white/70"
              >
                Download for Windows
              </a>
            </div>
            <p className="mt-6 text-sm text-ink/45">{version} · Free forever · No account needed</p>
          </div>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="relative mx-auto mt-24 max-w-6xl px-6 pb-12">
        <div className="flex flex-col items-center justify-between gap-6 border-t border-black/10 pt-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="AnswerCue" width={28} height={28} className="rounded-md" />
            <span className="font-extrabold">
              Answer<span className="gradient-text">Cue</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink/55">
            <a href="#features" className="transition hover:text-ink">Features</a>
            <a href="#pricing" className="transition hover:text-ink">Pricing</a>
            <a href="#how" className="transition hover:text-ink">How it works</a>
            <a href={`${REPO_URL}/releases`} target="_blank" rel="noopener noreferrer" className="transition hover:text-ink">Releases</a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition hover:text-ink">
              <GitHubIcon className="h-4 w-4" /> GitHub
            </a>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-ink/40">
          © {new Date().getFullYear()} AnswerCue · Open source under AGPL-3.0 · Built for people who do their own homework.
        </p>
      </footer>
    </main>
  );
}

const PROVIDERS = ["OpenAI", "Google Gemini", "Anthropic Claude"];

function FeatureIcon({ path }: { path: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  );
}

function Feature({ title, body, icon }: { title: string; body: string; icon: string }) {
  return (
    <div className="gcard h-full p-7">
      <FeatureIcon path={icon} />
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-ink/55">{body}</p>
    </div>
  );
}
