# Agent Notes

## Git Workflow

- This checkout tracks the public fork at `origin`: `https://github.com/FarzamHejaziK/AnswerFlow.git`.
- The original project is configured as `upstream`: `https://github.com/Natively-AI-assistant/natively-cluely-ai-assistant.git`.
- Push local work to `origin`, not `upstream`.
- Keep the local `upstream` push URL disabled unless the user explicitly asks to change it.
- To bring in future updates from the original repo:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

- Prefer `git merge upstream/main` over `git rebase upstream/main` for shared/public branches so public history is not rewritten.
- If there are merge conflicts, resolve them in favor of preserving this fork's intentional changes unless the user asks otherwise.

## Repository Notes

- The repository is AGPL-3.0. Public modified releases should keep the license notices and make corresponding source available.
- Some submodule paths are not fully available from the public checkout: `premium` points to a private or unavailable repository, and `natively-api` is a gitlink without a matching `.gitmodules` entry.

## Local Development

- Use the root package as the main app. The root scripts run the Vite + Electron app; `renderer/` appears to be a nested/legacy package.
- Recommended local stack: Node 22 LTS or Node 20+, npm, Xcode Command Line Tools/Xcode on macOS, and Rust/Cargo for the native audio module.
- First-time setup:

```bash
npm install
npm run build:native
```

- Start the app in development mode:

```bash
npm start
```

This runs Vite on `http://localhost:5180` and launches Electron.

- Fast checks before or after changes:

```bash
npm run build:electron
npm test
```

- Browser-only smoke tests are configured around port `5173`, while Electron dev uses `5180`. If running Playwright, start Vite on `5173` separately and pass the same port to the tests:

```bash
npm run dev -- --port 5173 --strictPort
ELECTRON_APP_PORT=5173 npx playwright test
```

Treat Electron/preload failures in browser-only Playwright as harness issues unless the test is run against a real Electron window.

- Manual macOS smoke checklist: launch Electron with `npm start`, grant Microphone/Screen Recording/Accessibility if prompted, open Settings, configure one AI provider and one speech provider, test provider connections, start a meeting, verify transcript updates, trigger a screenshot/answer flow, stop the meeting, and confirm the saved meeting/summary appears.
