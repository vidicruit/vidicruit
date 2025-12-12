import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase admin (doar pe server!)
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

// CORS
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
    // 1. Verificăm env vars
    if (
      !CLOUDFLARE_ACCOUNT_ID ||
      !CLOUDFLARE_API_TOKEN ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_KEY
    ) {
      return NextResponse.json(
        { error: "Missing env vars" },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Luăm token-ul din header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401, headers: corsHeaders }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // 3. Validăm userul la Supabase
    const { data: { user }, error } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid user token" },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = user.id;

    // 4. Cerem direct upload la Cloudflare
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 300,
          meta: {
            supabase_user_id: userId,
          },
        }),
      }
    );

    const cfJson = await cfRes.json();

    if (!cfRes.ok || !cfJson.success) {
      return NextResponse.json(
        { error: "Cloudflare error", details: cfJson },
        { status: 500, headers: corsHeaders }
      );
    }

    // 5. Trimitem uploadURL + uid
    return NextResponse.json(
      {
        uploadURL: cfJson.result.uploadURL,
        uid: cfJson.result.uid,
      },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500, headers: corsHeaders }
    );
  }
}
