// Stripe webhook receiver (spec §7). verify_jwt is off — authentication is
// the Stripe signature, verified against the signing secret captured by
// stripe-setup and stored in app_config (service-role-only table).
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

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"], v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const secret = await config("stripe_webhook_secret");
  if (!secret || !(await verifySignature(payload, sigHeader, secret))) {
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload);
  const obj = event.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    const email: string | null = obj.customer_details?.email ?? obj.customer_email ?? null;
    const customerId: string | null = typeof obj.customer === "string" ? obj.customer : null;
    if (!email) return new Response("no email", { status: 200 });

    // Find-or-create the auth user by email, flip membership, send sign-in email.
    let { data: existing } = await supabase
      .from("users").select("id").eq("email", email).maybeSingle();

    if (!existing) {
      const siteUrl = (await config("site_url")) ?? undefined;
      const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: siteUrl ? `${siteUrl}/welcome` : undefined,
      });
      if (error && !error.message.includes("already")) {
        return new Response(`invite failed: ${error.message}`, { status: 500 });
      }
      if (invited?.user) existing = { id: invited.user.id };
    }

    if (existing) {
      await supabase.from("users").upsert({
        id: existing.id,
        email,
        is_member: true,
        member_since: new Date().toISOString(),
        stripe_customer_id: customerId,
      });
    }
    await supabase.from("events").insert({
      name: "checkout_success",
      props: { customer: customerId },
    });
  }

  if (event.type === "customer.subscription.deleted" || event.type === "invoice.payment_failed") {
    const customerId: string | null =
      typeof obj.customer === "string" ? obj.customer : null;
    if (customerId) {
      await supabase.from("users").update({ is_member: false })
        .eq("stripe_customer_id", customerId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
