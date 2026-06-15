## Summary

Short one-line description of the AnswerFlow release.

## What's New

- Feature one description
- Feature two description
- Feature three description

## Improvements

- Performance improvement
- UX refinement
- Internal optimization

## Fixes

- Fixed issue one
- Resolved crash or packaging issue
- Corrected UI alignment or naming issue

## Technical

- Dependency updates
- Release pipeline updates
- Updater metadata changes

## Platform Downloads

Choose the artifact for your operating system and CPU architecture.

### macOS

- Apple Silicon: `AnswerFlow-VERSION-arm64-mac.zip`
- Intel: `AnswerFlow-VERSION.dmg` or `AnswerFlow-VERSION-mac.zip`
- Auto-update metadata: `latest-mac.yml`

If macOS says the app is damaged on an unsigned test build:

```bash
xattr -cr ~/Downloads/AnswerFlow-VERSION-arm64-mac.zip
xattr -cr /Applications/AnswerFlow.app
```

### Windows

- Intel x64 installer: `AnswerFlow-Setup-VERSION.exe`
- Auto-update metadata: `latest.yml`

If Microsoft Defender SmartScreen warns about an unsigned test build, click **More info**, then **Run anyway**.

### Linux

- AppImage target: `AnswerFlow-VERSION.AppImage`
- Debian package target: `answerflow_VERSION_amd64.deb`

Linux artifacts are configured in the package build metadata. Attach them when a Linux build is produced.
