// Stripe runtime operations (spec §7): hosted Checkout sessions and Customer
// Portal sessions. The secret key lives in app_config (service-role-only) —
// no key ever ships in app code or Vercel env.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PRICES: Record<string, string> = {
  monthly: "price_1Th9LbRG0Z7ZCg7WU1YNAw4m",
  annual: "price_1Th9LdRG0Z7ZCg7WZ4KTywvT",
};

async function config(key: string): Promise<string | null> {
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function stripe(sk: string, path: string, form: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `stripe ${res.status}`);
  return json;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      },
    });
  }

  const sk = await config("stripe_secret_key");
  if (!sk) return json({ error: "payments_not_configured" }, 503);

  const body = await req.json().catch(() => ({}));
  const siteUrl = (await config("site_url")) ?? "";

  if (body.action === "checkout") {
    const price = PRICES[body.plan as string];
    if (!price) return json({ error: "unknown plan" }, 400);
    const form: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      success_url: `${siteUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/club`,
      allow_promotion_codes: "true",
    };
    if (typeof body.email === "string" && body.email.includes("@")) {
      form.customer_email = body.email;
    }
    const session = await stripe(sk, "checkout/sessions", form);
    await supabase.from("events").insert({
      name: "checkout_start",
      device_id: typeof body.device_id === "string" ? body.device_id : null,
      props: { plan: body.plan },
    });
    return json({ url: session.url });
  }

  if (body.action === "portal") {
    // Caller must be a signed-in user with a Stripe customer on file.
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();
    if (!userData?.user) return json({ error: "auth required" }, 401);

    const { data: row } = await supabase
      .from("users").select("stripe_customer_id").eq("id", userData.user.id).maybeSingle();
    if (!row?.stripe_customer_id) return json({ error: "no subscription on file" }, 404);

    const session = await stripe(sk, "billing_portal/sessions", {
      customer: row.stripe_customer_id,
      return_url: `${siteUrl}/me`,
    });
    return json({ url: session.url });
  }

  return json({ error: "unknown action" }, 400);
});
