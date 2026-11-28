@AGENTS.md

# イヌとサンイン (inutosanin)

## プロジェクト概要
- 山陰（鳥取・島根）のイヌ連れスポット情報サイト
- URL: https://www.inutosanin.jp
- GitHub: towatarimasao/inutosanin

## スタック
- Next.js 16.4.6（App Router）/ TypeScript / Tailwind
- DB:
  - Supabase（東京リージョン）：スポットなど、topics・わんこグッズ比較以外の全機能
  - Neon PostgreSQL + Drizzle ORM：topics とわんこグッズ比較（wanko_goods_articles）
  - 注：src/db/schema.ts の spots テーブル定義はデッドコード（未参照）
- Vercel（ホスティング）。サーバーは東京（vercel.json の regions: hnd1）
- Google Places API
- 環境変数：DATABASE_URL / GOOGLE_PLACES_API_KEY / PHOTO_MONTHLY_CAP など（Vercel設定済み）

## ページの作り置き（キャッシュ）
- トップ・トピックス・わんこグッズ比較は10分ごとに作り直す（`export const revalidate = 600`）
- sitemap は1時間ごと（revalidate 3600）

## ディレクトリ構成（主なもの）
src/
├── app/
│   ├── _components/        # 共通部品（SpotPlaceholder＝写真がないときの分類イメージ）
│   ├── spots/              # スポット一覧・詳細（Supabase）
│   ├── topics/             # Note.com RSSコンテンツ（Neon）
│   ├── wanko-goods/        # わんこグッズ比較（Neon）
│   ├── admin/              # 管理画面
│   ├── api/
│   │   ├── spot-photo/[id]/        # Google写真をその場で表示
│   │   ├── admin/fill-place-ids/   # 場所番号付け（管理者のみ）
│   │   └── batch/                  # 一括処理（写真を保存する3つは停止済み）
│   └── layout.tsx / page.tsx / sitemap.ts / robots.ts
├── lib/                    # supabase.ts / photo-source.ts / areas.ts など
└── db/                     # Neon用（index.ts / schema.ts）
public/images/category/     # 分類ごとのイメージ画像
scripts/                    # 手元で動かす保守用スクリプト

## Google API 制約（最重要）
- 予算アラート：¥3,000上限（50% / 90% / 100%で通知）
- 1日の収集件数を必ず制限すること
- 絶対禁止：無制限ループでのAPI呼び出し
- APIコスト見積もりなしにバッチを走らせない

## Googleの写真（規約上の制約・最重要）
- Googleの写真は保存禁止（規約）。保存してよいのは場所番号（google_place_id）だけ
- 写真は /api/spot-photo/[id] でその場で取得して表示し、撮影者の名前を必ず出す
- 月の取得上限は環境変数 PHOTO_MONTHLY_CAP（未設定なら850回）。
  回数は Supabase の photo_api_usage テーブルで数える
- 写真がないスポットは public/images/category の分類イメージを表示する
- 写真を保存する一括処理（api/batch の spot-photos / rehost-google-photos / cache-photos）は停止済み。
  **復活させないこと**

## よく使う保守作業
- 場所番号付け：管理画面にログインしたうえで /api/admin/fill-place-ids
  （GET＝確認のみ、POST＝書き込み）
- URL用の名前（slug）付け：`node scripts/backfill-slugs.js --apply`
  （引数なしで確認のみ。既存のslugは --force を付けない限り上書きしない）

## よくあるバグパターン
- DB接続エラー（spots関連） → NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY確認
- DB接続エラー（topics機能） → DATABASE_URL確認（Vercel環境変数設定済み、Neon専用）
- Google Placesデータ取得失敗 → GOOGLE_PLACES_API_KEY確認

## 開発ルール
- 本番DBは直接触らない
- マイグレーション前にスキーマ変更内容を必ず確認
- 変更は必ず作業用ブランチ＋プルリクで出す。mainへのマージ（本番反映）はトワが行う。
  Claude はマージしない

## ローカル開発
cd ~/inutosanin
npm run dev
# Claude Codeで作業する場合
claude

## 作業フロー
- 相談・設計：claude.aiのチャット画面
- 実装・git：Claude Code（ターミナル）で完結させる
- 新セッション開始時：このCLAUDE.mdを読んでから作業開始

## セキュリティルール（最重要・常時遵守）
- Service Role Key、APIキー、パスワードなど機密情報は、
  いかなる場合もコマンドやスクリプトに直接ベタ書きしないこと
- 必ず.envファイルまたは環境変数（os.environ / process.env）経由で
  読み込むこと
- 上記に違反するコマンドを実行しようとした場合は、実行前に必ず
  「これは機密情報を含むため、環境変数経由に変更します」と一言添えて
  から修正版を提示すること

## アイキャッチ画像がNGだった場合の対応手順
noteの下書きチェック時、アイキャッチ画像が使えない（耳や体が切れている、
手足の形が崩れている等）と判断した場合は、以下の手順で対応する。

1. `generate_eyecatch_image` を、該当記事と同じタイトルで再実行し、
   `logs/images/eyecatch.png` を再生成する（Pollinations.aiは無料枠のため、
   気に入る1枚が出るまで何度でも再実行してよい）。
2. 気に入った画像ができたら、デスクトップの `note_eyecatch_candidates`
   フォルダ（なければ作成する）に、現在時刻を含んだファイル名でコピーする
   （例: eyecatch_20260821_0910.png）。
3. note.comの下書き編集画面を開き、既存のアイキャッチ画像を削除してから、
   コピーした新しい画像を手動でアップロード・トリミング確認して下書き保存する
   （この手順のみユーザーが手動で行う）。

※ 記事本文は自動生成されたものをそのまま使ってよい。作り直すのは画像のみ。
