# AnswerFlow Release Process

This app ships through GitHub Releases from the `FarzamHejaziK/AnswerFlow`
release channel. The update metadata must point to this repository so installed
apps never read update notes or installers from the upstream project.

## Release Checklist

1. Update the version in `package.json` and `package-lock.json`.
2. Add a top entry to `CHANGELOG.md`.
3. Add a release body under `.github/releases/vX.Y.Z.md`.
4. Commit the app, docs, icon, and workflow changes.
5. Push `main` and a matching `vX.Y.Z` tag.
6. Let GitHub Actions build and attach platform installers.
7. Verify the GitHub Release contains the artifacts below.

## Platform Artifacts

| Platform | Artifact | Notes |
| --- | --- | --- |
| macOS Apple Silicon | `AnswerFlow-X.Y.Z-arm64-mac.zip` | Primary unsigned Apple Silicon build |
| macOS Intel | `AnswerFlow-X.Y.Z.dmg`, `AnswerFlow-X.Y.Z-mac.zip` | Intel x64 DMG plus updater ZIP |
| macOS update metadata | `latest-mac.yml` | Used by Electron updater |
| Windows Intel x64 | `AnswerFlow-Setup-X.Y.Z.exe` | NSIS installer and updater target |
| Windows update metadata | `latest.yml` | Used by Electron updater |
| Linux AppImage | `AnswerFlow-X.Y.Z.AppImage` | Portable Linux app |
| Linux Debian | `answerflow_X.Y.Z_amd64.deb` | Debian/Ubuntu package |

## Creating A Release

```bash
npm version X.Y.Z --no-git-tag-version

git add package.json package-lock.json CHANGELOG.md .github/releases/vX.Y.Z.md
git commit -m "Release AnswerFlow vX.Y.Z"
git push origin main

git tag vX.Y.Z
git push origin vX.Y.Z
```

If the release workflow is configured to create the GitHub Release from the tag,
wait for Actions to finish. Otherwise create it manually:

```bash
gh release create vX.Y.Z \
  --repo FarzamHejaziK/AnswerFlow \
  --title "AnswerFlow vX.Y.Z" \
  --notes-file .github/releases/vX.Y.Z.md
```

## Update Behavior

AnswerFlow checks the GitHub Releases feed for newer versions. Updates are shown
inside the app as a quiet sidebar row, not as a modal promotion. Clicking the row
downloads the newest installer/update metadata from the AnswerFlow release
channel.

Signed macOS builds can use the standard Electron updater flow. Unsigned macOS
builds may require a manual install step after download:

```bash
xattr -cr /Applications/AnswerFlow.app
```

Windows uses the NSIS installer and `latest.yml` metadata for in-place updates.

## Versioning

Use semantic versioning:

```text
MAJOR.MINOR.PATCH
MAJOR.MINOR.PATCH-beta.N
```

Examples:

```text
2.7.3
2.8.0
3.0.0-beta.1
```

Stable public builds should use a plain version. Pre-release builds should be
marked as pre-release on GitHub.
