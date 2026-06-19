"use client";

import { useEffect, useRef, useState } from "react";

type Detected = "mac-arm" | "mac-intel" | "windows" | "unknown";

function detect(): Detected {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (platform.includes("mac") || ua.includes("mac")) return "mac-arm";
  if (platform.includes("win") || ua.includes("win")) return "windows";
  return "unknown";
}

const LABELS: Record<string, string> = {
  "mac-arm": "Download for Mac",
  "mac-intel": "Download for Mac (Intel)",
  windows: "Download for Windows",
  unknown: "Download AnswerCue",
};

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.18-1.14 2.34-.69 1.01-1.4 2.01-2.52 2.03-1.1.02-1.45-.65-2.71-.65-1.25 0-1.64.63-2.68.67-1.08.04-1.9-1.09-2.59-2.1-1.42-2.05-2.5-5.79-1.05-8.32.72-1.25 2.01-2.05 3.41-2.07 1.06-.02 2.06.71 2.71.71.65 0 1.87-.88 3.15-.75.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.78 3.14M14.3 5.4c.57-.69.96-1.65.85-2.6-.83.03-1.83.55-2.42 1.24-.53.61-1 1.59-.87 2.52.92.07 1.87-.47 2.44-1.16" />
  </svg>
);

const WinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M3 5.6 10.3 4.6v6.8H3zM10.3 12.6v6.8L3 18.4v-5.8zM11.4 4.45 21 3v8.4h-9.6zM21 12.6V21l-9.6-1.45V12.6z" />
  </svg>
);

export default function DownloadButton() {
  const [os, setOs] = useState<Detected>("unknown");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setOs(detect()), []);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const primary = os === "unknown" ? "mac-arm" : os;
  const isMac = primary.startsWith("mac");

  return (
    <div ref={wrap} className="relative inline-flex flex-col items-center">
      <div className="flex items-stretch overflow-hidden rounded-2xl shadow-glow">
        <a
          href={`/api/download/${primary}`}
          className="flex items-center gap-2.5 bg-brand-gradient bg-[length:200%_auto] px-7 py-4 text-base font-bold text-white transition hover:bg-[position:100%] sm:text-lg"
        >
          {isMac ? <AppleIcon /> : <WinIcon />}
          {LABELS[primary]}
        </a>
        <button
          aria-label="More download options"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center border-l border-white/25 bg-brand-gradient bg-[length:200%_auto] px-3.5 text-white transition hover:bg-[position:100%]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute top-[115%] z-30 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white p-1 shadow-2xl shadow-brand-indigo/15">
          {(
            [
              ["mac-arm", "macOS · Apple Silicon", ".zip"],
              ["mac", "macOS · DMG installer", ".dmg"],
              ["mac-intel", "macOS · Intel", ".zip"],
              ["windows", "Windows", ".exe"],
            ] as const
          ).map(([key, label, ext]) => (
            <a
              key={key}
              href={`/api/download/${key}`}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-ink/80 transition hover:bg-ink/5"
            >
              <span className="font-medium">{label}</span>
              <span className="text-ink/30">{ext}</span>
            </a>
          ))}
        </div>
      )}

      <p className="mt-4 text-sm text-ink/45">Free forever · macOS &amp; Windows · No account needed</p>
    </div>
  );
}
