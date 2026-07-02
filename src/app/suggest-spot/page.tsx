"use client";

import { useState } from "react";

const GENRES = [
  { value: "dogrun",     label: "ドッグラン" },
  { value: "vet",        label: "動物病院" },
  { value: "hotel",      label: "ペットホテル" },
  { value: "restaurant", label: "ペットOK飲食店" },
  { value: "shop",       label: "ペット用品店" },
  { value: "adoption",   label: "保護犬情報" },
];

type Status = "idle" | "submitting" | "done" | "error";

const INPUT_CLASS = "border rounded px-3 py-2 text-sm focus:outline-none w-full";
const INPUT_STYLE = { borderColor: "#C8BFB5", color: "#2A2521" };
const LABEL_CLASS = "text-xs font-medium";
const LABEL_STYLE = { color: "#6B6460" };
const REQUIRED = <span style={{ color: "#D2691E" }}>*</span>;

export default function SuggestSpotPage() {
  const [genre, setGenre]       = useState("");
  const [name, setName]         = useState("");
  const [address, setAddress]   = useState("");
  const [phone, setPhone]       = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [email, setEmail]       = useState("");
  const [nickname, setNickname] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus]     = useState<Status>("idle");
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!genre)   e.genre   = "ジャンルを選択してください";
    if (!name.trim())    e.name    = "店名を入力してください";
    if (!address.trim()) e.address = "住所を入力してください";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "有効なメールアドレスを入力してください";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStatus("submitting");

    try {
      const res = await fetch("/api/feedback/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre, name, address, phone,
          isConfirmedByVisitor: confirmed,
          email, nickname, honeypot,
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F1E7" }}>
        <div className="text-center px-6 py-16 max-w-md">
          <p className="text-5xl mb-6">🐾</p>
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#2A2521" }}>
            ありがとうございました！
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6B6460" }}>
            スポット情報を受け付けました。<br />
            確認のうえ、掲載を検討いたします。
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
          SUGGEST A SPOT
        </p>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#2A2521" }}>
          スポットを投稿する
        </h1>
        <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: "#6B6460" }}>
          山陰エリアで愛犬と訪れた犬同伴OKのスポットをぜひ教えてください。
          確認のうえ、掲載を検討いたします。
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="max-w-lg mx-auto px-4 pt-10 flex flex-col gap-5">

        {/* honeypot */}
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

        {/* スポット情報 */}
        <div className="rounded-xl border p-6 flex flex-col gap-4" style={{ borderColor: "#E0D8CC", backgroundColor: "#FFFFFF" }}>
          <h2 className="text-sm font-bold" style={{ color: "#2A2521" }}>スポット情報</h2>

          {/* ジャンル */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>ジャンル {REQUIRED}</label>
            <select
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setErrors((p) => ({ ...p, genre: "" })); }}
              className={INPUT_CLASS}
              style={{ ...INPUT_STYLE, borderColor: errors.genre ? "#DC2626" : "#C8BFB5" }}
            >
              <option value="">選択してください</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            {errors.genre && <p className="text-xs text-red-600">{errors.genre}</p>}
          </div>

          {/* 店名 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>店名・施設名 {REQUIRED}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="例：鳥取砂丘ドッグラン"
              className={INPUT_CLASS}
              style={{ ...INPUT_STYLE, borderColor: errors.name ? "#DC2626" : "#C8BFB5" }}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* 住所 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>住所 {REQUIRED}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setErrors((p) => ({ ...p, address: "" })); }}
              placeholder="例：鳥取県鳥取市福部町湯山"
              className={INPUT_CLASS}
              style={{ ...INPUT_STYLE, borderColor: errors.address ? "#DC2626" : "#C8BFB5" }}
            />
            {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
          </div>

          {/* 電話番号 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              電話番号 <span style={{ color: "#9E9990" }}>（任意）</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="例：0857-00-0000"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>

          {/* 確認済みチェック */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D2691E]"
            />
            <span className="text-sm" style={{ color: "#2A2521" }}>施設に確認済みです</span>
          </label>
        </div>

        {/* 送信者情報 */}
        <div className="rounded-xl border p-6 flex flex-col gap-4" style={{ borderColor: "#E0D8CC", backgroundColor: "#FFFFFF" }}>
          <h2 className="text-sm font-bold" style={{ color: "#2A2521" }}>送信者情報</h2>

          {/* メールアドレス */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>メールアドレス {REQUIRED}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              placeholder="example@mail.com"
              className={INPUT_CLASS}
              style={{ ...INPUT_STYLE, borderColor: errors.email ? "#DC2626" : "#C8BFB5" }}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* ニックネーム */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              ニックネーム <span style={{ color: "#9E9990" }}>（任意）</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：山陰犬好き"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
        </div>

        {/* エラー・送信 */}
        {status === "error" && (
          <p className="text-sm text-red-600 text-center">
            送信に失敗しました。時間をおいて再度お試しください。
          </p>
        )}

        <div className="text-center pt-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="px-10 py-3 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#D2691E", color: "#fff" }}
          >
            {status === "submitting" ? "送信中…" : "送信する"}
          </button>
        </div>

      </form>
    </div>
  );
}
