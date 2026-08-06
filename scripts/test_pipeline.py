"""Gemini記事生成 → note下書き保存の連続テスト用スクリプト

RSSフィードが未設定（プレースホルダー）のため、RSS取得の代わりにダミーの
NewsItemを1件用意し、Article Generator と Note Draft Poster の疎通を確認する。

使い方:
    python scripts/test_pipeline.py
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from article_generator import (
    ArticleGenerationError,
    ImageGenerationError,
    generate_article,
    generate_eyecatch_image,
)
from models import NewsItem
from note_poster import NotePostingError, save_draft

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "config" / "settings.yaml"


def main() -> None:
    load_dotenv(BASE_DIR / ".env")
    with SETTINGS_PATH.open("r", encoding="utf-8") as f:
        settings = yaml.safe_load(f)

    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        print("GEMINI_API_KEYが設定されていません。", file=sys.stderr)
        sys.exit(1)

    generation_config = settings["generation"]
    note_config = settings["note"]
    prompt_template_path = BASE_DIR / generation_config["prompt_template"]

    dummy_news = NewsItem(
        title="松江市で愛犬同伴OKのドッグカフェが新規オープン",
        url="https://example.com/news/dummy-dog-cafe-matsue",
        summary=(
            "島根県松江市に、愛犬と一緒にくつろげる新しいドッグカフェがオープンした。"
            "広々としたドッグランを併設し、地元食材を使ったフードメニューも提供する。"
        ),
        published_at=datetime.now(timezone.utc),
        source="テスト用ダミーニュース",
    )

    print("=== 記事生成テスト開始 ===")
    try:
        article = generate_article(
            news_item=dummy_news,
            api_key=gemini_api_key,
            model_name=generation_config["model"],
            prompt_template_path=prompt_template_path,
            media_name=generation_config["media_name"],
            media_description=generation_config["media_description"],
            max_retries=generation_config["max_retries"],
        )
    except ArticleGenerationError as e:
        print(f"記事生成に失敗しました: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"タイトル: {article.title}")
    print(f"タグ: {article.tags}")
    print(f"本文文字数: {len(article.body)}")
    print("--- 本文プレビュー（先頭200文字） ---")
    print(article.body[:200])

    print("\n=== 見出し画像生成テスト開始 ===")
    image_path = None
    try:
        image_path = generate_eyecatch_image(
            article=article,
            api_key=gemini_api_key,
            image_model_name=generation_config["image_model"],
            media_description=generation_config["media_description"],
            save_dir=BASE_DIR / generation_config["image_save_dir"],
        )
        print(f"画像を生成しました: {image_path}")
    except ImageGenerationError as e:
        print(f"画像生成に失敗しました（画像なしで続行します）: {e}", file=sys.stderr)

    print("\n=== note下書き保存テスト開始 ===")
    try:
        save_draft(article=article, note_config=note_config, image_path=image_path)
    except NotePostingError as e:
        print(f"下書き保存に失敗しました: {e}", file=sys.stderr)
        sys.exit(1)

    print("下書き保存に成功しました。noteの下書き一覧を確認してください。")


if __name__ == "__main__":
    main()
