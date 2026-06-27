import Link from "next/link";
import { db } from "@/db";
import { topics } from "@/db/schema";
import { desc } from "drizzle-orm";

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

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, ".");
}

export default async function TopicsPage() {
  const allTopics = await db
    .select()
    .from(topics)
    .orderBy(desc(topics.published_at));

  return (
    <main className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <header className="bg-[#FAF7F2] px-6 py-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#2C2C2A] tracking-wider">
          イヌとサンイン
        </Link>
        <nav className="hidden sm:flex gap-6 text-base font-medium tracking-wider text-[#2C2C2A]">
          <Link href="/spots" className="hover:text-[#E24B4A] transition-colors">
            スポット一覧
          </Link>
          <Link href="/topics" className="text-[#E24B4A]">
            トピックス
          </Link>
          <Link href="/about" className="hover:text-[#E24B4A] transition-colors">
            このサイトについて
          </Link>
        </nav>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <h1 className="text-3xl font-bold text-[#2C2C2A] mb-10">トピックス</h1>

        {allTopics.length === 0 ? (
          <p className="text-[#888780] text-center py-20">
            トピックスはまだありません。
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {allTopics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/topics/${topic.id}`}
                  className="group flex items-center gap-4 bg-white rounded-2xl px-6 py-5 border border-gray-100 hover:border-[#E24B4A] hover:shadow-sm transition-all"
                >
                  <span className="text-xs text-[#888780] whitespace-nowrap">
                    {formatDate(topic.published_at)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${categoryColor(topic.category)}`}
                  >
                    {topic.category}
                  </span>
                  <span className="text-sm font-medium text-[#2C2C2A] group-hover:text-[#E24B4A] transition-colors">
                    {topic.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-sm text-[#888780] hover:text-[#2C2C2A] transition-colors"
          >
            ← トップページに戻る
          </Link>
        </div>
      </div>

      {/* フッター */}
      <footer className="bg-[#2C2C2A] text-[#888780] text-xs text-center py-6">
        © 2026 イヌとサンイン. All rights reserved.
      </footer>
    </main>
  );
}
