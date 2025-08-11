import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI });
}
