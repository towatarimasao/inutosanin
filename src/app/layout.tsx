import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "イヌとサンイン | 山陰の犬オーナーコミュニティ",
  description:
    "鳥取・島根の犬オーナー向けポータル。ドッグラン・動物病院・ペットホテル・ペットOK飲食店・ペット用品店・保護犬情報を掲載。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#2C2C2A]">
        {children}
      </body>
    </html>
  );
}
