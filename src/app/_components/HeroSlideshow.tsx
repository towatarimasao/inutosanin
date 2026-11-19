"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// 季節ごとに入れ替えるメインビジュアル。先頭の1枚が最初に表示される。
// 秋〜冬版（2026/11〜）。春夏に戻すときは下の SPRING_SUMMER を使う。
// 冬の画像を追加したら、ここに { src, alt } を足す。
const AUTUMN_WINTER = [
  { src: "/images/hero4.webp", alt: "紅葉の山道を、雪をかぶった大山を背に愛犬と散歩するイラスト" },
  { src: "/images/hero5.webp", alt: "紅葉と実りの田んぼの道を、家族と柴犬が歩くイラスト" },
];

// 春夏版（海辺のテラス・海辺のドッグラン・柳の水辺の町並み）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SPRING_SUMMER = [
  { src: "/images/hero1.webp", alt: "海の見えるテラス席で、犬と一緒にお茶を楽しむイラスト" },
  { src: "/images/hero2.webp", alt: "山陰の海辺のドッグランで犬たちが遊ぶイラスト" },
  { src: "/images/hero3.webp", alt: "柳並木の水辺の町並みを、黒い犬と散歩するイラスト" },
];

const heroImages = AUTUMN_WINTER;

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  // 初期表示は1枚目のみマウントし、LCP候補（priority画像）との帯域競合を避ける。
  // opacityで隠しているだけだと"画面内"扱いのままで全画像が先読みされてしまうため、
  // 実際にDOMへ存在させる枚数を段階的に増やす。
  const [mountedCount, setMountedCount] = useState(1);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mountedCount >= heroImages.length) return;
    // 切り替え間隔(5秒)より十分短い間隔でマウントし、表示前に読み込みを完了させる
    const timer = setTimeout(() => {
      setMountedCount((c) => Math.min(c + 1, heroImages.length));
    }, 2000);
    return () => clearTimeout(timer);
  }, [mountedCount]);

  return (
    <section
      className="relative w-full max-w-[calc(100%-48px)] aspect-[3/4] sm:aspect-[16/9] max-h-[650px] mx-auto flex items-center justify-center text-center px-4 sm:px-6 bg-[#FAF6F1]"
      style={{}}
    >
      {/* 画像をsection内に収めるクリップラッパー */}
      <div className="absolute inset-0 overflow-hidden">
        {/* スライドショー背景 */}
        {heroImages.map(({ src, alt }, i) =>
          i < mountedCount ? (
            <Image
              key={src}
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className={`object-cover transition-opacity duration-1000 ${
                i === currentIndex ? "opacity-100" : "opacity-0"
              }`}
              preload={i === 0}
              fetchPriority={i === 0 ? "high" : "auto"}
              loading={i === 0 ? undefined : "lazy"}
            />
          ) : null
        )}

        {/* 温かみのある暗めオーバーレイ */}
        <div className="absolute inset-0 bg-[#2A2521]/55" aria-hidden="true" />
      </div>

      {/* テキストコンテンツ */}
      <div className="relative z-10 overflow-hidden pt-10 pb-8 sm:py-4 flex flex-col items-center gap-3 sm:gap-4">
        {/* ロゴ風バッジ */}
        <span className="inline-block bg-accent/90 text-white text-xs font-heading font-semibold tracking-widest px-4 py-1.5 rounded-full">
          山陰 · 鳥取 · 島根
        </span>
        <h1 className="font-heading text-3xl sm:text-5xl font-bold leading-tight text-white drop-shadow-sm">
          愛犬と楽しむ
          <br />
          <span className="text-[#F4A96A]">サンイン</span>のすべて
        </h1>
        <p className="text-white/80 text-sm tracking-widest font-heading">
          山陰（鳥取・島根）の犬オーナーのために
        </p>
        <p className="text-white/85 text-base sm:text-lg max-w-xl mx-auto">
          ドッグラン・動物病院・ペット可施設など、山陰エリアの犬にまつわる情報を一か所に。
        </p>
        <Link
          href="/spots"
          aria-label="山陰のペットスポットを探す"
          className="inline-block bg-accent hover:bg-[#8C4415] text-white font-semibold px-6 py-3 sm:px-10 sm:py-3.5 rounded-full shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          スポットを探す
        </Link>
      </div>

      {/* 下辺カーブオーバーレイ */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ zIndex: 20 }}>
        <svg viewBox="0 0 1200 20" preserveAspectRatio="none" className="w-full h-[20px]">
          <ellipse cx="600" cy="20" rx="700" ry="20" fill="#FAF6F1" />
        </svg>
      </div>

      {/* 上辺カーブオーバーレイ */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none" style={{ zIndex: 20 }}>
        <svg viewBox="0 0 1200 20" preserveAspectRatio="none" className="w-full h-[20px]">
          <ellipse cx="600" cy="0" rx="700" ry="20" fill="#FAF6F1" />
        </svg>
      </div>
    </section>
  );
}
