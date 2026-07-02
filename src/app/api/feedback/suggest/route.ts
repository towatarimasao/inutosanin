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
  const { genre, name, address, phone, isConfirmedByVisitor, email, nickname, honeypot } = body as {
    genre: string;
    name: string;
    address: string;
    phone: string;
    isConfirmedByVisitor: boolean;
    email: string;
    nickname: string;
    honeypot: string;
  };

  // ボット対策：honeypot に値があれば成功を装って無視
  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  if (!genre || !name?.trim() || !address?.trim()) {
    return NextResponse.json({ error: "genre・name・address は必須です" }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "有効なメールアドレスが必要です" }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from("feedback_submissions")
    .insert({
      type:                    "suggest",
      suggested_genre:         genre,
      suggested_name:          name.trim(),
      suggested_address:       address.trim(),
      suggested_phone:         phone || null,
      is_confirmed_by_visitor: isConfirmedByVisitor ?? false,
      contact_email:           email,
      contact_nickname:        nickname || null,
    });

  if (error) {
    console.error("[feedback/suggest] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
