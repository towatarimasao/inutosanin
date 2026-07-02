import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const NOTIFY_TO   = "info@greatbrain475.com";
const NOTIFY_FROM = "イヌとサンイン <notify@greatbrain475.com>";
const SITE_URL    = "https://www.inutosanin.jp";

const GENRE_LABELS: Record<string, string> = {
  dogrun:     "ドッグラン",
  vet:        "動物病院",
  hotel:      "ペットホテル",
  restaurant: "ペットOK飲食店",
  shop:       "ペット用品店",
  adoption:   "保護犬情報",
};

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
  const { genre, name, address, phone, isConfirmedByVisitor, email, nickname, consentPublic, honeypot } = body as {
    genre: string;
    name: string;
    address: string;
    phone: string;
    isConfirmedByVisitor: boolean;
    email: string;
    nickname: string;
    consentPublic: boolean;
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

  const thankToken = crypto.randomUUID();

  const { data: inserted, error } = await getServiceClient()
    .from("feedback_submissions")
    .insert({
      type:                    "suggest",
      genre:                   genre,
      name:                    name.trim(),
      address:                 address.trim(),
      phone:                   phone || null,
      is_confirmed_by_visitor: isConfirmedByVisitor ?? false,
      contact_email:           email,
      contact_nickname:        nickname || null,
      consent_public:          consentPublic ?? false,
      thank_token:             thankToken,
    })
    .select("id");

  if (error) {
    console.error("[feedback/suggest] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const insertedId = inserted?.[0]?.id as string | undefined;
  const thankUrl   = insertedId
    ? `${SITE_URL}/api/feedback/thank?id=${insertedId}&token=${thankToken}`
    : null;

  // 通知メール送信（失敗してもAPIは200を返す）
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from:    NOTIFY_FROM,
      to:      NOTIFY_TO,
      subject: `【新規スポット提案】${name.trim()}`,
      text: [
        "新しいスポット提案が届きました。",
        "",
        "■ スポット情報",
        `ジャンル: ${GENRE_LABELS[genre] ?? genre}`,
        `店名:     ${name.trim()}`,
        `住所:     ${address.trim()}`,
        `電話番号: ${phone || "（未入力）"}`,
        `施設確認済み: ${isConfirmedByVisitor ? "はい" : "いいえ"}`,
        "",
        "■ 投稿者情報",
        `メールアドレス: ${email}`,
        `ニックネーム: ${nickname || "（未入力）"}`,
        ...(thankUrl ? [
          "",
          "■ お礼メール送信",
          thankUrl,
        ] : []),
      ].join("\n"),
    });

    if (mailError) {
      console.error("[feedback/suggest] メール送信失敗:", mailError);
    }
  } catch (err) {
    console.error("[feedback/suggest] メール送信エラー:", err);
  }

  return NextResponse.json({ success: true });
}
