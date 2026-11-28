import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// スポット詳細ページで、Googleの写真を「保存せずに」その場で表示するための窓口。
// - Googleの規約上、写真そのものや写真の名前は保存できないため、毎回Googleに問い合わせる
// - 返す写真URLは一時的なもので、ブラウザがGoogleから直接読み込む
// - 撮影者の表示（authorAttributions）も一緒に返し、画面に必ず出す
// - 費用の上限：写真の取得（有料）は月の回数に上限を設け、超えたら写真を出さない（イラスト表示に戻る）

const BASE_URL = "https://places.googleapis.com/v1";

// 月の上限回数。Place Details Photos は月1,000回まで無料、超えると1,000回あたり7ドル。
// 既定の850回なら、無料枠が使い切られていても約6ドル（1,000円弱）に収まる。
const DEFAULT_MONTHLY_CAP = 850;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function noPhoto(reason: string) {
  return NextResponse.json(
    { photo: null, reason },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type Attribution = { displayName?: string; uri?: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return noPhoto("bad_id");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return noPhoto("no_api_key");

  const db = serviceClient();

  const { data: spot } = await db
    .from("spots")
    .select("google_place_id, photo_url, image_url, is_active, listing_status")
    .eq("id", id)
    .maybeSingle();

  if (!spot || !spot.is_active || spot.listing_status !== "published") return noPhoto("not_found");
  if (spot.photo_url || spot.image_url) return noPhoto("has_own_photo");
  if (!spot.google_place_id) return noPhoto("no_place_id");

  try {
    // 1. 写真の候補を取得（photos のみ指定＝無料の「IDs Only」扱い）
    const detailRes = await fetch(
      `${BASE_URL}/places/${encodeURIComponent(spot.google_place_id)}?languageCode=ja`,
      {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "photos" },
        cache: "no-store",
      }
    );
    if (!detailRes.ok) return noPhoto("detail_failed");
    const detail: {
      photos?: { name: string; authorAttributions?: Attribution[] }[];
    } = await detailRes.json();
    const first = detail.photos?.[0];
    if (!first) return noPhoto("no_photo");

    // 2. 月の上限を確認しつつ1回分を数える（上限に達していたら有料の取得はしない）
    const month = new Date().toISOString().slice(0, 7); // 例: 2026-11
    const cap = Number(process.env.PHOTO_MONTHLY_CAP) || DEFAULT_MONTHLY_CAP;
    const { data: allowed, error: capError } = await db.rpc("increment_photo_usage", {
      p_month: month,
      p_cap: cap,
    });
    // 数える仕組みが無い・失敗した場合は、安全側に倒して写真を出さない
    if (capError || allowed !== true) return noPhoto("cap_reached_or_unavailable");

    // 3. 一時的な写真URLを受け取る（ここが有料の1回）
    const mediaRes = await fetch(
      `${BASE_URL}/${first.name}/media?maxWidthPx=1200&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": apiKey }, cache: "no-store" }
    );
    if (!mediaRes.ok) return noPhoto("media_failed");
    const media: { photoUri?: string } = await mediaRes.json();
    if (!media.photoUri) return noPhoto("no_photo_uri");

    return NextResponse.json(
      {
        photo: {
          uri: media.photoUri,
          attributions: (first.authorAttributions ?? []).map((a) => ({
            name: a.displayName ?? "",
            uri: a.uri ?? "",
          })),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[spot-photo] error:", e);
    return noPhoto("error");
  }
}
