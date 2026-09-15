import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// 記事本文の見出し（# タイトル）はページ側でarticle.titleとして
// 別途h1表示しているため、本文中の先頭h1行は二重表示を避けるため取り除く
function stripLeadingH1(bodyMd: string): string {
  return bodyMd.replace(/^#\s+.+\r?\n+/, "");
}

// 通常のMarkdown由来タグに加え、楽天アフィリエイトの埋め込みHTML
// （table/div/span/a/img + target・rel・style属性）を許可する
const ALLOWED_TAGS = [
  "h2", "h3", "p", "strong", "em", "ul", "ol", "li", "hr", "br",
  "a", "img", "table", "thead", "tbody", "tr", "th", "td", "div", "span",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel", "style", "title"],
  img: ["src", "alt", "title", "border", "style"],
  table: ["border", "cellpadding", "cellspacing", "style", "width"],
  tr: ["style"],
  th: ["style", "width", "colspan", "rowspan", "align", "valign"],
  td: ["style", "width", "colspan", "rowspan", "align", "valign"],
  div: ["style"],
  span: ["style"],
  p: ["style"],
};

// わんこグッズ比較の本文はMarkdown（見出し・表・太字）と
// 楽天アフィリエイトの生HTML埋め込みタグが混在している。
// markedは行頭がブロックレベルタグのHTMLをそのまま透過するため、
// 埋め込みタグを壊さずにMarkdown部分だけHTML化できる。
// その後sanitize-htmlで許可タグ・属性以外（script等）を除去する。
export function renderWankoGoodsBody(bodyMd: string): string {
  const rawHtml = marked.parse(stripLeadingH1(bodyMd), { async: false }) as string;
  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
  });
}
