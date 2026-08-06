import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const NOTIFY_FROM = "イヌとサンイン <notify@greatbrain475.com>";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function html(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>
      body{font-family:sans-serif;display:flex;align-items:center;
           justify-content:center;min-height:100vh;margin:0;
           background:#F7F1E7;color:#2A2521;}
      .box{text-align:center;padding:2rem;max-width:480px;}
      h1{font-size:1.25rem;margin-bottom:1rem;}
      p{font-size:.9rem;color:#6B6460;line-height:1.7;}
    </style></head>
    <body><div class="box"><h1>${title}</h1><p>${body}</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id    = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) {
    return html("エラー", "パラメータが不正です。");
  }

  const supabase = getServiceClient();

  // 該当行を取得
  const { data: row, error: fetchError } = await supabase
    .from("feedback_submissions")
    .select("id, type, contact_email, contact_nickname, thank_token, thanked_at, spot_id, name")
    .eq("id", id)
    .single();

  if (fetchError || !row) {
    return html("エラー", "該当する投稿が見つかりませんでした。");
  }

  // token 検証
  if (row.thank_token !== token) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 二重送信防止
  if (row.thanked_at) {
    return html(
      "送信済みです",
      "このお礼メールは既に送信済みです。"
    );
  }

  // 送信先メール・ニックネーム
  const toEmail  = row.contact_email as string;
  const nickname = (row.contact_nickname as string | null) || "お客様";

  // スポット名を解決
  let spotName = "";
  if (row.type === "confirm" && row.spot_id) {
    const { data: spot } = await supabase
      .from("spots")
      .select("name")
      .eq("id", row.spot_id)
      .single();
    spotName = (spot?.name as string | undefined) ?? "ご報告いただいたスポット";
  } else if (row.type === "suggest") {
    spotName = (row.name as string | null) ?? "ご提案いただいたスポット";
  }

  // メール本文
  const isConfirm = row.type === "confirm";
  const mailText = isConfirm
    ? [
        `${nickname}さん`,
        "",
        `この度は「${spotName}」の犬同伴OK情報をご提供いただき、`,
        "誠にありがとうございました。",
        "",
        "いただいた情報は、イヌとサンインのスポット情報に反映させて",
        "いただきます。",
        "",
        "今後とも、イヌとサンインをよろしくお願いいたします。",
        "",
        "イヌとサンイン運営",
        "株式会社グレートブレーン",
      ].join("\n")
    : [
        `${nickname}さん`,
        "",
        `この度は「${spotName}」の情報をご提案いただき、`,
        "誠にありがとうございました。",
        "",
        "いただいた情報は、確認のうえイヌとサンインのスポット情報に",
        "反映させていただきます。",
        "",
        "今後とも、イヌとサンインをよろしくお願いいたします。",
        "",
        "イヌとサンイン運営",
        "株式会社グレートブレーン",
      ].join("\n");

  // Resendでお礼メール送信
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: mailError } = await resend.emails.send({
      from:    NOTIFY_FROM,
      to:      toEmail,
      subject: "【イヌとサンイン】情報提供のお礼",
      text:    mailText,
    });

    if (mailError) {
      console.error("[feedback/thank] メール送信失敗:", mailError);
      return html("送信エラー", "メールの送信に失敗しました。しばらくしてから再度お試しください。");
    }
  } catch (err) {
    console.error("[feedback/thank] メール送信エラー:", err);
    return html("送信エラー", "メールの送信に失敗しました。しばらくしてから再度お試しください。");
  }

  // thanked_at を記録
  await supabase
    .from("feedback_submissions")
    .update({ thanked_at: new Date().toISOString() })
    .eq("id", id);

  return html(
    "お礼メールを送信しました",
    `${toEmail} 宛にお礼メールをお送りしました。`
  );
}
