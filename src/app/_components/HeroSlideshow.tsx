"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const heroImages = [
  "/images/hero1.webp",
  "/images/hero2.webp",
  "/images/hero3.webp",
  "/images/hero4.webp",
  "/images/hero5.webp",
];

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
        {heroImages.map((src, i) =>
          i < mountedCount ? (
            <Image
              key={src}
              src={src}
              alt="山陰の海辺のドッグランで犬たちが遊ぶイラスト"
              fill
              sizes="100vw"
              className={`object-cover transition-opacity duration-1000 ${
                i === currentIndex ? "opacity-100" : "opacity-0"
              }`}
              priority={i === 0}
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
          className="inline-block bg-accent hover:bg-[#b8581a] text-white font-semibold px-6 py-3 sm:px-10 sm:py-3.5 rounded-full shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
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
