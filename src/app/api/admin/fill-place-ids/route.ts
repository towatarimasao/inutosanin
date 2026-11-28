import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 管理者専用（/api/admin/* は proxy.ts のログインで保護）。
// 公開中で google_place_id が空のスポットに、Googleの場所番号を付ける。
// place_id はGoogleの規約上、保存してよい唯一の項目（写真などは保存しない）。
// 使い方: GET で確認のみ（書き込みなし）、POST で書き込み。?limit=20（上限50）
// 費用: Text Search を1件につき1回（月5,000回まで無料）。件数上限あり・ループは対象件数まで。

export const maxDuration = 120;

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

function norm(s: string | null | undefined) {
  return (s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-‐ー－・&＆()（）「」|｜.,、。]/g, "")
    .replace(/^日本/, "")
    .replace(/〒?\d{3}\d{4}/, "");
}

function cityPart(address: string | null) {
  const m = norm(address).match(/^(.+?[都道府県])?(.+?郡)?(.+?[市町村])/);
  return m ? m[0] : "";
}

type Place = { id: string; displayName?: { text?: string }; formattedAddress?: string };

async function searchPlace(apiKey: string, name: string, address: string | null): Promise<Place[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: `${name} ${address || ""}`.trim(),
      languageCode: "ja",
      regionCode: "JP",
      pageSize: 3,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`検索失敗 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data: { places?: Place[] } = await res.json();
  return data.places || [];
}

async function run(req: NextRequest, apply: boolean) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY が未設定です" }, { status: 500 });

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Math.min(Math.max(limitParam || 20, 1), 50);

  const client = db();
  const { data: spots, error } = await client
    .from("spots")
    .select("id, name, address")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .is("google_place_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const matched: string[] = [];
  const skipped: string[] = [];
  let written = 0;

  for (const spot of spots ?? []) {
    try {
      const places = await searchPlace(apiKey, spot.name, spot.address);
      const city = cityPart(spot.address);
      const hit = places.find((p) => {
        const n1 = norm(spot.name);
        const n2 = norm(p.displayName?.text);
        const nameOk = !!n1 && !!n2 && (n1.includes(n2) || n2.includes(n1));
        const addrOk = !!city && norm(p.formattedAddress).includes(city);
        return nameOk && addrOk;
      });
      if (!hit) {
        const top = places[0];
        skipped.push(`${spot.name}：一致なし${top ? `（最上位: ${top.displayName?.text} / ${top.formattedAddress}）` : ""}`);
      } else {
        matched.push(`${spot.name} → ${hit.displayName?.text} / ${hit.formattedAddress}`);
        if (apply) {
          const { error: upErr } = await client
            .from("spots")
            .update({ google_place_id: hit.id })
            .eq("id", spot.id)
            .is("google_place_id", null);
          if (upErr) skipped.push(`${spot.name}：書き込み失敗 ${upErr.message}`);
          else written++;
        }
      }
    } catch (e) {
      skipped.push(`${spot.name}：${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    mode: apply ? "書き込み" : "確認のみ",
    target: spots?.length ?? 0,
    matched,
    written,
    skipped,
  });
}

export async function GET(req: NextRequest) {
  return run(req, false);
}

export async function POST(req: NextRequest) {
  return run(req, true);
}
