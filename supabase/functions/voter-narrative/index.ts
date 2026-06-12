// The one AI feature (spec §9): a 60–90 word Voter Profile narrative,
// grounded ONLY in the computed numbers. Cached in user_profiles and
// regenerated after every 10 new verdicts. Graceful template fallback when
// no Anthropic key is configured or the API errors.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const service = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface Spectrums {
  small_big: number;
  rings_stats: number;
  peak_longevity: number;
  era: number;
  offense_defense: number;
}

// Spectrum → archetype mapping (spec §9): weighted dot products, max wins.
// Kept in sync with src/lib/archetypes.ts (the avatar designs live there).
const ARCHETYPES: Array<{ name: string; w: Partial<Record<keyof Spectrums, number>> }> = [
  { name: "The Gatekeeper", w: { small_big: -1.3 } },
  { name: "The Velvet Rope", w: { small_big: -0.9, rings_stats: -0.5 } },
  { name: "The Populist", w: { small_big: 1.2 } },
  { name: "The Compiler’s Friend", w: { small_big: 0.8, peak_longevity: 0.8 } },
  { name: "The Ring Counter", w: { rings_stats: -1.3 } },
  { name: "The June Theorist", w: { rings_stats: -0.8, peak_longevity: -0.6 } },
  { name: "The Accountant", w: { rings_stats: 1.0, era: 0.5 } },
  { name: "The Spreadsheet Sicko", w: { rings_stats: 1.3, small_big: 0.3 } },
  { name: "The Peak Chaser", w: { peak_longevity: -1.3 } },
  { name: "The Comet Watcher", w: { peak_longevity: -0.9, era: 0.5 } },
  { name: "The Marathon Man", w: { peak_longevity: 1.3 } },
  { name: "The Longevity Lobbyist", w: { peak_longevity: 0.9, small_big: 0.5 } },
  { name: "The Romantic", w: { era: -1.0, peak_longevity: -0.6 } },
  { name: "The Old Head", w: { era: -0.9, small_big: -0.6 } },
  { name: "The Historian", w: { era: -1.2, rings_stats: 0.4 } },
  { name: "The Prisoner of the Moment", w: { era: 1.1, peak_longevity: -0.7 } },
  { name: "The Modernist", w: { era: 1.2, rings_stats: 0.5 } },
  { name: "The Defense Lawyer", w: { offense_defense: 1.3 } },
  { name: "The Stopper’s Advocate", w: { offense_defense: 0.9, rings_stats: -0.4 } },
  { name: "The Bucket Believer", w: { offense_defense: -1.2 } },
  { name: "The Showtime Disciple", w: { offense_defense: -0.8, era: -0.6 } },
  { name: "The Box-Office Voter", w: { offense_defense: -0.7, small_big: 0.6 } },
  { name: "The Skeptic", w: { small_big: -0.7, rings_stats: 0.7 } },
];

function pickArchetype(s: Spectrums): string {
  // No strong lean anywhere → The Even Hand.
  if (Object.values(s).every((v) => Math.abs(v) < 15)) return "The Even Hand";
  let best = ARCHETYPES[0].name;
  let bestScore = -Infinity;
  for (const a of ARCHETYPES) {
    let score = 0;
    for (const [k, w] of Object.entries(a.w)) score += (s[k as keyof Spectrums] ?? 0) * (w as number);
    if (score > bestScore) {
      bestScore = score;
      best = a.name;
    }
  }
  return best;
}

function fallbackNarrative(archetype: string, p: Record<string, unknown>): string {
  const s = p.spectrums as Spectrums;
  const lean = (v: number, a: string, b: string) =>
    Math.abs(v) < 20 ? `even-handed on ${a} vs ${b}` : v < 0 ? `${a}-leaning` : `${b}-leaning`;
  return (
    `${archetype}. Across ${p.verdict_count} blind verdicts you run ` +
    `${lean(s.small_big, "small-hall", "big-hall")}, ${lean(s.rings_stats, "rings", "stats")}, and ` +
    `${lean(s.peak_longevity, "peak", "longevity")} — agreeing with the actual Hall ` +
    `${Math.round(((p.hall_agreement as number) ?? 0) * 100)}% of the time. ` +
    `Accuracy: ${Math.round(((p.accuracy as number) ?? 0) * 100)}%. The committee should be nervous.`
  );
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await asUser.auth.getUser();
  if (!userData?.user) {
    return Response.json({ error: "auth required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { data: profile } = await asUser.rpc("api_voter_profile", {
    p_device_id: typeof body.device_id === "string" ? body.device_id : "",
  });
  if (!profile?.eligible) {
    return Response.json({ eligible: false, resolved: profile?.resolved ?? 0 });
  }

  const archetype = pickArchetype(profile.spectrums as Spectrums);

  // Cache: regenerate only after 10 new verdicts or archetype change.
  const { data: cached } = await service
    .from("user_profiles").select("narrative, archetype, verdict_count")
    .eq("user_id", userData.user.id).maybeSingle();
  if (
    cached?.narrative &&
    cached.archetype === archetype &&
    profile.verdict_count - (cached.verdict_count ?? 0) < 10
  ) {
    return Response.json({ eligible: true, archetype, narrative: cached.narrative, profile, cached: true });
  }

  let narrative = fallbackNarrative(archetype, profile);
  const { data: keyRow } = await service
    .from("app_config").select("value").eq("key", "anthropic_api_key").maybeSingle();

  if (keyRow?.value) {
    try {
      const anthropic = new Anthropic({ apiKey: keyRow.value });
      const s = profile.spectrums as Spectrums;
      const msg = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 400,
        system:
          "You write Voter Profile narratives for First Ballot, a daily NBA Hall of Fame voting game. " +
          "Voice: witty, specific, a little cutting — museum-archival, not sports-radio. " +
          "Write 60-90 words, second person. Ground every claim ONLY in the numbers provided. " +
          "Never invent players, teams, games, or facts. Never mention specific players. " +
          "Do not use headers or bullet points — one tight paragraph.",
        messages: [{
          role: "user",
          content:
            `Archetype: ${archetype}\n` +
            `Blind verdicts cast: ${profile.verdict_count} (${profile.resolved} resolvable)\n` +
            `Accuracy vs truth: ${Math.round((profile.accuracy ?? 0) * 100)}%\n` +
            `Agreement with the actual Hall: ${Math.round((profile.hall_agreement ?? 0) * 100)}%\n` +
            `Spectrums (-100..+100):\n` +
            `small-hall (-) vs big-hall (+): ${s.small_big}\n` +
            `rings (-) vs stats (+): ${s.rings_stats}\n` +
            `peak (-) vs longevity (+): ${s.peak_longevity}\n` +
            `era-romantic (-) vs era-neutral (+): ${s.era}\n` +
            `offense (-) vs defense (+): ${s.offense_defense}`,
        }],
      });
      const text = msg.content.find((b) => b.type === "text");
      if (text && "text" in text && text.text.trim().length > 40) narrative = text.text.trim();
    } catch {
      // keep fallback
    }
  }

  await service.from("user_profiles").upsert({
    user_id: userData.user.id,
    spectrums: profile.spectrums,
    archetype,
    narrative,
    verdict_count: profile.verdict_count,
    hall_agreement: profile.hall_agreement,
    updated_at: new Date().toISOString(),
  });

  return Response.json({ eligible: true, archetype, narrative, profile, cached: false });
});
