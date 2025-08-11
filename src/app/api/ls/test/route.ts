import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("ls_access_token")?.value;
  if (!token) return new NextResponse("No access token. Go to /api/oauth/start first.", { status: 401 });

  // Hit Accounts to verify the token (Retail R-Series)
  const resp = await fetch("https://api.lightspeedapp.com/API/Account.json", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const text = await resp.text();
  return new NextResponse(text, { status: resp.status, headers: { "content-type": resp.headers.get("content-type") ?? "application/json" } });
}
