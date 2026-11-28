import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SpotPlaceholder from "@/app/_components/SpotPlaceholder";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { supabase } from "@/lib/supabase";
import { AREAS, findAreaByCityName } from "@/lib/areas";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.inutosanin.jp";

// category・prefectureの指定内容を反映したcanonical URLを生成する
// メタ情報（検索結果に出るタイトル・説明文）用の言い回し。検索でよく使われる語を含める
const META_CATEGORY: Record<string, { title: string; desc: string }> = {
  dogrun:     { title: "ドッグラン",                         desc: "ドッグラン" },
  vet:        { title: "動物病院",                           desc: "動物病院" },
  hotel:      { title: "ペットホテル・犬と泊まれる宿",       desc: "ペットホテル・犬と泊まれる宿・犬を預けられる施設" },
  restaurant: { title: "犬連れOKの飲食店・カフェ",           desc: "犬と一緒に入れる飲食店・カフェ（テラス席のみ可を含む）" },
  shop:       { title: "ペットショップ・ペット用品店・トリミングサロン", desc: "ペットショップ・ペット用品店・トリミングサロン" },
  adoption:   { title: "保護犬情報",                         desc: "保護犬の譲渡に関する団体・施設" },
};
const META_PREF_LABEL: Record<string, string> = { tottori: "鳥取県", shimane: "島根県" };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; prefecture?: string }>;
}): Promise<Metadata> {
  const { category, prefecture } = await searchParams;

  const sp = new URLSearchParams();
  if (category) sp.set("category", category);
  if (prefecture) sp.set("prefecture", prefecture);
  const qs = sp.toString();

  // 絞り込み条件ごとにタイトル・説明文を変える。
  // 以前は全条件で「スポット一覧」と同じタイトルだったため、検索結果で中身が伝わらず、
  // サーチコンソールでも /spots・/spots?category=shop などのクリック率が1%前後と低かった。
  const areaLabel = (prefecture && META_PREF_LABEL[prefecture]) || "山陰（鳥取・島根）";
  const catMeta = category ? META_CATEGORY[category] : undefined;
  const title = catMeta
    ? `${areaLabel}の${catMeta.title}一覧`
    : `${areaLabel}の犬連れOKスポット一覧｜ドッグラン・ペットOKのランチ・カフェ・ペットホテル`;
  const description = catMeta
    ? `${areaLabel}の${catMeta.desc}をまとめて掲載。住所・営業時間・電話番号・ペット同伴条件を市町村別に確認できます。`
    : `${areaLabel}で犬と一緒に行けるスポットを市町村別に掲載。ドッグラン・ペットOKの飲食店やカフェ・ペットホテル・動物病院・ペット用品店の住所・営業時間・同伴条件を確認できます。`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/spots${qs ? `?${qs}` : ""}`,
    },
  };
}

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
  slug: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  description: string | null;
  pet_condition: string | null;
  photo_url: string | null;
  created_at: string;
  is_active: boolean;
  stay_tags: string[] | null;
};

// hotelカテゴリの補助タグ（同伴宿泊 / 預け先の判別用）
const STAY_TAG_LABELS: Record<string, string> = {
  stay:     "泊まる",
  boarding: "預ける",
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
        if (i < full) return <span key={i} className="text-[#A8521A] text-sm">★</span>;
        if (i === full && half) return <span key={i} className="text-[#A8521A] text-sm opacity-50">★</span>;
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

  // 見出し：検索結果の題名（generateMetadata）と同じ言い回しにそろえる。
  // 以前は絞り込み条件に関係なく「スポット一覧」だけだった
  const headingArea = (activePrefecture && META_PREF_LABEL[activePrefecture]) || "山陰（鳥取・島根）";
  const headingCat = activeCategory ? META_CATEGORY[activeCategory] : undefined;
  const heading = headingCat
    ? `${headingArea}の${headingCat.title}一覧`
    : `${headingArea}の犬連れOKスポット一覧`;

  // 「市町村から探す」に出す専用ページ。県を選んでいるときはその県だけ
  const areaLinkPrefs = activePrefecture ? AREAS.filter((p) => p.slug === activePrefecture) : AREAS;

  return (
    <>
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">

        {/* ページヘッダー */}
        <section className="bg-[#EDE8E0] px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-en font-semibold text-accent tracking-widest mb-2">SPOTS</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              {heading}
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
                  // 専用市町村ページがある場合はそちらへ、なければ従来通り?city=クエリで絞り込む
                  const dedicatedCity = findAreaByCityName(activePrefecture, c);
                  const href = dedicatedCity
                    ? `/spots/${activePrefecture}/${dedicatedCity.slug}${activeCategory ? `?category=${activeCategory}` : ""}`
                    : buildUrl({ category: activeCategory, prefecture: activePrefecture, city: c });
                  return (
                    <Link
                      key={c}
                      href={href}
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

        {/* 注意書き：shopカテゴリ選択時のみ表示 */}
        {activeCategory === 'shop' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
            <p className="text-xs text-subtext/70 leading-relaxed">
              ※ペット用品店・サロンにはコンビニ・スーパー・100円均一など一部不適切な店舗が含まれる場合があります。また、掲載情報は必ずしも最新ではない場合があります。
            </p>
          </div>
        )}

        {/* お出かけグッズの案内：dogrunカテゴリ選択時のみ表示 */}
        {activeCategory === 'dogrun' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
            <Link
              href="/wanko-goods"
              className="flex items-center justify-between gap-3 bg-white rounded-xl border border-accent/15 px-5 py-3.5 hover:border-accent/40 hover:shadow-sm transition-all"
            >
              <span className="text-sm text-foreground">
                🐾 ドッグランへのお出かけ前に、防寒・レインウェアなどの「わんこグッズ比較」もチェック
              </span>
              <span className="text-sm font-semibold text-accent whitespace-nowrap">見る →</span>
            </Link>
          </div>
        )}

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
                      <Link href={`/spots/${spot.slug}`} className="flex flex-col bg-white rounded-2xl overflow-hidden border border-accent/10 hover:shadow-lg transition-all duration-200 h-full">

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
                            <SpotPlaceholder category={spot.category} />
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

        {/* 市町村から探す：専用ページへの入口（以前は県を選ばないと市町村ページへのリンクが出なかった） */}
        {!activeCity && (
          <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-heading text-lg font-bold text-foreground mb-5">
                市町村から探す
              </h2>
              <div className="flex flex-col gap-5">
                {areaLinkPrefs.map((pref) => (
                  <div key={pref.slug}>
                    <h3 className="text-sm font-semibold text-subtext mb-2">{pref.name}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {pref.cities.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/spots/${pref.slug}/${c.slug}${activeCategory ? `?category=${activeCategory}` : ""}`}
                            className={`${PILL_BASE} ${PILL_INACTIVE} inline-block bg-white`}
                          >
                            {c.name}の{activeCategory ? CATEGORY_LABELS[activeCategory] ?? "犬連れスポット" : "犬連れスポット"}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
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
