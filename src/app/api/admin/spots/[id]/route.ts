import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, category, address, phone, business_hours, url, photo_url, pet_condition, listing_status, dog_size } = body;

  const { error } = await getServiceClient()
    .from("spots")
    .update({
      name,
      category,
      address:        address        || null,
      phone:          phone          || null,
      business_hours: business_hours || null,
      url:            url            || null,
      photo_url:      photo_url      || null,
      pet_condition:  pet_condition  || null,
      listing_status: listing_status || null,
      dog_size:       dog_size       || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await getServiceClient()
    .from("spots")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
