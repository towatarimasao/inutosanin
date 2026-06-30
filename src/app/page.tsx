import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HeroSlideshow from "./_components/HeroSlideshow";
import Header from "./_components/Header";

export const metadata: Metadata = {
  title: "イヌとサンイン | 山陰の犬オーナーのためのポータルサイト",
};

// カテゴリ定義（スラッグ・表示名・説明・アイコンパス・カラー）
const CATEGORIES = [
  {
    slug: "dogrun",
    label: "ドッグラン",
    description: "山陰のドッグランを探す",
    icon: "/icons/dogrun.svg",
    bgColor: "#E2EEE8",   // 苔色tint
    iconBg: "#C5DDD0",    // 少し濃い苔色
  },
  {
    slug: "hospital",
    label: "動物病院",
    description: "近くの動物病院を探す",
    icon: "/icons/clinick.svg",
    bgColor: "#DEEAF0",   // 空色tint
    iconBg: "#BDD4E3",    // 少し濃い空色
  },
  {
    slug: "hotel",
    label: "ペットホテル",
    description: "預かりサービスを探す",
    icon: "/icons/bed.svg",
    bgColor: "#FBEADD",   // 柿色tint
    iconBg: "#F5D0B5",    // 少し濃い柿色
  },
  {
    slug: "restaurant",
    label: "ペットOK飲食店",
    description: "愛犬と入れるお店を探す",
    icon: "/icons/cafe.svg",
    bgColor: "#E2EEE8",   // 苔色tint
    iconBg: "#C5DDD0",
  },
  {
    slug: "petshop",
    label: "ペット用品店",
    description: "グッズやフードを探す",
    icon: "/icons/shop.svg",
    bgColor: "#DEEAF0",   // 空色tint
    iconBg: "#BDD4E3",
  },
  {
    slug: "adoption",
    label: "保護犬情報",
    description: "里親募集を探す",
    icon: "/icons/hogoken.svg",
    bgColor: "#FBEADD",   // 柿色tint
    iconBg: "#F5D0B5",
  },
];

type NoteArticle = {
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string;
  excerpt: string;
};

// HTMLタグを除去してプレーンテキストを取得
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// note.com RSSから最新6件を取得（3カラムグリッド用）
async function fetchNoteTopics(): Promise<NoteArticle[]> {
  try {
    const res = await fetch("https://note.com/inutosanin/rss", {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

    return itemMatches.slice(0, 6).map((item) => {
      const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
        ?? item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
        ?? "";
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]
        ?? item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]
        ?? "";
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
      const thumbnail = item.match(/<media:thumbnail[^>]*>([\s\S]*?)<\/media:thumbnail>/)?.[1]
        ?? item.match(/<media:thumbnail\s+url="([^"]+)"/)?.[1]
        ?? "";
      // CDATA内のHTMLから本文冒頭を抽出（末尾の「続きをみる」リンクは除外）
      const rawDesc = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ?? "";
      const excerpt = stripHtml(rawDesc.replace(/<a\s[^>]*>続きをみる<\/a>/g, ""));

      return {
        title: title.trim(),
        link: link.trim(),
        pubDate: pubDate.trim(),
        thumbnail: thumbnail.trim(),
        excerpt: excerpt,
      };
    });
  } catch (e) {
    console.error("[RSS] fetch error:", e);
    return [];
  }
}

function formatPubDate(pubDate: string) {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, ".");
}

export default async function Home() {
  const noteTopics = await fetchNoteTopics();

  return (
    <>
      {/* ヘッダー */}
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">
        {/* ヒーローセクション */}
        <HeroSlideshow />

        {/* 新着トピックス（note.com RSSフィード） */}
        <section className="bg-[#FAF6F1] px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-10">新着トピックス</h2>

            {noteTopics.length === 0 ? (
              <p className="text-subtext text-center py-10">準備中</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {noteTopics.map((article, i) => (
                  <li key={i}>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-accent/15 hover:shadow-lg transition-all duration-200"
                    >
                      {/* サムネイル */}
                      <div className="relative aspect-video overflow-hidden bg-[#E2EEE8]">
                        {article.thumbnail ? (
                          <Image
                            src={article.thumbnail}
                            alt={article.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          /* 画像なし時のフォールバック */
                          <div className="absolute inset-0 flex items-center justify-center text-accent/30 text-5xl">
                            🐾
                          </div>
                        )}
                      </div>

                      {/* テキスト */}
                      <div className="flex flex-col gap-2 p-4 flex-1">
                        <span className="font-en text-xs font-semibold text-accent">
                          {formatPubDate(article.pubDate)}
                        </span>
                        <p className="font-bold text-base text-foreground line-clamp-2 leading-snug">
                          {article.title}
                        </p>
                        {article.excerpt && (
                          <p className="text-sm text-subtext line-clamp-3 leading-relaxed">
                            {article.excerpt}
                          </p>
                        )}
                        <span className="mt-auto pt-2 text-sm font-semibold text-accent group-hover:underline">
                          続きを読む →
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10 text-center">
              <a
                href="https://note.com/inutosanin"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="新着トピックスをすべて見る"
                className="inline-block border-2 border-accent text-accent hover:bg-accent hover:text-white font-semibold px-8 py-3 rounded-full transition-all"
              >
                もっと見る
              </a>
            </div>
          </div>
        </section>

        {/* カテゴリ選択 */}
        <section className="bg-[#FAF6F1] px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl font-bold text-center text-foreground mb-10">
              カテゴリから探す
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/spots?category=${cat.slug}`}
                  style={{ backgroundColor: cat.bgColor }}
                  className="group flex flex-col items-center gap-3 border-b-4 border-accent rounded-3xl p-6 hover:shadow-lg hover:-translate-y-2 transition-all duration-200"
                >
                  {/* アイコン背景円 */}
                  <div
                    style={{ backgroundColor: cat.iconBg }}
                    className="w-20 h-20 flex items-center justify-center rounded-full"
                  >
                    <Image
                      src={cat.icon}
                      alt={`${cat.label}アイコン`}
                      width={48}
                      height={48}
                    />
                  </div>
                  <span className="font-heading font-bold text-lg text-foreground group-hover:text-accent transition-colors">
                    {cat.label}
                  </span>
                  <span className="text-sm text-subtext text-center">
                    {cat.description}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* フッター：#9E9D97 は #2A2521 背景上でコントラスト比5.5:1（WCAG AA達成） */}
      <footer className="bg-foreground text-[#9E9D97] text-xs text-center py-6">
        © 2026 イヌとサンイン. All rights reserved.
      </footer>
    </>
  );
}
