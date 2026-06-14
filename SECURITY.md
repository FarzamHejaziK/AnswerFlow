# Security Policy

_Last updated: June 14, 2026_

AnswerFlow is a desktop interview assistant that handles sensitive local data: audio, transcript text, user documents, provider keys, screenshots when enabled, and interview history. Please treat security and privacy issues seriously.

## Supported Versions

Security fixes target the current release line on GitHub:

<https://github.com/FarzamHejaziK/AnswerFlow/releases>

Older versions may not receive fixes. Please reproduce issues on the latest release or current `main` before reporting when possible.

## Reporting A Vulnerability

Do not report security vulnerabilities through public issues, public discussions, social media, or blog posts before a fix is available.

Open a private GitHub security advisory draft here:

<https://github.com/FarzamHejaziK/AnswerFlow/security/advisories>

If GitHub advisories are unavailable, contact the repository owner through the GitHub profile associated with this repository and avoid posting exploit details publicly.

## What To Include

Please include:

1. Affected version or commit.
2. Operating system and architecture.
3. Affected component: Electron main process, preload bridge, renderer, native audio, document ingestion, updater, provider routing, persistence, or UI.
4. Reproduction steps.
5. Impact and data exposed or controlled.
6. Proof of concept if practical.
7. Any suggested mitigation.

## High-Value Areas

Security reports are especially useful for:

- IPC and preload bridge exposure.
- Provider-key storage and redaction.
- Prompt/context data accidentally sent to the wrong provider.
- Document ingestion path traversal or unsafe file parsing.
- Local transcript and interview-history persistence.
- Auto-update integrity.
- Audio and screen-capture privacy boundaries.
- Debug logs leaking sensitive user data.

## Out Of Scope

The following are normally out of scope unless they expose user data or enable local code execution:

- Model hallucinations.
- Generic prompt jailbreaks.
- Reports without a concrete exploit path.
- Social engineering.
- Issues requiring full physical access to an unlocked machine.
- Automated scanner output without manual verification.

## Privacy Boundary

AnswerFlow should keep local data local unless the user explicitly uses a feature that sends prompt text to the selected LLM provider. The currently supported LLM provider keys are OpenAI, Google Gemini, and Anthropic Claude. Transcription uses the packaged local Moonshine Base model.

If you find a path where transcript, document Markdown, screenshots, custom instructions, provider keys, or interview history are sent somewhere unexpected, report it as security-sensitive.
