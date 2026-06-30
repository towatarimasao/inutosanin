"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const spotItems = [
  { label: "スポット一覧", href: "/spots" },
  { label: "ドッグラン", href: "/spots?category=dogrun" },
  { label: "動物病院", href: "/spots?category=vet" },
  { label: "ペットホテル", href: "/spots?category=hotel" },
  { label: "ペットOK飲食店", href: "/spots?category=restaurant" },
  { label: "ペット用品店", href: "/spots?category=shop" },
  { label: "保護犬情報", href: "/spots?category=adoption" },
];

export default function Header() {
  const [spotsOpen, setSpotsOpen] = useState(false);

  return (
    <header className="bg-[#FAF6F1] px-6 py-5 flex items-center justify-between">
      {/* ロゴ */}
      <Link href="/" className="flex items-center">
        <Image
          src="/icons/inutosanin.svg"
          alt="イヌとサンイン"
          width={192}
          height={64}
          priority
        />
      </Link>

      {/* ナビゲーション（スマホは非表示） */}
      <nav aria-label="メインナビゲーション" className="hidden sm:flex items-center gap-2 text-sm font-medium text-foreground">

        {/* スポットを探す ドロップダウン */}
        <div
          className="relative"
          onMouseEnter={() => setSpotsOpen(true)}
          onMouseLeave={() => setSpotsOpen(false)}
        >
          <button
            className="flex items-center gap-1 border border-foreground/15 rounded-full px-4 py-1.5 text-sm hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all"
            aria-haspopup="true"
            aria-expanded={spotsOpen}
          >
            スポットを探す
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${spotsOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ドロップダウンメニュー */}
          {spotsOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-[#FAF6F1] rounded-xl shadow-lg border border-accent/10 py-1 z-50">
              {spotItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-2 text-sm text-foreground hover:text-accent hover:bg-accent/5 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* トピックス */}
        <Link
          href="/#topics"
          className="border border-foreground/15 rounded-full px-4 py-1.5 text-sm hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all"
        >
          トピックス
        </Link>

        {/* このサイトについて */}
        <Link
          href="/about"
          className="border border-foreground/15 rounded-full px-4 py-1.5 text-sm hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all"
        >
          このサイトについて
        </Link>

        {/* お問い合わせ */}
        <a
          href="#"
          className="border border-foreground/15 rounded-full px-4 py-1.5 text-sm hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all"
        >
          お問い合わせ
        </a>
      </nav>
    </header>
  );
}
