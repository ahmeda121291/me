import type { Metadata } from "next";
import { SITE_NAME, TAGLINE } from "@/lib/constants";
import { rpc } from "@/lib/supabase";
import type { TodayBallot } from "@/lib/types";
import DailyBallot from "@/components/DailyBallot";
import Countdown from "@/components/Countdown";

// Today's ballot is fetched server-side and cached briefly at the edge;
// the pre-vote page must load fast on mobile (spec §6).
export const revalidate = 60;

// The homepage unfurls with today's live card — sharing the bare domain
// shows the blind résumé, same as sharing /b/[n].
export async function generateMetadata(): Promise<Metadata> {
  const ballot = await rpc<TodayBallot>("api_today_ballot", {}, 300);
  if (!ballot) return {};
  const title = `${SITE_NAME} No. ${ballot.ballot_number} — IN or OUT?`;
  const image = `/api/og/ballot/${ballot.ballot_number}?spoiler=1`;
  return {
    openGraph: { title, description: TAGLINE, images: [image] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function Home() {
  const ballot = await rpc<TodayBallot>("api_today_ballot", {}, 60);

  return (
    <main className="mx-auto w-full max-w-xl px-5">
      {ballot ? (
        <DailyBallot ballot={ballot} />
      ) : (
        <div className="flex flex-col items-center gap-6 py-24 text-center">
          <p className="text-2xl font-semibold">The booth is closed.</p>
          <p className="max-w-sm text-sm opacity-70">
            No ballot is scheduled for today. Check back at midnight ET — one
            career a day, no names, your call.
          </p>
          <Countdown />
        </div>
      )}
    </main>
  );
}
