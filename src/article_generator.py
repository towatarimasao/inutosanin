"""Gemini記事生成モジュール

NewsItemを元にGemini APIへプロンプトを送り、note向け記事を生成する。
また、生成した記事の内容をもとに見出し画像も生成する。

【画像生成についての注意】
Google AI StudioのImagenモデル（Vertex AI経由）ではなく、Gemini本体の
画像生成機能（例: gemini-2.5-flash-image。いわゆるNano Banana系モデル）を
`google-generativeai` の `generate_content` 経由で利用している。
Imagen専用APIより手軽にAPIキーだけで呼び出せるため、こちらを採用した。
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

import google.generativeai as genai

from logger import get_logger
from models import GeneratedArticle, NewsItem

logger = get_logger(__name__)


class ArticleGenerationError(Exception):
    """記事生成に失敗した場合の例外"""


class ImageGenerationError(Exception):
    """見出し画像生成に失敗した場合の例外"""


def _load_prompt_template(prompt_template_path: Path) -> str:
    with prompt_template_path.open("r", encoding="utf-8") as f:
        return f.read()


def _build_prompt(
    template: str,
    news_item: NewsItem,
    media_name: str,
    media_description: str,
) -> str:
    return template.format(
        media_name=media_name,
        media_description=media_description,
        news_title=news_item.title,
        news_summary=news_item.summary,
        news_url=news_item.url,
    )


def _extract_json(raw_text: str) -> dict:
    """Geminiの応答からJSON部分を抽出してパースする

    コードブロック（```json ... ```）で囲まれている場合にも対応する。
    """
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[len("json"):]
        text = text.strip()
    return json.loads(text)


def generate_article(
    news_item: NewsItem,
    api_key: str,
    model_name: str,
    prompt_template_path: Path,
    media_name: str,
    media_description: str,
    max_retries: int = 3,
) -> GeneratedArticle:
    """1件のニュースから note 記事を生成する

    Gemini応答が期待するJSON形式でない場合はリトライし、
    max_retries回失敗した場合は ArticleGenerationError を送出する。
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    template = _load_prompt_template(prompt_template_path)
    prompt = _build_prompt(template, news_item, media_name, media_description)

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            response = model.generate_content(prompt)
            data = _extract_json(response.text)
            return GeneratedArticle(
                title=data["title"],
                body=data["body"],
                tags=data.get("tags", []),
                source_url=news_item.url,
            )
        except (json.JSONDecodeError, KeyError) as e:
            last_error = e
            logger.warning(
                f"記事生成のJSON解析に失敗しました（{attempt}/{max_retries}回目）: {news_item.title} - {e}"
            )
        except Exception as e:  # Gemini API側のエラー（レート制限等）
            last_error = e
            wait_seconds = 2 ** attempt
            logger.warning(
                f"Gemini API呼び出しに失敗しました（{attempt}/{max_retries}回目）: {e} "
                f"{wait_seconds}秒後にリトライします"
            )
            time.sleep(wait_seconds)

    raise ArticleGenerationError(
        f"記事生成に失敗しました: {news_item.title} - {last_error}"
    )


def _build_image_prompt(article: GeneratedArticle, media_description: str) -> str:
    return (
        f"以下のnote記事の見出し画像（アイキャッチ）として使うイラストを生成してください。\n\n"
        f"記事タイトル: {article.title}\n"
        f"記事の要約: {article.body[:300]}\n\n"
        f"条件:\n"
        f"- {media_description}向けの記事であることが伝わる、温かみのあるイラスト調\n"
        f"- 犬（愛犬）が写っている構図にすること\n"
        f"- 横長（16:9程度）の構図\n"
        f"- 文字・テキスト・ロゴは一切含めないこと\n"
    )


def _extract_image_bytes(response) -> tuple[bytes, str]:
    """Geminiのレスポンスから画像データ（バイト列, 拡張子）を取り出す"""
    for part in response.candidates[0].content.parts:
        inline_data = getattr(part, "inline_data", None)
        if inline_data and inline_data.mime_type.startswith("image/"):
            extension = inline_data.mime_type.split("/")[-1]
            return inline_data.data, extension
    raise ImageGenerationError("レスポンスに画像データが含まれていませんでした")


def _slugify(title: str, max_length: int = 30) -> str:
    slug = re.sub(r"[^\w\-]", "_", title)
    return slug[:max_length]


def generate_eyecatch_image(
    article: GeneratedArticle,
    api_key: str,
    image_model_name: str,
    media_description: str,
    save_dir: Path,
    max_retries: int = 3,
) -> Path:
    """記事内容をもとに見出し画像を生成し、ローカルに保存する

    Args:
        article: 画像生成のもとになる記事
        api_key: Gemini APIキー
        image_model_name: 画像生成に使うモデル名（例: gemini-2.5-flash-image）
        media_description: 画像のトンマナ指定に使うメディア説明文
        save_dir: 画像の保存先ディレクトリ
        max_retries: 失敗時の最大リトライ回数

    Returns:
        保存した画像ファイルのパス
    """
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(image_model_name)
    prompt = _build_image_prompt(article, media_description)

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            response = model.generate_content(prompt)
            image_bytes, extension = _extract_image_bytes(response)

            save_dir.mkdir(parents=True, exist_ok=True)
            image_path = save_dir / f"{_slugify(article.title)}.{extension}"
            image_path.write_bytes(image_bytes)

            logger.info(f"見出し画像を生成しました: {image_path}")
            return image_path

        except Exception as e:
            last_error = e
            wait_seconds = 2 ** attempt
            logger.warning(
                f"画像生成に失敗しました（{attempt}/{max_retries}回目）: {e} "
                f"{wait_seconds}秒後にリトライします"
            )
            time.sleep(wait_seconds)

    raise ImageGenerationError(
        f"見出し画像の生成に失敗しました: {article.title} - {last_error}"
    )
