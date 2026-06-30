@AGENTS.md

# イヌとサンイン (inutosanin)

## プロジェクト概要
- 山陰（鳥取・島根）のイヌ連れスポット情報サイト
- URL: https://www.inutosanin.jp
- GitHub: towatarimasao/inutosanin

## スタック
- Next.js 14 / TypeScript / Tailwind
- Drizzle ORM + Neon PostgreSQL
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
- DB接続エラー → DATABASE_URL確認（Vercel環境変数設定済み）
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
