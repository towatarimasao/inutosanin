import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const NOTIFY_TO   = "info@greatbrain475.com";
const NOTIFY_FROM = "イヌとサンイン <notify@greatbrain475.com>";

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
  const { name, email, subject, message, honeypot } = body as {
    name: string;
    email: string;
    subject: string;
    message: string;
    honeypot: string;
  };

  // ボット対策：honeypot に値があれば成功を装って無視
  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "有効なメールアドレスが必要です" }, { status: 400 });
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: "本文は必須です" }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from("contact_submissions")
    .insert({
      name:    name?.trim() || null,
      email:   email,
      subject: subject?.trim() || null,
      message: message.trim(),
    });

  if (error) {
    console.error("[feedback/contact] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 通知メール送信（失敗してもAPIは200を返す）
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from:    NOTIFY_FROM,
      to:      NOTIFY_TO,
      subject: `【お問い合わせ】${subject?.trim() || "（件名なし）"}`,
      text: [
        "新しいお問い合わせが届きました。",
        "",
        `お名前:  ${name?.trim() || "（未入力）"}`,
        `メールアドレス: ${email}`,
        `件名:    ${subject?.trim() || "（未入力）"}`,
        "",
        "■ 本文",
        message.trim(),
      ].join("\n"),
    });

    if (mailError) {
      console.error("[feedback/contact] メール送信失敗:", mailError);
    }
  } catch (err) {
    console.error("[feedback/contact] メール送信エラー:", err);
  }

  return NextResponse.json({ success: true });
}
