// One-time Stripe wiring (admin-only): once stripe_secret_key is present in
// app_config, this creates the webhook endpoint pointing at stripe-webhook
// and stores the returned signing secret. Idempotent.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function config(key: string): Promise<string | null> {
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

Deno.serve(async (req) => {
  // Admin gate: caller's email must be in the allowlist.
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: userData } = await createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  ).auth.getUser();
  const admins = ((await config("admin_emails")) ?? "").split(",");
  if (!userData?.user?.email || !admins.includes(userData.user.email)) {
    return new Response("admin only", { status: 403 });
  }

  const sk = await config("stripe_secret_key");
  if (!sk) return new Response(JSON.stringify({ error: "stripe_secret_key not set" }), { status: 503 });

  if (await config("stripe_webhook_secret")) {
    return new Response(JSON.stringify({ status: "already configured" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-webhook`;
  const form = new URLSearchParams({
    url,
    "enabled_events[0]": "checkout.session.completed",
    "enabled_events[1]": "customer.subscription.deleted",
    "enabled_events[2]": "invoice.payment_failed",
    description: "First Ballot membership provisioning",
  });
  const res = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: json.error?.message }), { status: 502 });
  }

  await supabase.from("app_config").upsert([
    { key: "stripe_webhook_secret", value: json.secret },
    { key: "stripe_webhook_id", value: json.id },
  ]);

  return new Response(JSON.stringify({ status: "configured", endpoint: json.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
