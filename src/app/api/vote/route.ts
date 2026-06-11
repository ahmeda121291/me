import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import type { Reveal } from "@/lib/types";

// POST /api/vote — dedupes on the votes unique constraint inside api_vote
// and returns the reveal payload with the live split (spec §6).
export async function POST(req: NextRequest) {
  let body: { ballot_id?: number; device_id?: string; verdict?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { ballot_id, device_id, verdict } = body;
  if (!ballot_id || !device_id || !verdict) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const reveal = await rpc<Reveal>("api_vote", {
    p_ballot_id: ballot_id,
    p_device_id: device_id,
    p_verdict: verdict,
  });

  if (!reveal) {
    return NextResponse.json({ error: "vote rejected" }, { status: 422 });
  }

  rpc("api_log_event", {
    p_name: "vote",
    p_device_id: device_id,
    p_props: { ballot_id, verdict },
  }).catch(() => {});

  return NextResponse.json(reveal);
}
