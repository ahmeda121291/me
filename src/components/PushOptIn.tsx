"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase } from "@/lib/supabase-browser";

const VAPID_PUBLIC_KEY =
  "BKhr0s5jQBz8F-Jp03McZyFK3P5SHSf-nzFpvzrqQ-Can1tgfbxICgQNzZLTCMMbDMG5So7azwS6zcSLUvMWKHE";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

interface Props {
  streak: number;
}

// Push opt-in only after a 5-day streak — never on first visit (spec §11).
export default function PushOptIn({ streak }: Props) {
  const [state, setState] = useState<"hidden" | "offer" | "busy" | "done">("hidden");

  useEffect(() => {
    if (streak < 5) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem("fb_push_done") === "1") return;
    setState("offer");
  }, [streak]);

  const enable = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      await getSupabase().rpc("api_push_subscribe", {
        p_device_id: getDeviceId(),
        p_endpoint: json.endpoint,
        p_keys: json.keys,
      });
      localStorage.setItem("fb_push_done", "1");
      setState("done");
    } catch {
      setState("hidden");
    }
  };

  if (state === "hidden") return null;
  if (state === "done") {
    return (
      <section className="rounded-2xl border border-bronze p-4 text-sm">
        <p className="font-semibold">Locked in. We’ll nudge you at midnight ET.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line p-4">
      <p className="text-sm font-semibold">
        {streak} straight days. Want the nudge?
      </p>
      <p className="mt-1 text-sm opacity-75">
        A single notification when the new ballot drops — and when your pending
        verdicts resolve.
      </p>
      <div className="mt-3 flex gap-3">
        <button
          onClick={enable}
          disabled={state === "busy"}
          className="rounded-lg bg-bronze px-5 py-2.5 text-sm font-semibold text-ivory disabled:opacity-50"
        >
          {state === "busy" ? "…" : "Turn on notifications"}
        </button>
        <button
          onClick={() => {
            localStorage.setItem("fb_push_done", "1");
            setState("hidden");
          }}
          className="text-sm underline opacity-60"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
