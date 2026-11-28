-- Googleの写真を「その場で表示」する機能の、月ごとの利用回数を数えるための表と関数
-- 実行方法: Supabase SQL Editorで手動実行（本番DBへの変更のため、内容を確認してから実行すること）
--
-- 方針:
--   - 既存の表には一切手を加えない（新しい表と関数を足すだけ）
--   - 回数は「月」単位で1行。上限に達したら false を返し、アプリ側は写真を出さない
--   - この表・関数はサーバー（SUPABASE_SECRET_KEY）からのみ使う。一般公開の鍵からは触れない

create table if not exists public.photo_api_usage (
  month text primary key,            -- 例: '2026-11'
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.photo_api_usage enable row level security;
-- 公開用の鍵（anon）向けのポリシーは作らない＝読み書き不可

-- 上限未満なら1増やして true、上限に達していたら false を返す（同時アクセスでも数がずれない）
create or replace function public.increment_photo_usage(p_month text, p_cap integer)
returns boolean
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into public.photo_api_usage as u (month, count)
  values (p_month, 1)
  on conflict (month) do update
    set count = u.count + 1, updated_at = now()
    where u.count < p_cap
  returning u.count into new_count;

  return new_count is not null;
end;
$$;

revoke all on function public.increment_photo_usage(text, integer) from public, anon, authenticated;
