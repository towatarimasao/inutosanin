import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "このサイトについて",
  description:
    "イヌとサンインは、山陰（鳥取・島根）で犬と暮らすオーナーのための情報ポータルサイトです。運営者・コンセプト・お問い合わせ先をご紹介します。",
};

export default function AboutPage() {
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
          <Link href="/about" className="text-[#E24B4A]" aria-current="page">
            このサイトについて
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto w-full px-6 py-16">
          <h1 className="text-3xl font-bold text-[#2C2C2A] mb-12">このサイトについて</h1>

          {/* サイトのコンセプト */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-4 pb-2 border-b border-gray-200">
              サイトのコンセプト
            </h2>
            <p className="text-[#2C2C2A] leading-relaxed mb-4">
              山陰（鳥取・島根）に住んでいると、愛犬と行ける場所の情報がなかなか見つからない——そんな経験はありませんか？
            </p>
            <p className="text-[#2C2C2A] leading-relaxed mb-4">
              「イヌとサンイン」は、山陰エリアで犬と暮らすオーナーのための情報をひとつにまとめたポータルサイトです。
              ドッグラン・動物病院・ペットホテル・ペットOK飲食店・ペット用品店・保護犬情報まで、
              山陰の犬にまつわる情報を一か所で探せるようにしました。
            </p>
            <p className="text-[#2C2C2A] leading-relaxed">
              地元で犬と豊かに暮らせる環境づくりのために、このサイトを運営しています。
            </p>
          </section>

          {/* 愛犬マサオの紹介 */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-4 pb-2 border-b border-gray-200">
              愛犬・マサオについて
            </h2>
            <p className="text-[#2C2C2A] leading-relaxed mb-4">
              このサイトのもうひとりの主役が、愛犬のマサオです。
            </p>
            <p className="text-[#2C2C2A] leading-relaxed">
              マサオと一緒に山陰を歩き回るなかで気づいたこと、困ったこと、発見したこと——そのすべてがこのサイトの原点です。
              マサオのような山陰の犬たちが、もっと楽しく・安心して暮らせるように。そんな思いでページを作っています。
            </p>
          </section>

          {/* 運営者情報 */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-4 pb-2 border-b border-gray-200">
              運営者情報
            </h2>
            <dl className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:gap-8">
                <dt className="text-sm font-medium text-[#6B6A64] sm:w-24 shrink-0">運営者</dt>
                <dd className="text-[#2C2C2A]">戸渡直宏</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-8">
                <dt className="text-sm font-medium text-[#6B6A64] sm:w-24 shrink-0">会社名</dt>
                <dd className="text-[#2C2C2A]">グレートブレーン</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-8">
                <dt className="text-sm font-medium text-[#6B6A64] sm:w-24 shrink-0">所在地</dt>
                <dd className="text-[#2C2C2A]">鳥取県米子市</dd>
              </div>
            </dl>
          </section>

          {/* 免責事項 */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-4 pb-2 border-b border-gray-200">
              免責事項
            </h2>
            <ul className="flex flex-col gap-4 text-[#2C2C2A] leading-relaxed text-sm">
              <li>
                「ペット用品店」カテゴリには、コンビニエンスストア・スーパーマーケット・100円均一ショップなど、犬用品の取り扱いが少ない、またはほとんどない店舗が含まれる場合があります。ご来店の際は事前にご確認いただくことをお勧めします。
              </li>
              <li>
                掲載している営業時間・電話番号・住所などの情報は、情報取得時点のものであり、現在の状況と異なる場合があります。最新情報は各施設の公式サイトや直接のお問い合わせにてご確認ください。
              </li>
              <li>
                当サイトに掲載された情報の正確性・完全性について、運営者は可能な限り正確な情報の提供に努めておりますが、その内容を保証するものではございません。掲載情報に起因して生じた損害について、当サイトは責任を負いかねますので、あらかじめご了承ください。
              </li>
            </ul>
          </section>

          {/* お問い合わせ */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-[#2C2C2A] mb-4 pb-2 border-b border-gray-200">
              お問い合わせ
            </h2>
            <p className="text-[#2C2C2A] leading-relaxed mb-4">
              スポット情報の追加・修正依頼、掲載に関するご相談など、お気軽にご連絡ください。
            </p>
            <a
              href="mailto:info@greatbrain475.com"
              className="inline-flex items-center gap-2 text-[#E24B4A] hover:underline font-medium"
            >
              info@greatbrain475.com
            </a>
          </section>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="text-sm text-[#6B6A64] hover:text-[#2C2C2A] transition-colors"
            >
              ← トップページに戻る
            </Link>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-[#2C2C2A] text-[#9E9D97] text-xs text-center py-6">
        © 2026 イヌとサンイン. All rights reserved.
      </footer>
    </>
  );
}
