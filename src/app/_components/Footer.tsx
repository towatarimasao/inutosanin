import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "スポット一覧", href: "/spots" },
  { label: "ドッグラン", href: "/spots?category=dogrun" },
  { label: "動物病院", href: "/spots?category=vet" },
  { label: "ペットホテル", href: "/spots?category=hotel" },
  { label: "ペットOK飲食店", href: "/spots?category=restaurant" },
  { label: "ペット用品店", href: "/spots?category=shop" },
  { label: "保護犬情報", href: "/spots?category=adoption" },
  { label: "トピックス", href: "/#topics" },
  { label: "このサイトについて", href: "/about" },
  { label: "お問い合わせ", href: "#" },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#EDE8E0" }}>
      <div className="max-w-5xl mx-auto py-12 px-6 flex flex-col gap-8">

        {/* 1段目：縦並び・センター */}
        <div className="flex flex-col items-center text-center gap-3">
          <Link href="/">
            <Image src="/icons/inutosanin.svg" alt="イヌとサンイン" width={240} height={80} />
          </Link>
          <p className="text-sm text-foreground/50 font-normal">愛犬と楽しむサンインのすべて</p>
          <p className="text-sm text-foreground/60">山陰（鳥取・島根）の犬オーナーのためのポータルサイト</p>
        </div>

        {/* 2段目：リンク集 */}
        <div className="border-t border-foreground/10 pt-8">
          <nav className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-foreground/70 hover:text-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 3段目：コピーライト */}
        <div className="border-t border-foreground/10 pt-6 text-xs text-foreground/40 text-center">
          © 2025 イヌとサンイン
        </div>

      </div>
    </footer>
  );
}
