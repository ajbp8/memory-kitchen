import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

// Refreshes the Supabase auth session on every request and protects
// authenticated routes. Invite-only enforcement itself happens at
// sign-in/sign-up time (see src/app/login, src/app/join) — this just
// gates access to the app for sessions that aren't logged in.
const PUBLIC_PATHS = ["/login", "/join", "/auth/callback", "/manifest.json", "/sw.js", "/api/login", "/api/join"];

type AuthCookie = { name: string; value: string; options: CookieOptions };
type AuthResult = { user: User | null; cookies: AuthCookie[] };

// Supabase rotates the refresh token on every use. A single page load here
// fires several parallel fetches (recipes, households, menu, …), and each
// one is a separate request that runs this middleware. If the access token
// happens to be expired when they land, every one of those requests calls
// getUser(), which triggers its own refresh against the *same* refresh-token
// cookie. Only the first redeems it — Supabase invalidates it immediately on
// use — so every other concurrent request gets back "Invalid Refresh Token:
// Refresh Token Not Found" and getUser() resolves with no user. Whichever of
// those responses is the browser applies last can then overwrite the
// winner's fresh Set-Cookie with a dead one, or the app just treats that one
// failed request as "logged out" — this is the "random logout" bug.
//
// Fix: dedupe concurrent refreshes. Requests that arrive with the exact same
// (soon-to-be-stale) auth cookies share one in-flight Supabase call instead
// of each racing to redeem the same refresh token. This is scoped to a
// single warm server instance — it can't coordinate across instances — but
// it eliminates the race for the common case (several fetches from one page
// load landing on the same instance), which is the pattern seen in the auth
// logs (paired /token 400 refresh_token_not_found within the same second).
const inFlightAuth = new Map<string, Promise<AuthResult>>();

function authCacheKey(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))
    .map((c) => `${c.name}=${c.value}`)
    .sort()
    .join("&");
}

async function getAuth(request: NextRequest): Promise<AuthResult> {
  const key = authCacheKey(request);

  // No Supabase auth cookie at all — nothing to dedupe, and no point
  // caching an empty key across unrelated anonymous requests.
  if (!key) {
    return resolveAuth(request);
  }

  const existing = inFlightAuth.get(key);
  if (existing) return existing;

  const promise = resolveAuth(request).finally(() => {
    // Only clear if we're still the current entry for this key — a newer
    // request may already have replaced it after this one's cookies rotated.
    if (inFlightAuth.get(key) === promise) inFlightAuth.delete(key);
  });
  inFlightAuth.set(key, promise);
  return promise;
}

async function resolveAuth(request: NextRequest): Promise<AuthResult> {
  const cookies: AuthCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return { user, cookies };
}

export async function proxy(request: NextRequest) {
  const { user, cookies } = await getAuth(request);

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Apply any rotated session cookies to *this* request/response pair, even
  // though the refresh itself may have been resolved on another request's
  // behalf (a shared in-flight lookup still needs its result written back
  // to every caller's own cookie jar).
  cookies.forEach(({ name, value }) => request.cookies.set(name, value));
  const response = NextResponse.next({ request });
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
