// 「わんこグッズ比較」記事をNeon DB（wanko_goods_articlesテーブル）に投入するワンショットスクリプト。
// 実行前に wanko_goods_articles テーブルが作成済みであること、
// DATABASE_URLが本番Neonの接続文字列を指していることを確認すること。
//
// 実行方法: npx tsx scripts/insert-wanko-goods-article.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import path from "node:path";
// @/dbはモジュール読み込み時にDATABASE_URLを参照するため、
// dotenv.config()が先に実行されるよう動的importにする
import { wankoGoodsArticles } from "@/db/schema";

const ARTICLE_PATH = path.join(
  process.cwd(),
  "content/wanko-goods/wanko-goods-article-01-boukan.md"
);

async function main() {
  const { db } = await import("@/db");
  const raw = readFileSync(ARTICLE_PATH, "utf-8");
  // 冒頭の運用メモ用HTMLコメント（公開前チェックリスト）は
  // サイト公開用の本文には含めないため取り除く
  const bodyMd = raw.replace(/^<!--[\s\S]*?-->\s*/, "").trim();

  const article = {
    slug: "boukan-rainwear-hikaku-2026-aki-fuyu",
    title:
      "【2026年秋冬】山陰の愛犬とのお出かけに強い、防寒・レインウェア比較｜選ぶ基準は3つ",
    excerpt:
      "山陰の愛犬とのお出かけに役立つ防寒・レインウェアを、防水性・防寒性・車移動での使いやすさの3つの基準で比較。PUPPIA・ASMPET・MAMORE・S-Lifeeling・フリースベストの5点を紹介します。",
    body_md: bodyMd,
    thumbnail_url: null,
  };

  const [inserted] = await db
    .insert(wankoGoodsArticles)
    .values(article)
    .returning({ id: wankoGoodsArticles.id, slug: wankoGoodsArticles.slug });

  console.log("挿入しました:", inserted);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("エラー:", e);
    process.exit(1);
  });
