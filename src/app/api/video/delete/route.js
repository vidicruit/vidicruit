import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401, headers: corsHeaders });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);

    if (userErr || !user) {
      return NextResponse.json({ error: "Invalid user token" }, { status: 401, headers: corsHeaders });
    }

    // 1) luăm video-ul userului din DB
    const { data: video, error: vidErr } = await supabaseAdmin
      .from("videos")
      .select("stream_uid")
      .eq("user_id", user.id)
      .maybeSingle();

    if (vidErr) {
      return NextResponse.json({ error: "DB read error", details: vidErr }, { status: 500, headers: corsHeaders });
    }

    if (!video?.stream_uid) {
      // nimic de șters
      return NextResponse.json({ ok: true, message: "No video" }, { headers: corsHeaders });
    }

    const uid = video.stream_uid;

    // 2) ștergem din Cloudflare
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      }
    );

    const cfJson = await cfRes.json().catch(() => ({}));
    if (!cfRes.ok || (cfJson && cfJson.success === false)) {
      return NextResponse.json(
        { error: "Cloudflare delete error", details: cfJson },
        { status: 500, headers: corsHeaders }
      );
    }

    // 3) ștergem rândul din Supabase
    const { error: delErr } = await supabaseAdmin
      .from("videos")
      .delete()
      .eq("user_id", user.id);

    if (delErr) {
      return NextResponse.json({ error: "DB delete error", details: delErr }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: String(err) }, { status: 500, headers: corsHeaders });
  }
}
