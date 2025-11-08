/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

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

    const data: any = await res.json();

    if (!res.ok || data?.success === false) {
      const msg =
        data?.errors?.[0]?.message ??
        data?.messages?.[0]?.message ??
        "Cloudflare error";
      return NextResponse.json({ error: msg, details: data }, { status: 502 });
    }

    const { uploadURL, uid } = data.result ?? {};
    return NextResponse.json({ uploadURL, uid });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
