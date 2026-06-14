# AnswerFlow Local Transcription Setup

AnswerFlow uses a packaged local Moonshine Base model for transcription. The user should not need to choose a cloud speech provider or configure a separate local transcription server.

## Expected User Experience

In Settings, Audio should focus on:

- Input device.
- Output/system audio device.
- Audio levels or device status.

It should not expose:

- Speech-provider selection.
- WhisperLive setup.
- Cloud transcription keys.
- Test-sound controls that are no longer part of the current UI.
- SCK backend controls that were removed from the current right panel.

## Local Development

Install dependencies:

```bash
npm install
```

Build native audio support:

```bash
npm run build:native
```

Run the app:

```bash
npm start
```

This starts Vite on `http://localhost:5180` and launches Electron.

## Manual Transcription Check

1. Open Settings.
2. Confirm the microphone input device.
3. Confirm the output/system audio device used by the meeting app.
4. Create a New Interview.
5. Add a short prep-chat note.
6. Start the interview.
7. Speak into the selected microphone and confirm your voice appears.
8. Play meeting audio through the selected output device and confirm interviewer audio appears.
9. End the interview.
10. Confirm the transcript and post-interview chat persist after reopening the interview.

## Troubleshooting

If your voice appears but the interviewer does not:

- The microphone path is working.
- Check the meeting app output device.
- Match that output device in AnswerFlow.
- Check macOS Screen Recording/system-audio permission if applicable.

If the interviewer appears but your voice does not:

- Check the selected input device.
- Check microphone permission.
- Confirm another app is not exclusively using the mic.

If neither side appears:

- Confirm the interview is started.
- Restart the app after changing permissions.
- Rebuild the native audio module if local development audio capture is missing.
