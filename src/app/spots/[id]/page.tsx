import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { supabase } from "@/lib/supabase";

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

const DOG_SIZE_LABELS: Record<string, string> = {
  small:  "小型のみ",
  medium: "中型可",
  large:  "大型可",
  all:    "制限なし",
};

type Spot = {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  description: string | null;
  image_url: string | null;
  business_hours: string | null;
  phone: string | null;
  parking: boolean | null;
  dog_size: string | null;
  url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  is_active: boolean;
  created_at: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from("spots")
    .select("name, description")
    .eq("id", id)
    .single();

  if (!data) return { title: "スポット詳細" };

  return {
    title: data.name,
    description: data.description ?? undefined,
  };
}

export default async function SpotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: spot, error } = await supabase
    .from("spots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !spot) notFound();

  const s = spot as Spot;
  const badgeColor = CATEGORY_COLORS[s.category] ?? { bg: "#E2E2E2", text: "#444" };

  const googleMapsUrl = s.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`
    : null;

  const links = [
    { href: s.url,           label: "公式サイト",  icon: "🌐" },
    { href: s.instagram_url, label: "Instagram",   icon: "📸" },
    { href: s.twitter_url,   label: "X / Twitter", icon: "🐦" },
    { href: s.facebook_url,  label: "Facebook",    icon: "👤" },
  ].filter((l) => l.href);

  return (
    <>
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">
        <div className="max-w-3xl mx-auto px-6 py-12 w-full">

          {/* 戻るリンク */}
          <Link
            href="/spots"
            className="inline-flex items-center gap-1 text-sm text-subtext hover:text-accent transition-colors mb-8"
          >
            ← スポット一覧に戻る
          </Link>

          {/* 1. ヘッダーエリア */}
          <div className="mb-6">
            <span
              className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: badgeColor.bg, color: badgeColor.text }}
            >
              {CATEGORY_LABELS[s.category] ?? s.category}
            </span>
            <h1 className="font-heading text-3xl font-bold text-foreground leading-tight mb-3">
              {s.name}
            </h1>
            {s.address && (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-subtext flex items-center gap-1.5">
                  <span>📍</span>
                  {s.address}
                </p>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline ml-5"
                  >
                    Google Mapsで見る 🗺️
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 2. メイン画像エリア */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#E2EEE8] flex items-center justify-center mb-8">
            {s.image_url ? (
              <Image
                src={s.image_url}
                alt={s.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
              />
            ) : (
              <span className="text-6xl opacity-20">🐾</span>
            )}
          </div>

          {/* 3. 情報グリッド */}
          {(s.business_hours || s.phone || s.parking != null || s.dog_size) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {s.business_hours && (
                <div className="bg-white rounded-xl border border-accent/10 p-4 flex gap-3">
                  <span className="text-xl">🕐</span>
                  <div>
                    <p className="text-xs text-subtext mb-1">営業時間</p>
                    <p className="text-sm font-medium text-foreground">{s.business_hours}</p>
                  </div>
                </div>
              )}
              {s.phone && (
                <div className="bg-white rounded-xl border border-accent/10 p-4 flex gap-3">
                  <span className="text-xl">📞</span>
                  <div>
                    <p className="text-xs text-subtext mb-1">電話番号</p>
                    <a
                      href={`tel:${s.phone}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {s.phone}
                    </a>
                  </div>
                </div>
              )}
              {s.parking != null && (
                <div className="bg-white rounded-xl border border-accent/10 p-4 flex gap-3">
                  <span className="text-xl">🅿️</span>
                  <div>
                    <p className="text-xs text-subtext mb-1">駐車場</p>
                    <p className="text-sm font-medium text-foreground">
                      {s.parking ? "あり" : "なし"}
                    </p>
                  </div>
                </div>
              )}
              {s.dog_size && (
                <div className="bg-white rounded-xl border border-accent/10 p-4 flex gap-3">
                  <span className="text-xl">🐕</span>
                  <div>
                    <p className="text-xs text-subtext mb-1">犬のサイズ</p>
                    <p className="text-sm font-medium text-foreground">
                      {DOG_SIZE_LABELS[s.dog_size] ?? s.dog_size}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. リンクエリア */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-8">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-accent text-accent hover:bg-accent hover:text-white text-sm px-4 py-2 rounded-full transition-all"
                >
                  <span>{l.icon}</span>
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {/* 5. 説明文エリア */}
          {s.description && (
            <div className="bg-white rounded-2xl border border-accent/10 p-6 mb-8">
              <h2 className="font-heading text-lg font-bold text-foreground mb-3">このスポットについて</h2>
              <p className="text-sm text-subtext leading-relaxed whitespace-pre-line">
                {s.description}
              </p>
            </div>
          )}

          {/* 6. 口コミセクション */}
          <div className="bg-white rounded-2xl border border-accent/10 p-6 mb-8">
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">口コミ</h2>
            <p className="text-sm text-subtext text-center py-6">口コミはまだありません</p>
            <div className="text-center">
              <button
                disabled
                className="inline-block border-2 border-accent text-accent font-semibold px-8 py-3 rounded-full opacity-40 cursor-not-allowed"
              >
                口コミを書く（準備中）
              </button>
            </div>
          </div>

          {/* 戻るリンク（下部） */}
          <Link
            href="/spots"
            className="inline-flex items-center gap-1 text-sm text-subtext hover:text-accent transition-colors"
          >
            ← スポット一覧に戻る
          </Link>

        </div>
      </main>

      <Footer />
    </>
  );
}
