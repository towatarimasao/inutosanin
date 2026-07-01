import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";

export const metadata: Metadata = {
  title: "スポット一覧",
  description: "山陰（鳥取・島根）の犬連れOKスポット一覧。ドッグラン・動物病院・ペットホテルなど。",
};

const CATEGORIES = [
  { slug: "",          label: "すべて" },
  { slug: "dogrun",    label: "ドッグラン" },
  { slug: "vet",       label: "動物病院" },
  { slug: "hotel",     label: "ペットホテル" },
  { slug: "restaurant",label: "ペットOK飲食店" },
  { slug: "shop",      label: "ペット用品店" },
  { slug: "adoption",  label: "保護犬情報" },
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

type MockSpot = {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  rating: number;
  reviewCount: number;
  description: string;
};

const MOCK_SPOTS: MockSpot[] = [
  {
    id: "1",
    name: "鳥取砂丘ドッグラン",
    category: "dogrun",
    address: "鳥取県鳥取市福部町湯山",
    city: "鳥取市",
    rating: 4.5,
    reviewCount: 38,
    description: "砂丘近くの広大なフリーランエリア。大型犬・小型犬エリア分かれています。",
  },
  {
    id: "2",
    name: "米子わんわんパーク",
    category: "dogrun",
    address: "鳥取県米子市車尾",
    city: "米子市",
    rating: 4.2,
    reviewCount: 21,
    description: "芝生の広場でのびのびと走れます。駐車場完備。",
  },
  {
    id: "3",
    name: "さくら動物病院 松江",
    category: "vet",
    address: "島根県松江市朝日町",
    city: "松江市",
    rating: 4.7,
    reviewCount: 56,
    description: "夜間・救急対応あり。各種健診・予防接種に対応。",
  },
  {
    id: "4",
    name: "おおやま動物クリニック",
    category: "vet",
    address: "鳥取県米子市旗ヶ崎",
    city: "米子市",
    rating: 4.3,
    reviewCount: 44,
    description: "土曜午後も診療。小動物全般に対応しています。",
  },
  {
    id: "5",
    name: "ペットホテル宍道湖",
    category: "hotel",
    address: "島根県松江市宍道町",
    city: "松江市",
    rating: 4.6,
    reviewCount: 17,
    description: "宍道湖を望む静かな環境。個室タイプの客室あり。",
  },
  {
    id: "6",
    name: "カフェ犬と散歩 鳥取店",
    category: "restaurant",
    address: "鳥取県鳥取市栄町",
    city: "鳥取市",
    rating: 4.4,
    reviewCount: 62,
    description: "テラス席でワンちゃんと一緒に食事OK。ドッグメニューあり。",
  },
  {
    id: "7",
    name: "ペッツワン 出雲店",
    category: "shop",
    address: "島根県出雲市渡橋町",
    city: "出雲市",
    rating: 4.0,
    reviewCount: 29,
    description: "フード・用品・トリミングサロン併設の総合ペットショップ。",
  },
  {
    id: "8",
    name: "島根県動物愛護センター",
    category: "adoption",
    address: "島根県出雲市西林木町",
    city: "出雲市",
    rating: 4.8,
    reviewCount: 11,
    description: "保護犬・保護猫の里親募集。見学は事前予約制。",
  },
  {
    id: "9",
    name: "境港ドッグビーチ",
    category: "dogrun",
    address: "鳥取県境港市外江町",
    city: "境港市",
    rating: 4.3,
    reviewCount: 33,
    description: "海岸沿いのビーチで愛犬と遊べます。夏季は早朝・夕方のみ可。",
  },
];

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

export default async function SpotsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category ?? "";

  const filtered = activeCategory
    ? MOCK_SPOTS.filter((s) => s.category === activeCategory)
    : MOCK_SPOTS;

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

        {/* カテゴリフィルタータブ */}
        <section className="bg-[#FAF6F1] border-b border-foreground/10 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <nav
              aria-label="カテゴリフィルター"
              className="flex gap-1 overflow-x-auto py-3 scrollbar-none"
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.slug;
                const href = cat.slug ? `/spots?category=${cat.slug}` : "/spots";
                return (
                  <Link
                    key={cat.slug}
                    href={href}
                    className={`whitespace-nowrap text-sm font-medium px-4 py-1.5 rounded-full border transition-all ${
                      isActive
                        ? "bg-accent text-white border-accent"
                        : "border-foreground/15 text-foreground hover:border-accent/30 hover:text-accent"
                    }`}
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
              {activeCategory
                ? `${CATEGORY_LABELS[activeCategory] ?? ""} `
                : "すべてのカテゴリ "}
              <span className="font-semibold text-foreground">{filtered.length}件</span>
              （モックデータ）
            </p>

            {filtered.length === 0 ? (
              <div className="py-20 text-center text-subtext text-sm">
                このカテゴリのスポットは現在準備中です
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((spot) => {
                  const badgeColor = CATEGORY_COLORS[spot.category] ?? { bg: "#E2E2E2", text: "#444" };
                  return (
                    <li key={spot.id}>
                      <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-accent/10 hover:shadow-lg transition-all duration-200 h-full">

                        {/* 画像プレースホルダー */}
                        <div className="relative aspect-video bg-[#E2EEE8] flex items-center justify-center">
                          <span className="text-4xl opacity-30">🐾</span>
                          {/* カテゴリバッジ */}
                          <span
                            className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: badgeColor.bg, color: badgeColor.text }}
                          >
                            {CATEGORY_LABELS[spot.category]}
                          </span>
                        </div>

                        {/* テキスト */}
                        <div className="flex flex-col gap-2 p-4 flex-1">
                          <p className="font-bold text-sm sm:text-base text-foreground leading-snug">
                            {spot.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <StarRating rating={spot.rating} />
                            <span className="text-xs text-subtext font-en">
                              {spot.rating.toFixed(1)}
                              <span className="ml-1">({spot.reviewCount})</span>
                            </span>
                          </div>
                          <p className="text-xs text-subtext">{spot.address}</p>
                          <p className="text-xs text-subtext line-clamp-2 leading-relaxed mt-1">
                            {spot.description}
                          </p>
                          <span className="mt-auto pt-2 text-xs sm:text-sm font-semibold text-accent">
                            詳細を見る →
                          </span>
                        </div>
                      </div>
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
