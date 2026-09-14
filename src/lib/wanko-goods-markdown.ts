import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// わんこグッズ比較の本文はMarkdown（見出し・表・太字）と
// 楽天アフィリエイトの生HTML埋め込みタグが混在している。
// markedは行頭がブロックレベルタグのHTMLをそのまま透過するため、
// 埋め込みタグを壊さずにMarkdown部分だけHTML化できる。
// その後DOMPurifyでscript等の危険な要素だけ除去する（デフォルト設定）。
export function renderWankoGoodsBody(bodyMd: string): string {
  const rawHtml = marked.parse(bodyMd, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
}
