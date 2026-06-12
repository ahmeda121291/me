"use client";

import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase-browser";
import { getDeviceId } from "@/lib/scoring";

// Mounted in the root layout: instantiates the Supabase client on every page
// load so a magic-link ?code= is exchanged for a session no matter where the
// link lands, and claims this device's anonymous history on sign-in.
export default function AuthWatcher() {
  useEffect(() => {
    const supabase = getSupabase();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        supabase
          .rpc("api_claim_votes", { p_device_id: getDeviceId() })
          .then(() => {});
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return null;
}
