import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = cookies();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Cookie: cookieStore
            .getAll()
            .map(c => `${c.name}=${c.value}`)
            .join("; "),
        },
      },
    }
  );

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
