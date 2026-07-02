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

async function fetchSpotNames(spotIds: string[]): Promise<Record<string, string>> {
  const { data } = await getServiceClient()
    .from("spots")
    .select("id, name")
    .in("id", spotIds);

  const map: Record<string, string> = {};
  (data ?? []).forEach((s: { id: string; name: string }) => { map[s.id] = s.name; });
  return map;
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
    type:             "confirm",
    spot_id:          spotId,
    contact_email:    email,
    contact_nickname: nickname || null,
  }));

  const { error } = await getServiceClient()
    .from("feedback_submissions")
    .insert(rows);

  if (error) {
    console.error("[feedback/confirm] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // スポット名を取得してメール送信（失敗してもAPIは200を返す）
  try {
    const nameMap = await fetchSpotNames(spotIds);
    const spotList = spotIds
      .map((id, i) => `${i + 1}. ${nameMap[id] ?? id}`)
      .join("\n");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from:    NOTIFY_FROM,
      to:      NOTIFY_TO,
      subject: `【犬同伴OK報告】${spotIds.length}件のスポット確認情報が届きました`,
      text: [
        `${spotIds.length}件の犬同伴OK確認情報が届きました。`,
        "",
        "■ チェックされたスポット",
        spotList,
        "",
        "■ 投稿者情報",
        `メールアドレス: ${email}`,
        `ニックネーム: ${nickname || "（未入力）"}`,
      ].join("\n"),
    });

    if (mailError) {
      console.error("[feedback/confirm] メール送信失敗:", mailError);
    }
  } catch (err) {
    console.error("[feedback/confirm] メール送信エラー:", err);
  }

  return NextResponse.json({ success: true, count: rows.length });
}
