export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function categoryColor(category: string) {
  switch (category) {
    case "ニュース":
      return "bg-blue-100 text-blue-700";
    case "新スポット":
      return "bg-green-100 text-green-700";
    case "イベント":
      return "bg-orange-100 text-orange-700";
    case "お役立ち":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) notFound();

  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, numericId))
    .limit(1);

  if (!topic) notFound();

  return (
    <>
      {/* ヘッダー：グローバルナビ */}
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
        <nav aria-label="メインナビゲーション" className="hidden sm:flex gap-6 text-base font-medium tracking-wider text-[#2C2C2A]">
          <Link href="/spots" className="hover:text-[#E24B4A] transition-colors">
            スポット一覧
          </Link>
          <Link href="/topics" className="hover:text-[#E24B4A] transition-colors">
            トピックス
          </Link>
          <Link href="/about" className="hover:text-[#E24B4A] transition-colors">
            このサイトについて
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto w-full px-6 py-16">
          {/* パンくずナビ */}
          <nav aria-label="パンくずナビゲーション" className="text-xs text-[#6B6A64] mb-8 flex items-center gap-2">
            <Link href="/" className="hover:text-[#2C2C2A] transition-colors">トップ</Link>
            <span aria-hidden="true">/</span>
            <Link href="/topics" className="hover:text-[#2C2C2A] transition-colors">トピックス</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#2C2C2A]" aria-current="page">{topic.title}</span>
          </nav>

          {/* カテゴリ・日付 */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(topic.category)}`}
            >
              {topic.category}
            </span>
            <time
              dateTime={topic.published_at.toISOString()}
              className="text-xs text-[#6B6A64]"
            >
              {formatDate(topic.published_at)}
            </time>
          </div>

          {/* タイトル */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2C2C2A] mb-10 leading-snug">
            {topic.title}
          </h1>

          {/* 本文 */}
          <div className="text-[#2C2C2A] text-base leading-relaxed whitespace-pre-wrap">
            {topic.content}
          </div>

          <div className="mt-16 pt-8 border-t border-gray-100">
            <Link
              href="/topics"
              className="text-sm text-[#6B6A64] hover:text-[#2C2C2A] transition-colors"
            >
              ← トピックス一覧に戻る
            </Link>
          </div>
        </article>
      </main>

      {/* フッター */}
      <footer className="bg-[#2C2C2A] text-[#9E9D97] text-xs text-center py-6">
        © 2026 イヌとサンイン. All rights reserved.
      </footer>
    </>
  );
}
