import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { supabase } from "@/lib/supabase";
import ProductImage from "./ProductImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "山陰産ドッグフード",
  description: "山陰（鳥取・島根）産のドッグフード・おやつをまとめて紹介。ドライ・ウェット・おやつなど、愛犬に合う一品を探せます。",
};

const SUBCATEGORIES = [
  { slug: "",        label: "すべて" },
  { slug: "dry",      label: "ドライ" },
  { slug: "wet",      label: "ウェット" },
  { slug: "treats",   label: "おやつ" },
  { slug: "other",    label: "その他" },
];

const SUBCATEGORY_LABELS: Record<string, string> = {
  dry:    "ドライ",
  wet:    "ウェット",
  treats: "おやつ",
  other:  "その他",
};

type Product = {
  id: string;
  name: string;
  brand_name: string;
  subcategory: string;
  price: number | null;
  purchase_url: string;
  image_url: string | null;
  description: string | null;
  maker_area: string | null;
  created_at: string;
};

// 現在のフィルターを保ちつつ特定パラメータだけ変えたURLを生成
function buildUrl(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
  const qs = sp.toString();
  return qs ? `/dog-food?${qs}` : "/dog-food";
}

const PILL_BASE = "whitespace-nowrap text-sm font-medium px-4 py-1.5 rounded-full border transition-all";
const PILL_ACTIVE = "bg-accent text-white border-accent";
const PILL_INACTIVE = "border-foreground/15 text-foreground hover:border-accent/30 hover:text-accent";

export default async function DogFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ subcategory?: string }>;
}) {
  const { subcategory } = await searchParams;
  const activeSubcategory = subcategory ?? "";

  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .order("created_at", { ascending: false });

  if (activeSubcategory) query = query.eq("subcategory", activeSubcategory);

  const { data: products, error } = await query;
  if (error) console.error("[Supabase] products fetch error:", error);
  const productList: Product[] = products ?? [];

  return (
    <>
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">

        {/* ページヘッダー */}
        <section className="bg-[#EDE8E0] px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-en font-semibold text-accent tracking-widest mb-2">DOG FOOD</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              山陰産ドッグフード
            </h1>
            <p className="text-sm text-subtext mt-2">
              山陰（鳥取・島根）産のドッグフード・おやつを探せます
            </p>
          </div>
        </section>

        {/* フィルターエリア */}
        <section className="bg-[#FAF6F1] border-b border-foreground/10 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <nav aria-label="サブカテゴリフィルター" className="flex gap-1 overflow-x-auto py-3 scrollbar-none">
              {SUBCATEGORIES.map((sub) => {
                const isActive = activeSubcategory === sub.slug;
                return (
                  <Link
                    key={sub.slug}
                    href={buildUrl({ subcategory: sub.slug })}
                    className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* 商品一覧 */}
        <section className="px-4 sm:px-6 py-10">
          <div className="max-w-5xl mx-auto">

            {/* 件数表示 */}
            <p className="text-sm text-subtext mb-6">
              {(activeSubcategory ? SUBCATEGORY_LABELS[activeSubcategory] : "") || "すべて"}
              {" "}
              <span className="font-semibold text-foreground">{productList.length}件</span>
            </p>

            {productList.length === 0 ? (
              <div className="py-20 text-center text-subtext text-sm">
                条件に合う商品は現在準備中です
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {productList.map((product) => (
                  <li key={product.id}>
                    <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-accent/10 hover:shadow-lg transition-all duration-200 h-full">

                      {/* 画像エリア */}
                      <div className="relative aspect-video bg-[#E2EEE8] flex items-center justify-center overflow-hidden">
                        <ProductImage src={product.image_url} alt={product.name} />
                        <span
                          className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full z-10"
                          style={{ backgroundColor: "#F5D0B5", color: "#7A3D10" }}
                        >
                          {SUBCATEGORY_LABELS[product.subcategory] ?? product.subcategory}
                        </span>
                      </div>

                      {/* テキスト */}
                      <div className="flex flex-col gap-2 p-4 flex-1">
                        <p className="text-xs text-subtext">{product.brand_name}</p>
                        <p className="font-bold text-sm sm:text-base text-foreground leading-snug">
                          {product.name}
                        </p>
                        {product.price != null && (
                          <p className="text-sm font-semibold text-accent">
                            ¥{product.price.toLocaleString("ja-JP")}
                            <span className="text-xs text-subtext font-normal">（参考価格）</span>
                          </p>
                        )}
                        {product.description && (
                          <p className="text-xs text-subtext line-clamp-2 leading-relaxed mt-1">
                            {product.description}
                          </p>
                        )}
                        {product.maker_area && (
                          <p className="text-xs text-accent/80 bg-[#F0F7F3] rounded-md px-2 py-1 line-clamp-2 leading-relaxed">
                            🐾 {product.maker_area}
                          </p>
                        )}
                        <a
                          href={product.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center justify-center gap-1.5 bg-accent text-white hover:bg-accent/90 text-sm font-semibold px-4 py-2.5 rounded-full transition-all"
                        >
                          購入サイトへ →
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
