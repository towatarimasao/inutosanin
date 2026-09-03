"""記事生成モジュール（完全無料・新SDK版、見出し画像は扱わない）"""

from pathlib import Path

from google import genai

from logger import get_logger

logger = get_logger(__name__)


class ArticleGenerationError(Exception):
    """記事生成時のエラー"""
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
            response = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
            )
            text = response.text.strip()

            # Geminiの応答は ```json ... ``` のコードブロックに包まれることが
            # あるため、それを取り除いてからJSONとしてパースする
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                if text.lower().startswith("json"):
                    text = text[4:].strip()

            import json

            data = json.loads(text)
            title = str(data.get("title", "")).strip()
            body = str(data.get("body", "")).strip()
            tags = data.get("tags", [])
            if not isinstance(tags, list):
                tags = []

            return {
                "title": title,
                "body": body,
                "tags": tags,
                "source_url": news_item.url,
                "source_title": news_item.title,
            }
        except Exception as e:
            logger.warning(f"記事生成失敗 ({attempt}/{max_retries}回目): {e}")
            if attempt == max_retries:
                raise ArticleGenerationError(f"記事生成に失敗しました: {e}")

