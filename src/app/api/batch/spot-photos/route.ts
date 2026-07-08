import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 手動トリガー専用（Vercel Cronは設定しない）。
// 対象は category=<指定値> AND is_active=true AND google_place_id IS NOT NULL AND photo_url IS NULL の1件のみ。
// photo_urlが埋まった時点で対象外になるため、再実行しても同じレコードは再処理されない。

export const maxDuration = 300;

const BASE_URL = "https://places.googleapis.com/v1";
const BUCKET = "spot-photos";

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

type TargetSpot = {
  id: string;
  name: string;
  google_place_id: string;
};

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

  if (!res.ok) {
    throw new Error(`Place詳細取得失敗 (${res.status}): ${await res.text()}`);
  }

  const data: { photos?: { name: string }[] } = await res.json();
  return data.photos?.[0]?.name ?? null;
}

// photo nameから画像バイナリを取得（リダイレクトを辿って実データを得る）
async function fetchPhotoBytes(
  photoName: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(
    `${BASE_URL}/${photoName}/media?maxWidthPx=1200`,
    { headers: { "X-Goog-Api-Key": getApiKey() } }
  );

  if (!res.ok) {
    throw new Error(`写真取得失敗 (${res.status}): ${await res.text()}`);
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

async function ensureBucket(
  supabase: ReturnType<typeof getServiceClient>
): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`バケット一覧取得失敗: ${error.message}`);

  const exists = buckets?.some((b) => b.name === BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (createError && !createError.message.includes("already exists")) {
    throw new Error(`バケット作成失敗: ${createError.message}`);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  if (!category) {
    return NextResponse.json(
      { error: "category クエリパラメータは必須です（例: ?category=dogrun）" },
      { status: 400 }
    );
  }

  const execute = searchParams.get("execute") === "true";

  const supabase = getServiceClient();

  const { data, error: fetchError } = await supabase
    .from("spots")
    .select("id, name, google_place_id")
    .eq("category", category)
    .eq("is_active", true)
    .eq("listing_status", "published")
    .not("google_place_id", "is", null)
    .is("photo_url", null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const targets = (data ?? []) as TargetSpot[];

  console.log(
    `[spot-photos][${category}] 対象件数: ${targets.length}件 (dryRun=${!execute})`
  );

  if (!execute) {
    // dry-runモード：対象件数と一覧をログ出力するのみ。書き込み・API呼び出しは一切行わない。
    for (const spot of targets) {
      console.log(`[spot-photos][${category}][dry-run] 対象: ${spot.name} (id=${spot.id})`);
    }
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      category,
      targetCount: targets.length,
      targets: targets.map((s) => ({ id: s.id, name: s.name })),
      note: "本実行するには ?execute=true を付けてください",
    });
  }

  // 本実行モード：バケットの存在を保証してから1件ずつ処理する
  await ensureBucket(supabase);

  const results: { id: string; name: string; ok: boolean; error?: string }[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const spot of targets) {
    try {
      const photoName = await fetchPhotoName(spot.google_place_id);
      if (!photoName) {
        throw new Error("写真が見つかりませんでした");
      }

      const { buffer, contentType } = await fetchPhotoBytes(photoName);
      const ext = extFromContentType(contentType);
      const path = `${category}/${spot.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true });

      if (uploadError) {
        throw new Error(`Storageアップロード失敗: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("spots")
        .update({ photo_url: publicUrlData.publicUrl })
        .eq("id", spot.id);

      if (updateError) {
        throw new Error(`DB更新失敗: ${updateError.message}`);
      }

      console.log(`[spot-photos][${category}][OK] ${spot.name} (id=${spot.id}) -> ${publicUrlData.publicUrl}`);
      results.push({ id: spot.id, name: spot.name, ok: true });
      succeeded++;
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      console.error(`[spot-photos][${category}][NG] ${spot.name} (id=${spot.id}): ${message}`);
      results.push({ id: spot.id, name: spot.name, ok: false, error: message });
      failed++;
      // 失敗しても全体は止めず、次のレコードへ進む
      continue;
    }

    // APIレート制限対策
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(
    `[spot-photos][${category}] 完了: 成功${succeeded}件 / 失敗${failed}件 / 対象${targets.length}件`
  );

  return NextResponse.json({
    ok: true,
    mode: "execute",
    category,
    targetCount: targets.length,
    succeeded,
    failed,
    results,
  });
}
