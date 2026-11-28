// fill-place-ids.js
// 公開中で google_place_id が空のスポットに、Googleの場所番号（place_id）を付ける。
// place_id はGoogleの規約上、保存してよい唯一の項目（写真などは保存しない）。
//
// 実行:
//   node scripts/fill-place-ids.js            … 確認だけ（書き込みなし。候補を表示）
//   node scripts/fill-place-ids.js --apply    … 書き込む
//   --limit=20 で1回の件数を指定（既定20、上限50）
//
// 費用: Text Search（名前と住所の確認つき）を1件につき1回。月5,000回まで無料、
//       超えても1,000回あたり32ドル。既定の20件なら無料枠内。
// 安全策: 件数上限あり・無限ループなし。名前か住所が合わない候補は書き込まない。

require("dotenv").config({ path: ".env.local", quiet: true });
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = Math.min(Math.max(Number(limitArg?.split("=")[1]) || 20, 1), 50);

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY が .env.local にありません");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// 比較用に、空白・記号・全角半角の違いをならす
function norm(s) {
  return (s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-‐ー－・&＆()（）「」|｜.,、。]/g, "")
    .replace(/^日本/, "")
    .replace(/〒?\d{3}\d{4}/, "");
}

// 住所の「市区町村まで」を取り出す（例: 鳥取県鳥取市南安長… → 鳥取県鳥取市）
function cityPart(address) {
  const m = norm(address).match(/^(.+?[都道府県])?(.+?郡)?(.+?[市町村])/);
  return m ? m[0] : "";
}

async function searchPlace(spot) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({
      textQuery: `${spot.name} ${spot.address || ""}`.trim(),
      languageCode: "ja",
      regionCode: "JP",
      pageSize: 3,
    }),
  });
  if (!res.ok) throw new Error(`検索失敗 (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.places || [];
}

function judge(spot, place) {
  const n1 = norm(spot.name);
  const n2 = norm(place.displayName?.text);
  const nameOk = n1 && n2 && (n1.includes(n2) || n2.includes(n1));
  const city = cityPart(spot.address);
  const addrOk = city && norm(place.formattedAddress).includes(city);
  return { nameOk, addrOk };
}

async function main() {
  const { data: spots, error } = await supabase
    .from("spots")
    .select("id, name, address")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .is("google_place_id", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) throw new Error(`スポット取得失敗: ${error.message}`);

  console.log(`対象: ${spots.length}件（上限${LIMIT}件） モード: ${APPLY ? "書き込み" : "確認のみ"}`);
  let written = 0;
  const skipped = [];

  for (const spot of spots) {
    let places = [];
    try {
      places = await searchPlace(spot);
    } catch (e) {
      skipped.push(`${spot.name}：${e.message}`);
      continue;
    }
    const hit = places.find((p) => {
      const j = judge(spot, p);
      return j.nameOk && j.addrOk;
    });

    if (!hit) {
      const top = places[0];
      skipped.push(
        `${spot.name}：一致する候補なし${top ? `（最上位: ${top.displayName?.text} / ${top.formattedAddress}）` : ""}`
      );
    } else {
      console.log(`  一致: ${spot.name} → ${hit.displayName?.text} / ${hit.formattedAddress}`);
      if (APPLY) {
        const { error: upErr } = await supabase
          .from("spots")
          .update({ google_place_id: hit.id })
          .eq("id", spot.id)
          .is("google_place_id", null);
        if (upErr) skipped.push(`${spot.name}：書き込み失敗 ${upErr.message}`);
        else written++;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n書き込み: ${written}件`);
  if (skipped.length) {
    console.log(`見送り: ${skipped.length}件`);
    skipped.forEach((s) => console.log(`  - ${s}`));
  }
  if (!APPLY) console.log("\n確認のみでした。内容がよければ --apply を付けて実行してください。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
