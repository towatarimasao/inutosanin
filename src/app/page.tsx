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

export default function Home() {
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
      <section className="bg-[#2C2C2A] text-white px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          愛犬と楽しむ
          <br />
          <span className="text-[#E24B4A]">サンイン</span>のすべて
        </h1>
        <p className="text-[#888780] text-sm mb-6 tracking-wide">
          山陰（鳥取・島根）の犬オーナーのために
        </p>
        <p className="text-[#888780] text-base sm:text-lg max-w-xl mx-auto mb-10">
          ドッグラン・動物病院・ペット可施設など、山陰エリアの犬にまつわる情報を一か所に。
        </p>
        <Link
          href="/spots"
          className="inline-block bg-[#E24B4A] hover:bg-[#c93d3c] text-white font-semibold px-8 py-3 rounded-full transition-colors"
        >
          スポットを探す
        </Link>
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
