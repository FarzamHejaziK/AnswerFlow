import { NextRequest, NextResponse } from "next/server";
import { getLatestRelease, pickAsset, Platform, REPO_URL } from "@/lib/github";

export const revalidate = 60;

const VALID: Platform[] = ["mac", "mac-arm", "mac-intel", "windows"];

export async function GET(_req: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform as Platform;
  if (!VALID.includes(platform)) {
    return NextResponse.redirect(`${REPO_URL}/releases/latest`, 302);
  }
  const release = await getLatestRelease();
  const asset = pickAsset(release.assets, platform);
  // Always redirect to the freshest matching asset, or the releases page as a fallback.
  return NextResponse.redirect(asset?.browser_download_url ?? `${REPO_URL}/releases/latest`, 302);
}
