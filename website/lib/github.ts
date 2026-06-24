export const REPO = "FarzamHejaziK/AnswerCue";
export const REPO_URL = `https://github.com/${REPO}`;

export type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

export type LatestRelease = {
  tag: string;
  htmlUrl: string;
  publishedAt: string | null;
  assets: ReleaseAsset[];
};

const FALLBACK: LatestRelease = {
  tag: "",
  htmlUrl: `${REPO_URL}/releases/latest`,
  publishedAt: null,
  assets: [],
};

type ReleaseFetchOptions = {
  revalidate?: number | false;
};

/**
 * Fetch the latest GitHub release. Pages can use a short cache, while download
 * redirects can opt out so newly attached assets are available immediately.
 */
export async function getLatestRelease(options: ReleaseFetchOptions = {}): Promise<LatestRelease> {
  const cacheOptions =
    options.revalidate === false
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate ?? 60 } };

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      ...cacheOptions,
    });
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    return {
      tag: data.tag_name ?? "",
      htmlUrl: data.html_url ?? FALLBACK.htmlUrl,
      publishedAt: data.published_at ?? null,
      assets: (data.assets ?? []).map((a: any) => ({
        name: a.name,
        browser_download_url: a.browser_download_url,
        size: a.size,
      })),
    };
  } catch {
    return FALLBACK;
  }
}

export type Platform = "mac" | "mac-arm" | "mac-intel" | "windows";

/**
 * Match a release asset to a platform, ignoring version numbers in the name.
 * DMG is preferred over ZIP (nicer install; ZIP exists mainly for the updater).
 */
export function pickAsset(assets: ReleaseAsset[], platform: Platform): ReleaseAsset | null {
  const is = (re: RegExp) => assets.find((a) => re.test(a.name)) ?? null;
  const isIntel = (re: RegExp) => assets.find((a) => re.test(a.name) && !/arm64/i.test(a.name)) ?? null;
  switch (platform) {
    case "mac-arm":
      // Apple Silicon: native DMG first, then the native zip.
      return is(/arm64\.dmg$/i) ?? is(/arm64.*mac\.zip$/i);
    case "mac-intel":
      // Intel: the non-arm64 DMG first, then the non-arm64 zip.
      return isIntel(/\.dmg$/i) ?? isIntel(/mac\.zip$/i);
    case "mac":
      // Generic: the Intel DMG runs on every Mac (natively on Intel, Rosetta on
      // Apple Silicon), so it's the safe single fallback; then any DMG/zip.
      return isIntel(/\.dmg$/i) ?? is(/\.dmg$/i) ?? is(/mac\.zip$/i);
    case "windows":
      return is(/\.exe$/i);
    default:
      return null;
  }
}

/**
 * Resolve the best download URL for a platform, scanning the most recent
 * releases newest-first. This keeps Mac downloads working even when the very
 * latest release is, say, Windows-only (a partial CI publish).
 */
export function resolveAssetUrl(releases: LatestRelease[], platform: Platform): string | null {
  for (const rel of releases) {
    const asset = pickAsset(rel.assets, platform);
    if (asset) return asset.browser_download_url;
  }
  return null;
}

/** Fetch recent published (non-draft, non-prerelease) releases, newest-first. */
export async function getRecentReleases(
  count = 10,
  options: ReleaseFetchOptions = {}
): Promise<LatestRelease[]> {
  const cacheOptions =
    options.revalidate === false
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate ?? 60 } };
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=${count}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      ...cacheOptions,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .filter((r: any) => !r.draft && !r.prerelease)
      .map((r: any) => ({
        tag: r.tag_name ?? "",
        htmlUrl: r.html_url ?? FALLBACK.htmlUrl,
        publishedAt: r.published_at ?? null,
        assets: (r.assets ?? []).map((a: any) => ({
          name: a.name,
          browser_download_url: a.browser_download_url,
          size: a.size,
        })),
      }));
  } catch {
    return [];
  }
}
