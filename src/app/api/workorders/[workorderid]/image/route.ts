import { NextRequest, NextResponse } from "next/server";

// Helper: get your Account ID from Lightspeed
async function getAccountId(token: string) {
  const r = await fetch("https://api.lightspeedapp.com/API/Account.json", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Account lookup failed");
  const j = await r.json();
  // API sometimes returns {Account:{accountID}} or {Account:[{accountID}]}
  const acc = Array.isArray(j?.Account) ? j.Account[0] : j.Account;
  return acc?.accountID ?? acc?.accountId ?? acc?.id;
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true, hint: "POST a JSON body here" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest, { params }: { params: { workorderId: string } }) {
  const token = req.cookies.get("ls_access_token")?.value;
  if (!token) return new NextResponse("Missing LS token", { status: 401 });

  const { dataUrl, description } = await req.json().catch(() => ({}));
  if (!dataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ error: "Expected { dataUrl } = data:image/png;base64,..." }, { status: 400 });
  }

  // decode data URL -> Blob
  const b64 = dataUrl.split(",")[1];
  const bytes = Buffer.from(b64, "base64");
  const blob = new Blob([bytes], { type: "image/png" });

  const accountId = await getAccountId(token);
  if (!accountId) return NextResponse.json({ error: "No accountId" }, { status: 500 });

  // Build multipart/form-data for Lightspeed WorkorderImage
  const fd = new FormData();
  fd.append("image", blob, "signature.png");
  if (description) fd.append("description", description);

  const url = `https://api.lightspeedapp.com/API/Account/${accountId}/Workorder/${params.workorderId}/WorkorderImage.json`;

  const up = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
    cache: "no-store",
  });

  const text = await up.text();
  return new NextResponse(text, { status: up.status, headers: { "content-type": up.headers.get("content-type") ?? "application/json" } });
}
