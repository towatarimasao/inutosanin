import Image from "next/image";
import Link from "next/link";

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
    <main className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <header className="bg-[#FAF7F2] px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/icons/inutosanin.svg"
            alt="イヌとサンイン"
            width={192}
            height={64}
            priority
          />
        </Link>
        <nav className="hidden sm:flex gap-6 text-base font-medium tracking-wider text-[#2C2C2A]">
          <Link href="/spots" className="hover:text-[#E24B4A] transition-colors">
            スポット一覧
          </Link>
          <Link href="/about" className="hover:text-[#E24B4A] transition-colors">
            このサイトについて
          </Link>
        </nav>
      </header>

      {/* ヒーローセクション */}
      <section className="relative h-[700px] flex items-center justify-center text-white text-center px-6 overflow-hidden">
        {/* 背景画像 */}
        <Image
          src="/images/hero.png"
          alt="山陰の風景"
          fill
          className="object-cover"
          priority
        />
        {/* 黒オーバーレイ（透明度60%） */}
        <div className="absolute inset-0 bg-black/60" />
        {/* テキストコンテンツ */}
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            愛犬と楽しむ
            <br />
            <span className="text-[#E24B4A]">サンイン</span>のすべて
          </h1>
          <p className="text-white/70 text-sm mb-6 tracking-wide">
            山陰（鳥取・島根）の犬オーナーのために
          </p>
          <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-10">
            ドッグラン・動物病院・ペット可施設など、山陰エリアの犬にまつわる情報を一か所に。
          </p>
          <Link
            href="/spots"
            className="inline-block bg-[#E24B4A] hover:bg-[#c93d3c] text-white font-semibold px-8 py-3 rounded-full transition-colors"
          >
            スポットを探す
          </Link>
        </div>
      </section>

      {/* 新着トピックス（note.com RSSフィード） */}
      <section className="bg-[#FAF7F2] px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#2C2C2A] mb-8">新着トピックス</h2>

          {noteTopics.length === 0 ? (
            <p className="text-[#888780] text-center py-10">準備中</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {noteTopics.map((article, i) => (
                <li key={i}>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 bg-white rounded-2xl px-6 py-4 border border-gray-100 hover:border-[#E24B4A] hover:shadow-sm transition-all"
                  >
                    <span className="text-xs text-[#888780] whitespace-nowrap">
                      {formatPubDate(article.pubDate)}
                    </span>
                    <span className="text-sm font-medium text-[#2C2C2A] group-hover:text-[#E24B4A] transition-colors line-clamp-1">
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
              className="inline-block border border-[#E24B4A] text-[#E24B4A] hover:bg-[#E24B4A] hover:text-white font-semibold px-8 py-3 rounded-full transition-colors"
            >
              もっと見る
            </a>
          </div>
        </div>
      </section>

      {/* カテゴリ選択 */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-center mb-10">
          カテゴリから探す
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/spots?category=${cat.slug}`}
              className="group flex flex-col items-center gap-3 border border-gray-200 rounded-2xl p-6 hover:border-[#E24B4A] hover:shadow-md transition-all"
            >
              <Image src={cat.icon} alt={cat.label} width={64} height={64} />
              <span className="font-semibold text-[#2C2C2A] group-hover:text-[#E24B4A] transition-colors">
                {cat.label}
              </span>
              <span className="text-xs text-[#888780] text-center">
                {cat.description}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* フッター */}
      <footer className="mt-auto bg-[#2C2C2A] text-[#888780] text-xs text-center py-6">
        © 2026 イヌとサンイン. All rights reserved.
      </footer>
    </main>
  );
}
