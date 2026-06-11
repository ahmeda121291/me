import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./constants";

// Thin REST wrapper over Postgres RPCs. The anon role only has EXECUTE on the
// security-definer game functions, so this is safe to run anywhere (server,
// edge OG images) without the service role key.
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  revalidate?: number,
): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    ...(revalidate !== undefined
      ? { next: { revalidate } }
      : { cache: "no-store" }),
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text === "null") return null;
  return JSON.parse(text) as T;
}
