-- Phase 5: notification infrastructure (push + email + SMS daily ballot,
-- pending-resolution alerts) and the five admin surfaces (spec §10, §11).

-- Daily ballot subscriptions: email and/or SMS with a link to the ballot.
create table daily_subscribers (
  id bigserial primary key,
  channel text not null check (channel in ('email','sms')),
  address text not null,
  device_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (channel, address)
);
alter table daily_subscribers enable row level security;

-- Send-dedupe ledger.
create table notify_log (
  id bigserial primary key,
  kind text not null,
  ref text not null,
  sent_on date not null default (now() at time zone 'America/New_York')::date,
  detail jsonb,
  created_at timestamptz not null default now(),
  unique (kind, ref, sent_on)
);
alter table notify_log enable row level security;

-- Pending-ballot resolutions waiting to be fanned out to their voters.
create table resolution_queue (
  id bigserial primary key,
  ballot_id bigint not null references ballots(id),
  processed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table resolution_queue enable row level security;

-- Subscribe to the daily ballot by email or SMS (no account required).
create or replace function api_subscribe_daily(p_channel text, p_address text, p_device_id text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare clean text;
begin
  if p_channel = 'email' then
    clean := lower(trim(p_address));
    if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'invalid email';
    end if;
  elsif p_channel = 'sms' then
    clean := regexp_replace(p_address, '[^0-9+]', '', 'g');
    if clean !~ '^\+?[0-9]{10,15}$' then
      raise exception 'invalid phone number';
    end if;
    if left(clean, 1) <> '+' then clean := '+1' || clean; end if;
  else
    raise exception 'invalid channel';
  end if;

  insert into daily_subscribers (channel, address, device_id)
  values (p_channel, clean, p_device_id)
  on conflict (channel, address) do update set active = true, device_id = excluded.device_id;

  insert into events (name, device_id, props)
  values ('push_optin', p_device_id, jsonb_build_object('channel', p_channel));

  return jsonb_build_object('subscribed', true, 'channel', p_channel);
end; $$;

create or replace function api_unsubscribe_daily(p_channel text, p_address text)
returns void language sql volatile security definer set search_path = public as $$
  update daily_subscribers set active = false
  where channel = p_channel and lower(address) = lower(trim(p_address));
$$;

-- Web push subscription registration (spec §11).
create or replace function api_push_subscribe(p_device_id text, p_endpoint text, p_keys jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_endpoint is null or p_endpoint !~ '^https://' then
    raise exception 'invalid endpoint';
  end if;
  insert into push_subscriptions (user_id, device_id, endpoint, keys)
  values (auth.uid(), p_device_id, p_endpoint, p_keys)
  on conflict (endpoint) do update set keys = excluded.keys,
    device_id = excluded.device_id,
    user_id = coalesce(excluded.user_id, push_subscriptions.user_id);
  insert into events (name, device_id, props)
  values ('push_optin', p_device_id, jsonb_build_object('channel', 'push'));
end; $$;

-- ───────────────────────── admin (spec §10) ─────────────────────────

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select u.email = any (string_to_array(
      coalesce((select value from app_config where key = 'admin_emails'), ''), ','))
    from public.users u where u.id = auth.uid()
  ), false);
$$;

-- (1) Calendar: the next 30 days of daily ballots, with gaps visible.
create or replace function api_admin_calendar()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else (
    select jsonb_agg(jsonb_build_object(
      'date', d.day, 'ballot_number', b.ballot_number, 'player', p.full_name,
      'truth_status', b.truth->>'status') order by d.day)
    from generate_series(
      (now() at time zone 'America/New_York')::date,
      (now() at time zone 'America/New_York')::date + 29, interval '1 day') as d(day)
    left join ballots b on b.type = 'career_hof' and b.live_date = d.day::date
    left join players p on p.id = b.player_id
  ) end;
$$;

-- (3) Pool dashboard: per-mode counts + debatability histogram.
create or replace function api_admin_pool()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else (
    select jsonb_object_agg(t.type, t.info) from (
      select b.type, jsonb_build_object(
        'total', count(*),
        'voted_on', count(distinct v.ballot_id),
        'histogram', (
          select jsonb_agg(c order by bucket) from (
            select width_bucket(debatability, 0, 1, 5) as bucket, count(*) as c
            from ballots b2 where b2.type = b.type and b2.debatability is not null
            group by 1) h)
      ) as info
      from ballots b left join votes v on v.ballot_id = b.id
      group by b.type
    ) t
  ) end;
$$;

-- (5) Metrics from the events table + core tables.
create or replace function api_admin_metrics()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else jsonb_build_object(
    'votes_by_day', (
      select jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d) from (
        select created_at::date as d, count(*) as n from votes
        where created_at > now() - interval '14 days' group by 1) t),
    'total_votes', (select count(*) from votes),
    'signups', (select count(*) from public.users),
    'members', (select count(*) from public.users where is_member),
    'share_clicks', (select count(*) from events where name = 'share_click'),
    'checkout_starts', (select count(*) from events where name = 'checkout_start'),
    'checkout_successes', (select count(*) from events where name = 'checkout_success'),
    'push_optins', (select count(*) from events where name = 'push_optin'),
    'daily_subscribers', (select count(*) from daily_subscribers where active),
    'pending_ballots', (
      select jsonb_agg(jsonb_build_object('id', b.id, 'ballot_number', b.ballot_number,
        'player', p.full_name, 'eligible_year', b.truth->'detail'->>'eligible_year'))
      from ballots b join players p on p.id = b.player_id
      where b.type = 'career_hof' and b.truth->>'status' = 'pending')
  ) end;
$$;

-- (2) Career-card editor: search → auto-pull (fill-in-the-blanks curation).
create or replace function api_admin_player_search(p_q text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else (
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.full_name, 'from', p.from_year, 'to', p.to_year,
      'hof', p.hof,
      'allstar', (select count(*) from awards a where a.player_id = p.id and a.award = 'allstar'),
      'has_card', exists(select 1 from ballots b where b.player_id = p.id and b.type = 'career_hof')))
    from (
      select * from players where full_name ilike '%' || p_q || '%'
      order by to_year desc nulls last limit 20
    ) p
  ) end;
$$;

create or replace function api_admin_player_card(p_player_id bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not is_admin() then null else (
    select jsonb_build_object(
      'player', jsonb_build_object('id', p.id, 'name', p.full_name,
        'from', p.from_year, 'to', p.to_year, 'hof', p.hof, 'pos', p.pos),
      'career', (
        select jsonb_build_object(
          'ppg', round(sum(ps.ppg*ps.gp)/nullif(sum(ps.gp),0),1),
          'rpg', round(sum(ps.rpg*ps.gp)/nullif(sum(ps.gp),0),1),
          'apg', round(sum(ps.apg*ps.gp)/nullif(sum(ps.gp),0),1),
          'spg', round(sum(coalesce(ps.spg,0)*ps.gp)/nullif(sum(ps.gp),0),1),
          'bpg', round(sum(coalesce(ps.bpg,0)*ps.gp)/nullif(sum(ps.gp),0),1),
          'mpg', round(sum(ps.mpg*ps.gp)/nullif(sum(ps.gp),0),1),
          'gp', sum(ps.gp),
          'fg_pct', round(sum(ps.fg_pct*ps.gp) filter (where ps.fg_pct is not null)
            / nullif(sum(ps.gp) filter (where ps.fg_pct is not null),0), 3),
          'fg3_pct', round(sum(ps.fg3_pct*ps.gp) filter (where ps.fg3_pct is not null)
            / nullif(sum(ps.gp) filter (where ps.fg3_pct is not null),0), 3),
          'ft_pct', round(sum(ps.ft_pct*ps.gp) filter (where ps.ft_pct is not null)
            / nullif(sum(ps.gp) filter (where ps.ft_pct is not null),0), 3),
          'seasons', count(distinct ps.season_end_year))
        from player_seasons ps
        where ps.player_id = p.id and ps.team_abbr not in ('2TM','3TM','4TM','5TM','TOT')),
      'sparkline', (
        select jsonb_agg(t.ppg order by t.yr) from (
          select distinct on (season_end_year) season_end_year yr, ppg
          from player_seasons where player_id = p.id
          order by season_end_year, gp desc nulls last) t),
      'accolades', (
        select jsonb_build_object(
          'allstar', count(*) filter (where a.award = 'allstar'),
          'allnba', count(*) filter (where a.award in ('allnba1','allnba2','allnba3')),
          'alldef', count(*) filter (where a.award in ('alldef1','alldef2')),
          'mvp', count(*) filter (where a.award = 'mvp'),
          'roy', count(*) filter (where a.award = 'roy') > 0,
          'dpoy', count(*) filter (where a.award = 'dpoy'))
        from awards a where a.player_id = p.id),
      'suggested_truth', case
        when p.hof then jsonb_build_object('status','in','detail','{}'::jsonb)
        when p.to_year >= extract(year from now())::int - 4
          then jsonb_build_object('status','pending','detail',
            jsonb_build_object('eligible_year', p.to_year + 4))
        else jsonb_build_object('status','out','detail','{}'::jsonb) end)
    from players p where p.id = p_player_id
  ) end;
$$;

create or replace function api_admin_schedule_card(
  p_player_id bigint, p_live_date date, p_era_band text, p_rings int,
  p_archetype text, p_truth jsonb, p_case_for text, p_case_against text,
  p_debatability numeric)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_card jsonb;
  v_number int;
  v_date date;
  v_id bigint;
begin
  if not is_admin() then raise exception 'admin only'; end if;

  v_card := api_admin_player_card(p_player_id);
  select coalesce(max(ballot_number), 0) + 1 into v_number from ballots;
  v_date := coalesce(p_live_date,
    (select greatest(max(live_date) + 1, (now() at time zone 'America/New_York')::date)
     from ballots where type = 'career_hof'));

  insert into ballots (ballot_number, type, player_id, payload, attributes,
    card_archetype, truth, scoring, case_for, case_against, debatability, live_date)
  values (
    v_number, 'career_hof', p_player_id,
    jsonb_build_object(
      'era_band', p_era_band,
      'career', v_card->'career',
      'accolades', (v_card->'accolades') - 'dpoy' || jsonb_build_object('champ', p_rings),
      'sparkline', v_card->'sparkline'),
    jsonb_build_object(
      'rings', p_rings,
      'allstar', (v_card->'accolades'->>'allstar')::int,
      'allnba', (v_card->'accolades'->>'allnba')::int,
      'alldef', (v_card->'accolades'->>'alldef')::int,
      'mvp', (v_card->'accolades'->>'mvp')::int,
      'peak_index', least(1.0, (select max((e.value)::numeric) from jsonb_array_elements(v_card->'sparkline') e) / 35.0),
      'longevity_index', least(1.0, ((v_card->'career'->>'gp')::numeric) / 1400.0),
      'scoring_index', least(1.0, ((v_card->'career'->>'ppg')::numeric) / 30.0),
      'playmaking_index', least(1.0, ((v_card->'career'->>'apg')::numeric) / 10.0),
      'defense_index', least(1.0, (v_card->'accolades'->>'alldef')::numeric * 0.12
        + (((v_card->'career'->>'spg')::numeric + (v_card->'career'->>'bpg')::numeric) / 5.0)),
      'era_decade', (substring(p_era_band from '\d{4}'))::int,
      'advanced_divergence', 0),
    p_archetype, p_truth, 'truth', p_case_for, p_case_against,
    coalesce(p_debatability, 0.7), v_date)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'ballot_number', v_number, 'live_date', v_date);
end; $$;

-- (4) Resolve pending: set the truth, queue resolution notifications.
create or replace function api_admin_resolve(p_ballot_id bigint, p_status text, p_detail jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_voters int;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if p_status not in ('in','out') then raise exception 'status must be in/out'; end if;

  update ballots set truth = jsonb_build_object('status', p_status, 'detail', coalesce(p_detail, '{}'::jsonb))
  where id = p_ballot_id and truth->>'status' = 'pending';
  if not found then raise exception 'ballot not pending'; end if;

  insert into resolution_queue (ballot_id) values (p_ballot_id);
  select count(*) into v_voters from votes where ballot_id = p_ballot_id;
  return jsonb_build_object('resolved', true, 'voters_to_notify', v_voters);
end; $$;

revoke all on function api_subscribe_daily(text, text, text) from public;
revoke all on function api_unsubscribe_daily(text, text) from public;
revoke all on function api_push_subscribe(text, text, jsonb) from public;
revoke all on function is_admin() from public;
revoke all on function api_admin_calendar() from public;
revoke all on function api_admin_pool() from public;
revoke all on function api_admin_metrics() from public;
revoke all on function api_admin_player_search(text) from public;
revoke all on function api_admin_player_card(bigint) from public;
revoke all on function api_admin_schedule_card(bigint, date, text, int, text, jsonb, text, text, numeric) from public;
revoke all on function api_admin_resolve(bigint, text, jsonb) from public;

grant execute on function api_subscribe_daily(text, text, text) to anon, authenticated, service_role;
grant execute on function api_unsubscribe_daily(text, text) to anon, authenticated, service_role;
grant execute on function api_push_subscribe(text, text, jsonb) to anon, authenticated, service_role;
grant execute on function is_admin() to authenticated, service_role;
grant execute on function api_admin_calendar() to authenticated, service_role;
grant execute on function api_admin_pool() to authenticated, service_role;
grant execute on function api_admin_metrics() to authenticated, service_role;
grant execute on function api_admin_player_search(text) to authenticated, service_role;
grant execute on function api_admin_player_card(bigint) to authenticated, service_role;
grant execute on function api_admin_schedule_card(bigint, date, text, int, text, jsonb, text, text, numeric) to authenticated, service_role;
grant execute on function api_admin_resolve(bigint, text, jsonb) to authenticated, service_role;
