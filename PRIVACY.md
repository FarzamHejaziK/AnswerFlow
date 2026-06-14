# Privacy Policy

_Last updated: June 14, 2026_

This policy describes the current AnswerFlow desktop app behavior.

## Short Version

AnswerFlow is designed to keep interview data on your device by default.

- Prep chat, selected document Markdown, transcripts, AI responses, post-interview chat, settings, and interview history are stored locally.
- Uploaded documents are ingested locally into Markdown.
- Transcription uses the packaged local Moonshine Base model.
- LLM prompts are sent to the AI provider the user configures and selects: OpenAI, Google Gemini, or Anthropic Claude.
- AnswerFlow does not need a separate cloud speech provider.
- AnswerFlow does not sell user data.

## Data Stored Locally

AnswerFlow may store the following on your device:

- AI provider keys saved in Settings.
- Custom Instructions and AI Persona.
- Ingested Custom Instructions file Markdown.
- Uploaded document Markdown and document metadata.
- Prep chat messages.
- Live transcript entries.
- Generated AI responses.
- Interview titles and lifecycle state.
- Post-interview chat history.
- Help Assistant chat history.
- Audio and permission settings.
- Theme and UI preferences.

Protect your machine with full-disk encryption such as FileVault on macOS or BitLocker on Windows.

## Data Sent To AI Providers

When you ask AnswerFlow to generate an answer, prep response, post-interview response, or help response, relevant prompt context may be sent to the selected provider.

That context can include:

- Custom Instructions.
- AI Persona.
- Prep chat.
- Selected document Markdown.
- Live transcript.
- AI responses already generated.
- The current user request.

Review the privacy terms of the provider you configure. AnswerFlow cannot control provider-side retention or training policies.

## Transcription

Speech transcription uses the packaged local Moonshine Base model. Interview audio should not be sent to a cloud speech provider through the normal current UI.

## Documents

Supported document uploads:

- Markdown
- TXT
- PDF
- DOCX

Documents are ingested locally into Markdown and can be reused across interviews. If a document is attached to a message or selected for an interview, its ingested Markdown can be included in prompts sent to the selected LLM provider.

## Permissions

AnswerFlow may request:

- Microphone permission for user speech.
- Screen Recording or screen-capture permission for system audio and screen-aware workflows.
- Accessibility permission on macOS for shortcuts or window behavior.
- Network access for LLM provider calls and update checks.

You can revoke permissions in the operating-system settings, but related features may stop working.

## Update Checks

Update checks use GitHub release infrastructure for:

<https://github.com/FarzamHejaziK/AnswerFlow/releases>

Update checks can reveal app version, operating system, and architecture to GitHub in the normal way GitHub-hosted release checks work.

## Logs

Debug logs should not contain provider keys or full sensitive payloads. If you share logs for support, review them first and remove private details.

## Open Source

The source code is available at:

<https://github.com/FarzamHejaziK/AnswerFlow>

The project is licensed under AGPL-3.0.
