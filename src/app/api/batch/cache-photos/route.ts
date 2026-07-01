import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300;

const BASE_URL = "https://places.googleapis.com/v1";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY が未設定です");
  return key;
}

// Place詳細からphoto nameを取得
async function fetchPhotoName(placeId: string): Promise<string | null> {
  const res = await fetch(
    `${BASE_URL}/places/${placeId}?fields=photos&languageCode=ja`,
    {
      headers: {
        "X-Goog-Api-Key": getApiKey(),
        "X-Goog-FieldMask": "photos",
      },
    }
  );

  if (!res.ok) return null;

  const data: { photos?: { name: string }[] } = await res.json();
  return data.photos?.[0]?.name ?? null;
}

// photo nameからmedia URLを取得（skipHttpRedirect=trueでリダイレクトせずURLを返す）
async function fetchPhotoUrl(photoName: string): Promise<string | null> {
  const res = await fetch(
    `${BASE_URL}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
    {
      headers: { "X-Goog-Api-Key": getApiKey() },
    }
  );

  if (!res.ok) return null;

  const data: { photoUri?: string } = await res.json();
  return data.photoUri ?? null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const supabase = getServiceClient();

  // photo_urlがNULLでgoogle_place_idがあるスポットを取得
  const { data: spots, error: fetchError } = await supabase
    .from("spots")
    .select("id, name, google_place_id")
    .not("google_place_id", "is", null)
    .is("photo_url", null)
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const targets = spots ?? [];
  const errors: string[] = [];
  let updated = 0;
  let skipped = 0;

  for (const spot of targets) {
    try {
      const photoName = await fetchPhotoName(spot.google_place_id as string);
      if (!photoName) {
        skipped++;
        continue;
      }

      const photoUrl = await fetchPhotoUrl(photoName);
      if (!photoUrl) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from("spots")
        .update({ photo_url: photoUrl })
        .eq("id", spot.id);

      if (updateError) {
        errors.push(`${spot.name}: ${updateError.message}`);
      } else {
        updated++;
      }

      // レート制限対策
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      errors.push(`${spot.name}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    targets: targets.length,
    updated,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
