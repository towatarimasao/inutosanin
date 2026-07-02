import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "スペシャルサンクス | イヌとサンイン",
  description: "スポット情報をお寄せいただいた皆さまに感謝いたします。",
};

async function fetchNicknames(): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data, error } = await supabase
    .from("feedback_submissions")
    .select("contact_nickname")
    .eq("consent_public", true)
    .not("contact_nickname", "is", null)
    .neq("contact_nickname", "");

  if (error) {
    console.error("[thanks] fetch error:", error.message);
    return [];
  }

  // 重複を除いてソート
  const unique = Array.from(
    new Set((data ?? []).map((r: { contact_nickname: string }) => r.contact_nickname as string))
  ).sort((a, b) => a.localeCompare(b, "ja"));

  return unique;
}

export default async function ThanksPage() {
  const nicknames = await fetchNicknames();

  return (
    <>
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">

        {/* ページヘッダー */}
        <section className="bg-[#EDE8E0] px-6 py-12 text-center">
          <p className="text-xs font-semibold tracking-widest text-accent mb-2">SPECIAL THANKS</p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-4">
            スペシャルサンクス
          </h1>
          <p className="text-sm text-subtext leading-relaxed max-w-lg mx-auto">
            スポット情報のご報告・ご提案をいただいた皆さまに、心より感謝いたします。
            みなさまの情報がこのサイトを支えています。
          </p>
        </section>

        {/* ニックネーム一覧 */}
        <section className="px-4 sm:px-6 py-12">
          <div className="max-w-3xl mx-auto">
            {nicknames.length === 0 ? (
              <p className="text-center text-subtext text-sm py-16">
                まだ掲載可能な情報提供者はいません
              </p>
            ) : (
              <>
                <p className="text-xs text-subtext text-center mb-8">
                  {nicknames.length} 名の方にご協力いただきました
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {nicknames.map((name) => (
                    <span
                      key={name}
                      className="inline-block text-sm font-medium px-4 py-1.5 rounded-full border border-accent/30 text-foreground bg-white"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 投稿ボタン */}
        <section className="px-4 sm:px-6 pb-16 border-t border-foreground/10 pt-10">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-5">
            <p className="text-sm text-subtext">あなたも情報提供に参加しませんか？</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/confirm-spots"
                className="inline-flex items-center justify-center gap-1.5 border-2 border-accent text-accent hover:bg-accent hover:text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                🐾 犬同伴OK情報を報告する
              </Link>
              <Link
                href="/suggest-spot"
                className="inline-flex items-center justify-center gap-1.5 bg-accent text-white hover:bg-accent/90 text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                ＋ スポットを投稿する
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
