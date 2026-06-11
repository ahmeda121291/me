// Notification fan-out (spec §11 + email/SMS daily ballot).
// Invoked hourly by pg_cron ({tick:true}). Just after midnight ET it sends
// "Today's ballot is live" to web-push subscribers, email subscribers
// (Resend), and SMS subscribers (Twilio) — providers activate when their
// keys exist in app_config. Also drains the pending-resolution queue.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function config(key: string): Promise<string | null> {
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

function etParts(): { hour: number; date: string } {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour: "numeric", hour12: false,
  }).format(now)) % 24;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  return { hour, date };
}

async function sendPush(payload: string, filter?: { deviceIds?: Set<string>; userIds?: Set<string> }) {
  const pub = await config("vapid_public_key");
  const priv = await config("vapid_private_key");
  if (!pub || !priv) return 0;
  webpush.setVapidDetails("mailto:ahmed@pipelinewithahmed.com", pub, priv);

  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  let sent = 0;
  for (const sub of subs ?? []) {
    if (filter && !(
      (sub.device_id && filter.deviceIds?.has(sub.device_id)) ||
      (sub.user_id && filter.userIds?.has(sub.user_id))
    )) continue;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }
  return sent;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = await config("resend_api_key");
  if (!key) return false;
  const from = (await config("email_from")) ?? "First Ballot <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return res.ok;
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = await config("twilio_account_sid");
  const token = await config("twilio_auth_token");
  const from = await config("twilio_from_number");
  if (!sid || !token || !from) return false;
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    },
  );
  return res.ok;
}

async function runDaily(force: boolean): Promise<Record<string, unknown>> {
  const { hour, date } = etParts();
  if (!force && hour !== 0) return { daily: "not the hour" };

  // Dedupe: one daily send per ET date.
  const { error: logErr } = await supabase.from("notify_log").insert({
    kind: "daily", ref: date,
  });
  if (logErr) return { daily: "already sent" };

  const { data: ballot } = await supabase.rpc("api_today_ballot");
  if (!ballot) return { daily: "no ballot scheduled" };

  const site = (await config("site_url")) ?? "https://www.playfirstballot.com";
  const n = ballot.ballot_number;
  const text = `First Ballot No. ${n} is live. One career, no name — IN or OUT? ${site}`;

  const pushSent = await sendPush(JSON.stringify({
    title: `Ballot No. ${n} is live`,
    body: "One career, no name. The booth is open.",
    url: site,
  }));

  const { data: subs } = await supabase
    .from("daily_subscribers").select("*").eq("active", true);
  let emails = 0, smses = 0;
  for (const s of subs ?? []) {
    if (s.channel === "email") {
      if (await sendEmail(
        s.address,
        `Ballot No. ${n} is live — your call`,
        `<p style="font-family:Georgia,serif;font-size:17px">One career a day. No names. Your call.</p>
         <p style="font-family:Georgia,serif">Ballot No. ${n} just went live. The booth closes at midnight ET.</p>
         <p><a href="${site}" style="font-family:Georgia,serif;font-weight:bold">Cast your verdict →</a></p>
         <p style="font-size:11px;color:#888">Unsubscribe: reply STOP or visit ${site}/me</p>`,
      )) emails++;
    } else if (s.channel === "sms") {
      if (await sendSms(s.address, text)) smses++;
    }
  }

  return { daily: "sent", push: pushSent, emails, smses };
}

async function runResolutions(): Promise<Record<string, unknown>> {
  const { data: queue } = await supabase
    .from("resolution_queue").select("*").eq("processed", false).limit(10);
  if (!queue?.length) return { resolutions: 0 };

  const site = (await config("site_url")) ?? "https://www.playfirstballot.com";
  let notified = 0;

  for (const item of queue) {
    const { data: ballot } = await supabase
      .from("ballots").select("id, ballot_number, truth").eq("id", item.ballot_id).single();
    if (!ballot) continue;
    const inducted = ballot.truth?.status === "in";

    const { data: voters } = await supabase
      .from("votes").select("device_id, user_id, verdict, created_at")
      .eq("ballot_id", item.ballot_id);

    const right = new Set<string>();
    const deviceIds = new Set<string>();
    const userIds = new Set<string>();
    for (const v of voters ?? []) {
      const correct = inducted === (v.verdict === "IN" || v.verdict === "YES");
      if (v.device_id) {
        deviceIds.add(v.device_id);
        if (correct) right.add(v.device_id);
      }
      if (v.user_id) {
        userIds.add(v.user_id);
        if (correct) right.add(v.user_id);
      }
    }

    // Web push to every voter's subscribed device (message is per-identity).
    const pub = await config("vapid_public_key");
    const priv = await config("vapid_private_key");
    if (pub && priv) {
      webpush.setVapidDetails("mailto:ahmed@pipelinewithahmed.com", pub, priv);
      const { data: subs } = await supabase.from("push_subscriptions").select("*");
      for (const sub of subs ?? []) {
        const idKey = sub.device_id && deviceIds.has(sub.device_id)
          ? sub.device_id
          : sub.user_id && userIds.has(sub.user_id) ? sub.user_id : null;
        if (!idKey) continue;
        const wasRight = right.has(idKey);
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: `Ballot No. ${ballot.ballot_number} just resolved`,
              body: `History ruled: ${inducted ? "IN" : "OUT"}. You were ${wasRight ? "right" : "wrong"}.`,
              url: `${site}/b/${ballot.ballot_number}`,
            }),
          );
          notified++;
        } catch { /* expired sub */ }
      }
    }

    // Email signed-in voters.
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from("users").select("id, email").in("id", [...userIds]);
      for (const u of users ?? []) {
        if (!u.email) continue;
        const wasRight = right.has(u.id);
        if (await sendEmail(
          u.email,
          `Your verdict on Ballot No. ${ballot.ballot_number} just resolved`,
          `<p style="font-family:Georgia,serif">History ruled: <b>${inducted ? "IN" : "OUT"}</b>. You were <b>${wasRight ? "right" : "wrong"}</b>.</p>
           <p><a href="${site}/b/${ballot.ballot_number}">See the ballot →</a></p>`,
        )) notified++;
      }
    }

    await supabase.from("resolution_queue").update({ processed: true }).eq("id", item.id);
    await supabase.from("notify_log").insert({
      kind: "resolution", ref: String(item.ballot_id), detail: { notified },
    });
  }

  return { resolutions: queue.length, notified };
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const daily = await runDaily(body.force_daily === true);
  const resolutions = await runResolutions();
  return Response.json({ ...daily, ...resolutions });
});
