"use client";

import { useEffect, useState } from "react";

type Photo = { uri: string; attributions: { name: string; uri: string }[] };

// Googleの写真を保存せず、ページを開いたときに直接表示する（撮影者・Google Mapsの表示つき）。
// 取得できない・月の上限に達した場合は何も出さず、下に敷いたイラストがそのまま見える。
export default function LivePlacePhoto({ spotId, alt }: { spotId: string; alt: string }) {
  const [photo, setPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/spot-photo/${spotId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.photo?.uri) setPhoto(d.photo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [spotId]);

  if (!photo) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.uri}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      <div className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-[11px] px-3 py-1.5 flex flex-wrap gap-x-1">
        <span>写真：</span>
        {photo.attributions.length > 0 ? (
          photo.attributions.map((a, i) => (
            <span key={i}>
              {a.uri ? (
                <a href={a.uri} target="_blank" rel="noopener noreferrer" className="underline">
                  {a.name || "投稿者"}
                </a>
              ) : (
                a.name || "投稿者"
              )}
              {i < photo.attributions.length - 1 ? "、" : ""}
            </span>
          ))
        ) : (
          <span>投稿者</span>
        )}
        <span>／ Google Maps</span>
      </div>
    </>
  );
}
