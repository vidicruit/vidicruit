import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: "Missing Supabase env vars",
          hasUrl: !!SUPABASE_URL,
          hasServiceRole: !!SERVICE_ROLE_KEY,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // 1) Luăm token-ul userului din header: Authorization: Bearer <token>
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization Bearer token" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2) Citim body: { uid }
    const body = await req.json().catch(() => null);
    const uid = body && body.uid;

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3) Client Supabase cu Service Role (server-only)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4) Verificăm token-ul și aflăm userul real
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Invalid/expired token", details: userErr?.message || null },
        { status: 401, headers: corsHeaders }
      );
    }

    // 5) Curățăm orice video vechi al userului (fără să depindem de UNIQUE)
    const { error: delErr } = await admin
      .from("videos")
      .delete()
      .eq("user_id", user.id);

    if (delErr) {
      return NextResponse.json(
        { error: "DB delete failed", details: delErr.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // 6) Inserăm noul uid
    const { data: inserted, error: insErr } = await admin
      .from("videos")
      .insert([{ user_id: user.id, stream_uid: uid }])
      .select()
      .single();

    if (insErr) {
      return NextResponse.json(
        { error: "DB insert failed", details: insErr.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, video: inserted },
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
