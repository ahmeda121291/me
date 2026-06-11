// First Ballot — open-data fallback loader (spec §5 adjunct).
// Loads the full historical player/season/award reference tables from the
// GitHub-hosted bball-reference dataset mirror. Runs server-side on Supabase
// (service role auto-injected, unrestricted egress), so it works from
// environments where stats.nba.com is blocked. The official residential-IP
// ingestion scripts remain the source of truth to true-up against.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BASE =
  "https://raw.githubusercontent.com/sumitrodatta/bball-reference-datasets/master/Data";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const header = rows[0];
  return rows.slice(1).map((r) =>
    Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])),
  );
}

async function fetchCsv(name: string) {
  const res = await fetch(`${BASE}/${encodeURIComponent(name)}.csv`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

const num = (v: string) => (v === "" || v === "NA" ? null : Number(v));

async function batchUpsert(table: string, rows: unknown[], conflict: string) {
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + 1000) as never[], {
        onConflict: conflict,
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`${table} @${i}: ${error.message}`);
  }
}

Deno.serve(async () => {
  const t0 = Date.now();

  // players (from Player Career Info) — integer ids assigned by file order
  const career = await fetchCsv("Player Career Info");
  const idOf = new Map<string, number>();
  const players = career.map((r, i) => {
    idOf.set(r.player_id, i + 1);
    return {
      id: i + 1,
      full_name: r.player,
      from_year: num(r.from),
      to_year: num(r.to),
      bbref_id: r.player_id,
      hof: r.hof === "TRUE",
      pos: r.pos || null,
    };
  });
  await batchUpsert("players", players, "id");

  // player_seasons (from Player Per Game; NBA/BAA only)
  const perGame = await fetchCsv("Player Per Game");
  const seasons = [];
  for (const r of perGame) {
    const pid = idOf.get(r.player_id);
    if (!pid || (r.lg !== "NBA" && r.lg !== "BAA")) continue;
    const fga = num(r.fga_per_game), fta = num(r.fta_per_game), pts = num(r.pts_per_game);
    const denom = fga !== null && fta !== null ? 2 * (fga + 0.44 * fta) : 0;
    seasons.push({
      player_id: pid,
      season_end_year: Number(r.season),
      team_abbr: r.team,
      age: num(r.age),
      gp: num(r.g),
      mpg: num(r.mp_per_game),
      ppg: pts,
      rpg: num(r.trb_per_game),
      apg: num(r.ast_per_game),
      spg: num(r.stl_per_game),
      bpg: num(r.blk_per_game),
      fg_pct: num(r.fg_percent),
      fg3_pct: num(r.x3p_percent),
      ft_pct: num(r.ft_percent),
      ts_pct: denom > 0 && pts !== null ? Number((pts / denom).toFixed(3)) : null,
    });
  }
  await batchUpsert("player_seasons", seasons, "player_id,season_end_year,team_abbr");

  // awards
  const awards = new Map<string, { player_id: number; season_end_year: number; award: string }>();
  const add = (pid: number | undefined, season: number, award: string) => {
    if (pid) awards.set(`${pid}|${season}|${award}`, { player_id: pid, season_end_year: season, award });
  };

  for (const r of await fetchCsv("All-Star Selections")) {
    if (r.lg === "NBA") add(idOf.get(r.player_id), Number(r.season), "allstar");
  }
  for (const r of await fetchCsv("End of Season Teams")) {
    if (r.lg !== "NBA") continue;
    if (r.type === "All-NBA" && ["1st", "2nd", "3rd"].includes(r.number_tm)) {
      add(idOf.get(r.player_id), Number(r.season), `allnba${r.number_tm[0]}`);
    } else if (r.type === "All-Defense" && ["1st", "2nd"].includes(r.number_tm)) {
      add(idOf.get(r.player_id), Number(r.season), `alldef${r.number_tm[0]}`);
    }
  }
  const mvpBySeason = new Map<number, Array<{ pts: number; pid: number; won: boolean }>>();
  for (const r of await fetchCsv("Player Award Shares")) {
    const pid = idOf.get(r.player_id);
    if (!pid) continue;
    const season = Number(r.season);
    if (r.award === "nba mvp") {
      if (!mvpBySeason.has(season)) mvpBySeason.set(season, []);
      mvpBySeason.get(season)!.push({ pts: Number(r.pts_won), pid, won: r.winner === "TRUE" });
    } else if (r.award === "nba roy" && r.winner === "TRUE") add(pid, season, "roy");
    else if (r.award === "nba dpoy" && r.winner === "TRUE") add(pid, season, "dpoy");
  }
  for (const [season, entries] of mvpBySeason) {
    entries.sort((a, b) => b.pts - a.pts);
    for (const e of entries.slice(0, 5)) {
      add(e.pid, season, "mvp_top5");
      if (e.won) add(e.pid, season, "mvp");
    }
  }
  await batchUpsert("awards", [...awards.values()], "player_id,season_end_year,award");

  return new Response(
    JSON.stringify({
      players: players.length,
      player_seasons: seasons.length,
      awards: awards.size,
      ms: Date.now() - t0,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
