import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

/**
 * Accepts FormData with:
 *  - dataUrl: string (data:image/jpeg;base64,...)
 *  - workorderId: string (optional, for naming)
 *  - name: string (optional, for naming)
 *
 * Stores the image in Vercel Blob and returns { url }.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const dataUrl = form.get("dataUrl") as string | null;
  const workorderId = (form.get("workorderId") as string | null) ?? "unknown";
  const name = (form.get("name") as string | null) ?? "Customer";

  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Bad or missing image" }, { status: 400 });
  }

  // Strip "data:image/jpeg;base64,"
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Buffer.from(base64, "base64");

  const safeName = name.replace(/\W+/g, "_").slice(0, 50) || "Customer";
  const key = `signatures/${workorderId}/${Date.now()}-${safeName}.jpg`;

  const { url } = await put(key, bytes, {
    access: "public",
    contentType: "image/jpeg",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url });
}
