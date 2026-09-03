"""note手動ログイン用スクリプト

noteはログインフォームにreCAPTCHAを設けており、メール/パスワードによる
自動ログインはブロックされることを実機検証で確認済み。
そのため、このスクリプトでブラウザウィンドウを開き、ユーザーが手動でログインした後の
セッション（storage_state）を保存し、note_poster.pyから再利用する。

セッションの有効期限が切れた場合は、このスクリプトを再実行すること。

使い方:
    python scripts/note_manual_login.py
"""

import sys
from pathlib import Path

import yaml
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "config" / "settings.yaml"


def main() -> None:
    with SETTINGS_PATH.open("r", encoding="utf-8") as f:
        settings = yaml.safe_load(f)

    storage_state_path = BASE_DIR / settings["note"]["storage_state_path"]
"""note手動ログイン用スクリプト

noteはログインフォームにreCAPTCHAを設けており、メール/パスワードによる
自動ログインはブロックされることを実機検証で確認済み。
そのため、このスクリプトでブラウザウィンドウを開き、ユーザーが手動でログインした後の
セッション（storage_state）を保存し、note_poster.pyから再利用する。

セッションの有効期限が切れた場合は、このスクリプトを再実行すること。

使い方:
    python scripts/note_manual_login.py
"""

import sys
from pathlib import Path

import yaml
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "config" / "settings.yaml"


def main() -> None:
    with SETTINGS_PATH.open("r", encoding="utf-8") as f:
        settings = yaml.safe_load(f)

    storage_state_path = BASE_DIR / settings["note"]["storage_state_path"]
    storage_state_path.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://note.com/login")
        print("ブラウザウィンドウでnoteに手動ログインしてください（最大10分待機します）...")

        try:
            page.wait_for_url(lambda url: "/login" not in url, timeout=600_000)
        except Exception:
            print("タイムアウトしました。ログインが完了しなかったため終了します。", file=sys.stderr)
            browser.close()
            sys.exit(1)

        # URL遷移直後はまだ本会員セッションが確立していないことがあるため、
        # ページの読み込み安定と、ログイン状態を示す要素が出るまで待つ
        page.wait_for_load_state("networkidle", timeout=30_000)
        page.wait_for_timeout(5000)

        # ページをリロードして、確実に最新のログイン状態を反映させる
        page.reload()
        page.wait_for_load_state("networkidle", timeout=30_000)
        page.wait_for_timeout(3000)

        screenshot_path = storage_state_path.parent / "login_confirm.png"
        page.screenshot(path=str(screenshot_path))
        print(f"ログイン後の画面を保存しました: {screenshot_path}")

        context.storage_state(path=str(storage_state_path))
        print(f"セッションを保存しました: {storage_state_path}")
        print("ブラウザを確認し、正しくログインできていることを目視で確認してください。")
        input("確認できたらEnterキーを押してブラウザを閉じます...")

        browser.close()


if __name__ == "__main__":
    main()
