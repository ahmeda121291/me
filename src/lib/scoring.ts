"use client";

import type { Reveal, Verdict } from "./types";

// All free-tier state lives client-side (spec §7, identity ladder rung 1).
// It migrates to the account on signup (Phase 2).

const DEVICE_KEY = "fb_device_id";
const HISTORY_KEY = "fb_history";

export interface HistoryEntry {
  n: number; // ballot_number
  id: number; // ballot id
  v: Verdict;
  d: string; // live_date (YYYY-MM-DD)
  t: "in" | "out" | "pending" | "crowd";
  correct: boolean | null; // null until resolvable
  contrarian: boolean | null; // disagreed with majority AND matched truth
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getHistory(): Record<string, HistoryEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function recordReveal(liveDate: string, reveal: Reveal): HistoryEntry {
  const history = getHistory();
  const split = reveal.split;
  const total = Object.values(split).reduce((a, b) => a + b, 0);
  const mine = split[reveal.your_verdict] ?? 0;
  const isMajority = total > 0 && mine >= total - mine;

  const status = reveal.scoring === "crowd" ? "crowd" : reveal.truth.status;
  let correct: boolean | null = null;
  if (status === "in" || status === "out") {
    correct =
      (status === "in" &&
        (reveal.your_verdict === "IN" || reveal.your_verdict === "YES")) ||
      (status === "out" &&
        (reveal.your_verdict === "OUT" || reveal.your_verdict === "NO"));
  }

  const entry: HistoryEntry = {
    n: reveal.ballot_number,
    id: reveal.ballot_id,
    v: reveal.your_verdict,
    d: liveDate,
    t: status,
    correct,
    contrarian: correct === null ? null : !isMajority && correct,
  };
  history[String(reveal.ballot_id)] = entry;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return entry;
}

export function getEntryForBallot(ballotId: number): HistoryEntry | null {
  return getHistory()[String(ballotId)] ?? null;
}

export interface Stats {
  played: number;
  streak: number;
  accuracy: number | null; // 0..1 over resolvable verdicts
  contrarian: number | null; // 0..1 contrarian index
  resolvable: number;
}

// Streak = consecutive days playing the daily ballot, ending today or yesterday (ET).
export function computeStats(todayEt: string): Stats {
  const entries = Object.values(getHistory());
  const days = new Set(entries.map((e) => e.d));

  let streak = 0;
  const cursor = new Date(`${todayEt}T12:00:00Z`);
  if (!days.has(isoDay(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(isoDay(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const resolved = entries.filter((e) => e.correct !== null);
  const right = resolved.filter((e) => e.correct).length;
  const contra = resolved.filter((e) => e.contrarian).length;

  return {
    played: entries.length,
    streak,
    accuracy: resolved.length ? right / resolved.length : null,
    contrarian: resolved.length ? contra / resolved.length : null,
    resolvable: resolved.length,
  };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
