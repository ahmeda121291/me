"use client";

import { useEffect, useState } from "react";
import { CLUB_ANNUAL_DISPLAY, CLUB_MONTHLY_DISPLAY } from "@/lib/constants";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase, invokeFunction } from "@/lib/supabase-browser";

// Pricing toggle + checkout (spec §7): signed-in users go straight to
// Checkout; anonymous users supply an email first. Purchase creates the
// account via the Stripe webhook → invite email.
export default function ClubCheckout() {
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [email, setEmail] = useState("");
  const [knownEmail, setKnownEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => setKnownEmail(data.session?.user.email ?? null));
  }, []);

  const checkout = async () => {
    setBusy(true);
    setError(null);
    const { data, error: err, status } = await invokeFunction<{ url: string }>(
      "stripe-api",
      {
        action: "checkout",
        plan,
        email: knownEmail ?? email,
        device_id: getDeviceId(),
      },
    );
    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    setBusy(false);
    setError(
      status === 503
        ? "Doors open shortly — payments are being wired up. Check back soon."
        : (err ?? "Something went sideways. Try again."),
    );
  };

  return (
    <div className="mt-6 rounded-2xl border border-bronze p-5">
      <div className="flex gap-2" role="radiogroup" aria-label="Billing period">
        <button
          onClick={() => setPlan("monthly")}
          aria-pressed={plan === "monthly"}
          className={`tabular flex-1 rounded-xl border px-3 py-3 text-center ${
            plan === "monthly" ? "border-bronze font-semibold" : "border-line opacity-70"
          }`}
        >
          {CLUB_MONTHLY_DISPLAY}
        </button>
        <button
          onClick={() => setPlan("annual")}
          aria-pressed={plan === "annual"}
          className={`tabular relative flex-1 rounded-xl border px-3 py-3 text-center ${
            plan === "annual" ? "border-bronze font-semibold" : "border-line opacity-70"
          }`}
        >
          {CLUB_ANNUAL_DISPLAY}
          <span className="absolute -top-2 right-2 rounded-full bg-bronze px-2 text-[10px] font-semibold uppercase text-ivory">
            save 44%
          </span>
        </button>
      </div>

      {!knownEmail && (
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-3 w-full rounded-xl border border-line bg-transparent px-4 py-3"
          aria-label="Email for your membership"
        />
      )}

      <button
        onClick={checkout}
        disabled={busy || (!knownEmail && !email.includes("@"))}
        className="mt-3 w-full rounded-xl bg-bronze py-4 text-lg font-semibold text-ivory disabled:opacity-50"
      >
        {busy ? "Opening checkout…" : "Join The Club →"}
      </button>

      {knownEmail && (
        <p className="mt-2 text-center text-xs opacity-60">as {knownEmail}</p>
      )}
      {error && <p className="mt-2 text-center text-sm text-stamp">{error}</p>}
    </div>
  );
}
