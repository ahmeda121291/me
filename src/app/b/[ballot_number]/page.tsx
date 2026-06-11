import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/constants";
import { rpc } from "@/lib/supabase";
import type { ShareData } from "@/lib/types";
import { displayDateET } from "@/lib/time";
import PastBallotStatus from "@/components/PastBallotStatus";

interface PageProps {
  params: Promise<{ ballot_number: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ballot_number } = await params;
  const title = `${SITE_NAME} No. ${ballot_number}`;
  const image = `${SITE_URL}/api/og/ballot/${ballot_number}?spoiler=1`;
  return {
    title,
    description: TAGLINE,
    openGraph: { title, description: TAGLINE, images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

// Share landing — the growth loop (spec §6). First-time visitors get the
// one-line explainer and one tap into today's ballot. Past ballots show the
// visitor's result if they played; otherwise a locked teaser.
export default async function BallotLanding({ params }: PageProps) {
  const { ballot_number } = await params;
  const data = await rpc<ShareData>(
    "api_ballot_share",
    { p_ballot_number: Number(ballot_number) },
    60,
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 px-5 py-16 text-center">
      <p className="text-xl italic opacity-80">“{TAGLINE}”</p>

      {data ? (
        data.is_today ? (
          <>
            <p className="text-sm opacity-70">
              Someone sent you today’s ballot. The booth is open.
            </p>
            <a
              href="/"
              className="rounded-xl bg-bronze px-8 py-4 text-lg font-semibold text-ivory"
            >
              Play Ballot No. {data.ballot_number} →
            </a>
          </>
        ) : (
          <>
            <div className="w-full rounded-2xl border border-line p-6">
              <p className="tabular text-xs uppercase tracking-widest opacity-60">
                Ballot No. {data.ballot_number} · {displayDateET(data.live_date)}
              </p>
              <PastBallotStatus ballotId={data.ballot_id} playerName={data.player_name} />
            </div>
            <a
              href="/"
              className="rounded-xl bg-bronze px-8 py-4 text-lg font-semibold text-ivory"
            >
              Play today’s ballot →
            </a>
          </>
        )
      ) : (
        <>
          <p className="text-sm opacity-70">
            That ballot isn’t on the docket. Today’s is.
          </p>
          <a
            href="/"
            className="rounded-xl bg-bronze px-8 py-4 text-lg font-semibold text-ivory"
          >
            Play today’s ballot →
          </a>
        </>
      )}
    </main>
  );
}
