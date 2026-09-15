export const dynamic = "force-dynamic";

import type { Metadata, ResolvingMetadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { db } from "@/db";
import { wankoGoodsArticles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderWankoGoodsBody } from "@/lib/wanko-goods-markdown";

const BASE_URL = "https://www.inutosanin.jp";

async function getArticle(slug: string) {
  const [article] = await db
    .select()
    .from(wankoGoodsArticles)
    .where(eq(wankoGoodsArticles.slug, slug))
    .limit(1);
  return article ?? null;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) return { title: "わんこグッズ比較" };

  const parentMeta = await parent;
  const pageUrl = `${BASE_URL}/wanko-goods/${article.slug}`;
  const ogImage = article.thumbnail_url || "/images/hero.png";

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      ...parentMeta.openGraph,
      type: "article",
      title: article.title,
      description: article.excerpt,
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      ...parentMeta.twitter,
      title: article.title,
      description: article.excerpt,
      images: [ogImage],
    },
  };
}

export default async function WankoGoodsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const pageUrl = `${BASE_URL}/wanko-goods/${article.slug}`;
  const bodyHtml = renderWankoGoodsBody(article.body_md);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.published_at.toISOString(),
    ...(article.thumbnail_url && { image: article.thumbnail_url }),
    mainEntityOfPage: pageUrl,
    publisher: {
      "@type": "Organization",
      name: "イヌとサンイン",
      url: BASE_URL,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "わんこグッズ比較", item: `${BASE_URL}/wanko-goods` },
      { "@type": "ListItem", position: 3, name: article.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // </script>によるタグ抜け出しを防ぐため < をエスケープする
          __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]).replace(/</g, "\\u003c"),
        }}
      />
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">
        <article className="max-w-3xl mx-auto w-full px-6 py-16">
          {/* パンくずナビ */}
          <nav aria-label="パンくずナビゲーション" className="text-xs text-subtext mb-8 flex flex-wrap items-center gap-2">
            <Link href="/" className="hover:text-foreground transition-colors">トップ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/wanko-goods" className="hover:text-foreground transition-colors">わんこグッズ比較</Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground" aria-current="page">{article.title}</span>
          </nav>

          <time dateTime={article.published_at.toISOString()} className="text-xs text-subtext">
            {formatDate(article.published_at)}
          </time>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mt-3 mb-8 leading-snug">
            {article.title}
          </h1>

          {article.thumbnail_url && (
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#FBEADD] mb-10">
              <Image
                src={article.thumbnail_url}
                alt={article.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          )}

          <div
            className="wanko-article-body"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* お出かけ先を探す導線（ドッグラン一覧への内部リンク） */}
          <div className="mt-12 bg-white rounded-2xl border border-accent/10 p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <p className="text-sm text-foreground">
              紹介したグッズを持って、山陰のドッグランへお出かけしませんか？
            </p>
            <Link
              href="/spots?category=dogrun"
              className="inline-flex items-center justify-center gap-1.5 border-2 border-accent text-accent hover:bg-accent hover:text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all whitespace-nowrap"
            >
              山陰のドッグラン一覧を見る →
            </Link>
          </div>

          <div className="mt-16 pt-8 border-t border-accent/10">
            <Link href="/wanko-goods" className="text-sm text-subtext hover:text-foreground transition-colors">
              ← わんこグッズ比較一覧に戻る
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
