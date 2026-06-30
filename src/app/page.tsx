import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "イヌとサンイン | 山陰の犬オーナーのためのポータルサイト",
};

// カテゴリ定義（スラッグ・表示名・説明・アイコンパス）
const CATEGORIES = [
  {
    slug: "dogrun",
    label: "ドッグラン",
    description: "山陰のドッグランを探す",
    icon: "/icons/dogrun.svg",
  },
  {
    slug: "hospital",
    label: "動物病院",
    description: "近くの動物病院を探す",
    icon: "/icons/clinick.svg",
  },
  {
    slug: "hotel",
    label: "ペットホテル",
    description: "預かりサービスを探す",
    icon: "/icons/bed.svg",
  },
  {
    slug: "restaurant",
    label: "ペットOK飲食店",
    description: "愛犬と入れるお店を探す",
    icon: "/icons/cafe.svg",
  },
  {
    slug: "petshop",
    label: "ペット用品店",
    description: "グッズやフードを探す",
    icon: "/icons/shop.svg",
  },
  {
    slug: "adoption",
    label: "保護犬情報",
    description: "里親募集を探す",
    icon: "/icons/hogoken.svg",
  },
] as const;

type NoteArticle = {
  title: string;
  link: string;
  pubDate: string;
};

// note.com RSSから最新5件を取得
async function fetchNoteTopics(): Promise<NoteArticle[]> {
  try {
    const res = await fetch("https://note.com/inutosanin/rss", {
      cache: "no-store", // 常に最新を取得（キャッシュ無効）
    });

    console.log("[RSS] status:", res.status, "ok:", res.ok);
    if (!res.ok) return [];

    const xml = await res.text();
    console.log("[RSS] xml length:", xml.length);

    // <item>ブロックを抽出してパース
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    console.log("[RSS] item count:", itemMatches.length);

    return itemMatches.slice(0, 5).map((item) => {
      const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
        ?? item.match(/<title>([\s\S]*?)<\/title>/)?.[1]
        ?? "";
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]
        ?? item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]
        ?? "";
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
      return { title: title.trim(), link: link.trim(), pubDate: pubDate.trim() };
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
      {/* ヘッダー：グローバルナビ */}
      <header className="bg-surface px-6 py-5 flex items-center justify-between border-b border-accent/10">
        <Link href="/" className="flex items-center">
          <Image
            src="/icons/inutosanin.svg"
            alt="イヌとサンイン"
            width={192}
            height={64}
            priority
          />
        </Link>
        <nav aria-label="メインナビゲーション" className="hidden sm:flex gap-6 text-base font-medium tracking-wider text-foreground">
          <Link href="/spots" className="hover:text-accent transition-colors">
            スポット一覧
          </Link>
          <Link href="/about" className="hover:text-accent transition-colors">
            このサイトについて
          </Link>
        </nav>
      </header>

      <main className="flex flex-col flex-1">
        {/* ヒーローセクション */}
        <section className="relative h-[700px] flex items-center justify-center text-center px-6 overflow-hidden">
          {/* 背景画像 */}
          <Image
            src="/images/hero.png"
            alt="山陰の海辺のドッグランで犬たちが遊ぶイラスト"
            fill
            className="object-cover"
            priority
          />
          {/* 温かみのある暗めオーバーレイ */}
          <div className="absolute inset-0 bg-[#2A2521]/55" aria-hidden="true" />
          {/* テキストコンテンツ */}
          <div className="relative z-10">
            {/* ロゴ風バッジ */}
            <span className="inline-block bg-accent/90 text-white text-xs font-en font-semibold tracking-widest px-4 py-1.5 rounded-full mb-6">
              山陰 · 鳥取 · 島根
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4 leading-tight text-white drop-shadow-sm">
              愛犬と楽しむ
              <br />
              <span className="text-[#F4A96A]">サンイン</span>のすべて
            </h1>
            <p className="text-white/80 text-sm mb-6 tracking-widest font-heading">
              山陰（鳥取・島根）の犬オーナーのために
            </p>
            <p className="text-white/85 text-base sm:text-lg max-w-xl mx-auto mb-10">
              ドッグラン・動物病院・ペット可施設など、山陰エリアの犬にまつわる情報を一か所に。
            </p>
            <Link
              href="/spots"
              aria-label="山陰のペットスポットを探す"
              className="inline-block bg-accent hover:bg-[#b8581a] text-white font-semibold px-10 py-3.5 rounded-full shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              スポットを探す
            </Link>
          </div>
        </section>

        {/* 新着トピックス（note.com RSSフィード） */}
        <section className="bg-surface px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-8">新着トピックス</h2>

            {noteTopics.length === 0 ? (
              <p className="text-subtext text-center py-10">準備中</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {noteTopics.map((article, i) => (
                  <li key={i}>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 bg-page rounded-2xl px-6 py-4 border border-accent/20 hover:border-accent hover:shadow-sm transition-all"
                    >
                      <span className="text-xs text-subtext whitespace-nowrap font-en">
                        {formatPubDate(article.pubDate)}
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                        {article.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 text-center">
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
        <section className="bg-page px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl font-bold text-center text-foreground mb-10">
              カテゴリから探す
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/spots?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 bg-surface border border-accent/15 rounded-3xl p-6 hover:border-accent hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  {/* アイコン背景：ホバー時に柿色の薄い円 */}
                  <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-page group-hover:bg-accent/10 transition-colors">
                    <Image
                      src={cat.icon}
                      alt={`${cat.label}アイコン`}
                      width={48}
                      height={48}
                    />
                  </div>
                  <span className="font-heading font-semibold text-foreground group-hover:text-accent transition-colors">
                    {cat.label}
                  </span>
                  <span className="text-xs text-subtext text-center">
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
