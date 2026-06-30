"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const heroImages = [
  "/images/hero1.png",
  "/images/hero2.png",
  "/images/hero3.png",
  "/images/hero4.png",
  "/images/hero5.png",
];

export default function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="relative w-full max-w-[calc(100%-48px)] aspect-[16/9] max-h-[650px] mx-auto flex items-center justify-center text-center px-6 bg-[#FAF6F1]"
      style={{}}
    >
      {/* 画像をsection内に収めるクリップラッパー */}
      <div className="absolute inset-0 overflow-hidden">
        {/* スライドショー背景 */}
        {heroImages.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt="山陰の海辺のドッグランで犬たちが遊ぶイラスト"
            fill
            className={`object-cover transition-opacity duration-1000 ${
              i === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            priority={i === 0}
          />
        ))}

        {/* 温かみのある暗めオーバーレイ */}
        <div className="absolute inset-0 bg-[#2A2521]/55" aria-hidden="true" />
      </div>

      {/* テキストコンテンツ */}
      <div className="relative z-10">
        {/* ロゴ風バッジ */}
        <span className="inline-block bg-accent/90 text-white text-xs font-en font-semibold tracking-widest px-4 py-1.5 rounded-full mb-6">
          山陰 · 鳥取 · 島根
        </span>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4 leading-tight text-white drop-shadow-sm">
          愛犬と楽しむ
          <br />
          <span className="text-[#F4A96A]">サンイン</span>のすべて
        </h1>
        <p className="text-white/80 text-sm mb-6 tracking-widest font-heading">
          山陰（鳥取・島根）の犬オーナーのために
        </p>
        <p className="text-white/85 text-base sm:text-lg max-w-xl mx-auto mb-10">
          ドッグラン・動物病院・ペット可施設など、山陰エリアの犬にまつわる情報を一か所に。
        </p>
        <Link
          href="/spots"
          aria-label="山陰のペットスポットを探す"
          className="inline-block bg-accent hover:bg-[#b8581a] text-white font-semibold px-10 py-3.5 rounded-full shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
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
