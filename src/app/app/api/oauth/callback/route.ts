import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || state !== cookieState) {
    return new NextResponse("Invalid OAuth state or missing code", { status: 400 });
  }

  // Exchange code for tokens
  const tokenResp = await fetch("https://cloud.lightspeedapp.com/oauth/access_token.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.LS_CLIENT_ID!,
      client_secret: process.env.LS_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
    }),
    // IMPORTANT on Vercel: no caching of secrets
    cache: "no-store",
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    return new NextResponse("Token exchange failed: " + text, { status: 500 });
  }

  const token = await tokenResp.json(); // { access_token, refresh_token, expires_in, token_type, ... }

  // For now, stash the access token in a secure, short-lived cookie (demo only).
  // In production, store per-workorder/session in a DB (Supabase, KV, etc.).
  const res = NextResponse.redirect(new URL("/oauth/success", req.url));
  res.cookies.set("ls_access_token", token.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,
    maxAge: 60 * 50, // ~50 minutes (Retail tokens typically 1h)
  });
  return res;
}
