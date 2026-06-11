"use client";

import { useEffect, useState } from "react";
import { computeStats, getDeviceId, type Stats } from "@/lib/scoring";
import { todayET } from "@/lib/time";
import { getSupabase, invokeFunction } from "@/lib/supabase-browser";
import VoterProfile from "./VoterProfile";

interface Me {
  email: string;
  is_member: boolean;
  member_since: string | null;
  has_stripe: boolean;
}

// /me (spec §6): account state, local stats, manage subscription (Stripe
// portal), sign out. The full Voter Profile lands in Phase 4.
export default function AccountPanel() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [claimed, setClaimed] = useState<number | null>(null);
  const [portalErr, setPortalErr] = useState<string | null>(null);

  useEffect(() => {
    setStats(computeStats(todayET()));
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        setMe(null);
        return;
      }
      const { data: meData } = await supabase.rpc("api_me");
      setMe(meData as Me);
      const { data: n } = await supabase.rpc("api_claim_votes", {
        p_device_id: getDeviceId(),
      });
      if (typeof n === "number" && n > 0) setClaimed(n);
    });
  }, []);

  const openPortal = async () => {
    setPortalErr(null);
    const { data, error } = await invokeFunction<{ url: string }>("stripe-api", {
      action: "portal",
    });
    if (data?.url) window.location.href = data.url;
    else setPortalErr(error ?? "Portal unavailable");
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="mt-6 flex flex-col gap-4 pb-16">
      {stats && (
        <section className="tabular grid grid-cols-3 gap-3 text-center">
          {(
            [
              [String(stats.streak), "Streak"],
              [stats.accuracy === null ? "—" : `${(stats.accuracy * 100).toFixed(0)}%`, "Accuracy"],
              [stats.contrarian === null ? "—" : `${(stats.contrarian * 100).toFixed(0)}%`, "Contrarian"],
            ] as const
          ).map(([v, label]) => (
            <div key={label} className="rounded-2xl border border-line p-3">
              <p className="text-2xl font-semibold">{v}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-60">{label}</p>
            </div>
          ))}
        </section>
      )}

      <VoterProfile />

      {me === undefined && <p className="text-sm opacity-50">…</p>}

      {me === null && (
        <section className="rounded-2xl border border-bronze p-5">
          <p className="font-semibold">Save your streak.</p>
          <p className="mt-1 text-sm opacity-75">
            Sign in and your history follows you across devices.
          </p>
          <a
            href="/signin"
            className="mt-3 inline-block rounded-lg bg-bronze px-5 py-2.5 font-semibold text-ivory"
          >
            Sign in →
          </a>
        </section>
      )}

      {me && (
        <section className="rounded-2xl border border-line p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{me.email}</p>
              <p className="text-xs uppercase tracking-widest text-bronze">
                {me.is_member ? "Club member" : "Free account"}
              </p>
            </div>
            <button onClick={signOut} className="text-sm underline opacity-70">
              Sign out
            </button>
          </div>
          {claimed !== null && (
            <p className="mt-2 text-xs text-bronze">
              {claimed} verdict{claimed === 1 ? "" : "s"} from this device now
              ride with your account.
            </p>
          )}
          <div className="mt-4 flex gap-3">
            {me.is_member && me.has_stripe && (
              <button
                onClick={openPortal}
                className="rounded-lg border border-line px-4 py-2 text-sm"
              >
                Manage subscription
              </button>
            )}
            {!me.is_member && (
              <a
                href="/club"
                className="rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-ivory"
              >
                Join The Club →
              </a>
            )}
          </div>
          {portalErr && <p className="mt-2 text-sm text-stamp">{portalErr}</p>}
        </section>
      )}
    </div>
  );
}
