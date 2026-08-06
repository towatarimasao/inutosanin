import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";

  if (!isValidBasicAuth(authHeader)) {
    return new NextResponse("認証が必要です", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
    });
  }

  return NextResponse.next();
}

function isValidBasicAuth(authHeader: string): boolean {
  if (!authHeader.startsWith("Basic ")) return false;

  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  // パスワード自体に":"が含まれる場合を考慮して最初の":"でのみ分割
  const colonIndex = decoded.indexOf(":");
  if (colonIndex === -1) return false;

  const username = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  return (
    username === (process.env.ADMIN_USERNAME ?? "") &&
    password === (process.env.ADMIN_PASSWORD ?? "")
  );
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
