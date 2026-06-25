import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 302 });
}
