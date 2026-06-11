"use client";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./constants";

// Fire-and-forget client RPC (used for event logging only — votes go
// through /api/vote so the server stays the single write path for gameplay).
export function rpcClient(fn: string, args: Record<string, unknown>): void {
  fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    keepalive: true,
  }).catch(() => {});
}
