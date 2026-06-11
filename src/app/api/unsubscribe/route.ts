import { NextRequest, NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";

// One-click unsubscribe target (List-Unsubscribe-Post): mail clients POST
// here directly; humans following a link get redirected to the page.
async function unsubscribe(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("c") ?? "email";
  const address = req.nextUrl.searchParams.get("a") ?? "";
  if (address) {
    await rpc("api_unsubscribe_daily", { p_channel: channel, p_address: address });
  }
  return address;
}

export async function POST(req: NextRequest) {
  await unsubscribe(req);
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  const address = await unsubscribe(req);
  return NextResponse.redirect(
    new URL(`/unsubscribe?done=1&a=${encodeURIComponent(address)}`, req.nextUrl.origin),
  );
}
