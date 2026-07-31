-- spots.slug 列追加（UUID URLからの脱却の第一段階）
-- 実行方法: Supabase SQL Editorで手動実行（本番DBへの直接変更のため、必ず内容を確認してから実行すること）
--
-- 方針:
--   1. まずnullable + UNIQUEで追加する（既存行は全てNULLのまま）
--   2. scripts/generate-slugs.js のドライラン結果を目視確認の上、
--      別途バックフィル処理でslugを埋める
--   3. 全件（is_active/listing_statusに関わらず）へのバックフィルが完了し、
--      アプリケーションコードがslugベースのルーティングに切り替わったら、
--      NOT NULL制約を追加する移行を別途行う（このファイルでは行わない）

alter table public.spots
  add column if not exists slug varchar(255);

-- NULLは複数行許容されるため、UNIQUE制約はNULL以外の値の重複のみを禁止する
create unique index if not exists spots_slug_unique_idx
  on public.spots (slug)
  where slug is not null;
