import type { Metadata } from "next";
import "./globals.css";

const SITE = "https://answercue.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "AnswerCue — Free AI Interview Assistant",
  description:
    "AnswerCue is a free desktop interview assistant. Bring your own AI model, upload your docs per interview, and control exactly what the assistant remembers and says. Stop paying $1,000s for closed subscriptions.",
  keywords: [
    "interview assistant",
    "AI interview copilot",
    "free interview assistant",
    "bring your own model",
    "live transcription",
    "AnswerCue",
  ],
  openGraph: {
    title: "AnswerCue — Free AI Interview Assistant",
    description:
      "Free, bring-your-own-model interview copilot. Upload docs per interview and control exactly what it remembers and says.",
    url: SITE,
    siteName: "AnswerCue",
    images: [{ url: "/banner.png", width: 1200, height: 432, alt: "AnswerCue" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnswerCue — Free AI Interview Assistant",
    description:
      "Free, bring-your-own-model interview copilot. Upload docs per interview and control exactly what it remembers and says.",
    images: ["/banner.png"],
  },
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f3f2fb" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <div className="mesh" />
        <div className="mesh-rotate" />
        <div className="vignette" />
        <div className="grain" />
        {children}
      </body>
    </html>
  );
}
