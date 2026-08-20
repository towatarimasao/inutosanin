"""記事および見出し画像の生成モジュール（完全無料・新SDK版）"""

import urllib.parse
from pathlib import Path
import requests
from google import genai

from logger import get_logger

logger = get_logger(__name__)


class ArticleGenerationError(Exception):
    """記事生成時のエラー"""
    pass


class ImageGenerationError(Exception):
    """画像生成時のエラー"""
    pass


def generate_article(
    news_item,
    api_key: str,
    model_name: str,
    prompt_template_path: Path,
    media_name: str,
    media_description: str,
    max_retries: int = 3,
) -> dict:
    """Gemini無料枠（新SDK）を使用して記事本文とタイトルを生成する"""
    client = genai.Client(api_key=api_key)

    with open(prompt_template_path, "r", encoding="utf-8") as f:
        template = f.read()

    prompt = template.format(
        media_name=media_name,
        media_description=media_description,
        title=news_item.title,
        news_title=news_item.title,
        summary=news_item.summary,
        news_summary=news_item.summary,
        url=news_item.url,
        news_url=news_item.url,
    )

    for attempt in range(1, max_retries + 1):
        try:
            # 正常に認識される gemini-3.6-flash を直接指定
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
            text = response.text.strip()

            lines = text.split("\n")
            title = lines[0].replace("タイトル：", "").replace("#", "").strip()
            body = "\n".join(lines[1:]).strip()

            return {
                "title": title,
                "body": body,
                "source_url": news_item.url,
                "source_title": news_item.title,
            }
        except Exception as e:
            logger.warning(f"記事生成失敗 ({attempt}/{max_retries}回目): {e}")
            if attempt == max_retries:
                raise ArticleGenerationError(f"記事生成に失敗しました: {e}")


def generate_eyecatch_image(
    article: dict,
    api_key: str,
    image_model_name: str,
    media_description: str,
    save_dir: Path,
) -> Path:
    """Pollinations.ai（完全無料API）を使用してアイキャッチ画像を生成・保存する"""
    save_dir.mkdir(parents=True, exist_ok=True)
    image_path = save_dir / "eyecatch.png"

    try:
        prompt_keywords = f"Cute dog in Japan, style illustration, {article['title'][:20]}"
        encoded_prompt = urllib.parse.quote(prompt_keywords)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1200&height=630&nologo=true"

        logger.info("Pollinations.ai (無料画像API) にて画像を取得中...")
        res = requests.get(image_url, timeout=30)

        if res.status_code == 200:
            with open(image_path, "wb") as f:
                f.write(res.content)
            logger.info(f"見出し画像を無料取得・保存しました: {image_path}")
            return image_path
        else:
            raise ImageGenerationError(f"画像取得ステータスエラー: {res.status_code}")

    except Exception as e:
        logger.error(f"無料画像生成エラー: {e}")
        raise ImageGenerationError(e)
