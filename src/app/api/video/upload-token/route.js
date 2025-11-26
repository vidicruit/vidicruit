// route.js - Cloudflare Direct Upload token (JavaScript version)

import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN;

// OPTIONS - CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  const body = await req.json();
  const userId = body?.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  // Cerere către Cloudflare Stream
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
        meta: { supabase_user_id: userId },
      }),
    }
  );

  const result = await cfRes.json();

  if (!result?.success) {
    return NextResponse.json(
      { error: "Cloudflare Stream error", details: result?.errors ?? null },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  const { uploadURL, uid } = result.result;

  return NextResponse.json(
    { uploadURL, uid },
    {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}
