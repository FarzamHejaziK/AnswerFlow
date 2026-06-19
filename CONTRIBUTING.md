# Contributing to AnswerCue

Thank you for helping improve AnswerCue. This fork is focused on a clean interview-assistant experience: prep chat, reusable document context, live transcript, AI answer generation, and post-interview follow-up chat.

## Before You Start

- Open issues and pull requests against `https://github.com/FarzamHejaziK/AnswerCue`.
- Keep changes focused and easy to review.
- Preserve AGPL-3.0 license notices.
- Do not commit API keys, logs with secrets, generated local databases, or build artifacts.

## Local Development

Recommended stack:

- Node.js 20+ or 22 LTS
- npm
- Rust and Cargo
- Xcode Command Line Tools on macOS

Setup:

```bash
npm install
npm run build:native
```

Run:

```bash
npm start
```

This starts Vite on `http://localhost:5180` and launches Electron.

Fast verification:

```bash
npm run build:electron
npx tsc --noEmit
```

Run the full service test suite only when needed:

```bash
npm test
```

## Product Expectations

When making user-facing changes, keep the current AnswerCue workflow intact:

1. First-run setup collects provider keys and permissions.
2. New Interview opens a prep page, not an active recording.
3. Prep chat messages receive assistant responses.
4. Uploaded documents are ingested locally into Markdown and can be reused.
5. Attached documents are visible in message history and clear from the composer after send.
6. Live interview transcript clearly separates Interviewer, Me, and AI response.
7. Interview finished appears as a scrollable boundary after the last transcript item.
8. Post-interview chat continues with prep context, selected docs, transcript, and AI responses.
9. Settings exposes only the supported AI provider keys: OpenAI, Google Gemini, and Anthropic Claude.
10. Transcription uses the packaged local Moonshine Base model and should not expose speech-provider selection.

## Pull Requests

- Use clear titles.
- Explain the user-facing behavior change.
- Include screenshots or short recordings for UI changes.
- Mention manual test steps.
- Add focused tests when the change touches persistence, prompt construction, document ingestion, audio, or provider routing.

## Branching

Use short descriptive branch names. For Codex-generated work, the default branch prefix is `codex/`.

Push to `origin`, not `upstream`.

To bring in upstream changes:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

Prefer merge over rebase on public/shared branches.
