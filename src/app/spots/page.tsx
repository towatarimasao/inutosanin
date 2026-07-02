import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { supabase } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "スポット一覧",
  description: "山陰（鳥取・島根）の犬連れOKスポット一覧。ドッグラン・動物病院・ペットホテルなど。",
};

const CATEGORIES = [
  { slug: "",           label: "すべて" },
  { slug: "dogrun",     label: "ドッグラン" },
  { slug: "vet",        label: "動物病院" },
  { slug: "hotel",      label: "ペットホテル" },
  { slug: "restaurant", label: "ペットOK飲食店" },
  { slug: "shop",       label: "ペット用品店" },
  { slug: "adoption",   label: "保護犬情報" },
];

const CATEGORY_LABELS: Record<string, string> = {
  dogrun:     "ドッグラン",
  vet:        "動物病院",
  hotel:      "ペットホテル",
  restaurant: "ペットOK飲食店",
  shop:       "ペット用品店",
  adoption:   "保護犬情報",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  dogrun:     { bg: "#C5DDD0", text: "#2A6048" },
  vet:        { bg: "#BDD4E3", text: "#1F4F6E" },
  hotel:      { bg: "#F5D0B5", text: "#7A3D10" },
  restaurant: { bg: "#C5DDD0", text: "#2A6048" },
  shop:       { bg: "#BDD4E3", text: "#1F4F6E" },
  adoption:   { bg: "#F5D0B5", text: "#7A3D10" },
};

// 地域定義
const PREFECTURES = [
  { slug: "",        label: "全て" },
  { slug: "tottori", label: "鳥取県" },
  { slug: "shimane", label: "島根県" },
];

const CITIES: Record<string, string[]> = {
  tottori: ["鳥取市", "米子市", "倉吉市", "境港市", "岩美町", "三朝町", "琴浦町", "北栄町", "大山町", "南部町", "伯耆町", "日吉津村", "若桜町", "智頭町"],
  shimane: ["松江市", "出雲市", "浜田市", "益田市", "安来市", "雲南市", "大田市", "江津市", "奥出雲町", "飯南町", "川本町", "美郷町", "邑南町", "津和野町", "吉賀町", "海士町", "西ノ島町", "知夫村", "隠岐の島町"],
};

const PREFECTURE_LABEL: Record<string, string> = { tottori: "鳥取県", shimane: "島根県" };

type Spot = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  is_active: boolean;
};

// 現在のフィルターを保ちつつ特定パラメータだけ変えたURLを生成
function buildUrl(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
  const qs = sp.toString();
  return qs ? `/spots?${qs}` : "/spots";
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-label={`評価${rating}`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className="text-[#D2691E] text-sm">★</span>;
        if (i === full && half) return <span key={i} className="text-[#D2691E] text-sm opacity-50">★</span>;
        return <span key={i} className="text-foreground/20 text-sm">★</span>;
      })}
    </span>
  );
}

const PILL_BASE = "whitespace-nowrap text-sm font-medium px-4 py-1.5 rounded-full border transition-all";
const PILL_ACTIVE = "bg-accent text-white border-accent";
const PILL_INACTIVE = "border-foreground/15 text-foreground hover:border-accent/30 hover:text-accent";

export default async function SpotsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; prefecture?: string; city?: string }>;
}) {
  const { category, prefecture, city } = await searchParams;
  const activeCategory   = category   ?? "";
  const activePrefecture = prefecture ?? "";
  const activeCity       = city       ?? "";

  let query = supabase
    .from("spots")
    .select("*")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .order("created_at", { ascending: false });

  if (activeCategory)   query = query.eq("category", activeCategory);
  if (activeCity)       query = query.ilike("address", `%${activeCity}%`);
  else if (activePrefecture) {
    const prefLabel = PREFECTURE_LABEL[activePrefecture];
    if (prefLabel) query = query.ilike("address", `%${prefLabel}%`);
  }

  const { data: spots, error } = await query;
  if (error) console.error("[Supabase] spots fetch error:", error);
  const spotList: Spot[] = spots ?? [];

  const cityList = activePrefecture ? CITIES[activePrefecture] ?? [] : [];

  return (
    <>
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">

        {/* ページヘッダー */}
        <section className="bg-[#EDE8E0] px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-en font-semibold text-accent tracking-widest mb-2">SPOTS</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              スポット一覧
            </h1>
            <p className="text-sm text-subtext mt-2">
              山陰（鳥取・島根）の犬連れOKスポットを探せます
            </p>
          </div>
        </section>

        {/* フィルターエリア */}
        <section className="bg-[#FAF6F1] border-b border-foreground/10 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">

            {/* 1段目：都道府県フィルター */}
            <nav aria-label="都道府県フィルター" className="flex gap-1 overflow-x-auto pt-3 pb-2 scrollbar-none">
              {PREFECTURES.map((pref) => {
                const isActive = activePrefecture === pref.slug;
                const href = buildUrl({
                  category: activeCategory,
                  prefecture: pref.slug,
                  city: "",
                });
                return (
                  <Link
                    key={pref.slug}
                    href={href}
                    className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                  >
                    {pref.label}
                  </Link>
                );
              })}
            </nav>

            {/* 2段目：市町村フィルター（県選択時のみ） */}
            {cityList.length > 0 && (
              <nav aria-label="市町村フィルター" className="flex flex-wrap gap-1 pb-3">
                <Link
                  href={buildUrl({ category: activeCategory, prefecture: activePrefecture, city: "" })}
                  className={`${PILL_BASE} ${activeCity === "" ? PILL_ACTIVE : PILL_INACTIVE}`}
                >
                  全て
                </Link>
                {cityList.map((c) => {
                  const isActive = activeCity === c;
                  return (
                    <Link
                      key={c}
                      href={buildUrl({ category: activeCategory, prefecture: activePrefecture, city: c })}
                      className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                    >
                      {c}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* 3段目：カテゴリフィルター */}
            <nav aria-label="カテゴリフィルター" className="flex gap-1 overflow-x-auto py-3 scrollbar-none border-t border-foreground/5">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.slug;
                const href = buildUrl({
                  category: cat.slug,
                  prefecture: activePrefecture,
                  city: activeCity,
                });
                return (
                  <Link
                    key={cat.slug}
                    href={href}
                    className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* 注意書き */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
          <p className="text-xs text-subtext/70 leading-relaxed">
            ※ペット用品店にはコンビニ・スーパー・100円均一など一部不適切な店舗が含まれる場合があります。また、掲載情報は必ずしも最新ではない場合があります。
          </p>
        </div>

        {/* スポット一覧 */}
        <section className="px-4 sm:px-6 py-10">
          <div className="max-w-5xl mx-auto">

            {/* 件数表示 */}
            <p className="text-sm text-subtext mb-6">
              {[
                activeCity || (activePrefecture ? PREFECTURE_LABEL[activePrefecture] : ""),
                activeCategory ? CATEGORY_LABELS[activeCategory] : "",
              ].filter(Boolean).join(" / ") || "すべて"}
              {" "}
              <span className="font-semibold text-foreground">{spotList.length}件</span>
            </p>

            {spotList.length === 0 ? (
              <div className="py-20 text-center text-subtext text-sm">
                条件に合うスポットは現在準備中です
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {spotList.map((spot) => {
                  const badgeColor = CATEGORY_COLORS[spot.category] ?? { bg: "#E2E2E2", text: "#444" };
                  return (
                    <li key={spot.id}>
                      <Link href={`/spots/${spot.id}`} className="flex flex-col bg-white rounded-2xl overflow-hidden border border-accent/10 hover:shadow-lg transition-all duration-200 h-full">

                        {/* 画像エリア */}
                        <div className="relative aspect-video bg-[#E2EEE8] flex items-center justify-center overflow-hidden">
                          {spot.photo_url ? (
                            <Image
                              src={spot.photo_url}
                              alt={spot.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <span className="text-4xl opacity-30">🐾</span>
                          )}
                          <span
                            className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full z-10"
                            style={{ backgroundColor: badgeColor.bg, color: badgeColor.text }}
                          >
                            {CATEGORY_LABELS[spot.category] ?? spot.category}
                          </span>
                        </div>

                        {/* テキスト */}
                        <div className="flex flex-col gap-2 p-4 flex-1">
                          <p className="font-bold text-sm sm:text-base text-foreground leading-snug">
                            {spot.name}
                          </p>
                          {spot.rating != null && (
                            <div className="flex items-center gap-2">
                              <StarRating rating={spot.rating} />
                              <span className="text-xs text-subtext font-en">
                                {spot.rating.toFixed(1)}
                                {spot.review_count != null && (
                                  <span className="ml-1">({spot.review_count})</span>
                                )}
                              </span>
                            </div>
                          )}
                          {spot.address && (
                            <p className="text-xs text-subtext">{spot.address}</p>
                          )}
                          {spot.description && (
                            <p className="text-xs text-subtext line-clamp-2 leading-relaxed mt-1">
                              {spot.description}
                            </p>
                          )}
                          <span className="mt-auto pt-2 text-xs sm:text-sm font-semibold text-accent">
                            詳細を見る →
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
