import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/** Pull workorderId from the URL path to avoid typing the 2nd arg */
function getWorkorderId(req: NextRequest): string | null {
  const parts = req.nextUrl.pathname.split("/");
  const i = parts.indexOf("workorders");
  return i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : null;
}

/** Resolve Retail account id using the current OAuth token */
async function getAccountId(token: string): Promise<string | number | null> {
  const r = await fetch("https://api.lightspeedapp.com/API/V3/Account.json", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const acc = Array.isArray(j?.Account) ? j.Account[0] : j?.Account;
  return acc?.id ?? acc?.accountID ?? acc?.accountId ?? null;
}

/**
 * Body: { url: string; name?: string }
 * Tries to append the URL as a Work Order note. If blocked, returns 202 with the URL
 * so the UI can copy/paste it.
 */
export async function POST(req: NextRequest) {
  // ✅ Next 15: cookies() is async
  const cookieStore = await cookies();
  const token = cookieStore.get("ls_access_token")?.value;
  if (!token) return NextResponse.json({ error: "Missing LS token" }, { status: 401 });

  const workorderId = getWorkorderId(req);
  if (!workorderId) return NextResponse.json({ error: "No workorderId" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { url?: string; name?: string } | null;
  const url = body?.url;
  const name = body?.name;
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const accountId = await getAccountId(token);
  if (!accountId) return NextResponse.json({ error: "No account id" }, { status: 500 });

  const noteText = `Signature captured${name ? ` for ${name}` : ""}: ${url}`;
  const woUrl = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Workorder/${workorderId}.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Try internalNote first
  let resp = await fetch(woUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ Workorder: { internalNote: noteText } }),
  });
  if (resp.ok) return NextResponse.json({ ok: true, mode: "internalNote" });

  // Some tenants use `note`
  resp = await fetch(woUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ Workorder: { note: noteText } }),
  });
  if (resp.ok) return NextResponse.json({ ok: true, mode: "note" });

  const detail = await resp.text().catch(() => "");
  return NextResponse.json(
    { ok: false, message: "Could not write note automatically", url, detail },
    { status: 202 }
  );
}
