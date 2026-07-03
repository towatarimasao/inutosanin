"use client";

import { useState } from "react";

const REPORT_TYPE_OPTIONS = [
  { value: "address_wrong", label: "住所が違う" },
  { value: "closed",        label: "廃業している" },
  { value: "phone_wrong",   label: "電話番号が違う" },
  { value: "other",         label: "その他" },
] as const;

type ReportType = typeof REPORT_TYPE_OPTIONS[number]["value"];

type Props = {
  spotId: string;
  spotName: string;
};

type Status = "idle" | "open" | "sending" | "done" | "error";

export default function ReportButton({ spotId, spotName }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [reportType, setReportType] = useState<ReportType>("address_wrong");
  const [detail, setDetail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    const res = await fetch(`/api/spots/${spotId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spot_name: spotName, report_type: reportType, detail }),
    });

    setStatus(res.ok ? "done" : "error");
  }

  if (status === "idle") {
    return (
      <div className="mt-2 text-center">
        <button
          onClick={() => setStatus("open")}
          className="text-xs text-subtext underline underline-offset-2 hover:text-foreground transition-colors"
        >
          情報の誤りを報告する
        </button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mt-4 bg-[#F0F7F3] border border-accent/20 rounded-xl px-5 py-4 text-sm text-accent text-center">
        ご報告ありがとうございます。内容を確認のうえ対応いたします。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-white border border-accent/10 rounded-2xl p-5">
      <p className="text-sm font-semibold text-foreground mb-4">情報の誤りを報告する</p>

      <div className="mb-3">
        <label className="block text-xs text-subtext mb-1">誤りの種類</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          className="w-full border border-accent/20 rounded-lg px-3 py-2 text-sm text-foreground bg-white focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {REPORT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs text-subtext mb-1">詳細（任意）</label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          placeholder="具体的な内容があればご記入ください"
          className="w-full border border-accent/20 rounded-lg px-3 py-2 text-sm text-foreground bg-white focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-red-500 mb-3">送信に失敗しました。時間をおいて再度お試しください。</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex-1 bg-accent text-white text-sm font-semibold py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {status === "sending" ? "送信中…" : "送信する"}
        </button>
        <button
          type="button"
          onClick={() => { setStatus("idle"); setDetail(""); }}
          className="flex-1 border border-accent/30 text-accent text-sm font-semibold py-2 rounded-full hover:bg-accent/5 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
