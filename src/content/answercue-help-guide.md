# AnswerCue Help Guide

This is the in-app knowledge base for the AnswerCue Help Assistant. The help chat should answer from this guide first, then use recent help-chat history for continuity.

## Mental Model

AnswerCue has three phases:

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

AnswerCue uses the local Moonshine Base model for transcription after it is downloaded during setup. Users should not need to select a transcription model.

AnswerCue needs two audio paths:

- **Input device:** your microphone.
- **Output/system audio device:** the device where the interviewer audio is playing.

For Zoom, Teams, Google Meet, or similar apps, match the AnswerCue output/system audio device to the meeting app output.

Examples:

- If Zoom plays through Mac mini Speakers, choose Mac mini Speakers in AnswerCue.
- If Meet plays through AirPods, choose AirPods in AnswerCue.
- If Teams plays through Studio Display Speakers, choose Studio Display Speakers in AnswerCue.

If your voice appears but the interviewer does not, check output/system audio. If the interviewer appears but your voice does not, check microphone input.

## Permissions

On macOS, AnswerCue may need:

- Microphone permission.
- Screen Recording permission for system audio and screen-aware features.
- Accessibility permission for global shortcuts or window behavior.

On Windows, check:

- Microphone access in Windows Privacy settings.
- Correct input device.
- Correct output device used by the meeting app.

When permissions are missing, setup warnings should appear in the right panel. If all required permissions are granted, the right panel should not show permission warnings.

## Main Layout

AnswerCue uses a three-column desktop layout:

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

Before the live interview starts, use prep chat to tell AnswerCue:

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

Prep chat is an intake/context-building space by default. If the user uploads a job description, resume, project notes, or other documents, AnswerCue should acknowledge the material, extract useful interview context, and ask a few targeted setup questions. It should not generate practice questions, mock interviews, answer drills, or study plans unless the user explicitly asks for those.

## Documents

Supported files:

- Markdown
- TXT
- PDF
- DOCX

New uploads are ingested locally into Markdown. Uploaded documents can be reused in future interviews.

When adding a new document, AnswerCue asks what type it is:

- Resume
- Project
- Other

If `Other` is selected, the user provides a short description. If the user cancels this dialog, the document should not be added.

When selecting an already uploaded document, AnswerCue should attach it immediately without asking for the document type again.

Attached documents should be visible in the chat message history, not only in the composer. After a message is sent, attached documents should clear from the composer.

## Live Interview

When the user clicks **Start interview**, AnswerCue enters the live phase.

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

The interview preparation context must be available to the live **What to answer?** and **Solve Code** actions.

## Live Interview Actions

The live shell quick actions are the main way users interact with AnswerCue during an interview. The user can click the visible buttons in the overlay or use global shortcuts when another app is focused.

Default shortcuts use `Cmd` on macOS and `Ctrl` on Windows. Users can change shortcuts in Settings > Hotkeys.

### What to answer?

Default shortcut: `Cmd/Ctrl+1`.

Use **What to answer?** when the interviewer asks a normal interview question and the user wants a polished answer to say out loud.

This action uses the available live context:

- Custom Instructions.
- AI Persona.
- Prep chat.
- Selected document Markdown.
- Live transcript so far.
- Prior AI responses.
- Any attached screenshot context.

Best for:

- Behavioral questions.
- Project walkthroughs.
- System design questions.
- Product or data questions.
- General technical questions.
- Explaining tradeoffs or decisions.

Expected output: a direct interview-ready answer. For interviewer questions, the answer should restate or identify the question first, then provide the answer.

### Solve Code

Default shortcut: `Cmd/Ctrl+6`.

Use **Solve Code** when the screen or transcript contains a coding problem, code editor, compiler error, failing test, SQL prompt, algorithm question, code review prompt, or debugging task.

If a screenshot is attached, the screenshot is the primary source. The transcript is used to disambiguate what the interviewer asked.

Expected output: a full coding answer, not only a hint. The response should include the approach, working code in a fenced code block, and key edge cases or complexity when relevant.

Use **Solve Code** instead of **What to answer?** when the user specifically needs code.

### Clarify

Default shortcut: `Cmd/Ctrl+2`.

Use **Clarify** when the interviewer question is ambiguous, underspecified, or missing constraints. This action should help the user ask a concise clarifying question instead of guessing too early.

Best for:

- System design scope questions.
- Product prompts without clear goals.
- Data questions with unclear metrics.
- Coding problems missing input/output format.
- Any moment where the user needs to confirm assumptions.

Expected output: one or more short clarifying questions the user can ask the interviewer.

### Brainstorm

Default shortcut: `Cmd/Ctrl+3` when Interview Mode is active.

Use **Brainstorm** when the user needs several possible angles before answering. It helps generate approaches, examples, tradeoffs, risks, and step-by-step strategy.

Best for:

- Open-ended system design prompts.
- Choosing between multiple solutions.
- Structuring a behavioral story.
- Planning a debugging approach.
- Thinking through architecture, tradeoffs, or edge cases.

Expected output: a compact set of options or a structured plan.

### Recap

Default shortcut: `Cmd/Ctrl+3` when Interview Mode is not active.

Use **Recap** when the user lost the thread or needs a quick summary of the recent conversation.

Expected output: recent conversation condensed into useful bullets. In the live shell, the same button slot can show **Brainstorm** or **Recap** depending on mode.

### Follow Up Question

Default shortcut: `Cmd/Ctrl+4`.

Use **Follow Up Question** when the user wants to keep the conversation moving or ask the interviewer a smart next question.

Best for:

- Ending an answer smoothly.
- Showing curiosity.
- Asking about requirements.
- Asking about tradeoffs.
- Asking about metrics, team process, or next steps.

Expected output: one or more concise questions the user can ask next.

### Screenshot

Default shortcut: `Cmd/Ctrl+H`.

Use **Screenshot** to capture the full screen and attach it as visual context. This action does not automatically generate an answer.

Best for:

- Visible coding prompts.
- Diagrams.
- Error messages.
- Code editor state.
- Browser pages.
- Any text or visual context the interviewer is referencing.

After taking a screenshot, the user can run **What to answer?**, **Solve Code**, or type a custom prompt.

### Screenshot + answer immediately

Default shortcut: `Cmd/Ctrl+Shift+Enter`.

Use **Screenshot + answer immediately** when the question depends on something visible and the user needs a response in one action.

This action captures the screen, attaches the screenshot, and immediately runs **What to answer?**.

Best for visible prompts, diagrams, documents, or product screens where the user needs an interview-ready spoken answer.

### Screenshot + code immediately

Default shortcut: `Cmd/Ctrl+Shift+6`.

Use **Screenshot + code immediately** when the visible screen contains a coding problem, code editor, compiler output, failing test, SQL task, or debugging prompt.

This action captures the screen, attaches the screenshot, and immediately runs **Solve Code**.

Best for live coding because it avoids the extra step of manually taking a screenshot and then clicking **Solve Code**.

## Interview Finished

When the interview ends:

- Show an **Interview finished** boundary directly after the final transcript item.
- The boundary should scroll with the transcript.
- It should not overlay the chat composer.
- Any temporary "Finalizing interview" state should clear when finalization completes or fails.

After the boundary, the user can continue chatting with the assistant. The post-interview chat should use prep chat, selected docs, transcript, and AI responses as context.

## Saved State

AnswerCue should persist:

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
