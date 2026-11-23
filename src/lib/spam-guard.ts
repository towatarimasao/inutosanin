import { createClient } from "@supabase/supabase-js";

export const MAX_SPOT_IDS = 20;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** 文字列を最大長で切り詰める（非文字列は空文字） */
export function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * 同一メールアドレスからの直近投稿数が上限を超えているか。
 * DB照会に失敗した場合は投稿を止めない（false）。
 */
export async function isRateLimited(
  table: "feedback_submissions" | "contact_submissions",
  emailColumn: "contact_email" | "email",
  email: string,
  opts: { windowMinutes?: number; max?: number } = {}
): Promise<boolean> {
  const { windowMinutes = 60, max = 5 } = opts;
  try {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(emailColumn, email)
      .gte("created_at", since);
    if (error) return false;
    return (count ?? 0) >= max;
  } catch {
    return false;
  }
}

/**
 * フォームを開いてから送信までの時間で、機械的な送信を見分ける。
 * startedAt はフォーム表示時にブラウザで記録した時刻（ミリ秒）。
 * - 値が無い・数値でない → フォーム画面を経由せず直接送られたとみなす
 * - minSeconds 未満 → 人が入力するには速すぎる
 * - maxHours を超える／未来の時刻 → 値が不自然
 */
export function isSuspiciousTiming(
  startedAt: unknown,
  opts: { minSeconds?: number; maxHours?: number; now?: number } = {}
): boolean {
  const { minSeconds = 3, maxHours = 24, now = Date.now() } = opts;
  const t = typeof startedAt === "number" ? startedAt : Number(startedAt);
  if (!Number.isFinite(t) || t <= 0) return true;
  const elapsed = now - t;
  if (elapsed < minSeconds * 1000) return true;
  if (elapsed > maxHours * 3_600_000) return true;
  return false;
}

/**
 * 「bKtjmKzEwBcXewLCZrvnEpm」のような、英字だけで大文字小文字が
 * ばらばらに混ざった無意味な文字列か。
 * 空白・数字・記号・日本語を含む文字列は対象外（false）。
 * 「iPhone」「McDonald」のような普通の単語を誤判定しないよう、
 * 10文字以上かつ「小文字→大文字」の切り替わりが3回以上のものだけを対象にする。
 */
export function looksLikeGibberish(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!/^[A-Za-z]{10,}$/.test(s)) return false;
  const switches = s.match(/[a-z][A-Z]/g)?.length ?? 0;
  return switches >= 3;
}

/**
 * サイト全体の直近投稿数が上限を超えているか（大量送信への歯止め）。
 * メールアドレスを毎回変えてくる送信にも効く。
 * DB照会に失敗した場合は投稿を止めない（false）。
 */
export async function isGloballyRateLimited(
  table: "feedback_submissions" | "contact_submissions",
  opts: { windowMinutes?: number; max?: number } = {}
): Promise<boolean> {
  const { windowMinutes = 10, max = 10 } = opts;
  try {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
      .from(table)
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if (error) return false;
    return (count ?? 0) >= max;
  } catch {
    return false;
  }
}
