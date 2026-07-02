import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { spotIds, email, nickname, honeypot } = body as {
    spotIds: string[];
    email: string;
    nickname: string;
    honeypot: string;
  };

  // ボット対策：honeypot に値があれば成功を装って無視
  if (honeypot) {
    return NextResponse.json({ success: true, count: 0 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "有効なメールアドレスが必要です" }, { status: 400 });
  }

  if (!Array.isArray(spotIds) || spotIds.length === 0) {
    return NextResponse.json({ error: "spotIds が空です" }, { status: 400 });
  }

  const rows = spotIds.map((spotId) => ({
    type:              "confirm",
    spot_id:           spotId,
    contact_email:     email,
    contact_nickname:  nickname || null,
  }));

  const { error } = await getServiceClient()
    .from("feedback_submissions")
    .insert(rows);

  if (error) {
    console.error("[feedback/confirm] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: rows.length });
}
