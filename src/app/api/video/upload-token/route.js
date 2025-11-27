import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN;

/**
 * Aici tratăm cererea POST care vine de la Framer
 * și cerem la Cloudflare un link de upload direct.
 */
export async function POST(req) {
  try {
    // 0. verificăm variabilele de mediu
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return NextResponse.json(
        {
          error: "Missing Cloudflare env vars",
          hasAccountId: !!CLOUDFLARE_ACCOUNT_ID,
          hasToken: !!CLOUDFLARE_API_TOKEN,
        },
        { status: 500 }
      );
    }

    // 1. citim corpul cererii (userId de la Framer)
    const body = await req.json().catch(() => null);
    const userId = body && body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // 2. cerem direct_upload la Cloudflare Stream
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

    const cfJson = await cfRes.json();

    if (!cfRes.ok || !cfJson.success || !cfJson.result) {
      return NextResponse.json(
        {
          error: "Cloudflare Stream error",
          status: cfRes.status,
          cfBody: cfJson,
        },
        { status: 500 }
      );
    }

    const { uploadURL, uid } = cfJson.result;

    // 3. trimitem înapoi către Framer uploadURL + uid
    return NextResponse.json({ uploadURL, uid }, { status: 200 });
  } catch (err) {
    console.error("upload-token route error:", err);
    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: String(err),
      },
      { status: 500 }
    );
  }
}
