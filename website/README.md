# AnswerCue — Marketing Website

The public landing page for [AnswerCue](https://github.com/FarzamHejaziK/AnswerCue). Built with
Next.js (App Router) + Tailwind CSS.

## Download links auto-sync with GitHub Releases

The download buttons call `/api/download/<platform>`, which fetches the **latest** GitHub release at
request time and 302-redirects to the matching asset. Filenames contain the version number, so this
avoids hardcoding any version — publish a new release and the site serves it automatically (cached
for 30 minutes).

Platforms: `mac` (DMG), `mac-arm` (Apple Silicon zip), `mac-intel` (Intel zip), `windows` (exe).

## Local development

```bash
cd website
npm install
npm run dev      # http://localhost:3000
```

## Deploy on Vercel

1. Push the repo to GitHub (the site lives in the `website/` subfolder).
2. In Vercel, **Import** the repo and set **Root Directory** = `website`.
3. Framework preset: **Next.js** (auto-detected). Deploy.
4. (Optional) Add a `GITHUB_TOKEN` env var to raise the GitHub API rate limit.

You get a free `*.vercel.app` URL immediately; attach a custom domain later in Project → Domains.

To update the OG/canonical URL after picking a domain, edit `SITE` in `app/layout.tsx`.
