import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import type { TodayBallot } from "@/lib/types";

// GET /api/ballot/today — edge-cached for a minute; the underlying RPC
// flips at midnight ET (spec §6).
export const revalidate = 60;

export async function GET() {
  const ballot = await rpc<TodayBallot>("api_today_ballot", {}, 60);
  return NextResponse.json(ballot, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
