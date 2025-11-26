import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN;

type CloudflareDirectUploadResponse = {
  success: boolean;
  result?: { uploadURL: string; uid: string };
  errors?: any[];
};

type UploadBody = {
  userId?: string;
};

export async function POST(req: Request) {
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

    // 1. citim corpul cererii
    const body = (await req.json()) as UploadBody;
    if (!body.userId) {
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
          meta: { supabase_user_id: body.userId },
        }),
      }
    );

    const cfJson =
      (await cfRes.json()) as CloudflareDirectUploadResponse;

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
