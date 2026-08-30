"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

const INPUT_CLASS = "border rounded px-3 py-2 text-sm focus:outline-none w-full";
const INPUT_STYLE = { borderColor: "#C8BFB5", color: "#2A2521" };
const LABEL_CLASS = "text-xs font-medium";
const LABEL_STYLE = { color: "#6B6460" };
const REQUIRED = <span style={{ color: "#D2691E" }}>*</span>;

export default function ContactPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus]   = useState<Status>("idle");
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "有効なメールアドレスを入力してください";
    if (!message.trim()) e.message = "本文を入力してください";
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
      const res = await fetch("/api/feedback/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, honeypot }),
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
            お問い合わせを受け付けました。<br />
            内容を確認のうえ、必要に応じてご連絡いたします。
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
          CONTACT
        </p>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#2A2521" }}>
          お問い合わせ
        </h1>
        <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: "#6B6460" }}>
          サイトに関するご質問・ご意見・掲載内容の修正依頼など、
          お気軽にお問い合わせください。
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

        <div className="rounded-xl border p-6 flex flex-col gap-4" style={{ borderColor: "#E0D8CC", backgroundColor: "#FFFFFF" }}>
          <h2 className="text-sm font-bold" style={{ color: "#2A2521" }}>お問い合わせ内容</h2>

          {/* お名前 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              お名前 <span style={{ color: "#9E9990" }}>（任意）</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：山陰犬好き"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>

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

          {/* 件名 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              件名 <span style={{ color: "#9E9990" }}>（任意）</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例：掲載情報の修正依頼"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>

          {/* 本文 */}
          <div className="flex flex-col gap-1">
            <label className={LABEL_CLASS} style={LABEL_STYLE}>本文 {REQUIRED}</label>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: "" })); }}
              placeholder="お問い合わせ内容をご記入ください"
              rows={6}
              className={INPUT_CLASS}
              style={{ ...INPUT_STYLE, borderColor: errors.message ? "#DC2626" : "#C8BFB5", resize: "vertical" }}
            />
            {errors.message && <p className="text-xs text-red-600">{errors.message}</p>}
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
