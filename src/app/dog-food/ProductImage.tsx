"use client";

import { useState } from "react";
import Image from "next/image";

// image_urlが空、またはロードに失敗した場合はフォールバック表示にする
export default function ProductImage({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-30">
        🦴
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      onError={() => setFailed(true)}
    />
  );
}
