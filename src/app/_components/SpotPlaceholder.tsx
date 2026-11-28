import Image from "next/image";

// 写真がないスポット用の、分類ごとのイラスト（トップページの「カテゴリから探す」と同じアイコン・配色）
const VISUALS: Record<string, { icon: string; bg: string; iconBg: string; label: string }> = {
  dogrun:     { icon: "/icons/dogrun.svg",  bg: "#E2EEE8", iconBg: "#C5DDD0", label: "ドッグラン" },
  vet:        { icon: "/icons/clinick.svg", bg: "#DEEAF0", iconBg: "#BDD4E3", label: "動物病院" },
  hotel:      { icon: "/icons/bed.svg",     bg: "#FBEADD", iconBg: "#F5D0B5", label: "ペットホテル" },
  restaurant: { icon: "/icons/cafe.svg",    bg: "#E2EEE8", iconBg: "#C5DDD0", label: "ペットOK飲食店" },
  shop:       { icon: "/icons/shop.svg",    bg: "#DEEAF0", iconBg: "#BDD4E3", label: "ペット用品店・サロン" },
  adoption:   { icon: "/icons/hogoken.svg", bg: "#FBEADD", iconBg: "#F5D0B5", label: "保護犬情報" },
};

const FALLBACK = { icon: "/icons/dogrun.svg", bg: "#E2EEE8", iconBg: "#C5DDD0", label: "スポット" };

export default function SpotPlaceholder({
  category,
  size = "md",
}: {
  category: string;
  size?: "md" | "lg";
}) {
  const v = VISUALS[category] ?? FALLBACK;
  const circle = size === "lg" ? "w-28 h-28" : "w-16 h-16";
  const iconPx = size === "lg" ? 64 : 36;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: v.bg }}
      aria-hidden="true"
    >
      <div
        className={`${circle} flex items-center justify-center rounded-full`}
        style={{ backgroundColor: v.iconBg }}
      >
        <Image src={v.icon} alt="" width={iconPx} height={iconPx} />
      </div>
    </div>
  );
}
