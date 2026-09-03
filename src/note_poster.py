"""Playwrightによるnote下書き保存モジュール

生成された記事をnoteの新規投稿画面に入力し、下書き保存まで行う。
公開ボタンは一切操作しない。

【設計上の注意点（実機検証で判明した事項）】
- note.comはログインフォームにreCAPTCHAを設けており、メール/パスワードによる
  自動ログインは「しばらくたってからもう一度お試し下さい。」で弾かれることが確認された。
  そのため本モジュールではメール/パスワードによる自動ログインを行わず、
  事前に `scripts/note_manual_login.py` で手動ログインして保存した
  Playwrightセッション（storage_state）を再利用する方式のみをサポートする。
  セッションが無効化されている場合はエラーを送出するので、手動ログインをやり直すこと。
- エディタは editor.note.com という別サブドメインで動作しており、
  storage_stateを読み込んだ状態でも editor.note.com へ直接遷移するとCORSエラーで
  読み込みが止まる。note.com のトップページから実際に「投稿」リンクをクリックする
  遷移を経由する必要がある。
- headless=True だとエディタがローディングスピナーのまま止まり操作できないことを確認した
  （Bot検知の可能性がある）。そのため headless=False での実行が必須。
  画面のないサーバーで動かす場合は Xvfb 等の仮想ディスプレイを利用すること。
- ハッシュタグは「公開設定」画面（公開に進むボタンの先）でのみ入力できるが、
  実機検証の結果、下書き保存ではハッシュタグの入力内容が一切保存されないことを確認した
  （ネットワーク監視でも保存系APIが呼ばれていない）。noteの現行UI上、ハッシュタグは
  実際に「投稿する」を押した時にのみ確定される仕様のため、本エージェントの
  「絶対に公開しない」という制約とは両立できない。そのため、ハッシュタグの自動確定は行わず、
  代わりにタグ候補を本文末尾にテキストとして追記する（公開時に人手でハッシュタグ欄へ
  コピーして使うことを想定）。
- 見出し画像の生成・アップロードは行わない（廃止）。note.comのUI変更に対して
  Playwrightのセレクタが壊れやすく、運用コストが見合わなかったため、
  見出し画像は公開時に人手で別途設定する運用に変更した。
"""

from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from logger import get_logger
from models import GeneratedArticle

logger = get_logger(__name__)

SCREENSHOT_DIR = Path(__file__).resolve().parent.parent / "logs"


class NotePostingError(Exception):
    """note操作に失敗した場合の例外"""


def _build_body_with_hashtags(article: GeneratedArticle) -> str:
    """本文末尾にハッシュタグ候補をテキストとして追記する

    noteの下書き保存ではハッシュタグ欄への自動入力が永続化されないため、
    人手で公開する際にコピーして使えるよう本文末尾に候補を残す。
    """
    if not article['tags']:
        return article['body']
    hashtag_line = " ".join(f"#{tag}" for tag in article['tags'])
    return f"{article['body']}\n\n---\n【ハッシュタグ候補（公開時に手動で設定してください）】\n{hashtag_line}"


def save_draft(article: GeneratedArticle, note_config: dict) -> None:
    """記事をnoteの下書きとして保存する（見出し画像は扱わない）

    Args:
        article: 保存する記事
        note_config: settings.yamlのnoteセクション（selectors, url等を含む）
    """
    selectors = note_config["selectors"]
    storage_state_path = Path(note_config["storage_state_path"])

    if not storage_state_path.exists():
        raise NotePostingError(
            f"noteのセッション情報が見つかりません: {storage_state_path} "
            "先に `python scripts/note_manual_login.py` で手動ログインしてください。"
        )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=note_config.get("headless", False))
        context = browser.new_context(storage_state=str(storage_state_path))
        page = context.new_page()

        try:
            page.goto(note_config["home_url"])
            page.wait_for_timeout(2000)

            if "login" in page.url:
                raise NotePostingError(
                    "noteのセッションが無効化されています。"
                    "`python scripts/note_manual_login.py` で再ログインしてください。"
                )

            # editor.note.com へ直接遷移するとCORSエラーで止まるため、
            # トップページの「投稿」リンクを実際にクリックして遷移する
            with page.expect_navigation(timeout=30000):
                page.click(selectors["post_link"])
            page.wait_for_timeout(3000)

            page.fill(selectors["title_input"], article['title'])
            page.click(selectors["body_editor"])
            page.keyboard.type(_build_body_with_hashtags(article))

            page.click(selectors["save_draft_button"])
            page.wait_for_timeout(2000)  # 保存完了を待つ

            logger.info(f"下書き保存に成功しました: {article['title']}")

        except PlaywrightTimeoutError as e:
            screenshot_path = SCREENSHOT_DIR / f"error_{article['title'][:20]}.png"
            page.screenshot(path=str(screenshot_path))
            logger.error(
                f"note操作がタイムアウトしました: {article['title']} - {e} "
                f"スクリーンショット: {screenshot_path}"
            )
            raise NotePostingError(str(e)) from e

        finally:
            context.close()
            browser.close()
