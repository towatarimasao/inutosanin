import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_PASSWORD = "admin1234";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("x-admin-password") === ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, category, address, phone, opening_hours, google_maps_url, website_url } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name と category は必須です" }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from("spots")
    .insert({
      name,
      category,
      address:       address       || null,
      phone:         phone         || null,
      business_hours: opening_hours || null,
      url:           website_url || google_maps_url || null,
      is_active:     true,
    });

  if (error) {
    console.error("[admin/spots POST] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getServiceClient();
  const PAGE_SIZE = 1000;
  const allSpots: Record<string, unknown>[] = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error } = await client
      .from("spots")
      .select("id, name, category, address, phone, business_hours, url, photo_url, listing_status, is_active, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    allSpots.push(...(data ?? []));

    if ((data ?? []).length < PAGE_SIZE) break;
    page++;
  }

  return NextResponse.json(allSpots);
}
