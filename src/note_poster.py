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
- 2026/09/15、生成された本文自体は正常（100文字以上）だったにもかかわらず、
  `page.keyboard.type()` でエディタに入力した内容が反映されず、本文が空のまま
  下書き保存されてしまう事象が発生した。保存ボタンを押す前にエディタへ実際に反映された
  文字数を検証するガードを追加した。
- 2026/09/16、上記ガードの実装が原因で今度は実行自体がクラッシュする事象が発生した。
  note.com側に新しく「AIアシスタント」パネルが追加されており、そのパネルのdivが
  本文エディタと同じCSSクラス（note-common-styles__textnote-body）を持っていたため、
  `page.locator(selectors["body_editor"])` が2要素にヒットしてPlaywrightの
  strict modeエラーで例外が発生し、キャッチされずにスクリプト全体が異常終了していた
  （下書き保存の前段階でクラッシュするため、タイトルすら保存されない）。
  そのため body_editor セレクタに `[contenteditable="true"]` を追加して
  実際の編集可能領域のみに絞り込み、あわせてガード処理全体を例外セーフにした
  （想定外の例外が起きても、握りつぶさずNotePostingErrorとして扱いスキップする）。
"""

from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from logger import get_logger
from models import GeneratedArticle

logger = get_logger(__name__)

SCREENSHOT_DIR = Path(__file__).resolve().parent.parent / "logs"

# エディタへの入力反映チェック：実際に反映された文字数が
# 想定本文の何割未満なら「入力が反映されていない」とみなすか
BODY_REFLECTION_RATIO_THRESHOLD = 0.5


class NotePostingError(Exception):
    """note操作に失敗した場合の例外"""


def _build_body_with_hashtags(article: GeneratedArticle, site_link: "dict | None" = None) -> str:
    """本文末尾に「サイト誘導文＋URL」とハッシュタグ候補をテキストとして追記する

    並び順は「本文 → サイト誘導文＋URL → ハッシュタグ候補」で固定。
    （2026/10/29 トワさん指示：全記事で、ハッシュタグの前にサイトURLとリード文を入れる）

    noteの下書き保存ではハッシュタグ欄への自動入力が永続化されないため、
    人手で公開する際にコピーして使えるよう本文末尾に候補を残す。
    """
    parts = [article['body'].rstrip()]

    if site_link and site_link.get("url"):
        lead = (site_link.get("lead") or "").strip()
        block = f"{lead}\n{site_link['url']}" if lead else site_link['url']
        parts.append(block)

    if article['tags']:
        hashtag_line = " ".join(f"#{tag}" for tag in article['tags'])
        parts.append(f"---\n【ハッシュタグ候補（公開時に手動で設定してください）】\n{hashtag_line}")

    return "\n\n".join(parts)


def _wait_for_link_card(page, editor_selector: str, url: str, timeout_ms: int = 20000) -> None:
    """URLがnoteのリンクカード（埋め込み）に変換され、表示されるまで待つ

    待っても変換されない場合は警告ログを出して先へ進む（下書き保存自体は止めない）。
    """
    domain = url.split("//")[-1].split("/")[0]
    script = """([sel, domain]) => {
        const ed = document.querySelector(sel);
        if (!ed) return false;
        for (const el of ed.querySelectorAll('figure, iframe, [data-src], [embedded-service]')) {
            if (el.outerHTML.includes(domain)) return true;
        }
        return false;
    }"""
    try:
        page.wait_for_function(script, arg=[editor_selector, domain], timeout=timeout_ms)
        page.wait_for_timeout(3000)  # カード内の画像・タイトル読み込み待ち
        logger.info("サイト誘導のリンクカード表示を確認しました")
    except Exception:  # noqa: BLE001
        logger.warning("サイト誘導URLがリンクカードに変換されませんでした（下書きは保存を続行）")


def _dismiss_modals(page, max_rounds: int = 3) -> None:
    """note.comのお祝い・お知らせ等のモーダルがあれば閉じる

    2026/09/28以降、「スキ○回おめでとう」等のモーダルがトップに出て
    「投稿」リンクのクリックを塞ぎ、タイムアウトする事象が断続的に発生した。
    """
    modal = page.locator("div[data-name='modal']")
    for _ in range(max_rounds):
        if modal.count() == 0:
            return
        logger.info("noteのモーダルを検出したため閉じます")
        page.keyboard.press("Escape")
        page.wait_for_timeout(800)
        if modal.count() == 0:
            return
        for sel in ("[data-name='modal'] button[aria-label*='閉じる']",
                    "[data-name='modal'] button[aria-label*='close' i]",
                    "[data-name='modal'] button"):
            btn = page.locator(sel)
            if btn.count() > 0:
                try:
                    btn.first.click(timeout=3000)
                    break
                except Exception:  # noqa: BLE001
                    continue
        page.wait_for_timeout(800)
    if modal.count() > 0:
        # 最後の手段：DOMから取り除く
        page.evaluate("document.querySelectorAll(\"div[data-name='modal']\").forEach(e => e.remove())")


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

            _dismiss_modals(page)

            # editor.note.com へ直接遷移するとCORSエラーで止まるため、
            # トップページの「投稿」リンクを実際にクリックして遷移する
            with page.expect_navigation(timeout=30000):
                page.click(selectors["post_link"])
            page.wait_for_timeout(3000)

            page.fill(selectors["title_input"], article['title'])
            page.click(selectors["body_editor"])

            site_link = note_config.get("site_link")
            body_text = _build_body_with_hashtags(article, site_link)

            if site_link and site_link.get("url") and article['tags']:
                # 2026/10/31：URLを入れた直後に続けて入力・保存すると、noteがURLを
                # リンクカードに変換している途中で保存され、カード部分が空白になる
                # 事象が発生した。そのため「本文＋誘導文＋URL」まで入力したら
                # カードが表示されるのを待ってから、ハッシュタグ候補を入力する。
                tag_block = _build_body_with_hashtags({**article, 'body': ''}, None).strip()
                head_text = body_text[: len(body_text) - len(tag_block)].rstrip()
                page.keyboard.type(head_text)
                page.keyboard.press("Enter")
                _wait_for_link_card(page, selectors["body_editor"], site_link["url"])
                page.keyboard.type(tag_block)
            else:
                page.keyboard.type(body_text)
                if site_link and site_link.get("url"):
                    _wait_for_link_card(page, selectors["body_editor"], site_link["url"])
            page.wait_for_timeout(2000)

            # 本文が実際にエディタへ反映されたかを、保存前に検証する。
            # 生成された本文（article['body']）自体は正常でも、エディタの
            # フォーカス喪失やnote.com側のUI変更によって入力が反映されず、
            # 本文が空のまま「保存成功」になってしまう事象が確認されたため。
            # この検証自体が想定外の例外（note.com側のDOM構造変化など）で
            # 落ちてもスクリプト全体をクラッシュさせないよう、ここだけ広めに捕捉する。
            try:
                actual_text = page.locator(selectors["body_editor"]).inner_text().strip()
            except Exception as verify_error:  # noqa: BLE001
                screenshot_path = SCREENSHOT_DIR / f"error_verify_failed_{article['title'][:20]}.png"
                page.screenshot(path=str(screenshot_path))
                raise NotePostingError(
                    f"本文反映の検証中に予期しないエラーが発生しました: {verify_error} "
                    f"スクリーンショット: {screenshot_path}"
                ) from verify_error

            expected_len = len(body_text)
            actual_len = len(actual_text)
            if expected_len > 0 and actual_len < expected_len * BODY_REFLECTION_RATIO_THRESHOLD:
                screenshot_path = SCREENSHOT_DIR / f"error_empty_body_{article['title'][:20]}.png"
                page.screenshot(path=str(screenshot_path))
                raise NotePostingError(
                    f"本文がエディタに正しく反映されていません"
                    f"（想定{expected_len}文字 / 実際の反映{actual_len}文字）。"
                    f"下書き保存を中止しました。スクリーンショット: {screenshot_path}"
                )

            page.click(selectors["save_draft_button"])
            page.wait_for_timeout(2000)  # 保存完了を待つ

            logger.info(f"下書き保存に成功しました: {article['title']}")

        except NotePostingError:
            raise

        except PlaywrightTimeoutError as e:
            screenshot_path = SCREENSHOT_DIR / f"error_{article['title'][:20]}.png"
            page.screenshot(path=str(screenshot_path))
            logger.error(
                f"note操作がタイムアウトしました: {article['title']} - {e} "
                f"スクリーンショット: {screenshot_path}"
            )
            raise NotePostingError(str(e)) from e

        except Exception as e:  # noqa: BLE001
            # 2026/09/16、想定していなかった例外（Playwrightのstrict mode違反など）が
            # ここで捕捉されずスクリプト全体をクラッシュさせ、タイトルすら保存されない
            # まま実行が終了する事象が発生した。今後同種の想定外エラーが起きても、
            # 必ずNotePostingErrorとしてスキップ扱いにできるよう最終防波堤を置く。
            screenshot_path = SCREENSHOT_DIR / f"error_unexpected_{article['title'][:20]}.png"
            try:
                page.screenshot(path=str(screenshot_path))
            except Exception:  # noqa: BLE001
                pass
            logger.error(
                f"note操作で想定外のエラーが発生しました: {article['title']} - {e} "
                f"スクリーンショット: {screenshot_path}"
            )
            raise NotePostingError(str(e)) from e

        finally:
            context.close()
            browser.close()
