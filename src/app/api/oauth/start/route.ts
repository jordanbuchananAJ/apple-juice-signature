import { NextResponse } from "next/server";

export async function GET() {
  const redirectUri = process.env.OAUTH_REDIRECT_URI!;
  const clientId = process.env.LS_CLIENT_ID!;
  const state = crypto.randomUUID();

  const url = new URL("https://cloud.lightspeedapp.com/oauth/authorize.php");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "employee:all"); // 👈 add this

  const res = NextResponse.redirect(url.toString(), 302);
  res.cookies.set("oauth_state", state, {
    httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 600
  });
  return res;
}
