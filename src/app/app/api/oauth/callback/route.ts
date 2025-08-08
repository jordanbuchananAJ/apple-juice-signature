import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || state !== cookieState) {
    return new NextResponse("Invalid OAuth state or missing code", { status: 400 });
  }

  // Later, after LS approves your app, we’ll exchange `code` for tokens here.

  return NextResponse.json({ ok: true, receivedCode: !!code });
}
