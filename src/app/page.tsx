import { rpc } from "@/lib/supabase";
import type { TodayBallot } from "@/lib/types";
import DailyBallot from "@/components/DailyBallot";
import Countdown from "@/components/Countdown";

// Today's ballot is fetched server-side and cached briefly at the edge;
// the pre-vote page must load fast on mobile (spec §6).
export const revalidate = 60;

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
