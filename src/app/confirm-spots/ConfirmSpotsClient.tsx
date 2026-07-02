"use client";

import { useState, useMemo } from "react";
import type { PendingSpot } from "./page";

const CATEGORY_LABELS: Record<string, string> = {
  dogrun:     "ドッグラン",
  vet:        "動物病院",
  hotel:      "ペットホテル",
  restaurant: "ペットOK飲食店",
  shop:       "ペット用品店",
  adoption:   "保護犬情報",
};

type Status = "idle" | "submitting" | "done" | "error";

export default function ConfirmSpotsClient({ spots }: { spots: PendingSpot[] }) {
  const [checked, setChecked]     = useState<Set<string>>(new Set());
  const [filterCat, setFilterCat] = useState("");
  const [email, setEmail]         = useState("");
  const [nickname, setNickname]   = useState("");
  const [honeypot, setHoneypot]   = useState("");
  const [status, setStatus]       = useState<Status>("idle");
  const [emailError, setEmailError] = useState("");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    spots.forEach((s) => seen.add(s.category));
    return Array.from(seen).sort();
  }, [spots]);

  const filtered = useMemo(
    () => (filterCat ? spots.filter((s) => s.category === filterCat) : spots),
    [spots, filterCat]
  );

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const filteredIds = filtered.map((s) => s.id);
    const allChecked = filteredIds.every((id) => checked.has(id));
    setChecked((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ボット対策：honeypot に入力があれば無視
    if (honeypot) return;

    // メール簡易バリデーション
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("有効なメールアドレスを入力してください");
      return;
    }
    setEmailError("");

    if (checked.size === 0) return;

    setStatus("submitting");

    try {
      const res = await fetch("/api/feedback/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotIds:  Array.from(checked),
          email,
          nickname,
          honeypot,
        }),
      });

      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  const filteredCheckedCount = filtered.filter((s) => checked.has(s.id)).length;
  const allFilteredChecked   = filtered.length > 0 && filtered.every((s) => checked.has(s.id));

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F1E7" }}>
        <div className="text-center px-6 py-16 max-w-md">
          <p className="text-5xl mb-6">🐾</p>
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#2A2521" }}>
            ありがとうございました！
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6B6460" }}>
            {checked.size}件の情報をお送りいただきました。<br />
            確認のうえ、掲載に反映いたします。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F1E7", color: "#2A2521" }}>

      {/* ヘッダー */}
      <div className="px-4 py-10 text-center border-b" style={{ borderColor: "#E0D8CC" }}>
        <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: "#D2691E" }}>
          SPOT CONFIRMATION
        </p>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#2A2521" }}>
          スポット確認フォーム
        </h1>
        <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: "#6B6460" }}>
          下記のスポットに実際に愛犬と訪問された方は、「犬同伴OKでした」にチェックをつけてご報告ください。
          いただいた情報はサイトの掲載審査に活用されます。
        </p>
        <p className="text-xs mt-3" style={{ color: "#9E9990" }}>
          全 {spots.length} 件中 {checked.size} 件チェック済み
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 pt-8">

        {/* カテゴリフィルター */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "#6B6460" }}>カテゴリ：</span>
          <button
            type="button"
            onClick={() => setFilterCat("")}
            className="text-xs px-3 py-1 rounded-full border transition-all"
            style={!filterCat
              ? { backgroundColor: "#D2691E", color: "#fff", borderColor: "#D2691E" }
              : { backgroundColor: "transparent", color: "#6B6460", borderColor: "#C8BFB5" }
            }
          >
            すべて（{spots.length}）
          </button>
          {categories.map((cat) => {
            const count = spots.filter((s) => s.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                className="text-xs px-3 py-1 rounded-full border transition-all"
                style={filterCat === cat
                  ? { backgroundColor: "#D2691E", color: "#fff", borderColor: "#D2691E" }
                  : { backgroundColor: "transparent", color: "#6B6460", borderColor: "#C8BFB5" }
                }
              >
                {CATEGORY_LABELS[cat] ?? cat}（{count}）
              </button>
            );
          })}
        </div>

        {/* 一括チェック */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: "#9E9990" }}>
            {filtered.length} 件表示 ／ {filteredCheckedCount} 件チェック済み
          </p>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs px-3 py-1 rounded border transition-all"
            style={{ borderColor: "#C8BFB5", color: "#6B6460" }}
          >
            {allFilteredChecked ? "表示中の選択を解除" : "表示中を全て選択"}
          </button>
        </div>

        {/* スポット一覧 */}
        <div className="rounded-xl overflow-hidden border mb-10" style={{ borderColor: "#E0D8CC" }}>
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "#9E9990" }}>
              該当するスポットがありません
            </p>
          ) : (
            <ul>
              {filtered.map((spot, i) => (
                <li
                  key={spot.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{
                    backgroundColor: checked.has(spot.id) ? "#FFF7EF" : (i % 2 === 0 ? "#FFFFFF" : "#FDFAF6"),
                    borderBottom: i < filtered.length - 1 ? "1px solid #EDE6DC" : undefined,
                  }}
                >
                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate" style={{ color: "#2A2521" }}>
                      {spot.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9E9990" }}>
                      {CATEGORY_LABELS[spot.category] ?? spot.category}
                      {spot.address && <span className="ml-2">{spot.address}</span>}
                    </p>
                  </div>

                  {/* チェックボックス */}
                  <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none pt-0.5">
                    <input
                      type="checkbox"
                      checked={checked.has(spot.id)}
                      onChange={() => toggleCheck(spot.id)}
                      className="w-4 h-4 rounded accent-[#D2691E]"
                    />
                    <span className="text-xs whitespace-nowrap" style={{ color: "#6B6460" }}>
                      犬同伴OKでした
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 送信者情報 */}
        <div className="rounded-xl border p-6 mb-8 flex flex-col gap-4" style={{ borderColor: "#E0D8CC", backgroundColor: "#FFFFFF" }}>
          <h2 className="text-sm font-bold" style={{ color: "#2A2521" }}>送信者情報</h2>

          {/* ボット対策honeypot（人間には見えない） */}
          <div style={{ display: "none" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "#6B6460" }}>
              メールアドレス <span style={{ color: "#D2691E" }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              placeholder="example@mail.com"
              required
              className="border rounded px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: emailError ? "#DC2626" : "#C8BFB5", color: "#2A2521" }}
            />
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "#6B6460" }}>
              ニックネーム <span style={{ color: "#9E9990" }}>（任意）</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：山陰犬好き"
              className="border rounded px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#C8BFB5", color: "#2A2521" }}
            />
          </div>
        </div>

        {/* 送信ボタン */}
        {status === "error" && (
          <p className="text-sm text-red-600 text-center mb-4">
            送信に失敗しました。時間をおいて再度お試しください。
          </p>
        )}

        <div className="text-center">
          <button
            type="submit"
            disabled={checked.size === 0 || status === "submitting"}
            className="px-10 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#D2691E", color: "#fff" }}
          >
            {status === "submitting"
              ? "送信中…"
              : `${checked.size} 件の情報を送信する`}
          </button>
          {checked.size === 0 && (
            <p className="text-xs mt-2" style={{ color: "#9E9990" }}>
              チェックを1件以上つけてください
            </p>
          )}
        </div>

      </form>
    </div>
  );
}
