// Googleマップから取り込んで保存した写真かどうかを判定する。
// Googleの規約では写真の保存は認められていないため、こうした写真は表示に使わず、
// 分類ごとのイメージ画像か、詳細ページでのGoogle写真の直接表示（保存なし）に切り替える。
const GOOGLE_DERIVED_PATTERNS = [
  "/storage/v1/object/public/spot-photos/", // 旧バッチがGoogle写真を保存していた保管場所
  "googleusercontent.com",
  "places.googleapis.com",
  "maps.googleapis.com",
];

export function isGoogleDerivedPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  return GOOGLE_DERIVED_PATTERNS.some((p) => url.includes(p));
}

// 表示してよい自前の写真URLだけを返す（Google由来は null）
export function ownPhoto(...urls: (string | null | undefined)[]): string | null {
  for (const u of urls) {
    if (u && !isGoogleDerivedPhoto(u)) return u;
  }
  return null;
}
