import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // use Node APIs (Buffer/Blob)

/** Pull the workorderId from the URL to avoid Next's strict 2nd-arg typing */
function getWorkorderId(req: NextRequest): string | null {
  const parts = req.nextUrl.pathname.split("/");
  const i = parts.indexOf("workorders");
  return i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : null;
}

/** Fetch your Retail account ID with the current OAuth token */
async function getAccountId(token: string): Promise<string | number> {
  const r = await fetch("https://api.lightspeedapp.com/API/Account.json", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Account lookup failed");
  const j = await r.json();
  const acc = Array.isArray(j?.Account) ? j.Account[0] : j.Account;
  return acc?.accountID ?? acc?.accountId ?? acc?.id;
}

/** Simple GET so you can sanity-check the route in a browser */
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, workorderId: getWorkorderId(req) });
}

/** Accept multipart/form-data and forward the image to Lightspeed */
export async function POST(req: NextRequest) {
  // 1) Auth & params
  const token = req.cookies.get("ls_access_token")?.value;
  if (!token) return new NextResponse("Missing LS token", { status: 401 });

  const workorderId = getWorkorderId(req);
  if (!workorderId) {
    return NextResponse.json({ error: "No workorderId in URL" }, { status: 400 });
  }

  // 2) Read multipart form (image should be a File, JPEG preferred)
  const form = await req.formData();
  const image = form.get("image");
  const description = form.get("description");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image is required (File)" }, { status: 400 });
  }

  // 3) Get account id
  const accountId = await getAccountId(token);

  // 4) Build upstream multipart body for Retail R-Series (use V3 path)
  const upstreamBody = new FormData();
  upstreamBody.set("image", image); // keep original filename & type
  if (typeof description === "string" && description) {
    upstreamBody.set("description", description);
  }

  const url = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Workorder/${workorderId}/WorkorderImage.json`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      // DO NOT set Content-Type—FormData will set the boundary for us.
    },
    body: upstreamBody,
    cache: "no-store",
  });

  const text = await upstream.text();

  // Pass LS response through so we can see exact errors while testing
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
