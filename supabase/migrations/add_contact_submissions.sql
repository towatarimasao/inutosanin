-- contact_submissions テーブル新規作成（ヘッダー「お問い合わせ」フォーム用）
-- 実行方法: Supabase SQL Editorで手動実行（本番DBへの直接変更のため、必ず内容を確認してから実行すること）
--
-- 方針:
--   feedback_submissions はスポット提案(suggest)・犬同伴OK確認(confirm)専用の
--   カラム設計になっており、genre/name/address/phone/spot_id など今回の
--   一般的なお問い合わせでは使わない列が多い。性質が異なるため専用テーブルとする。

create table if not exists public.contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text not null,
  subject    text,
  message    text not null,
  status     text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);
