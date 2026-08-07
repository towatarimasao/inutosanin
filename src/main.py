"""dog-note-agent エントリーポイント

RSS取得 → Gemini記事生成 → note下書き保存 の一連の処理を実行する。
"""

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

from article_generator import (
    ArticleGenerationError,
    ImageGenerationError,
    generate_article,
    generate_eyecatch_image,
)
from logger import get_logger
from note_poster import NotePostingError, save_draft
from rss_fetcher import fetch_news_items, mark_as_processed

logger = get_logger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "config" / "settings.yaml"


def load_settings() -> dict:
    with SETTINGS_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main() -> None:
    load_dotenv(BASE_DIR / ".env")
    settings = load_settings()

    gemini_api_key = os.environ.get("GEMINI_API_KEY")

    if not gemini_api_key:
        logger.error("GEMINI_API_KEYが設定されていません。.envの設定を確認してください。")
        return

    fetch_config = settings["fetch"]
    generation_config = settings["generation"]
    note_config = settings["note"]

    processed_log_path = BASE_DIR / fetch_config["processed_log"]
    prompt_template_path = BASE_DIR / generation_config["prompt_template"]

    news_items = fetch_news_items(
        feeds=settings["rss_feeds"],
        days_back=fetch_config["days_back"],
        processed_log_path=processed_log_path,
    )

    # ★ 1回の実行で処理する上限数を設定ファイルから取得（デフォルトは最大1件）
    max_articles = fetch_config.get("max_articles", 1)
    if max_articles and len(news_items) > max_articles:
        logger.info(f"対象記事 {len(news_items)} 件のうち、上限の {max_articles} 件のみ処理します。")
        news_items = news_items[:max_articles]

    success_count = 0
    skip_count = 0

    for news_item in news_items:
        try:
            article = generate_article(
                news_item=news_item,
                api_key=gemini_api_key,
                model_name=generation_config["model"],
                prompt_template_path=prompt_template_path,
                media_name=generation_config["media_name"],
                media_description=generation_config["media_description"],
                max_retries=generation_config["max_retries"],
            )
        except ArticleGenerationError as e:
            logger.error(f"記事生成をスキップしました: {e}")
            skip_count += 1
            continue

        image_path = None
        try:
            image_path = generate_eyecatch_image(
                article=article,
                api_key=gemini_api_key,
                image_model_name=generation_config["image_model"],
                media_description=generation_config["media_description"],
                save_dir=BASE_DIR / generation_config["image_save_dir"],
            )
        except ImageGenerationError as e:
            logger.warning(f"見出し画像の生成に失敗したため、画像なしで下書き保存を続行します: {e}")

        try:
            save_draft(article=article, note_config=note_config, image_path=image_path)
        except NotePostingError as e:
            logger.error(f"下書き保存をスキップしました: {e}")
            skip_count += 1
            continue

        mark_as_processed(news_item.url, processed_log_path)
        success_count += 1

    logger.info(
        f"処理完了: 成功 {success_count} 件 / スキップ {skip_count} 件 / "
        f"対象 {len(news_items)} 件"
    )


if __name__ == "__main__":
    main()