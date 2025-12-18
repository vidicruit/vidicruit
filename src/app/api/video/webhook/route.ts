import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const WEBHOOK_SECRET = process.env.CLOUDFLARE_WEBHOOK_SECRET!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get("secret") || ""

    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    const uid =
      body?.uid ||
      body?.video?.uid ||
      body?.data?.uid ||
      body?.data?.video?.uid

    if (!uid) {
      return new NextResponse("Missing uid in webhook payload", { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("videos")
      .update({ status: "ready" })
      .eq("uid", uid)

    if (error) {
      return new NextResponse(error.message, { status: 500 })
    }

    return NextResponse.json({ ok: true, uid })
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Webhook error", { status: 500 })
  }
}
