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
  const { is_reviewed } = await req.json();

  if (typeof is_reviewed !== "boolean") {
    return NextResponse.json({ error: "is_reviewedはboolean必須です" }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from("spot_reports")
    .update({ is_reviewed })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
