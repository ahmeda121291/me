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

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  headers?: Record<string, string>,
): Promise<boolean> {
  const key = await config("resend_api_key");
  if (!key) return false;
  const from = (await config("email_from")) ?? "First Ballot <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, ...(headers ? { headers } : {}) }),
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

// The daily email is the product in miniature: the blind résumé itself,
// numbers big, name sealed, one bronze button.
function dailyEmailHtml(ballot: {
  ballot_number: number;
  payload: {
    era_band?: string;
    career?: Record<string, number>;
    accolades?: { allstar?: number; champ?: number; mvp?: number };
  };
}, site: string): string {
  const c = ballot.payload?.career ?? {};
  const a = ballot.payload?.accolades ?? {};
  const era = ballot.payload?.era_band ?? "";
  const mono = "Consolas,Menlo,'Courier New',monospace";
  const serif = "Georgia,'Times New Roman',serif";
  const statCell = (v: unknown, label: string) =>
    `<td align="center" style="padding:0 10px">
       <div style="font-family:${mono};font-size:34px;color:#191511">${v ?? "—"}</div>
       <div style="font-family:${mono};font-size:11px;letter-spacing:3px;color:#8a8276;padding-top:2px">${label}</div>
     </td>`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background-color:#F6F1E7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F1E7">
<tr><td align="center" style="padding:36px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

  <tr><td style="padding-bottom:18px">
    <table role="presentation" width="100%"><tr>
      <td style="font-family:${mono};font-size:13px;letter-spacing:4px;color:#9C6B2F">&#127936; FIRST BALLOT</td>
      <td align="right" style="font-family:${mono};font-size:13px;letter-spacing:3px;color:#8a8276">BALLOT NO. ${ballot.ballot_number}</td>
    </tr></table>
  </td></tr>

  <tr><td style="background-color:#F1EDE3;border:1px solid #ddd5c4;border-radius:16px;padding:30px 28px">
    <div style="font-family:${serif};font-style:italic;font-size:16px;color:#6f6759">${era}</div>
    <div style="font-family:${serif};font-size:40px;font-weight:bold;color:#191511;letter-spacing:8px;padding:14px 0 4px">&#9608;&#9608;&#9608;&#9608;&#9608; &#9608;&#9608;&#9608;&#9608;&#9608;&#9608;</div>
    <div style="font-family:${serif};font-size:13px;color:#8a8276;padding-bottom:18px">The name stays sealed until you vote.</div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 -10px"><tr>
      ${statCell(c.ppg, "PPG")}
      ${statCell(c.rpg, "RPG")}
      ${statCell(c.apg, "APG")}
      ${statCell(c.gp, "GP")}
    </tr></table>

    <div style="font-family:${serif};font-size:17px;font-weight:bold;color:#191511;padding-top:20px">
      ${a.allstar ?? 0}&#215; All-Star &#183; ${a.champ ?? 0}&#215; champion &#183; ${(a.mvp ?? 0) > 0 ? `${a.mvp}&#215; MVP` : "0 MVPs"}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" style="padding-top:26px"><tr><td style="border-radius:10px;background-color:#9C6B2F">
      <a href="${site}" style="display:inline-block;padding:15px 34px;font-family:${serif};font-size:18px;font-weight:bold;color:#F6F1E7;text-decoration:none">Cast your verdict &#8594;</a>
    </td></tr></table>
    <div style="font-family:${serif};font-size:13px;color:#8a8276;padding-top:12px">Hall of Fame: IN or OUT? The booth closes at midnight ET.</div>
  </td></tr>

  <tr><td style="padding-top:14px;background-color:#F6F1E7">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #c9a06a;border-radius:14px;background-color:#F6F1E7"><tr><td style="padding:20px 24px">
      <div style="font-family:${mono};font-size:11px;letter-spacing:3px;color:#9C6B2F">THE CLUB</div>
      <div style="font-family:${serif};font-size:16px;color:#191511;padding-top:6px;line-height:1.5">
        One a day not enough? Members get <b>five more game modes</b> with
        1,800+ ballots, the <b>full playable archive</b>, and an
        <b>AI-written Voter Profile</b> that knows how you judge careers.
      </div>
      <div style="font-family:${serif};font-size:14px;color:#6f6759;padding-top:8px">
        $8.99/mo &#183; $59.99/yr &#183; no ads, ever &#8212;
        <a href="${site}/club" style="color:#9C6B2F;font-weight:bold">see what&#8217;s inside &#8594;</a>
      </div>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding-top:18px">
    <table role="presentation" width="100%"><tr>
      <td style="font-family:${serif};font-style:italic;font-size:13px;color:#8a8276">One career a day. No names. Your call.</td>
      <td align="right" style="font-family:${serif};font-size:12px;color:#a89f8f"><a href="{{UNSUB}}" style="color:#a89f8f">Unsubscribe</a></td>
    </tr></table>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function runDaily(force: boolean, testEmail?: string): Promise<Record<string, unknown>> {
  const { hour, date } = etParts();

  const { data: ballot } = await supabase.rpc("api_today_ballot");
  if (!ballot) return { daily: "no ballot scheduled" };

  const site = (await config("site_url")) ?? "https://www.playfirstballot.com";
  const n = ballot.ballot_number;
  const subject = `Ballot No. ${n} is live — one career, no name. Your call.`;
  const baseHtml = dailyEmailHtml(ballot, site);
  const unsubUrl = (addr: string) =>
    `${site}/unsubscribe?c=email&a=${encodeURIComponent(addr)}`;
  const emailFor = (addr: string) => ({
    html: baseHtml.replaceAll("{{UNSUB}}", unsubUrl(addr)),
    // One-click unsubscribe headers — required by Gmail/Yahoo bulk-sender
    // rules and a meaningful deliverability signal.
    headers: {
      "List-Unsubscribe": `<${site}/api/unsubscribe?c=email&a=${encodeURIComponent(addr)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  // Test mode: send the daily email to one address, skip the log/fan-out.
  if (testEmail) {
    const t = emailFor(testEmail);
    const ok = await sendEmail(testEmail, subject, t.html, t.headers);
    return { daily: "test", sent: ok };
  }

  if (!force && hour !== 0) return { daily: "not the hour" };

  // Dedupe: one daily send per ET date.
  const { error: logErr } = await supabase.from("notify_log").insert({
    kind: "daily", ref: date,
  });
  if (logErr) return { daily: "already sent" };

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
      const e = emailFor(s.address);
      if (await sendEmail(s.address, subject, e.html, e.headers)) emails++;
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
  const daily = await runDaily(
    body.force_daily === true,
    typeof body.test_email === "string" ? body.test_email : undefined,
  );
  const resolutions = await runResolutions();
  return Response.json({ ...daily, ...resolutions });
});
