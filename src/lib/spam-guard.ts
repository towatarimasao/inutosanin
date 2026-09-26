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
