"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const REPORT_TYPE_LABELS: Record<string, string> = {
  address_wrong: "住所が違う",
  closed:        "廃業している",
  phone_wrong:   "電話番号が違う",
  other:         "その他",
};

type Report = {
  id: string;
  spot_id: string;
  spot_name: string;
  report_type: string;
  detail: string | null;
  created_at: string;
  is_reviewed: boolean;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function fetchReports() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/reports");
    if (!res.ok) {
      setError("取得に失敗しました");
      setLoading(false);
      return;
    }
    setReports(await res.json());
    setLoading(false);
  }

  async function toggleReviewed(report: Report) {
    const next = !report.is_reviewed;
    const res = await fetch(`/api/admin/reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_reviewed: next }),
    });
    if (res.ok) {
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, is_reviewed: next } : r))
      );
    }
  }

  useEffect(() => { fetchReports(); }, []);

  const unreviewed = reports.filter((r) => !r.is_reviewed);
  const reviewed   = reports.filter((r) => r.is_reviewed);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-foreground">誤り報告一覧</h1>
          <div className="flex gap-3 items-center">
            <span className="text-sm text-subtext">未確認: {unreviewed.length}件</span>
            <Link href="/admin/spots" className="text-sm text-accent underline">スポット管理へ</Link>
          </div>
        </div>

        {loading && <p className="text-sm text-subtext">読み込み中…</p>}
        {error   && <p className="text-sm text-red-500">{error}</p>}

        {!loading && reports.length === 0 && (
          <p className="text-sm text-subtext text-center py-12">報告はまだありません</p>
        )}

        {[...unreviewed, ...reviewed].map((r) => (
          <div
            key={r.id}
            className={`bg-white rounded-2xl border p-5 mb-3 ${
              r.is_reviewed ? "border-accent/10 opacity-60" : "border-amber-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {!r.is_reviewed && (
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">未確認</span>
                  )}
                  <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                    {REPORT_TYPE_LABELS[r.report_type] ?? r.report_type}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  <Link
                    href={`/spots/${r.spot_id}`}
                    target="_blank"
                    className="hover:text-accent underline underline-offset-2"
                  >
                    {r.spot_name}
                  </Link>
                </p>
                {r.detail && (
                  <p className="text-sm text-subtext mt-1 whitespace-pre-line">{r.detail}</p>
                )}
                <p className="text-xs text-subtext mt-2">
                  {new Date(r.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
              <button
                onClick={() => toggleReviewed(r)}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  r.is_reviewed
                    ? "border-accent/20 text-accent hover:bg-accent/5"
                    : "bg-accent text-white hover:opacity-90"
                }`}
              >
                {r.is_reviewed ? "未確認に戻す" : "確認済みにする"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
