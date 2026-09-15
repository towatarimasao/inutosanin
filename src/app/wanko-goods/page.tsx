export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { db } from "@/db";
import { wankoGoodsArticles } from "@/db/schema";
import { desc } from "drizzle-orm";

const BASE_URL = "https://www.inutosanin.jp";

export const metadata: Metadata = {
  title: "わんこグッズ比較",
  description:
    "山陰の愛犬とのお出かけに役立つ犬用品を、実際に選ぶ基準つきで比較するコーナーです。防寒・レインウェアからお出かけグッズまで、月2本ペースで紹介します。",
  alternates: {
    canonical: `${BASE_URL}/wanko-goods`,
  },
};

function formatDate(date: Date) {
  return date
    .toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\//g, ".");
}

export default async function WankoGoodsListPage() {
  const articles = await db
    .select()
    .from(wankoGoodsArticles)
    .orderBy(desc(wankoGoodsArticles.published_at));

  return (
    <>
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">
        <div className="max-w-5xl mx-auto w-full px-6 py-16">
          {/* パンくずナビ */}
          <nav aria-label="パンくずナビゲーション" className="text-xs text-subtext mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-foreground transition-colors">トップ</Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground" aria-current="page">わんこグッズ比較</span>
          </nav>

          <h1 className="font-heading text-3xl font-bold text-foreground mb-4">わんこグッズ比較</h1>
          <p className="text-sm text-subtext leading-relaxed mb-2 max-w-2xl">
            山陰の愛犬とのお出かけに役立つ犬用品を、選ぶ基準つきで比較するコーナーです。月2本ペースで更新予定。
          </p>
          <p className="text-xs text-subtext/80 leading-relaxed mb-10 max-w-2xl">
            ※本コーナーの記事はPRを含みます（楽天アフィリエイトリンクを使用）。お出かけ先を探す場合は
            <Link href="/spots?category=dogrun" className="text-accent hover:underline">
              山陰のドッグラン一覧
            </Link>
            もあわせてご覧ください。
          </p>

          {articles.length === 0 ? (
            <p className="text-subtext text-center py-20">記事を準備中です。</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/wanko-goods/${article.slug}`}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-accent/15 hover:shadow-lg transition-all duration-200 h-full"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#E2EEE8]">
                      {article.thumbnail_url ? (
                        <Image
                          src={article.thumbnail_url}
                          alt={article.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-accent/30 text-5xl">
                          🐾
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 p-5 flex-1">
                      <span className="font-en text-xs font-semibold text-accent">
                        {formatDate(article.published_at)}
                      </span>
                      <p className="font-bold text-base text-foreground leading-snug">
                        {article.title}
                      </p>
                      <p className="text-sm text-subtext leading-relaxed line-clamp-3">
                        {article.excerpt}
                      </p>
                      <span className="mt-auto pt-2 text-sm font-semibold text-accent group-hover:underline">
                        続きを読む →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12 text-center">
            <Link href="/" className="text-sm text-subtext hover:text-foreground transition-colors">
              ← トップページに戻る
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
