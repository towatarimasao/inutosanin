import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ConfirmSpotsClient from "./ConfirmSpotsClient";

export const metadata: Metadata = {
  title: "スポット確認フォーム | イヌとサンイン",
  robots: "noindex",
};

export type PendingSpot = {
  id: string;
  name: string;
  category: string;
  address: string | null;
};

async function fetchPendingSpots(): Promise<PendingSpot[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const PAGE_SIZE = 1000;
  const all: PendingSpot[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("spots")
      .select("id, name, category, address")
      .eq("listing_status", "pending_review")
      .order("category")
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("[confirm-spots] fetch error:", error.message);
      break;
    }

    all.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) break;
    page++;
  }

  return all;
}

export default async function ConfirmSpotsPage() {
  const spots = await fetchPendingSpots();
  return <ConfirmSpotsClient spots={spots} />;
}
