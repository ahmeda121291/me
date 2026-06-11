"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase-browser";
import { getDeviceId } from "@/lib/scoring";

export default function UnsubscribeClient() {
  const params = useSearchParams();
  const address = params.get("a") ?? "";
  const channel = params.get("c") ?? "email";
  const preDone = params.get("done") === "1";
  const [state, setState] = useState<"working" | "done" | "resubscribed">(
    preDone ? "done" : "working",
  );

  useEffect(() => {
    if (preDone || !address) return;
    getSupabase()
      .rpc("api_unsubscribe_daily", { p_channel: channel, p_address: address })
      .then(() => setState("done"));
  }, [preDone, address, channel]);

  const resubscribe = async () => {
    await getSupabase().rpc("api_subscribe_daily", {
      p_channel: channel,
      p_address: address,
      p_device_id: getDeviceId(),
    });
    setState("resubscribed");
  };

  if (state === "resubscribed") {
    return (
      <>
        <h1 className="text-3xl font-semibold">Welcome back.</h1>
        <p className="mt-2 opacity-75">
          The daily ballot resumes at midnight ET.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">
        {state === "done" ? "You’re unsubscribed." : "Unsubscribing…"}
      </h1>
      {state === "done" && (
        <>
          <p className="mt-2 opacity-75">
            No more daily ballots{address ? ` to ${address}` : ""}. The booth
            stays open at <a href="/" className="underline text-bronze">playfirstballot.com</a> whenever you want it.
          </p>
          {address && (
            <button
              onClick={resubscribe}
              className="mt-5 rounded-lg border border-line px-5 py-2.5 text-sm"
            >
              That was a mistake — resubscribe
            </button>
          )}
        </>
      )}
    </>
  );
}
