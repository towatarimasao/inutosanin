"""記事生成モジュール（完全無料・新SDK版、見出し画像は扱わない）"""

from pathlib import Path

from google import genai

from logger import get_logger

logger = get_logger(__name__)

# 本文がこの文字数未満の場合は「生成失敗」とみなしてリトライ・スキップする。
# 2026/09/15、Geminiが構文的には正しいJSONを返しつつ body が空文字になり、
# 本文なしの下書きがそのままnoteに保存される不具合が発生したため導入。
MIN_BODY_LENGTH = 100


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
                model=model_name,
                contents=prompt,
            )
            text = (response.text or "").strip()

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

            # タイトル・本文が空、または本文が極端に短い場合は
            # 「JSONとしては正しいが中身が空」の不良応答とみなし、失敗扱いにする。
            if not title or not body or len(body) < MIN_BODY_LENGTH:
                finish_reason = None
                try:
                    finish_reason = response.candidates[0].finish_reason
                except Exception:
                    pass
                raise ArticleGenerationError(
                    f"生成結果が不十分です（title_len={len(title)}, "
                    f"body_len={len(body)}, finish_reason={finish_reason}）"
                )

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
