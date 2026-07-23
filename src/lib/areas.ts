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
