import { NextResponse } from "next/server";

type CFDirectUploadResult = {
  uploadURL?: string;
  uid?: string;
};

type CFDirectUploadResponse = {
  success?: boolean;
  result?: CFDirectUploadResult;
  errors?: Array<{ message?: string }>;
  messages?: Array<{ message?: string }>;
};

export function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_STREAM_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json(
      { error: "Missing Cloudflare credentials" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 600,
        }),
      }
    );

    const data = (await res.json()) as CFDirectUploadResponse;

    if (!res.ok || data.success === false) {
      const msg =
        data.errors?.[0]?.message ??
        data.messages?.[0]?.message ??
        "Cloudflare error";
      return NextResponse.json({ error: msg, details: data }, { status: 502 });
    }

    const uploadURL = data.result?.uploadURL;
    const uid = data.result?.uid;

    return NextResponse.json({ uploadURL, uid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
