// generate-slugs.js
// spots.slug の一括生成（ドライラン専用・DB書き込みなし）
// 実行: node scripts/generate-slugs.js
// 出力: scripts/slug-dryrun-<timestamp>.csv

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const Kuroshiro = require("kuroshiro").default;
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 市区町村名 → ローマ字（行政接尾辞「市/町/村」は落とす。areas.tsのcity.slugと表記を揃える）
const CITY_ROMAJI = {
  // 鳥取県
  "鳥取市": "tottori",
  "米子市": "yonago",
  "倉吉市": "kurayoshi",
  "境港市": "sakaiminato",
  "岩美町": "iwami",
  "三朝町": "misasa",
  "琴浦町": "kotoura",
  "北栄町": "hokuei",
  "大山町": "daisen",
  "南部町": "nanbu",
  "伯耆町": "hoki",
  "日吉津村": "hiezu",
  "若桜町": "wakasa",
  "智頭町": "chizu",
  "八頭町": "yazu",
  "湯梨浜町": "yurihama",
  "日野町": "hino",
  "江府町": "kofu",
  "日南町": "nichinan",
  // 島根県
  "松江市": "matsue",
  "出雲市": "izumo",
  "浜田市": "hamada",
  "益田市": "masuda",
  "安来市": "yasugi",
  "雲南市": "unnan",
  "大田市": "ota",
  "江津市": "gotsu",
  "奥出雲町": "okuizumo",
  "飯南町": "iinan",
  "川本町": "kawamoto",
  "美郷町": "misato",
  "邑南町": "onan",
  "津和野町": "tsuwano",
  "吉賀町": "yoshika",
  "海士町": "ama",
  "西ノ島町": "nishinoshima",
  "知夫村": "chibu",
  "隠岐の島町": "okinoshima",
};
// 長い地名から先にマッチさせる（例:「隠岐の島町」が「島町」等の部分一致で誤爆しないように）
const CITY_NAMES_BY_LENGTH_DESC = Object.keys(CITY_ROMAJI).sort((a, b) => b.length - a.length);

// 機械変換(kuromoji形態素解析)では正しく読めない、または不自然な分割になる地名の例外辞書。
// キーは住所の地名表記（かな/カナ/漢字）、値は最終的に使いたいローマ字。
// local_part_raw中に部分一致した箇所をこの読みで置き換えてからkuroshiroにかける。
// 鳥取・島根の地名限定の辞書のため、他地域の同名地名には流用しないこと。
// 追加する場合は「なぜ機械変換が誤るか」をコメントで残す。
const PLACE_NAME_EXCEPTIONS = {
  // ヶ(小文字カナ)がkuroshiroで独立音節に分割され「hata-ke-saki」のように崩れるため固定読みで上書き
  "旗ヶ崎": "hatagasaki",
  // ひらがな地名「はわい」がkuromojiの形態素解析で「わ」「わい」に誤分割されるため固定読みで上書き
  "はわい": "hawai",
  // 「大山」は一般的な訓読みだと「おおやま(oyama)」に変換されるが、
  // このデータセットの住所はいずれも大山町(daisen)エリア内の記載であり、
  // 地元表記・観光文脈では「daisen」で統一されているため上書きする
  "大山": "daisen",
  // 「八橋」は通常の音読み変換では読めない難読地名（正しくは「やばせ(yabase)」）
  "八橋": "yabase",
  // 「江尾」は江府町の地名。地形が海老に似ていることに由来し、正しい読みは「えび(ebi)」
  // （日本郵便・Weblio地名辞典で確認）。kuromojiの音読み変換では別の読みになるため上書き
  "江尾": "ebi",
  // 「岡成」は通常の訓読みだと分割されて崩れるため固定読みで上書き
  "岡成": "okanari",
  // 「両三柳」は熟字訓的な読みでkuroshiroが「ryo-san-yanagi」と誤分割するため上書き
  "両三柳": "ryomitsuyanagi",
};
// 長い表記から先にマッチさせる（部分文字列の誤爆防止）
const PLACE_NAME_EXCEPTION_KEYS = Object.keys(PLACE_NAME_EXCEPTIONS).sort((a, b) => b.length - a.length);

// 住所表記のノイズとなる接頭辞（大字・字は行政区画の意味を持つだけで地名の読みには寄与しない）
const ADDRESS_NOISE_PREFIXES = ["大字", "字"];

// spots.category → スラッグ用英語ラベル
const CATEGORY_SLUG = {
  dogrun: "dog-run",
  vet: "animal-hospital",
  hotel: "pet-hotel",
  restaurant: "restaurant",
  shop: "pet-shop",
  adoption: "adoption",
};

function stripAddressNoise(address) {
  return (address || "")
    // 全角数字・全角英数字を半角に正規化（丁目・番地の全角数字対策）
    .normalize("NFKC")
    .replace(/^日本、/, "")
    .replace(/〒\d{3}-?\d{4}/, "")
    .replace(/^(鳥取県|島根県)/, "")
    .trim();
}

// 市区町村名を除去した残り部分から、番地・丁目より前の地名部分だけを取り出す
function extractLocalPart(addressAfterCity) {
  // 最初の数字（丁目・番地・郵便番号残骸など）より前を地名とみなす
  const match = addressAfterCity.match(/^[^0-9]*/);
  let local = (match ? match[0] : "").trim();
  // 末尾に残りがちな記号を除去
  local = local.replace(/[、,・\s]+$/, "");
  // 先頭の「大字」「字」を除去（地名の読みには寄与しないノイズ）
  for (const prefix of ADDRESS_NOISE_PREFIXES) {
    if (local.startsWith(prefix)) {
      local = local.slice(prefix.length).trim();
      break;
    }
  }
  // 住所途中に出現する単独の「字」も除去（「大字」の一部である場合は残す）
  local = local.replace(/(?<!大)字/g, "").trim();
  return local;
}

// 「町」を挟んで同一（または類似）地名が繰り返されるケースでは、
// kuromojiの形態素解析がトークン境界を認識できず、
// スペース無しで丸ごと1語に融合したローマ字を返すことがある
// （例:「長久町長久」→"nagahisachonagahisa"）。
// この場合はmachi/choトークンとして除去できないため、
// 「町」の位置で明示的に文字列を分割し、choを境界として挟み直す。
const CHO_READINGS = ["machi", "cho", "chō", "mura"];

async function convertPlainSegment(text, kuroshiro) {
  const romaji = await kuroshiro.convert(text, { to: "romaji", mode: "spaced" });
  const normalized = normalizeRomaji(romaji);

  const choIdx = text.indexOf("町");
  const choIsInternal = choIdx > 0 && choIdx < text.length - 1;
  // フィルタ前のトークンで判定する（フィルタ後はmachi/cho等が必ず除去されているため）
  const choTokenIsolated = tokenizeRomaji(romaji).some((t) => CHO_READINGS.includes(t));

  if (choIsInternal && !choTokenIsolated) {
    // 「町」を含めて変換することで、単独変換時に別の読み（熟字訓など）に
    // ぶれるのを防ぎ、地名としての読みを保った上でmachi/cho相当のトークンだけ取り除く
    const beforeTokens = tokenizeRomaji(
      await kuroshiro.convert(text.slice(0, choIdx + 1), { to: "romaji", mode: "spaced" })
    );
    while (beforeTokens.length && CHO_READINGS.includes(beforeTokens[beforeTokens.length - 1])) {
      beforeTokens.pop();
    }
    const after = text.slice(choIdx + 1);
    const afterRomaji = after ? normalizeRomaji(await kuroshiro.convert(after, { to: "romaji", mode: "spaced" })) : "";

    // 完全一致では取り除けない、machi/cho等が語末に融合したトークン（例:「西町」→"nishimachi"）は
    // 既に町の読みを含んでいるとみなし、cho区切りを重複挿入しない
    const lastBeforeToken = beforeTokens[beforeTokens.length - 1] ?? "";
    const choAlreadyFused = CHO_READINGS.some((r) => lastBeforeToken.endsWith(r));
    if (choAlreadyFused) {
      return [beforeTokens.join("-"), afterRomaji].filter(Boolean).join("-");
    }

    return [beforeTokens.join("-"), "cho", afterRomaji].filter(Boolean).join("-");
  }

  return normalized;
}

// 例外辞書にマッチする箇所は固定のローマ字に差し替え、それ以外の部分だけkuroshiroで変換する
async function romanizeLocalPart(text, kuroshiro) {
  const segments = [text];
  for (const key of PLACE_NAME_EXCEPTION_KEYS) {
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      if (typeof seg !== "string" || !seg.includes(key)) continue;
      const parts = seg.split(key);
      const replaced = [];
      parts.forEach((part, idx) => {
        if (part) replaced.push(part);
        if (idx < parts.length - 1) replaced.push({ exception: PLACE_NAME_EXCEPTIONS[key] });
      });
      segments.splice(i, 1, ...replaced);
    }
  }

  const romajiParts = [];
  for (const seg of segments) {
    if (typeof seg === "object") {
      romajiParts.push(seg.exception);
      continue;
    }
    if (!seg) continue;
    const normalized = await convertPlainSegment(seg, kuroshiro);
    if (normalized) romajiParts.push(normalized);
  }
  return romajiParts.join("-");
}

// マクロン除去・小文字化・記号除去のみ行い、トークン分割した状態で返す（フィルタ前）
function tokenizeRomaji(romaji) {
  return romaji
    .normalize("NFKD")
    // マクロン(ō/ū/ā/ī/ē)を除去して長音記号を落とす
    .replace(/[̄]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);
}

function normalizeRomaji(romaji) {
  return tokenizeRomaji(romaji)
    // 行政接尾辞の読み（machi/cho/mura）が単独トークンとして残った場合は削る
    .filter((token) => !["machi", "cho", "mura", "chō"].includes(token))
    .join("-");
}

function slugify(parts) {
  return parts
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// 公開391件優先のデフォルト絞り込み。generate-slugs.js / backfill-slugs.js で共通利用する
async function fetchTargetSpots(supabaseClient) {
  const { data, error } = await supabaseClient
    .from("spots")
    .select("id, name, address, category, listing_status, is_active")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`spots取得失敗: ${error.message}`);
  return data;
}

async function createKuroshiro() {
  const kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  return kuroshiro;
}

// spots配列からslug生成結果の行データを組み立てる（ドライラン・バックフィル共通ロジック）
async function computeSlugRows(spots, kuroshiro) {
  const rows = [];
  const slugCount = new Map();

  for (const spot of spots) {
    const notes = [];
    const cleaned = stripAddressNoise(spot.address);

    const matchedCity = CITY_NAMES_BY_LENGTH_DESC.find((name) => cleaned.includes(name));
    if (!matchedCity) notes.push("city_not_matched");
    const citySlug = matchedCity ? CITY_ROMAJI[matchedCity] : null;

    const afterCity = matchedCity ? cleaned.slice(cleaned.indexOf(matchedCity) + matchedCity.length) : cleaned;
    const localRaw = extractLocalPart(afterCity);

    let localSlug = "";
    if (localRaw) {
      localSlug = await romanizeLocalPart(localRaw, kuroshiro);
      if (!localSlug) notes.push("local_part_empty_after_normalize");
    } else {
      notes.push("local_part_empty");
    }
    // 施設名等が住所末尾に紛れ込んでいる可能性がある長い地名は目視確認を促す
    if (localRaw.length > 8) notes.push("local_part_long");

    const categorySlug = CATEGORY_SLUG[spot.category];
    if (!categorySlug) notes.push(`unknown_category:${spot.category}`);

    let baseSlug = slugify([citySlug, localSlug, categorySlug]);
    if (!baseSlug) {
      baseSlug = slugify([spot.id.slice(0, 8), categorySlug]);
      notes.push("fallback_to_id_prefix");
    }

    const count = slugCount.get(baseSlug) ?? 0;
    slugCount.set(baseSlug, count + 1);
    const finalSlug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    if (count > 0) notes.push(`duplicate_base_slug(#${count + 1})`);

    rows.push({
      id: spot.id,
      name: spot.name,
      address: spot.address ?? "",
      category: spot.category,
      matched_city: matchedCity ?? "",
      local_part_raw: localRaw,
      generated_slug: finalSlug,
      notes: notes.join(";"),
    });
  }

  return rows;
}

function rowsToCsv(rows) {
  const header = ["id", "name", "address", "category", "matched_city", "local_part_raw", "generated_slug", "notes"];
  const csvLines = [header.join(",")];
  for (const r of rows) {
    csvLines.push(
      header
        .map((key) => {
          const v = String(r[key] ?? "");
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    );
  }
  return csvLines.join("\n");
}

async function main() {
  const spots = await fetchTargetSpots(supabase);
  const kuroshiro = await createKuroshiro();
  const rows = await computeSlugRows(spots, kuroshiro);

  const outPath = path.join(__dirname, `slug-dryrun-${Date.now()}.csv`);
  fs.writeFileSync(outPath, rowsToCsv(rows), "utf-8");

  const flagged = rows.filter((r) => r.notes);
  const duplicates = rows.filter((r) => r.notes.includes("duplicate_base_slug"));

  console.log(`対象件数: ${rows.length}`);
  console.log(`要確認フラグあり: ${flagged.length}`);
  console.log(`重複ベーススラッグ（連番付与）件数: ${duplicates.length}`);
  console.log(`出力: ${outPath}`);
}

module.exports = { fetchTargetSpots, createKuroshiro, computeSlugRows, rowsToCsv };

// このファイルを直接実行した場合のみドライランを行う（backfill-slugs.jsからのrequire時は実行しない）
if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
