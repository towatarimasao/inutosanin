"""RSS取得モジュール

設定ファイルに登録されたRSSフィードから新着ニュースを取得し、
処理済み記事を除外したNewsItemのリストを返す。
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import feedparser

from logger import get_logger
from models import NewsItem

logger = get_logger(__name__)


def _hash_url(url: str) -> str:
    """記事URLから重複判定用のハッシュ値を生成する"""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _load_processed(processed_log_path: Path) -> set[str]:
    """処理済み記事URLのハッシュ集合を読み込む"""
    if not processed_log_path.exists():
        return set()
    with processed_log_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return set(data.get("processed_hashes", []))


def mark_as_processed(url: str, processed_log_path: Path) -> None:
    """記事URLを処理済みとして記録する"""
    processed = _load_processed(processed_log_path)
    processed.add(_hash_url(url))
    processed_log_path.parent.mkdir(parents=True, exist_ok=True)
    with processed_log_path.open("w", encoding="utf-8") as f:
        json.dump({"processed_hashes": sorted(processed)}, f, ensure_ascii=False, indent=2)


def fetch_news_items(feeds: list[dict], days_back: int, processed_log_path: Path) -> list[NewsItem]:
    """全RSSフィードから未処理の新着ニュースを取得する

    Args:
        feeds: [{"name": ..., "url": ...}, ...] の形式のフィード一覧
        days_back: 直近何日以内の記事を対象にするか
        processed_log_path: 処理済み記事の記録先パス

    Returns:
        未処理のNewsItemのリスト（公開日時の新しい順）
    """
    processed_hashes = _load_processed(processed_log_path)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)

    news_items: list[NewsItem] = []

    for feed_config in feeds:
        name = feed_config["name"]
        url = feed_config["url"]
        logger.info(f"RSS取得開始: {name} ({url})")

        parsed = feedparser.parse(url)
        if parsed.bozo:
            logger.warning(f"RSSの解析に失敗しました: {name} - {parsed.bozo_exception}")
            continue

        for entry in parsed.entries:
            entry_url = entry.get("link", "")
            if not entry_url:
                continue

            if _hash_url(entry_url) in processed_hashes:
                continue

            published_at = _parse_published(entry)
            if published_at is None or published_at < cutoff:
                continue

            news_items.append(
                NewsItem(
                    title=entry.get("title", "（タイトルなし）"),
                    url=entry_url,
                    summary=entry.get("summary", ""),
                    published_at=published_at,
                    source=name,
                )
            )

    news_items.sort(key=lambda item: item.published_at, reverse=True)
    logger.info(f"新着ニュース {len(news_items)} 件を取得しました")
    return news_items


def _parse_published(entry) -> datetime | None:
    """feedparserのエントリから公開日時を抽出する"""
    time_struct = entry.get("published_parsed") or entry.get("updated_parsed")
    if time_struct is None:
        return None
    return datetime(*time_struct[:6], tzinfo=timezone.utc)
