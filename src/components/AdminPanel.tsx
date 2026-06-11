"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-browser";

// Admin (spec §10): functional over pretty. Every RPC is admin-gated
// server-side; this UI is just the wrapper.

type Tab = "calendar" | "editor" | "pool" | "resolve" | "metrics";

interface CalendarDay {
  date: string;
  ballot_number: number | null;
  player: string | null;
  truth_status: string | null;
}

interface SearchHit {
  id: number;
  name: string;
  from: number;
  to: number;
  hof: boolean;
  allstar: number;
  has_card: boolean;
}

interface PendingBallot {
  id: number;
  ballot_number: number;
  player: string;
  eligible_year: string | null;
}

export default function AdminPanel() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("calendar");

  useEffect(() => {
    getSupabase()
      .rpc("is_admin")
      .then(({ data }) => setAuthorized(Boolean(data)));
  }, []);

  if (authorized === null) return <p className="py-8 text-sm opacity-50">…</p>;
  if (!authorized) {
    return (
      <p className="mt-6 rounded-2xl border border-line p-5 text-sm">
        Admins only. <a href="/signin" className="underline">Sign in</a> with an
        allowlisted email.
      </p>
    );
  }

  const tabs: Array<[Tab, string]> = [
    ["calendar", "Calendar"],
    ["editor", "Card editor"],
    ["pool", "Pool"],
    ["resolve", "Resolve"],
    ["metrics", "Metrics"],
  ];

  return (
    <div className="mt-5 pb-20">
      <nav className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === key ? "border-bronze font-semibold" : "border-line opacity-70"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-5">
        {tab === "calendar" && <CalendarTab />}
        {tab === "editor" && <EditorTab />}
        {tab === "pool" && <PoolTab />}
        {tab === "resolve" && <ResolveTab />}
        {tab === "metrics" && <MetricsTab />}
      </div>
    </div>
  );
}

function CalendarTab() {
  const [days, setDays] = useState<CalendarDay[] | null>(null);
  useEffect(() => {
    getSupabase().rpc("api_admin_calendar").then(({ data }) => setDays(data as CalendarDay[]));
  }, []);
  if (!days) return <p className="text-sm opacity-50">…</p>;
  const gaps = days.filter((d) => !d.ballot_number).length;
  return (
    <div>
      {gaps > 0 && (
        <p className="mb-3 rounded-xl border border-stamp p-3 text-sm text-stamp">
          ⚠ {gaps} unscheduled day{gaps === 1 ? "" : "s"} in the next 30 — the
          booth goes dark without a card.
        </p>
      )}
      <ul className="tabular flex flex-col gap-1 text-sm">
        {days.map((d) => (
          <li
            key={d.date}
            className={`flex justify-between rounded-lg px-3 py-1.5 ${
              d.ballot_number ? "bg-faint" : "border border-dashed border-stamp"
            }`}
          >
            <span>{d.date}</span>
            <span>
              {d.ballot_number
                ? `No. ${d.ballot_number} — ${d.player} (${d.truth_status})`
                : "— open —"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorTab() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [picked, setPicked] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    era_band: "Peaked in the 2000s",
    rings: 0,
    archetype: "coinflip",
    case_for: "",
    case_against: "",
    live_date: "",
    debatability: 0.7,
  });
  const [result, setResult] = useState<string | null>(null);

  const search = async () => {
    const { data } = await getSupabase().rpc("api_admin_player_search", { p_q: q });
    setHits((data as SearchHit[]) ?? []);
  };

  const pick = async (id: number) => {
    const { data } = await getSupabase().rpc("api_admin_player_card", { p_player_id: id });
    setPicked(data as Record<string, unknown>);
    setResult(null);
  };

  const schedule = async () => {
    if (!picked) return;
    const player = picked.player as { id: number };
    const { data, error } = await getSupabase().rpc("api_admin_schedule_card", {
      p_player_id: player.id,
      p_live_date: form.live_date || null,
      p_era_band: form.era_band,
      p_rings: form.rings,
      p_archetype: form.archetype,
      p_truth: picked.suggested_truth,
      p_case_for: form.case_for,
      p_case_against: form.case_against,
      p_debatability: form.debatability,
    });
    setResult(
      error
        ? `Error: ${error.message}`
        : `Scheduled — Ballot No. ${(data as { ballot_number: number }).ballot_number} on ${(data as { live_date: string }).live_date}`,
    );
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search a player…"
          className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-4 py-2.5"
        />
        <button onClick={search} className="rounded-xl bg-bronze px-5 font-semibold text-ivory">
          Search
        </button>
      </div>

      {hits.length > 0 && !picked && (
        <ul className="tabular flex flex-col gap-1">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                onClick={() => pick(h.id)}
                className="flex w-full justify-between rounded-lg bg-faint px-3 py-2 text-left"
              >
                <span>
                  {h.name} <span className="opacity-50">{h.from}–{h.to}</span>
                </span>
                <span className="opacity-70">
                  {h.allstar}×AS {h.hof ? "· HOF" : ""} {h.has_card ? "· has card" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <div className="rounded-2xl border border-line p-4">
          <div className="flex justify-between">
            <p className="font-semibold">
              {(picked.player as { name: string }).name}
            </p>
            <button onClick={() => setPicked(null)} className="underline opacity-60">
              change
            </button>
          </div>
          <pre className="tabular mt-2 overflow-x-auto rounded-lg bg-faint p-2 text-xs">
            {JSON.stringify(picked.career, null, 1)}
          </pre>
          <p className="tabular mt-1 text-xs opacity-70">
            suggested truth: {JSON.stringify(picked.suggested_truth)}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-60">Era band</span>
              <input
                value={form.era_band}
                onChange={(e) => setForm({ ...form, era_band: e.target.value })}
                className="rounded-lg border border-line bg-transparent px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-60">Rings</span>
              <input
                type="number"
                value={form.rings}
                onChange={(e) => setForm({ ...form, rings: Number(e.target.value) })}
                className="rounded-lg border border-line bg-transparent px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-60">Archetype</span>
              <select
                value={form.archetype}
                onChange={(e) => setForm({ ...form, archetype: e.target.value })}
                className="rounded-lg border border-line bg-transparent px-3 py-2"
              >
                <option value="coinflip">coinflip</option>
                <option value="humbler">humbler</option>
                <option value="snub">snub</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs opacity-60">Live date (blank = next open)</span>
              <input
                type="date"
                value={form.live_date}
                onChange={(e) => setForm({ ...form, live_date: e.target.value })}
                className="rounded-lg border border-line bg-transparent px-3 py-2"
              />
            </label>
          </div>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs opacity-60">The case for</span>
            <textarea
              value={form.case_for}
              onChange={(e) => setForm({ ...form, case_for: e.target.value })}
              rows={2}
              className="rounded-lg border border-line bg-transparent px-3 py-2"
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs opacity-60">The case against</span>
            <textarea
              value={form.case_against}
              onChange={(e) => setForm({ ...form, case_against: e.target.value })}
              rows={2}
              className="rounded-lg border border-line bg-transparent px-3 py-2"
            />
          </label>
          <button
            onClick={schedule}
            disabled={!form.case_for || !form.case_against}
            className="mt-3 rounded-xl bg-bronze px-6 py-2.5 font-semibold text-ivory disabled:opacity-50"
          >
            Schedule card
          </button>
          {result && <p className="mt-2">{result}</p>}
        </div>
      )}
    </div>
  );
}

function PoolTab() {
  const [pool, setPool] = useState<Record<string, {
    total: number; voted_on: number; histogram: number[] | null;
  }> | null>(null);
  useEffect(() => {
    getSupabase().rpc("api_admin_pool").then(({ data }) => setPool(data as typeof pool));
  }, []);
  if (!pool) return <p className="text-sm opacity-50">…</p>;
  return (
    <div className="flex flex-col gap-3 text-sm">
      {Object.entries(pool).map(([type, info]) => (
        <div key={type} className="rounded-2xl border border-line p-4">
          <div className="tabular flex justify-between">
            <span className="font-semibold">{type}</span>
            <span>
              {info.total} ballots · {info.voted_on} played
            </span>
          </div>
          {info.histogram && (
            <div className="mt-2 flex h-10 items-end gap-1">
              {info.histogram.map((c, i) => (
                <span
                  key={i}
                  title={`debatability bucket ${i + 1}: ${c}`}
                  className="flex-1 rounded-t bg-bronze opacity-80"
                  style={{ height: `${(c / Math.max(...info.histogram!)) * 100}%` }}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="text-xs opacity-60">
        Mint more season ballots: <code>npm run generate:ballots</code> (see README).
      </p>
    </div>
  );
}

function ResolveTab() {
  const [pending, setPending] = useState<PendingBallot[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    getSupabase().rpc("api_admin_metrics").then(({ data }) => {
      setPending(((data as { pending_ballots?: PendingBallot[] })?.pending_ballots) ?? []);
    });
  }, []);
  useEffect(load, [load]);

  const resolve = async (id: number, status: "in" | "out") => {
    const detail =
      status === "in" ? { inducted_year: new Date().getFullYear() } : {};
    const { data, error } = await getSupabase().rpc("api_admin_resolve", {
      p_ballot_id: id,
      p_status: status,
      p_detail: detail,
    });
    setMsg(
      error
        ? `Error: ${error.message}`
        : `Resolved — ${(data as { voters_to_notify: number }).voters_to_notify} voters queued for notification.`,
    );
    load();
  };

  if (!pending) return <p className="text-sm opacity-50">…</p>;
  return (
    <div className="flex flex-col gap-2 text-sm">
      {pending.length === 0 && <p className="opacity-60">Nothing pending. History is caught up.</p>}
      {pending.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-xl border border-line p-3">
          <span>
            No. {b.ballot_number} — {b.player}
            <span className="ml-2 text-xs opacity-50">eligible {b.eligible_year ?? "?"}</span>
          </span>
          <span className="flex gap-2">
            <button
              onClick={() => resolve(b.id, "in")}
              className="rounded-lg border border-bronze px-3 py-1 text-bronze"
            >
              IN
            </button>
            <button
              onClick={() => resolve(b.id, "out")}
              className="rounded-lg border border-stamp px-3 py-1 text-stamp"
            >
              OUT
            </button>
          </span>
        </div>
      ))}
      {msg && <p>{msg}</p>}
    </div>
  );
}

function MetricsTab() {
  const [m, setM] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getSupabase().rpc("api_admin_metrics").then(({ data }) => setM(data as Record<string, unknown>));
  }, []);
  if (!m) return <p className="text-sm opacity-50">…</p>;
  const days = (m.votes_by_day as Array<{ day: string; n: number }>) ?? [];
  const max = Math.max(1, ...days.map((d) => d.n));
  const stat = (label: string, v: unknown) => (
    <div className="rounded-2xl border border-line p-3 text-center">
      <p className="tabular text-2xl font-semibold">{String(v ?? 0)}</p>
      <p className="text-[10px] uppercase tracking-widest opacity-60">{label}</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {stat("Total votes", m.total_votes)}
        {stat("Signups", m.signups)}
        {stat("Members", m.members)}
        {stat("Share clicks", m.share_clicks)}
        {stat("Checkouts", m.checkout_successes)}
        {stat("Subscribers", m.daily_subscribers)}
      </div>
      <div className="rounded-2xl border border-line p-4">
        <p className="text-xs uppercase tracking-widest opacity-60">Votes — last 14 days</p>
        <div className="mt-2 flex h-20 items-end gap-1">
          {days.map((d) => (
            <span
              key={d.day}
              title={`${d.day}: ${d.n}`}
              className="flex-1 rounded-t bg-bronze"
              style={{ height: `${(d.n / max) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <p className="text-xs opacity-60">
        MRR lives in the{" "}
        <a className="underline" href="https://dashboard.stripe.com" target="_blank">
          Stripe dashboard
        </a>{" "}
        — checkout counts above come from the events table.
      </p>
    </div>
  );
}
