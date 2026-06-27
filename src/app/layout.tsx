import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const BASE_URL = "https://www.inutosanin.jp";

export const metadata: Metadata = {
  title: {
    default: "イヌとサンイン | 山陰の犬オーナーのためのポータルサイト",
    template: "%s | イヌとサンイン",
  },
  description:
    "鳥取・島根の犬オーナーのための情報サイト。ドッグラン・動物病院・ペットホテル・ペットOK飲食店・保護犬情報を一か所に。",
  keywords: ["山陰", "犬", "ドッグラン", "動物病院", "ペットホテル", "鳥取", "島根", "保護犬"],
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "イヌとサンイン",
    title: "イヌとサンイン | 山陰の犬オーナーのためのポータルサイト",
    description:
      "鳥取・島根の犬オーナーのための情報サイト。ドッグラン・動物病院・ペットホテル・ペットOK飲食店・保護犬情報を一か所に。",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "イヌとサンイン",
      },
    ],
    locale: "ja_JP",
  },
  verification: {
    google: "1KWlAnQkrgavNJ4UXpHhJZJHk4e_aaJ9dzXRUjOMNfg",
  },
  twitter: {
    card: "summary_large_image",
    title: "イヌとサンイン | 山陰の犬オーナーのためのポータルサイト",
    description:
      "鳥取・島根の犬オーナーのための情報サイト。ドッグラン・動物病院・ペットホテル・ペットOK飲食店・保護犬情報を一か所に。",
    images: ["/images/hero.png"],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "イヌとサンイン",
    url: BASE_URL,
    description: "山陰の犬オーナーのためのポータルサイト",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "イヌとサンイン",
    url: BASE_URL,
    logo: `${BASE_URL}/icons/inutosanin.svg`,
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#2C2C2A]">
        {children}
      </body>
    </html>
  );
}
