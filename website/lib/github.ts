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

/** Match a release asset to a platform, ignoring version numbers in the name. */
export function pickAsset(assets: ReleaseAsset[], platform: Platform): ReleaseAsset | null {
  const is = (re: RegExp) => assets.find((a) => re.test(a.name)) ?? null;
  switch (platform) {
    case "mac":
      return is(/\.dmg$/i);
    case "mac-arm":
      return is(/arm64.*mac\.zip$/i);
    case "mac-intel":
      // a -mac.zip that is NOT the arm64 build
      return assets.find((a) => /(?<!arm64-)mac\.zip$/i.test(a.name) && !/arm64/i.test(a.name)) ?? null;
    case "windows":
      return is(/\.exe$/i);
    default:
      return null;
  }
}
