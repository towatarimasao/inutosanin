// 市町村ページ（/spots/[prefecture]/[city]）の対象エリア定義
// is_active=true かつ listing_status=published で5件以上の市町村のみを対象とする

export type AreaCity = {
  slug: string;
  name: string;
};

export type AreaPrefecture = {
  slug: string;
  name: string;
  cities: AreaCity[];
};

export const AREAS: AreaPrefecture[] = [
  {
    slug: "tottori",
    name: "鳥取県",
    cities: [
      { slug: "tottori-shi",  name: "鳥取市" },
      { slug: "yonago",       name: "米子市" },
      { slug: "kurayoshi",    name: "倉吉市" },
      { slug: "sakaiminato",  name: "境港市" },
      { slug: "hoki",         name: "伯耆町" },
      { slug: "daisen",       name: "大山町" },
    ],
  },
  {
    slug: "shimane",
    name: "島根県",
    cities: [
      { slug: "matsue",     name: "松江市" },
      { slug: "izumo",      name: "出雲市" },
      { slug: "masuda",     name: "益田市" },
      { slug: "ota",        name: "大田市" },
      { slug: "hamada",     name: "浜田市" },
      { slug: "yasugi",     name: "安来市" },
      { slug: "unnan",      name: "雲南市" },
      { slug: "gotsu",      name: "江津市" },
      { slug: "okinoshima", name: "隠岐の島町" },
      { slug: "iinan",      name: "飯南町" },
    ],
  },
];

// prefecture slug + city slugから該当エリアを引く（不正なslugならnull）
export function findArea(
  prefectureSlug: string,
  citySlug: string
): { prefecture: AreaPrefecture; city: AreaCity } | null {
  const prefecture = AREAS.find((p) => p.slug === prefectureSlug);
  const city = prefecture?.cities.find((c) => c.slug === citySlug);
  if (!prefecture || !city) return null;
  return { prefecture, city };
}

// 市町村名からエリアページのslugを引く（/spotsの市町村ピルからのリンク先切り替え用）
export function findAreaByCityName(
  prefectureSlug: string,
  cityName: string
): AreaCity | null {
  const prefecture = AREAS.find((p) => p.slug === prefectureSlug);
  return prefecture?.cities.find((c) => c.name === cityName) ?? null;
}

// 市町村ごとの近隣市町村（地理的な近さに基づく手動定義、3件ずつ）。
// 値のslugはすべてAREAS配列に実在する市町村slugと一致させること
export const NEARBY_CITIES: Record<string, string[]> = {
  "tottori-shi":  ["kurayoshi", "yonago", "daisen"],
  "kurayoshi":    ["tottori-shi", "daisen", "yonago"],
  "yonago":       ["sakaiminato", "daisen", "hoki"],
  "sakaiminato":  ["yonago", "hoki", "daisen"],
  "hoki":         ["daisen", "yonago", "sakaiminato"],
  "daisen":       ["yonago", "hoki", "kurayoshi"],
  "matsue":       ["yasugi", "izumo", "okinoshima"],
  "yasugi":       ["matsue", "yonago", "izumo"],
  "izumo":        ["matsue", "unnan", "iinan"],
  "unnan":        ["izumo", "iinan", "matsue"],
  "iinan":        ["unnan", "izumo", "matsue"],
  "ota":          ["gotsu", "hamada", "izumo"],
  "hamada":       ["gotsu", "masuda", "ota"],
  "masuda":       ["hamada", "gotsu", "ota"],
  "gotsu":        ["hamada", "ota", "masuda"],
  "okinoshima":   ["matsue", "yasugi", "izumo"],
};

// 市町村slugが属する都道府県slugを引く
export function findPrefectureSlugForCity(citySlug: string): string | null {
  const prefecture = AREAS.find((p) => p.cities.some((c) => c.slug === citySlug));
  return prefecture?.slug ?? null;
}

// 指定した市町村slugの近隣市町村を、都道府県slugとAreaCityのセットで返す。
// AREASに実在しないslugが紛れ込んでいた場合は黙って除外する（防御的）
export function getNearbyCities(
  citySlug: string
): { prefectureSlug: string; city: AreaCity }[] {
  const nearbySlugs = NEARBY_CITIES[citySlug] ?? [];
  return nearbySlugs
    .map((slug) => {
      const prefectureSlug = findPrefectureSlugForCity(slug);
      if (!prefectureSlug) return null;
      const area = findArea(prefectureSlug, slug);
      if (!area) return null;
      return { prefectureSlug, city: area.city };
    })
    .filter((v): v is { prefectureSlug: string; city: AreaCity } => v !== null);
}
