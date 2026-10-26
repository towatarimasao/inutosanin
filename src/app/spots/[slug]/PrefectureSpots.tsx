// 都道府県ページ（/spots/tottori・/spots/shimane）。
// URLが /spots/[slug] でスポット詳細と同じ形のため、[slug]/page.tsx から県slugのときだけ呼び出す。
// 文章はDBにある事実（件数・スポット名・同伴条件の記載・宿泊タグ）だけで組み立てる。推測や体験談は入れない。
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import Header from "@/app/_components/Header";
import Footer from "@/app/_components/Footer";
import { supabase } from "@/lib/supabase";
import { AREAS, type AreaPrefecture } from "@/lib/areas";

const BASE_URL = "https://www.inutosanin.jp";

const CATEGORY_LABELS: Record<string, string> = {
  dogrun:     "ドッグラン",
  vet:        "動物病院",
  hotel:      "ペットホテル",
  restaurant: "ペットOK飲食店",
  shop:       "ペット用品店・サロン",
  adoption:   "保護犬情報",
};

const SUMMARY_CATEGORIES = ["dogrun", "vet", "hotel", "restaurant", "shop", "adoption"] as const;

// 一覧表示の上限（ページが重くなりすぎないように）
const LIST_LIMIT = 40;

type PrefSpot = {
  slug: string;
  name: string;
  category: string;
  address: string | null;
  pet_condition: string | null;
  stay_tags: string[] | null;
};

type Faq = { q: string; a: string };

export function findPrefecture(slug: string): AreaPrefecture | null {
  return AREAS.find((p) => p.slug === slug) ?? null;
}

const getPrefectureSpots = cache(async (prefName: string): Promise<PrefSpot[]> => {
  const { data, error } = await supabase
    .from("spots")
    .select("slug,name,category,address,pet_condition,stay_tags")
    .eq("is_active", true)
    .eq("listing_status", "published")
    .ilike("address", `%${prefName}%`)
    .order("name", { ascending: true });

  if (error) console.error("[Supabase] prefecture spots fetch error:", error);
  return (data ?? []) as PrefSpot[];
});

// 住所から市町村名を取り出す（例：「鳥取県西伯郡伯耆町…」→「伯耆町」）。取れなければnull
function extractCityName(prefName: string, address: string | null): string | null {
  if (!address) return null;
  const re = new RegExp(`${prefName}(?:[^\\s\\d０-９、]{1,6}?郡)?([^\\s\\d０-９、]{1,8}?[市町村])`);
  return address.match(re)?.[1] ?? null;
}

function summarize(pref: AreaPrefecture, spots: PrefSpot[]) {
  const byCat: Record<string, PrefSpot[]> = {};
  for (const sp of spots) (byCat[sp.category] ??= []).push(sp);
  const count = (c: string) => byCat[c]?.length ?? 0;

  const breakdown = SUMMARY_CATEGORIES
    .filter((c) => count(c) > 0)
    .map((c) => `${CATEGORY_LABELS[c]}${count(c)}件`)
    .join("・");

  // 市町村ページがある市町村の件数（市町村ページと同じく住所の部分一致で数える）
  const areaCities = pref.cities.map((city) => ({
    ...city,
    total: spots.filter((sp) => sp.address?.includes(city.name)).length,
  }));

  // 市町村ページがない町村（住所から取り出した名前ごとに集計）
  const otherCounts: Record<string, number> = {};
  for (const sp of spots) {
    if (pref.cities.some((c) => sp.address?.includes(c.name))) continue;
    const name = extractCityName(pref.name, sp.address);
    if (name) otherCounts[name] = (otherCounts[name] ?? 0) + 1;
  }
  const otherCities = Object.entries(otherCounts)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const cityOf = (sp: PrefSpot) =>
    pref.cities.find((c) => sp.address?.includes(c.name))?.name ?? extractCityName(pref.name, sp.address) ?? "";

  const dogruns = byCat["dogrun"] ?? [];
  const stays = (byCat["hotel"] ?? []).filter((h) => h.stay_tags?.includes("stay"));
  const boardings = (byCat["hotel"] ?? []).filter((h) => h.stay_tags?.includes("boarding"));
  const restaurants = byCat["restaurant"] ?? [];
  const terrace = restaurants.filter((r) => r.pet_condition?.includes("テラス")).length;

  const description = spots.length > 0
    ? `${pref.name}の犬連れOKスポットを${spots.length}件掲載（${breakdown}）。市町村別に、ドッグラン・犬と泊まれる宿・ペットOKの飲食店などを探せます。`
    : `${pref.name}の犬連れOKなドッグラン・動物病院・ペットホテル・飲食店・ペット用品店をまとめて紹介`;

  const intro = spots.length > 0
    ? `${pref.name}内の犬連れOKスポットを${spots.length}件掲載中です（${breakdown}）。市町村やカテゴリから探せます。同伴できる席や条件は、各スポットのページで確認できます。`
    : "";

  const names = (list: PrefSpot[], n: number) => list.slice(0, n).map((x) => `「${x.name}」`).join("");

  const faqs: Faq[] = [];
  if (dogruns.length > 0) {
    const cities = [...new Set(dogruns.map(cityOf).filter(Boolean))];
    faqs.push({
      q: `${pref.name}にドッグランはありますか？`,
      a: `${pref.name}のドッグランとして、${names(dogruns, 5)}${dogruns.length > 5 ? "など" : ""}${dogruns.length}件を掲載しています${cities.length > 0 ? `（${cities.slice(0, 8).join("・")}${cities.length > 8 ? "など" : ""}）` : ""}。利用条件（登録・ワクチン接種の証明・料金など）は施設ごとに異なります。`,
    });
  }
  if (stays.length > 0 || boardings.length > 0) {
    let a = `${pref.name}では、`;
    if (stays.length > 0) a += `犬と一緒に泊まれる宿として${stays.length}件`;
    if (stays.length > 0 && boardings.length > 0) a += `、`;
    if (boardings.length > 0) a += `犬を預けられる施設として${boardings.length}件`;
    a += `を掲載しています。受け入れできる犬の大きさや頭数、料金は施設ごとに異なるため、予約前に確認してください。`;
    faqs.push({ q: `${pref.name}で犬と泊まれる宿や、犬を預けられるペットホテルはありますか？`, a });
  }
  if (restaurants.length > 0) {
    let a = `${pref.name}の、犬と一緒に利用できる飲食店を${restaurants.length}件掲載しています。`;
    if (terrace > 0) a += `そのうち${terrace}件は、同伴条件に「テラス」の記載があります（テラス席のみ同伴可など）。`;
    a += `店内に入れるかどうかはお店ごとに異なるため、各スポットの「ペット同伴条件」をご確認ください。`;
    faqs.push({ q: `${pref.name}で犬と一緒に入れる飲食店はありますか？`, a });
  }
  if (count("vet") > 0) {
    faqs.push({
      q: `${pref.name}の動物病院を探せますか？`,
      a: `${pref.name}の動物病院を${count("vet")}件掲載しています。診療時間・診療する動物・予約の要否は病院ごとに異なるため、受診前に電話などでご確認ください。`,
    });
  }
  if (spots.length > 0) {
    faqs.push({
      q: "お出かけ前に確認しておくことは？",
      a: "同伴できる席や時間帯、予約の要否、ワクチン接種証明書の提示などの条件は、お店や施設によって異なり、変更されることもあります。おでかけ前に、各スポットのページにある電話番号や公式サイトで、最新の情報をご確認ください。",
    });
  }

  return {
    description, intro, faqs, areaCities, otherCities, byCount: count,
    dogruns: dogruns.map((sp) => ({ ...sp, city: cityOf(sp) })),
    stays: stays.map((sp) => ({ ...sp, city: cityOf(sp) })),
  };
}

export async function prefectureMetadata(pref: AreaPrefecture): Promise<Metadata> {
  const spots = await getPrefectureSpots(pref.name);
  const { description } = summarize(pref, spots);
  const title = `${pref.name}の犬連れOKスポット一覧`;
  const pageUrl = `${BASE_URL}/spots/${pref.slug}`;
  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "イヌとサンイン",
      locale: "ja_JP",
      type: "website",
      // openGraphは親(layout.tsx)の値を丸ごと置き換えるため、共通画像もここで指定する
      images: [{ url: "/images/hero.png", width: 1200, height: 630, alt: "イヌとサンイン" }],
    },
  };
}

function SpotLinkList({ items }: { items: (PrefSpot & { city: string })[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {items.slice(0, LIST_LIMIT).map((sp) => (
        <li key={sp.slug}>
          <Link href={`/spots/${sp.slug}`} className="text-sm text-foreground hover:text-accent hover:underline">
            {sp.name}
          </Link>
          {sp.city && <span className="text-xs text-subtext ml-2">{sp.city}</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function PrefectureSpots({ pref }: { pref: AreaPrefecture }) {
  const spots = await getPrefectureSpots(pref.name);
  const s = summarize(pref, spots);
  const pageUrl = `${BASE_URL}/spots/${pref.slug}`;
  const otherPref = AREAS.find((p) => p.slug !== pref.slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: pref.name, item: pageUrl },
    ],
  };

  const sectionTitle = "font-heading text-lg font-bold text-foreground mb-5";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // </script>によるタグ抜け出しを防ぐため < をエスケープする
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />

      <main className="flex flex-col flex-1 bg-[#FAF6F1]">
        {/* ページヘッダー */}
        <section className="bg-[#EDE8E0] px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-en font-semibold text-accent tracking-widest mb-2">SPOTS</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              {pref.name}の犬連れOKスポット一覧
            </h1>
            <p className="text-sm text-subtext mt-2">
              {s.intro || `${pref.name}の犬連れOKなドッグラン・動物病院・ペットホテル・飲食店・ペット用品店をまとめて探せます。`}
            </p>
          </div>
        </section>

        {/* 市町村から探す */}
        <section className="px-4 sm:px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <h2 className={sectionTitle}>{pref.name}の市町村から探す</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {s.areaCities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/spots/${pref.slug}/${c.slug}`}
                    className="flex items-center justify-between bg-white rounded-xl border border-accent/10 px-4 py-3 hover:shadow-md transition-all h-full"
                  >
                    <span className="font-bold text-sm text-foreground">{c.name}</span>
                    <span className="text-xs text-subtext">{c.total}件</span>
                  </Link>
                </li>
              ))}
            </ul>
            {s.otherCities.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-subtext mb-2">その他の町村</p>
                <ul className="flex flex-wrap gap-2">
                  {s.otherCities.map((c) => (
                    <li key={c.name}>
                      <Link
                        href={`/spots?prefecture=${pref.slug}&city=${encodeURIComponent(c.name)}`}
                        className="inline-block text-sm border border-accent/30 text-foreground hover:border-accent hover:text-accent bg-white rounded-full px-3 py-1 transition-colors"
                      >
                        {c.name}（{c.total}）
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* カテゴリから探す */}
        <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
          <div className="max-w-5xl mx-auto">
            <h2 className={sectionTitle}>{pref.name}のスポットをカテゴリから探す</h2>
            <ul className="flex flex-wrap gap-2">
              {SUMMARY_CATEGORIES.filter((c) => s.byCount(c) > 0).map((c) => (
                <li key={c}>
                  <Link
                    href={`/spots?category=${c}&prefecture=${pref.slug}`}
                    className="inline-block text-sm border border-accent/30 text-foreground hover:border-accent hover:text-accent bg-white rounded-full px-4 py-1.5 transition-colors"
                  >
                    {CATEGORY_LABELS[c]}（{s.byCount(c)}件）
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ドッグラン一覧 */}
        {s.dogruns.length > 0 && (
          <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
            <div className="max-w-5xl mx-auto">
              <h2 className={sectionTitle}>{pref.name}のドッグラン（{s.dogruns.length}件）</h2>
              <SpotLinkList items={s.dogruns} />
            </div>
          </section>
        )}

        {/* 犬と泊まれる宿 */}
        {s.stays.length > 0 && (
          <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
            <div className="max-w-5xl mx-auto">
              <h2 className={sectionTitle}>{pref.name}の犬と泊まれる宿（{s.stays.length}件）</h2>
              <SpotLinkList items={s.stays} />
            </div>
          </section>
        )}

        {/* よくある質問 */}
        {s.faqs.length > 0 && (
          <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
            <div className="max-w-5xl mx-auto">
              <h2 className={sectionTitle}>{pref.name}で犬と出かける前に：よくある質問</h2>
              <dl className="flex flex-col gap-5">
                {s.faqs.map((f) => (
                  <div key={f.q}>
                    <dt className="text-sm font-bold text-foreground">{f.q}</dt>
                    <dd className="text-sm text-subtext leading-relaxed mt-1">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* もう一方の県へ */}
        {otherPref && (
          <section className="px-4 sm:px-6 py-10 border-t border-foreground/10">
            <div className="max-w-5xl mx-auto text-center">
              <Link
                href={`/spots/${otherPref.slug}`}
                className="inline-flex items-center justify-center gap-1.5 border-2 border-accent text-accent hover:bg-accent hover:text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                {otherPref.name}の犬連れOKスポットを見る →
              </Link>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
