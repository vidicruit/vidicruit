import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
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

    const body = await req.json();
    const uid = body?.uid;
    const playback_url = body?.playback_url;
    const status = body?.status || "ready";

    if (!uid || !playback_url) {
      return NextResponse.json({ error: "Missing uid or playback_url" }, { status: 400, headers: corsHeaders });
    }

    const row = {
      user_id: user.id,
      stream_uid: uid,
      playback_url,
      status,
    };

    const { data, error } = await supabaseAdmin
      .from("videos")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "DB error", details: error }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ ok: true, video: data }, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: String(err) }, { status: 500, headers: corsHeaders });
  }
}
