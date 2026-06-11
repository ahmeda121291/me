"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { getDeviceId } from "@/lib/scoring";

// Post-checkout landing (spec §6): confirm membership, prompt sign-in if
// needed, route to /play. Also claims any anonymous history.
export default function WelcomeStatus() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(Boolean(data.session));
      if (data.session) {
        await supabase.rpc("api_claim_votes", { p_device_id: getDeviceId() });
      }
    });
  }, []);

  if (signedIn === null) return <p className="text-sm opacity-50">…</p>;

  return signedIn ? (
    <>
      <p className="max-w-sm opacity-80">
        Your streak rides with you now. The five modes are open.
      </p>
      <a
        href="/play"
        className="rounded-xl bg-bronze px-8 py-4 text-lg font-semibold text-ivory"
      >
        Enter the modes →
      </a>
    </>
  ) : (
    <>
      <p className="max-w-sm opacity-80">
        A sign-in link is on its way to the email you used at checkout. Open it
        on this device and everything unlocks.
      </p>
      <a href="/signin" className="text-sm underline opacity-70">
        Didn’t get it? Request a new link
      </a>
    </>
  );
}
