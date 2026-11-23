import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  isGloballyRateLimited,
  isRateLimited,
  isSuspiciousTiming,
  looksLikeGibberish,
} from "@/lib/spam-guard";

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
  const { name, email, subject, message, honeypot, startedAt } = body as {
    name: string;
    email: string;
    subject: string;
    message: string;
    honeypot: string;
    startedAt: unknown;
  };

  // ボット対策：以下に当てはまる送信は、成功したように見せて保存も通知もしない
  // 1. 見えない入力欄（honeypot）に値がある
  // 2. フォームを開いてから送信までが速すぎる／フォーム画面を経由していない
  // 3. 本文、または名前と件名の両方が、英字だけの無意味な文字列
  const spamReason =
    honeypot ? "honeypot" :
    isSuspiciousTiming(startedAt) ? "timing" :
    looksLikeGibberish(message) || (looksLikeGibberish(name) && looksLikeGibberish(subject))
      ? "gibberish" : null;
  if (spamReason) {
    console.warn(`[feedback/contact] 迷惑投稿として破棄: ${spamReason}`);
    return NextResponse.json({ success: true });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "有効なメールアドレスが必要です" }, { status: 400 });
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: "本文は必須です" }, { status: 400 });
  }

  if (
    email.length > 254 || message.length > 5000 ||
    (name?.length ?? 0) > 100 || (subject?.length ?? 0) > 200
  ) {
    return NextResponse.json({ error: "入力が長すぎます" }, { status: 400 });
  }

  if (
    (await isRateLimited("contact_submissions", "email", email)) ||
    (await isGloballyRateLimited("contact_submissions"))
  ) {
    return NextResponse.json(
      { error: "短時間に送信が集中しています。しばらくしてからお試しください" },
      { status: 429 }
    );
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
