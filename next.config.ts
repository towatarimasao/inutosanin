import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [400, 800, 1200],
    imageSizes: [64, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.st-note.com",
      },
      {
        // Google Places 写真URL
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "places.googleapis.com",
      },
      {
        // Supabase Storage（スポット写真）
        protocol: "https",
        hostname: "jbbxcznfuwwxavzwsuks.supabase.co",
      },
      {
        // ワンフー（商品画像）
        protocol: "https",
        hostname: "d2w53g1q050m78.cloudfront.net",
      },
      {
        // リバードコーポレーション（商品画像）
        protocol: "https",
        hostname: "www.riverd-republic.com",
      },
      {
        // マンマボーノ（商品画像）
        protocol: "https",
        hostname: "manmabuono.jp",
      },
      {
        // 楽天/KISSBABY（商品画像）
        protocol: "https",
        hostname: "shop.r10s.jp",
      },
      {
        // みちのくファーム（商品画像）
        protocol: "https",
        hostname: "image.raku-uru.jp",
      },
      {
        // くいしんぼ（BASE、商品画像）
        protocol: "https",
        hostname: "baseec-img-mng.akamaized.net",
      },
    ],
  },
};

export default nextConfig;
