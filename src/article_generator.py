"""記事および見出し画像の生成モジュール（完全無料・新SDK版）"""

import random
import urllib.parse
from io import BytesIO
from pathlib import Path
import requests
from google import genai
from PIL import Image

from logger import get_logger

logger = get_logger(__name__)

# note.comの推奨アイキャッチ比率（横1200 x 縦630）
NOTE_EYECATCH_WIDTH = 1200
NOTE_EYECATCH_HEIGHT = 630
# 生成時は歪みを避けるため正方形（長辺基準）で作らせる
SQUARE_SIZE = NOTE_EYECATCH_WIDTH


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
        prompt_keywords = (
            f"Cute dog in Japan, warm hand-drawn illustration style, {article['title'][:20]}, "
            "San'in coastal landscape with sea and sandy beach in background, "
            "bright warm color palette, gentle storybook illustration, "
            "full body shot, small subject in frame, centered, "
            "lots of headroom and empty space around, wide angle, "
            "no text, no logo, no signage"
        )
        encoded_prompt = urllib.parse.quote(prompt_keywords)
        seed = random.randint(0, 2**31 - 1)
        image_url = (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?width={SQUARE_SIZE}&height={SQUARE_SIZE}&nologo=true&seed={seed}"
        )

        logger.info("Pollinations.ai (無料画像API) にて正方形画像を取得中...")
        res = requests.get(image_url, timeout=30)

        if res.status_code != 200:
            raise ImageGenerationError(f"画像取得ステータスエラー: {res.status_code}")

        square_image = Image.open(BytesIO(res.content)).convert("RGB")

        # Pollinations.aiの無料枠はwidth/height指定を無視し、
        # 768x768等の別サイズで返すことがあるため、
        # クロップ前に指定サイズの正方形へ揃える
        if square_image.size != (SQUARE_SIZE, SQUARE_SIZE):
            square_image = square_image.resize(
                (SQUARE_SIZE, SQUARE_SIZE), Image.LANCZOS
            )

        # 中央ではなく、やや上寄り（画像上部から25%の位置を基準）にクロップする。
        # 動物の顔・耳は画像上部に来やすいため、中央クロップだと耳が切れやすい。
        crop_bias = 0.25  # 0.0=一番上から切る、0.5=中央（元の挙動）
        left = 0
        top = int((square_image.height - NOTE_EYECATCH_HEIGHT) * crop_bias)
        right = square_image.width
        bottom = top + NOTE_EYECATCH_HEIGHT
        cropped_image = square_image.crop((left, top, right, bottom))

        cropped_image.save(image_path, format="PNG")
        logger.info(f"見出し画像を正方形生成→中央クロップして保存しました: {image_path}")
        return image_path

    except Exception as e:
        logger.error(f"無料画像生成エラー: {e}")
        raise ImageGenerationError(e)
