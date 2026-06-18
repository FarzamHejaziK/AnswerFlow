# AnswerFlow Help Guide

This is the in-app knowledge base for the AnswerFlow Help Assistant. The help chat should answer from this guide first, then use recent help-chat history for continuity.

## Mental Model

AnswerFlow has three phases:

1. **Prepare interview:** chat with the assistant, add notes, and attach selected documents.
2. **Live interview:** capture interviewer audio, user audio, and generated AI help.
3. **After interview:** keep chatting with the assistant using prep context, selected docs, transcript, and AI responses.

The prep chat is not the transcript. The transcript is created only during the live interview.

## First Run Setup

Use the setup flow in this order:

1. Add at least one AI provider key.
2. Grant required permissions.
3. Confirm microphone input.
4. Confirm meeting/system audio output.
5. Create a New Interview.
6. Add prep context.
7. Start the interview only after the meeting app audio is routed correctly.

If the setup flow appears again after a reset, complete the provider-key step first, then the permissions step.

## AI Providers

Settings should expose only the main LLM providers:

- OpenAI
- Google Gemini
- Anthropic Claude

The selected main model is used for:

- Prep chat.
- Live interview answer generation.
- Post-interview chat.
- Help Assistant chat.

If only one provider key is saved, the active model should come from that provider. For example, if only an OpenAI key exists, Gemini should not appear as the active model.

## Audio And Transcription

AnswerFlow uses the local Moonshine Base model for transcription after it is downloaded during setup. Users should not need to select a transcription model.

AnswerFlow needs two audio paths:

- **Input device:** your microphone.
- **Output/system audio device:** the device where the interviewer audio is playing.

For Zoom, Teams, Google Meet, or similar apps, match the AnswerFlow output/system audio device to the meeting app output.

Examples:

- If Zoom plays through Mac mini Speakers, choose Mac mini Speakers in AnswerFlow.
- If Meet plays through AirPods, choose AirPods in AnswerFlow.
- If Teams plays through Studio Display Speakers, choose Studio Display Speakers in AnswerFlow.

If your voice appears but the interviewer does not, check output/system audio. If the interviewer appears but your voice does not, check microphone input.

## Permissions

On macOS, AnswerFlow may need:

- Microphone permission.
- Screen Recording permission for system audio and screen-aware features.
- Accessibility permission for global shortcuts or window behavior.

On Windows, check:

- Microphone access in Windows Privacy settings.
- Correct input device.
- Correct output device used by the meeting app.

When permissions are missing, setup warnings should appear in the right panel. If all required permissions are granted, the right panel should not show permission warnings.

## Main Layout

AnswerFlow uses a three-column desktop layout:

- **Left panel:** interviews list and New Interview.
- **Middle panel:** the active interview conversation, transcript, prep chat, and post-interview chat.
- **Right panel:** setup status, selected model, audio configuration, and detectability controls.

The middle panel should be the main working area. Chat, transcript, document attachment, and interview lifecycle messages should appear there.

## New Interview

Click **New Interview** from the top-left area.

Expected behavior:

1. A draft interview is created.
2. The user sees the prep page.
3. The live interview does not start automatically.
4. The draft title starts as **Untitled interview**.
5. The title can be renamed inline where the title appears.

## Prep Chat

Before the live interview starts, use prep chat to tell AnswerFlow:

- What role this interview is for.
- What company or team it is with.
- What interview round it is.
- What topics are likely.
- How you want answers to sound.
- What projects or stories to emphasize.
- What documents should be considered.

The prompt should ask:

> What should I know about your interview? How should I answer the questions?

Every prep-chat message should receive an assistant response.

Prep chat is an intake/context-building space by default. If the user uploads a job description, resume, project notes, or other documents, AnswerFlow should acknowledge the material, extract useful interview context, and ask a few targeted setup questions. It should not generate practice questions, mock interviews, answer drills, or study plans unless the user explicitly asks for those.

## Documents

Supported files:

- Markdown
- TXT
- PDF
- DOCX

New uploads are ingested locally into Markdown. Uploaded documents can be reused in future interviews.

When adding a new document, AnswerFlow asks what type it is:

- Resume
- Project
- Other

If `Other` is selected, the user provides a short description. If the user cancels this dialog, the document should not be added.

When selecting an already uploaded document, AnswerFlow should attach it immediately without asking for the document type again.

Attached documents should be visible in the chat message history, not only in the composer. After a message is sent, attached documents should clear from the composer.

## Live Interview

When the user clicks **Start interview**, AnswerFlow enters the live phase.

The live transcript should clearly distinguish:

- Interviewer.
- Me.
- AI response.

Generated AI responses should render Markdown correctly, not as raw Markdown text.

The live answer prompt should include, in order:

```text
<custom_instructions>
Typed custom instructions and any ingested custom-instruction file.
</custom_instructions>

<ai_persona>
The user's style and behavior preferences.
</ai_persona>

<interview_preparation_context>
Prep chat plus selected document Markdown for this interview.
</interview_preparation_context>

<live_interview_transcript>
Transcript and AI responses captured so far.
</live_interview_transcript>

<user_request>
The current answer request.
</user_request>
```

The interview preparation context must be available to the live Answer button.

## Interview Finished

When the interview ends:

- Show an **Interview finished** boundary directly after the final transcript item.
- The boundary should scroll with the transcript.
- It should not overlay the chat composer.
- Any temporary "Finalizing interview" state should clear when finalization completes or fails.

After the boundary, the user can continue chatting with the assistant. The post-interview chat should use prep chat, selected docs, transcript, and AI responses as context.

## Saved State

AnswerFlow should persist:

- Interview title.
- Prep chat.
- Selected documents.
- Live transcript.
- AI responses.
- Interview started and finished boundaries.
- Post-interview chat.

When reopening an old interview, the user should see the saved state instead of a blank page.

## Custom Instructions

Custom Instructions live in Settings.

Use them for durable preferences that apply across interviews:

- Answer style.
- Career background.
- Preferred tone.
- Topics to emphasize or avoid.
- General resume or project context.

The Custom Instructions tab supports one ingested local file. Choosing a new file should replace the old file. Removing the file should keep typed instructions.

## AI Persona

AI Persona lives in Settings next to Custom Instructions.

Use it to describe assistant behavior:

- Be concise.
- Answer as me.
- Use interview-ready wording.
- Prefer practical examples.
- Avoid sounding robotic.

## Help Assistant

The Help Assistant opens from the bottom help entry. The user can close the bottom entry with the `X`, and a `?` control should bring it back.

Help chat history should persist so the user can continue later.

The Help Assistant uses the selected main LLM and this guide as its reference.

## Troubleshooting

If transcript is missing:

1. Confirm the interview is actually started.
2. Confirm microphone input.
3. Confirm output/system audio matches the meeting app.
4. Confirm permissions.
5. Restart the app after changing permissions.

If PDF upload fails:

1. Try a smaller PDF.
2. Try a text-based PDF instead of a scanned image PDF.
3. Convert to TXT or Markdown as a workaround.
4. Check the debug log for document-ingestion errors.

If Settings hangs:

1. Restart the app.
2. Check whether provider state or audio device enumeration is stuck.
3. Confirm the settings page is not trying to load removed provider or transcription options.

If the UI looks wrong:

- The middle panel should remain readable at full-screen width.
- The right panel should keep consistent card widths.
- Detectable/Undetectable should be a simple segmented/toggle-style control.
- Removed calendar, test sound, and SCK backend controls should not appear in the right panel.
