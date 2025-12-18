import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const WEBHOOK_SECRET = process.env.CLOUDFLARE_WEBHOOK_SECRET!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed")

    // ✅ verificare simplă cu secret în query: ?secret=...
    const secret = (req.query.secret as string) || ""
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return res.status(401).send("Unauthorized")
    }

    const body = req.body || {}

    // Cloudflare Stream trimite uid în payload (de obicei în video.uid)
    const uid =
      body?.uid ||
      body?.video?.uid ||
      body?.data?.uid ||
      body?.data?.video?.uid

    if (!uid) return res.status(400).send("Missing uid in webhook payload")

    // Update: video devine READY
    const { error } = await supabaseAdmin
      .from("videos")
      .update({ status: "ready" })
      .eq("uid", uid)

    if (error) return res.status(500).send(error.message)

    return res.status(200).json({ ok: true, uid })
  } catch (e: any) {
    return res.status(500).send(e?.message ?? "Webhook error")
  }
}
