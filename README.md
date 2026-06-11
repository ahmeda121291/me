# First Ballot

**One career a day. No names. Your call.**

A daily NBA voting game. Every day at midnight ET one anonymized career résumé
goes live — same card for everyone on earth. Vote **IN** or **OUT** of the Hall
of Fame with a hold-to-confirm stamp, then get the reveal: the name, the live
community split, the truth, your streak. Free forever, no account required.
**The Club** ($8.99/mo · $59.99/yr) unlocks five more game modes, the playable
archive, the AI Voter Profile, and pending-resolution alerts.

Built with Next.js (App Router) + TypeScript + Tailwind on Vercel, Supabase
(Postgres + Auth), Stripe, `next/og` share images, web push, and the Anthropic
API (exactly one feature: the Voter Profile narrative).

## Status — build phases (spec §14)

- [x] **Phase 1 — The free loop**: migrations, sample seed, daily ballot page,
  vote API + live split, reveal choreography, Locker Room, localStorage
  scoring, share images (OG + story), `/b/[n]` landing, countdown.
- [ ] Phase 2 — Identity + commerce (Supabase Auth, Stripe checkout/webhooks, The Club)
- [ ] Phase 3 — Data + variant games (ingestion, generator, `/play` endless modes)
- [ ] Phase 4 — The Voter Profile (spectrum math, archetypes, AI narrative)
- [ ] Phase 5 — Admin, push, polish

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the gaps (see comments in the file)
npm run dev
```

The deployed free game works with **no secrets at all**: gameplay runs through
Postgres security-definer RPCs that the anon key may execute. The service role
key is only needed for seeding, ingestion, and Phase 2+ server features.

### Database

Schema lives in `supabase/migrations/` (already applied to the production
project `yggdfeoznuqettgfrfca`). To stand up a fresh project:

```bash
# with the Supabase CLI linked to your project:
supabase db push                      # applies supabase/migrations/*.sql
psql "$DATABASE_URL" -f supabase/seed.sql   # 14 sample career cards
```

The seed schedules sample ballots daily starting "today" (ET) so the full
loop — vote → reveal → share — runs end-to-end before real curation.

## Architecture notes

- **One ballot engine** (spec §3): every playable unit is a `ballots` row;
  `BallotCard` renders `{type, payload, verdictOptions}`, `RevealSequence`
  runs the choreography. New ballot types are a config entry + payload mapper.
- **Production code never calls an external sports API** (spec §5). All
  gameplay reads from Supabase. Ingestion is a local-only concern.
- **Anonymous-first identity** (spec §7): a client UUID rides every vote;
  free-tier streak/accuracy/contrarian state lives in localStorage and
  migrates to the account on signup.
- **Game RPCs**: `api_today_ballot`, `api_vote`, `api_reveal`,
  `api_ballot_share`, `api_log_event` — security definer, anon-executable,
  truth/name never readable via table selects.

## NBA data ingestion (Phase 3 — important)

`stats.nba.com` blocks datacenter IPs, so **ingestion runs from a residential
connection** (your laptop), never on Vercel or CI:

```bash
npm run ingest:smoke                       # three seasons, quick verification
npm run ingest:seasons -- --from=1952 --to=2026
npm run ingest:awards                      # loads data/awards.csv
npm run generate:ballots -- --type=season_allstar --count=500
```

An open-data fallback loader (GitHub-mirrored stat dumps) populates the full
roster from cloud environments where stats.nba.com is unreachable; the
official ingestion above remains the source of truth to true-up against.

## Stripe

Live products on the connected account (`AgentMastery`):

| | ID |
|---|---|
| Product | `prod_UgWOCvKOIpY41Y` |
| Monthly $8.99 | `price_1Th9LbRG0Z7ZCg7WU1YNAw4m` |
| Annual $59.99 | `price_1Th9LdRG0Z7ZCg7WZ4KTywvT` |

Checkout/webhook wiring lands in Phase 2.
