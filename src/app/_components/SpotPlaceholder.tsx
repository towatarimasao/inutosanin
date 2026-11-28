import Image from "next/image";

// 写真がないスポット用の、分類ごとのイメージ画像（トップと同じ絵本風のイラスト）。
// 実際の店・施設の写真ではないため、必ず「イメージ」と表示する。
const IMAGES: Record<string, string> = {
  dogrun:     "/images/category/dogrun.webp",
  vet:        "/images/category/vet.webp",
  hotel:      "/images/category/hotel.webp",
  restaurant: "/images/category/restaurant.webp",
  shop:       "/images/category/shop.webp",
  adoption:   "/images/category/adoption.webp",
};

export default function SpotPlaceholder({
  category,
  size = "md",
}: {
  category: string;
  size?: "md" | "lg";
}) {
  const src = IMAGES[category] ?? IMAGES.dogrun;
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes={
          size === "lg"
            ? "(max-width: 768px) 100vw, 768px"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        }
      />
      <span
        className={`absolute bottom-2 right-2 rounded-full bg-white/80 text-[#6B6460] ${
          size === "lg" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5"
        }`}
      >
        イメージ
      </span>
    </div>
  );
}
