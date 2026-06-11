-- First Ballot — initial schema (spec §4)

-- reference data (populated by ingestion, §5)
create table players (
  id bigint primary key,                -- NBA person_id
  full_name text not null,
  from_year int,
  to_year int
);

create table player_seasons (
  id bigserial primary key,
  player_id bigint not null references players(id),
  season_end_year int not null,
  team_abbr text not null default '',
  age int,
  gp int,
  mpg numeric,
  ppg numeric,
  rpg numeric,
  apg numeric,
  spg numeric,
  bpg numeric,
  fg_pct numeric,
  fg3_pct numeric,
  ft_pct numeric,
  ts_pct numeric,
  unique (player_id, season_end_year, team_abbr)
);

create table awards (
  id bigserial primary key,
  player_id bigint not null references players(id),
  season_end_year int not null,
  award text not null check (award in (
    'allstar','allnba1','allnba2','allnba3','alldef1','alldef2',
    'mvp','mvp_top5','roy','dpoy'
  )),
  unique (player_id, season_end_year, award)
);

-- game content
create table ballots (
  id bigserial primary key,
  ballot_number int unique,             -- sequential, daily career ballots only
  type text not null check (type in (
    'career_hof','season_allstar','season_allnba','season_mvp5',
    'season_roy','season_max'
  )),
  sport text not null default 'nba',
  player_id bigint references players(id),
  season_end_year int,
  payload jsonb not null,               -- everything the card displays pre-reveal
  attributes jsonb,                     -- career cards only (indices for Voter Profile math)
  card_archetype text check (card_archetype in ('humbler','snub','coinflip')),
  truth jsonb not null,                 -- {status:'in'|'out'|'pending', detail:{...}}
  scoring text not null check (scoring in ('truth','crowd')),
  case_for text,
  case_against text,
  debatability numeric,                 -- 0-1, generator output (§5.3)
  live_date date,                       -- daily career ballots only
  created_at timestamptz not null default now()
);

-- one daily career ballot per date
create unique index ballots_live_date_career_uniq
  on ballots (live_date) where type = 'career_hof';

create index ballots_type_idx on ballots (type);

create table votes (
  id bigserial primary key,
  ballot_id bigint not null references ballots(id),
  device_id text not null,
  user_id uuid,
  verdict text not null,
  created_at timestamptz not null default now(),
  unique (ballot_id, device_id)
);

create index votes_ballot_idx on votes (ballot_id);
create index votes_user_idx on votes (user_id) where user_id is not null;

-- identity & commerce
create table public.users (
  id uuid primary key,                  -- = auth.users.id
  email text,
  is_member boolean not null default false,
  member_since timestamptz,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table user_profiles (
  user_id uuid primary key references public.users(id),
  spectrums jsonb,
  archetype text,
  narrative text,
  verdict_count int not null default 0,
  hall_agreement numeric,
  updated_at timestamptz not null default now()
);

create table push_subscriptions (
  id bigserial primary key,
  user_id uuid,
  device_id text,
  endpoint text not null unique,
  keys jsonb,
  created_at timestamptz not null default now()
);

create table events (
  id bigserial primary key,
  name text not null,
  device_id text,
  user_id uuid,
  props jsonb,
  created_at timestamptz not null default now()
);

create index events_name_created_idx on events (name, created_at);

-- All access goes through the service role (server-side); lock everything down.
alter table players enable row level security;
alter table player_seasons enable row level security;
alter table awards enable row level security;
alter table ballots enable row level security;
alter table votes enable row level security;
alter table public.users enable row level security;
alter table user_profiles enable row level security;
alter table push_subscriptions enable row level security;
alter table events enable row level security;

-- Signed-in users may read their own rows (member gating reads from the client are allowed).
create policy users_select_own on public.users
  for select using (auth.uid() = id);
create policy profiles_select_own on user_profiles
  for select using (auth.uid() = user_id);
