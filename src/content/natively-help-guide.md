# AnswerFlow Help Guide

This guide is the in-app knowledge base for AnswerFlow. The Help Assistant uses this document as its main reference when answering setup, usage, troubleshooting, and workflow questions.

## 1. The Simple Mental Model

AnswerFlow has two main areas:

1. Settings is where you configure the app.
2. The launcher/interview workspace is where you use the app.

Keep that separation in mind:

- If something is about keys, models, permissions, audio devices, appearance, or custom instructions, go to Settings.
- If something is about preparing for an interview, starting an interview, reading transcript, or asking questions about a finished interview, use the main interview workspace.

The cleanest workflow is:

1. Configure once in Settings.
2. Create a new interview.
3. Add prep context if needed.
4. Start the interview only when your meeting app is ready.
5. Let transcript and AI responses build during the live interview.
6. Continue chatting after the interview with the saved transcript as context.

## 2. First Run Setup

On first run, configure the app in this order:

1. Open Settings.
2. Add at least one AI provider key.
3. Pick the model you want to use.
4. Configure microphone input.
5. Configure meeting/system audio output.
6. Grant operating system permissions.
7. Add Custom Instructions if you want the assistant to remember your preferences.
8. Start a test interview before using the app in a real call.

The app is easiest to use when only one AI provider is configured at first. Add more providers later if you want failover or model comparisons.

## 3. AI Providers

The app uses the configured main LLM provider for chat and assistant responses. In the simplified setup, Settings should focus on the main provider keys:

- OpenAI
- Google Gemini
- Anthropic Claude

Pick one provider, save the key, then choose a model from that provider. If the app has only one valid key, the user should expect that provider to be the active path for helper chat and interview assistance.

Recommended first setup:

1. Add an OpenAI key.
2. Pick the default OpenAI model.
3. Confirm the app can answer a basic question.
4. Only then add Gemini or Claude if needed.

If a model does not respond:

- Check that the key is saved.
- Check that the selected model belongs to the provider whose key you saved.
- Check your network.
- Try a simpler prompt.
- Restart the app after major settings changes if the model state seems stale.

## 4. Speech and Audio Setup

AnswerFlow needs two audio paths:

1. Your microphone, so it can understand what you say.
2. Meeting/system audio, so it can understand the other person.

Transcription uses the packaged local Moonshine Base model. There is no cloud speech provider or transcription model to choose.

For a Zoom, Teams, Google Meet, or similar call, the important rule is:

The app output/system audio selection must match the device where the meeting audio is playing.

Example:

- If Zoom audio is coming through Mac mini Speakers, choose Mac mini Speakers as the output/system audio source in AnswerFlow.
- If Zoom audio is coming through Studio Display speakers, choose Studio Display speakers.
- If Zoom audio is coming through AirPods, choose AirPods.

If your voice transcribes but the interviewer does not:

- The microphone path is working.
- The meeting/system audio path is not matched or not permitted.
- Check the output device in Zoom.
- Check the output/system audio device in AnswerFlow.
- Make sure Screen Recording or system audio permission is granted on macOS.

If the interviewer transcribes but your voice does not:

- The system audio path is working.
- The microphone path is not working.
- Check the input device in AnswerFlow.
- Check microphone permission.
- Check whether another app is exclusively using the mic.

## 5. macOS Permissions

On macOS, AnswerFlow may need:

- Microphone permission.
- Screen Recording permission.
- Accessibility permission, depending on the features used.

Microphone is required for your voice.

Screen Recording is often required for system audio capture and screen-aware workflows. Even if the app is not visibly recording the screen, macOS may put system audio capture behind Screen Recording style permissions.

Accessibility may be needed for global shortcuts, window behavior, or helper features.

If permissions were denied:

1. Open macOS System Settings.
2. Go to Privacy and Security.
3. Open Microphone, Screen Recording, and Accessibility.
4. Enable AnswerFlow.
5. Quit and reopen AnswerFlow.

If a permission looks granted but the app still says denied, restart the app. For stubborn macOS permission problems, remove and re-add the permission or reboot the machine.

## 6. Windows Permissions and Testing

On Windows, the most important permissions and settings are:

- Microphone access in Windows Privacy settings.
- The correct input device.
- The correct output device used by the meeting app.

To test a Windows build:

1. Install the Windows build.
2. Open the app.
3. Add at least one AI provider key.
4. Select the model.
5. Select the microphone.
6. Select the speaker/output device used by Zoom or Teams.
7. Start a test meeting or play audio through that output device.
8. Start an interview in AnswerFlow.
9. Confirm both your voice and meeting audio appear in transcript.

If logs are needed on Windows, look for the AnswerFlow debug log in the user documents or app data location configured by the app build. In many builds, renderer and main process logs are mirrored into a debug log for support.

## 7. Custom Instructions

Custom Instructions live in Settings.

Use Custom Instructions for durable preferences and facts that should apply across interviews:

- How concise or detailed answers should be.
- Your preferred answer style.
- Role or career context.
- Things the assistant should prioritize.
- Things the assistant should avoid.
- Company, project, or resume context that is broadly useful.

Custom Instructions are not the same as live interview transcript. They are background instructions. The live transcript is created during the interview.

## 8. Custom Instructions File

The Custom Instructions tab supports one attached local file.

Supported file types:

- Markdown
- TXT
- PDF
- DOCX

The app ingests the selected file locally and converts it into Markdown. The ingested Markdown is saved with the Custom Instructions.

Important behavior:

- Only one file is attached at a time.
- Choosing a new file replaces the previous file.
- Removing the file keeps typed Custom Instructions.
- The file is used as context after ingestion, not as a live link to the original file.

Good file examples:

- Resume.
- Project notes.
- Role notes.
- Interview prep notes.
- Company research.
- A short technical portfolio.
- A list of stories to use in behavioral interviews.

If PDF upload fails:

- Try a smaller PDF.
- Try exporting the PDF text to Markdown or TXT.
- Try DOCX if the PDF is scanned or image-heavy.
- Restart the app after backend changes during local development.

## 9. AI Persona

AI Persona also lives in Settings.

Use AI Persona to describe how the assistant should behave:

- "Act as a senior interview coach."
- "Be concise and direct."
- "Prefer answers I can say out loud."
- "When helping during interviews, answer as me."
- "Use calm, practical wording."
- "Avoid sounding robotic."

Persona controls voice and behavior. Custom Instructions control durable context. Interview prep controls the current interview.

## 10. Creating a New Interview

Use New Interview from the main interview workspace.

Expected behavior:

1. New Interview creates a draft interview.
2. It should show a ready/prep page, not instantly start recording.
3. You can chat with the assistant before the live interview starts.
4. You can attach reusable documents to that interview if the document system is available.
5. The assistant can help build context before the live call.
6. Start Interview begins the live capture phase.

Use the pre-interview chat for context specific to the next interview:

- Role.
- Company.
- Interview round.
- Interviewer name.
- What you want to emphasize.
- What you are nervous about.
- Likely question areas.
- Stories you want to use.
- Job description details.

## 11. Interview Prep Chat

The prep chat is different from the live interview transcript.

Prep chat is between you and the assistant. It is where you plan and add context.

Live transcript is between you and the interviewer. It is captured from audio during the live interview.

After the interview ends, the assistant should be able to answer using:

- Prep chat.
- Selected docs.
- Live transcript.
- AI responses generated during the interview.

This makes the experience feel like one long conversation:

1. Before interview: prepare with the assistant.
2. During interview: capture conversation and generate help.
3. After interview: continue discussing what happened.

## 12. Starting the Live Interview

Before clicking Start Interview:

1. Open your meeting app.
2. Join the meeting.
3. Confirm you can hear the other person.
4. Confirm your microphone is selected.
5. Confirm AnswerFlow input and output devices are correct.
6. Confirm AI provider/model is configured.
7. Confirm permissions are granted.
8. Then click Start Interview.

If you start AnswerFlow before your meeting audio is routed correctly, transcript may miss the interviewer. You can fix devices and restart the interview if needed.

## 13. During the Live Interview

During a live interview, AnswerFlow should show:

- User speech.
- Interviewer speech.
- AI responses or suggestions when triggered.
- Session state, such as interview started or interview finished.

The UI should make it clear what is transcript and what is chat.

Recommended labels:

- Interviewer for the other person.
- Me for the user.
- AI for assistant responses.

Transcript should stay distinct from the prep/post chat. The user should never wonder whether text came from the meeting or from the assistant.

## 14. Asking Questions During a Live Interview

Depending on the mode and controls, the app may support actions like:

- What to answer.
- Clarify.
- Recap.
- Follow up question.
- Answer.

The main rule is:

Use live actions when you need help in the moment. Use prep/post chat when you want to discuss the interview more broadly.

If the assistant gives poor answers:

- Add better Custom Instructions.
- Add more interview prep context.
- Make sure transcript is capturing both sides.
- Ask shorter and more specific questions.
- Pick a stronger model.

## 15. Ending an Interview

When the interview ends, the app should mark the boundary clearly. A visible "Interview finished" ribbon or line helps show that the live transcript is complete.

After that, the user can continue chatting with the assistant. The assistant should use the saved interview transcript as context.

If the app remains stuck on "Finalizing interview":

- Wait briefly if the meeting was long.
- Check whether the app is still processing transcript or summary.
- Restart the app if it is stuck for a long time.
- Verify the saved interview appears in the interview list.

## 16. Saved Interview History

Saved interviews should preserve:

- Interview title.
- Prep chat.
- Selected documents.
- Live transcript.
- AI responses.
- Completion state.
- Post-interview chat if supported.

If an interview opens later and the prep chat is missing, that is a state persistence issue. The app should save the interview workspace state and read it back by interview ID.

## 17. Renaming Interviews

Interview titles should be editable in place. The best UX is:

1. Click the title or rename icon.
2. Edit the text directly where the title appears.
3. Press Enter or blur to save.
4. Press Escape to cancel.

Avoid opening a separate rename dialog unless the title is not visible in the current view.

## 18. Documents in Interview Workspaces

Documents can be reusable across interviews.

Good document types:

- Resume.
- Project description.
- Job description.
- Company notes.
- Portfolio.
- Technical notes.
- Behavioral stories.

Documents should be ingested locally into Markdown. After ingestion, the app can reference the Markdown in future chats.

When adding a document to a specific interview, the UI should make the attachment visible in the message history. The user should be able to see what was attached and when.

When attaching a document to the chat composer:

- It should appear as an attachment chip or preview.
- Sending the message should clear the composer attachment.
- The sent message should show the attached document.
- Re-selecting an already uploaded document should attach it without asking for document type again.

## 19. Markdown Rendering

AI responses should render Markdown, not show raw Markdown unless the user asks for raw text.

Expected Markdown rendering:

- Bold text should appear bold.
- Lists should render as lists.
- Code blocks should render as code blocks.
- Tables should render as tables if supported.

If raw Markdown appears in the UI, the message component probably needs ReactMarkdown or equivalent rendering.

## 20. The Help Assistant

The Help Assistant is a support-style chat inside the app.

It should:

- Open from a floating bottom button.
- Use this help guide as context.
- Use the user's currently selected main LLM.
- Save chat history locally.
- Restore chat history when the user comes back.
- Answer setup and usage questions in plain language.
- Ask for the missing detail when a question depends on platform, provider, or device.

The Help Assistant is not the live interview assistant. It should not add messages to the interview transcript. It should not pollute prep chat. It should behave like product support.

Good questions for Help Assistant:

- "Why is interviewer audio not transcribing?"
- "How do I set this up with Zoom?"
- "Where do I add my OpenAI key?"
- "What should I put in Custom Instructions?"
- "How do I test on Windows?"
- "Why is my PDF not importing?"
- "What is the difference between prep chat and transcript?"
- "How do I start a new interview?"

## 21. Recommended Setup for Zoom

For Zoom:

1. Open Zoom.
2. Join a meeting or start a test meeting.
3. In Zoom audio settings, pick the speaker/output device you want.
4. In AnswerFlow audio settings, choose the same output/system audio device.
5. In Zoom microphone settings, pick your microphone.
6. In AnswerFlow input settings, choose the same microphone or the microphone you want AnswerFlow to hear.
7. Start the interview in AnswerFlow.
8. Speak once and have the other side speak once.
9. Confirm both show in transcript.

If only your voice appears, output/system audio is wrong.

If only the other person appears, microphone input is wrong.

If neither appears, check permissions, audio capture, and whether the packaged Moonshine Base model is present.

## 22. Recommended Setup for Google Meet

For Google Meet:

1. Open Meet in the browser.
2. Pick microphone and speaker from Meet settings.
3. Make sure browser permissions allow microphone.
4. In AnswerFlow, select matching microphone and output/system audio device.
5. Grant Screen Recording/system audio permissions on macOS if needed.
6. Start the interview.

If Meet is in Chrome and AnswerFlow cannot hear the interviewer, check both Chrome output device and system output device.

## 23. Recommended Setup for Teams

For Microsoft Teams:

1. Open Teams settings.
2. Confirm microphone.
3. Confirm speaker/output.
4. Match those devices in AnswerFlow.
5. Start a test call.
6. Confirm transcript captures both channels.

Teams sometimes changes devices after Bluetooth devices connect or disconnect. If transcript stops, re-check devices.

## 24. Model Choice Guidance

Use a fast model when latency matters.

Use a stronger model when reasoning quality matters.

For live interviews:

- Prefer a model that starts responding quickly.
- Keep prompts and context concise.
- Make sure transcript is clean.

For prep and post-interview analysis:

- Use a stronger model if available.
- It can handle longer context and more thoughtful answers.

For the Help Assistant:

- It uses the selected main model.
- If the model is weak, ask short direct questions.
- If the response is wrong, include the platform and exact app state.

## 25. Troubleshooting: No Transcription

If no transcription appears:

1. Confirm interview is actually started.
2. Confirm microphone permission.
3. Confirm input device.
4. Confirm output/system audio device.
5. Confirm the packaged Moonshine Base local transcription engine is available.
6. Try the audio level meter if available.
7. Restart the interview.
8. Restart the app.

If no text appears after packaging, check whether the installer contains `resources/models/onnx-community/moonshine-base-ONNX`. The app expects that model to be bundled.

## 26. Troubleshooting: Only My Voice Transcribes

This usually means microphone capture works, but system audio capture does not.

Check:

- Meeting output device.
- AnswerFlow output/system audio device.
- macOS Screen Recording permission.
- Whether headphones changed the output device.
- Whether the meeting app is using a device different from the system default.

## 27. Troubleshooting: Only Interviewer Voice Transcribes

This usually means system audio capture works, but microphone capture does not.

Check:

- AnswerFlow input device.
- Meeting input device.
- macOS Microphone permission.
- Windows microphone privacy settings.
- Whether another app is blocking the microphone.

## 28. Troubleshooting: Bad Answers

Bad answers usually come from one of these causes:

- Transcript is missing the actual question.
- Transcript speaker labels are wrong.
- Custom Instructions conflict with the current interview.
- Too much irrelevant context is being injected.
- The selected model is too weak.
- The prompt asks for something vague.

Fixes:

- Ask the question more directly.
- Add prep context before the interview.
- Attach a relevant document.
- Clean up Custom Instructions.
- Use a stronger model.
- Make sure the interviewer audio is captured.

## 29. Troubleshooting: PDF or DOCX Import

If a PDF or DOCX will not import:

- Try a smaller file.
- Try a text-based PDF instead of a scanned PDF.
- Export the document as Markdown or TXT.
- Remove sensitive images or large embedded assets.
- Restart the app if the ingestion service was updated during development.

If a document imports but content looks poor, the source document may have complex formatting. Markdown or TXT is usually the most reliable format.

## 30. Troubleshooting: Settings Feel Wrong

If the app appears to use a provider you did not configure:

- Check the selected model.
- Check which provider keys are saved.
- Remove unused provider keys if the UI supports it.
- Restart the app after changing provider settings.

The simplified Settings experience should show only the main providers that matter for LLM use:

- OpenAI.
- Google Gemini.
- Anthropic Claude.

## 31. Privacy Notes

Be careful with sensitive interview and resume data.

Local ingestion means the file is converted on your machine, but if you use a cloud LLM, relevant context may be sent to that cloud provider as part of a prompt.

If you do not want certain information sent to a cloud provider:

- Do not put it in Custom Instructions.
- Do not attach it to an interview.
- Do not ask the assistant to reason over it.
- Use a local model only if the app supports local routing for that feature.

## 32. Good Custom Instructions Examples

Example 1:

```text
Answer interview questions in a concise, spoken style. Prefer 3 to 5 bullet points for planning, but final answers should sound natural. If a question is ambiguous, first clarify the question in one short sentence, then answer.
```

Example 2:

```text
My background is data science and product analytics. Prioritize examples involving experimentation, fraud detection, dashboards, SQL, Python, stakeholder communication, and causal inference.
```

Example 3:

```text
For behavioral answers, use STAR format but keep it conversational. Do not over-explain. Make me sound senior, calm, and specific.
```

## 33. Good AI Persona Examples

Example 1:

```text
You are a senior interview coach. You are direct, practical, and calm. Help me answer as myself, not as a generic assistant.
```

Example 2:

```text
You are a real-time technical interview copilot. Be fast, concise, and precise. When giving an answer, include the key idea first.
```

Example 3:

```text
You are a product-minded communication coach. Help me make answers crisp, structured, and easy for an interviewer to follow.
```

## 34. What To Do Before a Real Interview

One day before:

1. Add or update Custom Instructions.
2. Attach resume or relevant prep file if needed.
3. Confirm provider key and model.
4. Confirm audio devices.
5. Run a short test interview.

Ten minutes before:

1. Join the meeting app.
2. Verify audio output.
3. Open AnswerFlow.
4. Open the interview draft.
5. Add last-minute prep context.
6. Start interview only when ready.

During:

1. Watch whether both speakers are transcribing.
2. Use AI actions only when useful.
3. Do not over-rely on the assistant.
4. Keep attention on the human conversation.

After:

1. Stop the interview.
2. Confirm it is saved.
3. Ask follow-up questions.
4. Extract lessons, follow-ups, and better answers for next time.

## 35. Quick Answers

Question: Where do I add provider keys?

Answer: Settings, then AI Providers.

Question: Where do I add durable personal context?

Answer: Settings, then Custom Instructions.

Question: Where do I add one local instruction file?

Answer: Settings, then Custom Instructions, then Choose file.

Question: How do I make the assistant sound like an interview coach?

Answer: Put that behavior in AI Persona.

Question: Why is only my voice transcribed?

Answer: Meeting/system audio is probably not configured or permitted.

Question: Why is only the interviewer transcribed?

Answer: Microphone input is probably not configured or permitted.

Question: Does Help Assistant use a separate model?

Answer: No. It should use the current main LLM selected by the user.

Question: Does Help Assistant write into interview history?

Answer: No. It is product support, separate from interview transcript and prep chat.

Question: Can I continue a Help Assistant chat later?

Answer: Yes. The chat history should be saved locally and restored when the user returns.

## 36. Support Style

The Help Assistant should answer like a useful product support expert:

- Be direct.
- Use short steps.
- Ask for missing platform or device details when needed.
- Prefer likely causes first.
- Do not pretend a feature exists if it is only planned.
- If the user reports a bug, suggest the fastest manual verification.
- If logs are needed, tell the user where to look.

The Help Assistant should not use promotional language. It should help the user get working quickly.
