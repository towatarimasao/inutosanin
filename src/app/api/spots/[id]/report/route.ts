import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const REPORT_TYPES = ["address_wrong", "closed", "phone_wrong", "other"] as const;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: spotId } = await params;
  const body = await req.json();
  const { spot_name, report_type, detail } = body;

  if (!spot_name || !report_type) {
    return NextResponse.json({ error: "spot_nameとreport_typeは必須です" }, { status: 400 });
  }
  if (!REPORT_TYPES.includes(report_type)) {
    return NextResponse.json({ error: "report_typeが不正です" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from("spot_reports").insert({
    spot_id:     spotId,
    spot_name,
    report_type,
    detail:      detail || null,
  });

  if (error) {
    console.error("[spots/report POST] INSERT失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
