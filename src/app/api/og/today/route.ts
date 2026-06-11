import { NextResponse } from "next/server";
import { rpc } from "@/lib/supabase";
import type { TodayBallot } from "@/lib/types";

// Today's card as a stable URL (used as the default OG image for the
// homepage and any page without its own): redirects to the current daily
// ballot's spoiler-safe share image. Scrapers follow the redirect.
export const revalidate = 300;

export async function GET() {
  const ballot = await rpc<TodayBallot>("api_today_ballot", {}, 300);
  const n = ballot?.ballot_number ?? 1;
  return NextResponse.redirect(
    new URL(
      `/api/og/ballot/${n}?spoiler=1`,
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.playfirstballot.com",
    ),
    { status: 302 },
  );
}
