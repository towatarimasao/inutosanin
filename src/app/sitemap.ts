import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { AREAS } from "@/lib/areas";

const BASE_URL = "https://www.inutosanin.jp";

const CATEGORIES = ["dogrun", "vet", "hotel", "restaurant", "shop", "adoption"];

// 1時間ごとに再生成（頻繁に更新するファイルではないため）
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixedPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/spots`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/dog-food`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/topics`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: `${BASE_URL}/spots?category=${category}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const cityPages: MetadataRoute.Sitemap = AREAS.flatMap((pref) =>
    pref.cities.map((city) => ({
      url: `${BASE_URL}/spots/${pref.slug}/${city.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  const { data: spots } = await supabase
    .from("spots")
    .select("id, updated_at")
    .eq("is_active", true)
    .eq("listing_status", "published");

  const spotPages: MetadataRoute.Sitemap = (spots ?? []).map((spot) => ({
    url: `${BASE_URL}/spots/${spot.id}`,
    lastModified: spot.updated_at ? new Date(spot.updated_at) : undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...fixedPages, ...categoryPages, ...cityPages, ...spotPages];
}
