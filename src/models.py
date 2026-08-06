"""エージェント内で受け渡すデータ構造の定義"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class NewsItem:
    """RSSから取得したニュース記事candidate"""

    title: str
    url: str
    summary: str
    published_at: datetime
    source: str


@dataclass
class GeneratedArticle:
    """Geminiによって生成されたnote記事"""

    title: str
    body: str  # Markdown形式
    tags: list[str] = field(default_factory=list)
    source_url: str = ""
