import { NextRequest, NextResponse } from "next/server";
import { getRecentReleases, resolveAssetUrl, Platform, REPO_URL } from "@/lib/github";

export const dynamic = "force-dynamic";

const VALID: Platform[] = ["mac", "mac-arm", "mac-intel", "windows"];

export async function GET(_req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform as Platform;
  if (!VALID.includes(platform)) {
    return NextResponse.redirect(`${REPO_URL}/releases/latest`, 302);
  }
  // Scan recent releases (newest-first) so a platform whose build is missing from
  // the very latest release still resolves to the most recent one that has it.
  const releases = await getRecentReleases(10, { revalidate: false });
  const url = resolveAssetUrl(releases, platform) ?? `${REPO_URL}/releases/latest`;
  return NextResponse.redirect(url, 302);
}
