# dog-note-agent 設計書

## 1. 概要

`dog-note-agent` は、山陰（島根県・鳥取県）の愛犬家向けメディア「イヌとサンイン」の note アカウント向けに、記事の自動生成・下書き保存を行うエージェントである。

犬・ペット関連のニュース RSS から話題を収集し、Google Gemini API を用いて note 向けの記事を生成、Playwright によるブラウザ自動操作で note の下書きとして保存するところまでを自動化する。

**本エージェントは記事を「下書き保存」までを行い、実際の公開（投稿）は人手でのレビュー後に行うことを前提とする。**

## 2. 目的

- 愛犬・ペット関連の最新ニュースをもとにした記事ネタ切れを防ぐ
- 記事執筆の初稿作成にかかる時間を削減する
- 山陰エリア（島根・鳥取）の愛犬家に向けた地域性のある切り口を記事に反映する
- 誤情報や不適切な内容が無編集で公開されないよう、下書き保存までに留める

## 3. 全体構成

```
[RSSフィード群]
      │ 取得
      ▼
┌─────────────────┐
│ RSS Fetcher       │  ニュース記事の一覧（タイトル・URL・要約・公開日）を取得
└─────────────────┘
      │ 記事候補
      ▼
┌─────────────────┐
│ Article Generator │  Gemini API を用いて note 用記事本文・見出し画像を生成
└─────────────────┘
      │ 生成済み記事（タイトル・本文・タグ）＋見出し画像ファイル
      ▼
┌─────────────────┐
│ Note Draft Poster  │  Playwright で note の下書きに、本文・見出し画像・
│                    │  ハッシュタグ候補（本文末尾）を反映して保存
└─────────────────┘
      │
      ▼
  note 下書き一覧に反映
```

## 4. ディレクトリ構成

```
dog-note-agent/
├── spec.md
├── requirements.txt
├── .env.example              # APIキー・note認証情報のテンプレート
├── config/
│   └── settings.yaml         # RSSフィードURL一覧、記事生成のプロンプト設定など
├── src/
│   ├── main.py                # エントリーポイント（一連の処理を実行）
│   ├── rss_fetcher.py         # RSS取得モジュール
│   ├── article_generator.py   # Gemini記事生成モジュール
│   ├── note_poster.py         # Playwright下書き保存モジュール
│   ├── models.py              # 記事候補・生成記事のデータクラス定義
│   └── logger.py              # ロギング設定
├── prompts/
│   └── article_prompt.txt     # Geminiへ渡す記事生成プロンプトテンプレート
├── scripts/
│   ├── note_manual_login.py   # note手動ログイン用スクリプト（セッション保存）
│   └── test_pipeline.py       # 記事生成〜下書き保存の疎通テスト用スクリプト
└── logs/
    ├── images/                 # 生成した見出し画像の一時保存先
    └── .gitkeep
```

## 5. 各モジュール仕様

### 5.1 RSS Fetcher (`rss_fetcher.py`)

- `config/settings.yaml` に登録された複数の RSS フィード URL（犬・ペットニュース、山陰地方ニュース等）から記事一覧を取得する
- `feedparser` を用いてタイトル・URL・要約・公開日時を抽出する
- 直近 N 日以内（設定値、デフォルト 3 日）に公開された記事のみを対象とする
- 過去に処理済みの記事は除外する（記事URLのハッシュ値を `logs/processed.json` 等に保持し重複投稿を防止）
- 出力：`NewsItem` のリスト（`models.py` で定義）

```python
@dataclass
class NewsItem:
    title: str
    url: str
    summary: str
    published_at: datetime
    source: str
```

### 5.2 Article Generator (`article_generator.py`)

- Gemini API（`google-generativeai`）を利用し、`NewsItem` を元に note 記事を生成する
- `prompts/article_prompt.txt` にテンプレートを持ち、下記情報をプロンプトに埋め込む
  - 元ニュースのタイトル・要約・出典URL
  - メディアのトンマナ（「イヌとサンイン」の想定読者：山陰在住の愛犬家、親しみやすく地域密着の語り口）
  - 出力形式（タイトル／リード文／本文（見出し構成）／おすすめタグ）
- 生成結果は JSON 形式でパースし、以下のデータクラスに格納する

```python
@dataclass
class GeneratedArticle:
    title: str
    body: str          # Markdown形式
    tags: list[str]
    source_url: str
```

- Gemini の応答が期待する JSON 形式でない場合はリトライ（最大3回）し、それでも失敗した場合は当該記事をスキップしログに記録する
- 生成物には「AIが生成した下書きであり、公開前に必ず人手で確認・編集すること」を示す内部メモを付与する（note本文には含めない）

**見出し画像の生成**

- 生成した記事タイトル・本文をもとに、Gemini本体の画像生成モデル
  （`gemini-2.5-flash-image` などのNano Banana系モデル）を `generate_content` 経由で呼び出し、
  見出し画像を生成する
  - Google AI StudioのImagen専用API（Vertex AI経由）ではなく、
    APIキーだけで手軽に呼び出せるGemini本体の画像生成機能を採用した
  - プロンプトには記事タイトル・本文冒頭・「犬を構図に含める」「文字やロゴを入れない」
    「横長（16:9程度）」といった条件を含める
- 生成した画像は `logs/images/` に記事タイトルをスラッグ化したファイル名で保存する
- 画像生成に失敗した場合も記事生成自体は失敗させず、画像なしで下書き保存に進む
  （`ImageGenerationError` を送出し、呼び出し側でログに警告を出して続行する）

### 5.3 Note Draft Poster (`note_poster.py`)

- Playwright（Chromium）で note の記事エディタを開いて下書き保存を行う
- 処理の流れ：
  1. `scripts/note_manual_login.py` で事前に手動ログインして保存したセッション
     （`logs/note_session.json`）を読み込む
  2. note.com のトップページを開き、「投稿」リンクを実際にクリックしてエディタへ遷移する
  3. 見出し画像が渡されていれば、「画像を追加」→「画像をアップロード」→
     ファイル選択→トリミングモーダルの「保存」の順でアップロードする
  4. タイトルを入力する
  5. 本文と、末尾に追記したハッシュタグ候補テキストを入力する（下記「ハッシュタグの扱い」参照）
  6. 「下書き保存」ボタンをクリックし、保存を確認する
  7. 保存できたことをログに記録し、`processed.json` に元記事URLを追記する
- note の UI 変更に備え、セレクタは `config/settings.yaml` から差し替え可能にする

**ハッシュタグの扱い（実機検証の結果、自動確定は不採用）**

- note のハッシュタグ入力欄は「公開設定」画面（「公開に進む」の先）にのみ存在する
- 実機検証の結果、ハッシュタグをそこで入力・確定しても、下書き保存では一切永続化されない
  （ネットワーク監視でも保存系APIが呼ばれないことを確認済み）ことが判明した
  - note の現行UIでは、ハッシュタグは実際に「投稿する」（公開）を押した時にのみ確定される仕様
  - 本エージェントは「絶対に公開ボタンを押さない」制約があるため、ハッシュタグ欄への
    自動入力・確定は行わない設計とした
- 代わりに、Geminiが生成したタグ（`article.tags`）を本文末尾に
  「【ハッシュタグ候補（公開時に手動で設定してください）】」という注記付きで
  テキストとして追記する。人手で公開する際にこの候補をハッシュタグ欄へコピーして使う想定

**【実機検証で判明した制約事項】**

- **自動ログイン不可**: note.com のログインフォームには reCAPTCHA があり、
  メール／パスワードによる Playwright での自動ログインは
  「しばらくたってからもう一度お試し下さい。」というメッセージでブロックされることを確認した。
  そのため本エージェントは自動ログインを行わず、`scripts/note_manual_login.py` で
  人手による初回ログイン→セッション保存→以降はセッション再利用、という設計にしている。
  セッションが失効した場合は同スクリプトを再実行する。
- **editor.note.com への直接遷移不可**: エディタは `editor.note.com` という別サブドメインで
  動作しており、保存済みセッションを使っていても同URLへ直接 `goto` するとCORSエラーで
  読み込みが止まる。note.com のトップページから「投稿」リンクを実際にクリックする遷移を
  経由する必要がある。
- **ヘッドレスモード不可**: `headless: true` で起動するとエディタがローディングスピナーの
  まま止まり操作できないことを確認した（Bot検知の可能性がある）。そのため
  `headless: false` での実行が必須。画面のないサーバーで動かす場合は、Bot検知回避を目的
  とした細工ではなく、実ブラウザをそのまま表示するための仮想ディスプレイ（Xvfb等）の利用を
  想定する。

### 5.4 main.py（処理フロー）

1. 設定ファイル（`config/settings.yaml`）と `.env` を読み込む
2. RSS Fetcher で新着ニュースを取得
3. 未処理の記事について、Article Generator で記事を生成
4. 生成した記事をもとに Article Generator で見出し画像を生成（失敗しても画像なしで続行）
5. 生成した記事と見出し画像を Note Draft Poster で下書き保存
6. 処理結果（成功・失敗件数、スキップ件数）をログに出力

## 6. 設定ファイル

### `.env.example`

```
GEMINI_API_KEY=
```

note のログイン情報は reCAPTCHA により自動ログインができないため環境変数では扱わない。
`scripts/note_manual_login.py` で手動ログインし、セッションを保存する。

### `config/settings.yaml`（例）

```yaml
rss_feeds:
  - name: "犬・ペットニュース"
    url: "https://example.com/pet-news/rss"   # TODO: 実際のRSS URLに差し替える
  - name: "山陰地方ニュース"
    url: "https://example.com/sanin-news/rss" # TODO: 実際のRSS URLに差し替える

fetch:
  days_back: 3

generation:
  model: "gemini-flash-latest"
  max_retries: 3
  image_model: "gemini-2.5-flash-image"
  image_save_dir: "logs/images"

note:
  draft_only: true
  headless: false   # true不可（5.3節参照）
```

## 7. エラーハンドリング・ロギング

- 各モジュールの処理は例外を握りつぶさず、`logger.py` で標準出力とログファイル（`logs/`）の両方に記録する
- Gemini API のレート制限・エラー時は指数バックオフでリトライする
- Playwright 操作で要素が見つからない場合はスクリーンショットを `logs/` に保存し、原因調査を容易にする
- note へのログイン失敗が続く場合は処理を中断し、通知（将来的にSlack通知等を想定）を行う

## 8. セキュリティ・運用上の注意

- `.env` は Git 管理対象外とする（`.gitignore` に追加）
- `logs/note_session.json`（noteログインセッション）も認証情報に準じる機密情報のため、
  Git 管理対象外とする
- 生成記事は必ず人手でのレビュー・編集を経てから公開する運用とする（本エージェントは公開ボタンを操作しない）

## 9. 定期実行（GitHub Actions）

`.github/workflows/daily_note_draft.yml` により、毎日 日本時間 7:00（UTC 22:00）に
`python src/main.py` を自動実行する。

### 9.1 ワークフローの処理内容

1. リポジトリをチェックアウトし、Python 3.11 と依存パッケージをセットアップする
2. `playwright install --with-deps chromium` で Chromium 本体を導入する
3. `apt-get install xvfb` で Xvfb（仮想ディスプレイ）を導入する
4. `Xvfb :99 -screen 0 1280x1024x24 &` をバックグラウンドで起動し、
   `DISPLAY=:99` を後続ステップに引き継ぐ
   - 画面のない CI 環境でも、5.3節で述べた「`headless: true` 不可」という制約に
     対応するため、実ブラウザを仮想ディスプレイ上で表示させて動かす
5. Secret `NOTE_SESSION_STATE_BASE64` を base64 デコードし、
   `logs/note_session.json` として復元する
6. `GEMINI_API_KEY` を環境変数として渡し、`python src/main.py` を実行する
7. 失敗時は `logs/*.log` と `logs/*.png`（エラー時スクリーンショット）を
   アーティファクトとして保存し、原因調査できるようにする

### 9.2 事前に必要なGitHub側の設定

リポジトリの Settings → Secrets and variables → Actions で以下を登録する。

| Secret名 | 内容 |
|---|---|
| `GEMINI_API_KEY` | Gemini APIキー |
| `NOTE_SESSION_STATE_BASE64` | `logs/note_session.json` をbase64エンコードした文字列 |

`NOTE_SESSION_STATE_BASE64` は、手元で下記を実行して生成する。

```bash
python scripts/note_manual_login.py   # ブラウザで手動ログインし、logs/note_session.jsonを生成
base64 -i logs/note_session.json | pbcopy   # macOSの場合。クリップボードにコピーされる
```

コピーした値を `NOTE_SESSION_STATE_BASE64` としてSecretに貼り付ける
（既存のSecretを更新する場合は上書きでよい）。

### 9.3 セッション失効時の運用（重要）

noteのログインセッションには有効期限があり、失効すると
`save_draft()` が「noteのセッションが無効化されています」というエラーで失敗し、
ワークフローが失敗するようになる。

その場合の対応手順：

1. GitHub Actionsの実行結果（失敗通知・Actionsタブ）で失敗に気づく
2. 手元で `python scripts/note_manual_login.py` を再実行し、
   ブラウザウィンドウで note に手動ログインする
3. 9.2節の手順で `logs/note_session.json` を再度base64化する
4. リポジトリの Secret `NOTE_SESSION_STATE_BASE64` を新しい値で更新する
5. 必要であれば Actions タブから `workflow_dispatch` で手動再実行し、
   正常に下書き保存できることを確認する

このセッション更新は自動化できない（reCAPTCHAのため）ため、
定期的な手動メンテナンス作業として運用に組み込む必要がある。

## 10. 今後の拡張（本バージョンのスコープ外）

- Slack 等への処理結果通知（GitHub Actions失敗時の通知含む）
- 複数メディアアカウントへの対応
- noteセッション失効の自動検知・通知
- note のUI変更でハッシュタグが下書き保存時にも永続化されるようになった場合の
  自動確定対応（現状は本文末尾へのテキスト追記で代替）
