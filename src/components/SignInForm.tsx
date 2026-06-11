"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const send = async () => {
    setState("busy");
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/me` },
    });
    setState(error ? "error" : "sent");
  };

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-2xl border border-bronze p-5">
        <p className="font-semibold">Check your email.</p>
        <p className="mt-1 text-sm opacity-75">
          The link signs you in on this device. It can take a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-line bg-transparent px-4 py-3"
        aria-label="Email address"
      />
      <button
        onClick={send}
        disabled={state === "busy" || !email.includes("@")}
        className="mt-3 w-full rounded-xl bg-bronze py-4 text-lg font-semibold text-ivory disabled:opacity-50"
      >
        {state === "busy" ? "Sending…" : "Send sign-in link"}
      </button>
      {state === "error" && (
        <p className="mt-2 text-sm text-stamp">Couldn’t send — try again.</p>
      )}
    </div>
  );
}
