export const runtime = "edge";

import { NextResponse } from "next/server";

// GET /api/og?url=https://...
// Fetches Open Graph metadata from any URL for recipe link previews.
// Works for most recipe sites, YouTube, and many public IG posts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Validate it's a real URL
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return NextResponse.json({ title: null, image: null, description: null });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ title: null, image: null, description: null });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6000),
      // Don't follow too many redirects
      redirect: "follow",
    });

    if (!res.ok) return NextResponse.json({ title: null, image: null, description: null });

    const html = await res.text();

    function getMeta(property: string): string | null {
      // Handles both property="og:title" and name="og:title" ordering variants
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim();
      }
      return null;
    }

    const title =
      getMeta("og:title") ??
      getMeta("twitter:title") ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      null;

    const image = getMeta("og:image") ?? getMeta("twitter:image") ?? null;
    const description = getMeta("og:description") ?? getMeta("description") ?? null;

    return NextResponse.json({ title, image, description });
  } catch {
    return NextResponse.json({ title: null, image: null, description: null });
  }
}
