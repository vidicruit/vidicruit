import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN!;

type CloudflareDirectUploadResult = {
  uploadURL: string;
  uid: string;
};

type CloudflareDirectUploadResponse = {
  success: boolean;
  result?: CloudflareDirectUploadResult;
  errors?: unknown[];
};

type UploadBody = {
  userId?: string;
};

export async function POST(req: Request) {
  // citim corpul cererii
  const body = (await req.json()) as UploadBody;
  const userId = body.userId;

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 }
    );
  }

  // cerem la Cloudflare un link de upload
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

  const result = (await cfRes.json()) as CloudflareDirectUploadResponse;

  if (!result.success || !result.result) {
    return NextResponse.json(
      {
        error: "Cloudflare Stream error",
        details: result.errors ?? null,
      },
      { status: 500 }
    );
  }

  const { uploadURL, uid } = result.result;

  // trimitem înapoi către frontend URL-ul de upload și uid-ul video-ului
  return NextResponse.json({ uploadURL, uid }, { status: 200 });
}
