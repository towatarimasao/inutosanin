// このslugは都道府県slug（tottori/shimane）を表す。スポット詳細ページのslugとは意味が異なる
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { supabase } from "@/lib/supabase";
import { findArea, getNearbyCities } from "@/lib/areas";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.inutosanin.jp";

const CATEGORIES = [
  { slug: "",           label: "すべて" },
  { slug: "dogrun",     label: "ドッグラン" },
  { slug: "vet",        label: "動物病院" },
  { slug: "hotel",      label: "ペットホテル" },
  { slug: "restaurant", label: "ペットOK飲食店" },
  { slug: "shop",       label: "ペット用品店・サロン" },
  { slug: "adoption",   label: "保護犬情報" },
];

const CATEGORY_LABELS: Record<string, string> = {
  dogrun:     "ドッグラン",
  vet:        "動物病院",
  hotel:      "ペットホテル",
  restaurant: "ペットOK飲食店",
  shop:       "ペット用品店・サロン",
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

// hotelカテゴリの補助タグ（同伴宿泊 / 預け先の判別用）
const STAY_TAG_LABELS: Record<string, string> = {
  stay:     "泊まる",
  boarding: "預ける",
};

const PILL_BASE = "whitespace-nowrap text-sm font-medium px-4 py-1.5 rounded-full border transition-all";
const PILL_ACTIVE = "bg-accent text-white border-accent";
const PILL_INACTIVE = "border-foreground/15 text-foreground hover:border-accent/30 hover:text-accent";

type Spot = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  description: string | null;
  pet_condition: string | null;
  photo_url: string | null;
  stay_tags: string[] | null;
};

type PageParams = { slug: string; city: string };

type NearbyCityStats = {
  total: number;
  topCategory: string | null;
};

// 近隣市町村カード表示用に、件数と最多カテゴリだけ軽量に取得する
async function getNearbyCityStats(cityName: string): Promise<NearbyCityStats> {
  const { data, error } = await supabase
    .from("spots")
    .select("category")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .ilike("address", `%${cityName}%`);

  if (error) {
    console.error("[Supabase] nearby city stats fetch error:", error);
    return { total: 0, topCategory: null };
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }

  let topCategory: string | null = null;
  let topCount = 0;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCategory = cat;
      topCount = count;
    }
  }

  return { total: data?.length ?? 0, topCategory };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug: prefecture, city } = await params;
  const area = findArea(prefecture, city);
  if (!area) return { title: "スポット一覧" };

  const { prefecture: pref, city: cityDef } = area;

  return {
    title: `${cityDef.name}の犬連れOKスポット一覧`,
    description: `${pref.name}${cityDef.name}の犬連れOKなドッグラン・動物病院・ペットホテル・飲食店・ペット用品店をまとめて紹介`,
  };
}

export default async function CitySpotsPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { slug: prefecture, city } = await params;
  const area = findArea(prefecture, city);
  if (!area) notFound();

  const { prefecture: pref, city: cityDef } = area;
  const { category } = await searchParams;
  const activeCategory = category ?? "";

  const { data: spots, error } = await supabase
    .from("spots")
    .select("*")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .ilike("address", `%${cityDef.name}%`)
    .order("created_at", { ascending: false });

  if (error) console.error("[Supabase] spots fetch error:", error);

  const allSpots: Spot[] = spots ?? [];
  const spotList = activeCategory
    ? allSpots.filter((s) => s.category === activeCategory)
    : allSpots;

  const nearbyCities = getNearbyCities(city);
  const nearbyCitiesWithStats = await Promise.all(
    nearbyCities.map(async (n) => ({
      ...n,
      stats: await getNearbyCityStats(n.city.name),
    }))
  );

  const pageUrl = `${BASE_URL}/spots/${prefecture}/${city}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: pref.name, item: `${BASE_URL}/spots?prefecture=${prefecture}` },
      { "@type": "ListItem", position: 3, name: cityDef.name, item: pageUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // </script>によるタグ抜け出しを防ぐため < をエスケープする
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">

        {/* ページヘッダー */}
        <section className="bg-[#EDE8E0] px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-en font-semibold text-accent tracking-widest mb-2">SPOTS</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              {cityDef.name}の犬連れOKスポット一覧
            </h1>
            <p className="text-sm text-subtext mt-2">
              {pref.name}{cityDef.name}には現在{allSpots.length}件の犬連れOKスポットを掲載中。ドッグラン・動物病院・ペットホテル・飲食店・ペット用品店をまとめて探せます。
            </p>
          </div>
        </section>

        {/* カテゴリフィルター */}
        <section className="bg-[#FAF6F1] border-b border-foreground/10 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <nav aria-label="カテゴリフィルター" className="flex gap-1 overflow-x-auto py-3 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.slug;
                const href = cat.slug ? `${pageUrl}?category=${cat.slug}` : pageUrl;
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

        {/* スポット一覧 */}
        <section className="px-4 sm:px-6 py-10">
          <div className="max-w-5xl mx-auto">

            {/* 件数表示 */}
            <p className="text-sm text-subtext mb-6">
              {[cityDef.name, activeCategory ? CATEGORY_LABELS[activeCategory] : ""].filter(Boolean).join(" / ")}
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
                              unoptimized
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
                          {spot.category === "hotel" && spot.stay_tags && spot.stay_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {spot.stay_tags
                                .filter((tag) => STAY_TAG_LABELS[tag])
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                      tag === "stay"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {STAY_TAG_LABELS[tag]}
                                  </span>
                                ))}
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
                          {spot.pet_condition && (
                            <p className="text-xs text-accent/80 bg-[#F0F7F3] rounded-md px-2 py-1 line-clamp-2 leading-relaxed">
                              🐾 {spot.pet_condition}
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

        {/* 近隣の市町村もチェック */}
        {nearbyCitiesWithStats.length > 0 && (
          <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-heading text-lg font-bold text-foreground mb-5">
                {cityDef.name}周辺のスポットもチェック
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {nearbyCitiesWithStats.map((n) => (
                  <li key={`${n.prefectureSlug}-${n.city.slug}`}>
                    <Link
                      href={`/spots/${n.prefectureSlug}/${n.city.slug}`}
                      className="flex flex-col bg-white rounded-2xl border border-accent/10 p-5 hover:shadow-lg transition-all duration-200 h-full"
                    >
                      <p className="font-bold text-base text-foreground leading-snug mb-1">
                        {n.city.name}
                      </p>
                      {n.stats.total > 0 ? (
                        <p className="text-xs text-subtext">
                          {n.stats.topCategory && (
                            <span
                              className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mr-1.5"
                              style={{
                                backgroundColor:
                                  (CATEGORY_COLORS[n.stats.topCategory] ?? { bg: "#E2E2E2" }).bg,
                                color:
                                  (CATEGORY_COLORS[n.stats.topCategory] ?? { text: "#444" }).text,
                              }}
                            >
                              {CATEGORY_LABELS[n.stats.topCategory] ?? n.stats.topCategory}
                            </span>
                          )}
                          全{n.stats.total}件掲載中
                        </p>
                      ) : (
                        <p className="text-xs text-subtext">スポット準備中</p>
                      )}
                      <span className="mt-auto pt-3 text-xs sm:text-sm font-semibold text-accent">
                        詳細を見る →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 投稿・報告ボタン */}
        <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-5">
            <p className="text-sm text-subtext">
              載っていないお店がありましたか？情報をお寄せください。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/confirm-spots"
                className="inline-flex items-center justify-center gap-1.5 border-2 border-accent text-accent hover:bg-accent hover:text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                🐾 犬同伴OK情報を報告する
              </Link>
              <Link
                href="/suggest-spot"
                className="inline-flex items-center justify-center gap-1.5 bg-accent text-white hover:bg-accent/90 text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                ＋ スポットを投稿する
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
