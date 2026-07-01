import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// RLSを回避するためservice_roleキーを使用
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export const maxDuration = 300;

const BASE_URL = "https://places.googleapis.com/v1";

// 山陰地方の住所フィルター
const SANIN_PREFECTURES = ["鳥取県", "島根県"];

function isSaninAddress(address: string): boolean {
  return SANIN_PREFECTURES.some((pref) => address.includes(pref));
}

// 検索対象都市と中心座標
const CITIES: { name: string; lat: number; lng: number }[] = [
  // 鳥取県
  { name: "鳥取市",   lat: 35.5014, lng: 134.2349 },
  { name: "米子市",   lat: 35.4275, lng: 133.3308 },
  { name: "境港市",   lat: 35.5426, lng: 133.2327 },
  { name: "倉吉市",   lat: 35.4297, lng: 133.8267 },
  { name: "岩美町",   lat: 35.5403, lng: 134.3504 },
  { name: "三朝町",   lat: 35.3614, lng: 133.8495 },
  { name: "琴浦町",   lat: 35.4504, lng: 133.6928 },
  { name: "北栄町",   lat: 35.4867, lng: 133.7552 },
  { name: "大山町",   lat: 35.3845, lng: 133.4736 },
  { name: "南部町",   lat: 35.3322, lng: 133.3517 },
  { name: "伯耆町",   lat: 35.3626, lng: 133.5186 },
  { name: "日吉津村", lat: 35.4372, lng: 133.3601 },
  { name: "若桜町",   lat: 35.3268, lng: 134.3983 },
  { name: "智頭町",   lat: 35.2693, lng: 134.2343 },
  // 島根県
  { name: "松江市",   lat: 35.4681, lng: 133.0487 },
  { name: "出雲市",   lat: 35.3671, lng: 132.7550 },
  { name: "浜田市",   lat: 34.8994, lng: 132.0797 },
  { name: "益田市",   lat: 34.6745, lng: 131.8417 },
  { name: "安来市",   lat: 35.4277, lng: 133.2551 },
  { name: "雲南市",   lat: 35.3063, lng: 132.9131 },
  { name: "大田市",   lat: 35.1924, lng: 132.4993 },
  { name: "江津市",   lat: 34.9984, lng: 132.2179 },
  { name: "奥出雲町", lat: 35.1866, lng: 133.0033 },
  { name: "飯南町",   lat: 35.0688, lng: 132.7310 },
  { name: "川本町",   lat: 34.9897, lng: 132.4980 },
  { name: "美郷町",   lat: 35.0718, lng: 132.5819 },
  { name: "邑南町",   lat: 34.8741, lng: 132.3867 },
  { name: "津和野町", lat: 34.4664, lng: 131.7763 },
  { name: "吉賀町",   lat: 34.4236, lng: 131.9447 },
  { name: "海士町",   lat: 36.0971, lng: 133.1039 },
  { name: "西ノ島町", lat: 36.1137, lng: 133.0070 },
  { name: "知夫村",   lat: 36.0603, lng: 133.0718 },
  { name: "隠岐の島町", lat: 36.2038, lng: 133.3167 },
];

// カテゴリ別検索キーワード
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: "dogrun",     keywords: ["ドッグラン"] },
  { category: "vet",        keywords: ["動物病院"] },
  { category: "hotel",      keywords: ["ペットホテル"] },
  { category: "restaurant", keywords: ["ペット可 カフェ", "犬連れ レストラン"] },
  { category: "shop",       keywords: ["ペットショップ", "ペット用品"] },
  { category: "adoption",   keywords: ["保護犬 譲渡", "動物愛護センター"] },
];

interface PlaceResult {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions: string[] };
  photos?: { name: string }[];
}

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY が未設定です");
  return key;
}

function buildHeaders(fieldMask: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": getApiKey(),
    "X-Goog-FieldMask": fieldMask,
  };
}

async function searchPlaces(
  keyword: string,
  city: { name: string; lat: number; lng: number }
): Promise<PlaceResult[]> {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.regularOpeningHours",
    "places.photos",
  ].join(",");

  const body = {
    textQuery: `${keyword} ${city.name}`,
    locationBias: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: 10000,
      },
    },
    languageCode: "ja",
    maxResultCount: 20,
  };

  const res = await fetch(`${BASE_URL}/places:searchText`, {
    method: "POST",
    headers: buildHeaders(fieldMask),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Places API error ${res.status}: ${err}`);
  }

  const data: { places?: PlaceResult[] } = await res.json();
  return data.places ?? [];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];
  let upserted = 0;
  let skipped = 0;

  for (const city of CITIES) {
    for (const { category, keywords } of CATEGORY_KEYWORDS) {
      for (const keyword of keywords) {
        try {
          const places = await searchPlaces(keyword, city);

          for (const place of places) {
            // 山陰地方以外の住所を除外
            if (!isSaninAddress(place.formattedAddress)) {
              skipped++;
              continue;
            }

            const hours = place.regularOpeningHours?.weekdayDescriptions?.join("\n") ?? null;

            const { error } = await supabase.from("spots").upsert(
              {
                google_place_id: place.id,
                name: place.displayName.text,
                category,
                address: place.formattedAddress,
                phone: place.nationalPhoneNumber ?? null,
                url: place.websiteUri ?? null,
                business_hours: hours,
                is_active: true,
              },
              { onConflict: "google_place_id" }
            );

            if (error) {
              errors.push(`upsert失敗 ${place.displayName.text}: ${error.message}`);
            } else {
              upserted++;
            }
          }

          // API レート制限対策
          await new Promise((r) => setTimeout(r, 300));
        } catch (err) {
          errors.push(`${city.name}/${keyword}: ${String(err)}`);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    upserted,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
