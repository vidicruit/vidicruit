import { NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.CF_STREAM_TOKEN!;

type CloudflareDirectUploadResponse = {
  success: boolean;
  result?: {
    uploadURL: string;
    uid: string;
  };
  errors?: unknown[];
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = (body as { userId?: string }).userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

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
        { error: "Cloudflare Stream error", details: result.errors ?? null },
        { status: 500 }
      );
    }

    const { uploadURL, uid } = result.result;

    return NextResponse.json({ uploadURL, uid }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
