@AGENTS.md

# イヌとサンイン (inutosanin)

## プロジェクト概要
- 山陰（鳥取・島根）のイヌ連れスポット情報サイト
- URL: https://www.inutosanin.jp
- GitHub: towatarimasao/inutosanin

## スタック
- Next.js 14 / TypeScript / Tailwind
- DB: Supabase（spots関連の全機能）、Drizzle ORM + Neon PostgreSQL（topics機能のみ）
- 注：src/db/schema.tsのspotsテーブル定義はデッドコード（未参照）
- Vercel（ホスティング）
- Google Places API
- 環境変数：DATABASE_URL / GOOGLE_PLACES_API_KEY（Vercel設定済み）

## ディレクトリ構成
src/
├── app/
│   ├── about/
│   ├── topics/        # Note.com RSSコンテンツ
│   ├── layout.tsx
│   ├── page.tsx
│   ├── sitemap.ts
│   └── robots.ts
└── db/
    ├── index.ts
    └── schema.ts

## Google API 制約（最重要）
- 予算アラート：¥3,000上限（50% / 90% / 100%で通知）
- 7/1〜データ収集開始予定
- 1日の収集件数を必ず制限すること
- 絶対禁止：無制限ループでのAPI呼び出し
- APIコスト見積もりなしにバッチを走らせない

## よくあるバグパターン
- DB接続エラー（spots関連） → NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY確認
- DB接続エラー（topics機能） → DATABASE_URL確認（Vercel環境変数設定済み、Neon専用）
- Google Placesデータ取得失敗 → GOOGLE_PLACES_API_KEY確認

## 開発ルール
- 本番DBは直接触らない
- マイグレーション前にスキーマ変更内容を必ず確認

## 現在の残タスク
- GSCサイトマップ確認
- favicon設定
- Instagramアカウント作成（@inuto_sanin）
- スポット一覧ページUIの実装
- Google Places APIデータ収集（7/1〜）

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
