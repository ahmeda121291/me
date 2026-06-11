"use client";

import { useState } from "react";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase } from "@/lib/supabase-browser";

// Daily ballot by email or text: collect an address, send the link at
// midnight ET. No account required.
export default function DailySubscribe() {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [address, setAddress] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const subscribe = async () => {
    setState("busy");
    const { error } = await getSupabase().rpc("api_subscribe_daily", {
      p_channel: channel,
      p_address: address,
      p_device_id: getDeviceId(),
    });
    setState(error ? "error" : "done");
  };

  if (state === "done") {
    return (
      <section className="rounded-2xl border border-bronze p-4 text-sm">
        <p className="font-semibold">You’re on the list.</p>
        <p className="mt-1 opacity-75">
          Tomorrow’s ballot lands {channel === "email" ? "in your inbox" : "by text"} at
          midnight ET. Reply STOP or visit your locker to unsubscribe.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line p-4">
      <h3 className="text-xs uppercase tracking-widest opacity-60">
        Never miss a ballot
      </h3>
      <p className="mt-1 text-sm opacity-80">
        Get tomorrow’s ballot {channel === "email" ? "emailed" : "texted"} to you
        the moment it goes live.
      </p>
      <div className="mt-3 flex gap-2 text-sm" role="radiogroup" aria-label="Notification channel">
        <button
          onClick={() => setChannel("email")}
          aria-pressed={channel === "email"}
          className={`rounded-full border px-4 py-1.5 ${channel === "email" ? "border-bronze font-semibold" : "border-line opacity-70"}`}
        >
          Email
        </button>
        <button
          onClick={() => setChannel("sms")}
          aria-pressed={channel === "sms"}
          className={`rounded-full border px-4 py-1.5 ${channel === "sms" ? "border-bronze font-semibold" : "border-line opacity-70"}`}
        >
          Text
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type={channel === "email" ? "email" : "tel"}
          inputMode={channel === "email" ? "email" : "tel"}
          autoComplete={channel === "email" ? "email" : "tel"}
          placeholder={channel === "email" ? "you@example.com" : "(555) 555-0100"}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm"
          aria-label={channel === "email" ? "Email address" : "Mobile number"}
        />
        <button
          onClick={subscribe}
          disabled={state === "busy" || address.length < 6}
          className="rounded-xl bg-bronze px-5 py-2.5 text-sm font-semibold text-ivory disabled:opacity-50"
        >
          {state === "busy" ? "…" : "Sign up"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-xs text-stamp">
          That {channel === "email" ? "email" : "number"} didn’t take — check it and try again.
        </p>
      )}
      <p className="mt-2 text-[10px] opacity-50">
        One message a day, only the ballot link. Unsubscribe anytime.
      </p>
    </section>
  );
}
