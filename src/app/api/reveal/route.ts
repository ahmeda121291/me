import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import type { Reveal } from "@/lib/types";

// GET /api/reveal?ballot_id=&device_id= — re-entry path for a device that
// already voted; returns null (200) if no vote exists for that device.
export async function GET(req: NextRequest) {
  const ballotId = Number(req.nextUrl.searchParams.get("ballot_id"));
  const deviceId = req.nextUrl.searchParams.get("device_id");

  if (!ballotId || !deviceId) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const reveal = await rpc<Reveal>("api_reveal", {
    p_ballot_id: ballotId,
    p_device_id: deviceId,
  });

  return NextResponse.json(reveal);
}
