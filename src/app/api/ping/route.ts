import { NextResponse } from "next/server";

// forțează Next/Vercel să trateze ruta ca funcție server
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, route: "ping" });
}
