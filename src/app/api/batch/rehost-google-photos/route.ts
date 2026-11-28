import { NextResponse } from "next/server";

// 停止中（2026-11-28）：Googleマップの写真をダウンロード・保存する処理だった。
// Googleの規約では写真の保存は認められていないため停止した。
// 写真は、詳細ページで保存せずにその場で表示する仕組み（/api/spot-photo/[id]）に切り替え済み。
// 元の処理はGitの履歴に残っている。
export async function GET() {
  return NextResponse.json(
    { error: "この処理は停止しています（Googleの写真は保存できないため）" },
    { status: 410 }
  );
}
