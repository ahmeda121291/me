-- First Ballot — game RPCs.
-- The anonymized game loop runs through security-definer functions so the
-- anon key can play without exposing truth/name data via table reads.

-- Today's daily career ballot (pre-reveal payload only — no truth, no name).
create or replace function api_today_ballot()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', b.id,
    'ballot_number', b.ballot_number,
    'type', b.type,
    'scoring', b.scoring,
    'payload', b.payload,
    'live_date', b.live_date
  )
  from ballots b
  where b.type = 'career_hof'
    and b.live_date = (now() at time zone 'America/New_York')::date
  limit 1;
$$;

-- Reveal: only available to a device that has voted on the ballot.
create or replace function api_reveal(p_ballot_id bigint, p_device_id text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_verdict text;
  v_result jsonb;
begin
  select verdict into v_verdict
  from votes where ballot_id = p_ballot_id and device_id = p_device_id;

  if v_verdict is null then
    return null;
  end if;

  select jsonb_build_object(
    'ballot_id', b.id,
    'ballot_number', b.ballot_number,
    'your_verdict', v_verdict,
    'player_name', p.full_name,
    'truth', b.truth,
    'scoring', b.scoring,
    'case_for', b.case_for,
    'case_against', b.case_against,
    'split', (
      select coalesce(jsonb_object_agg(s.verdict, s.n), '{}'::jsonb)
      from (
        select verdict, count(*)::int as n
        from votes where ballot_id = b.id group by verdict
      ) s
    )
  )
  into v_result
  from ballots b
  left join players p on p.id = b.player_id
  where b.id = p_ballot_id;

  return v_result;
end;
$$;

-- Vote: dedupe on the unique constraint, then return the reveal.
create or replace function api_vote(p_ballot_id bigint, p_device_id text, p_verdict text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if p_verdict not in ('IN','OUT','YES','NO','1st','2nd','3rd','NONE') then
    raise exception 'invalid verdict';
  end if;
  if p_device_id is null or length(p_device_id) < 8 or length(p_device_id) > 64 then
    raise exception 'invalid device';
  end if;

  insert into votes (ballot_id, device_id, verdict)
  values (p_ballot_id, p_device_id, p_verdict)
  on conflict (ballot_id, device_id) do nothing;

  return api_reveal(p_ballot_id, p_device_id);
end;
$$;

-- Share/landing data for /b/[n] and OG images. Name + split are share-card
-- material; truth status drives the stamp art. Payload included for the card art.
create or replace function api_ballot_share(p_ballot_number int)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ballot_id', b.id,
    'ballot_number', b.ballot_number,
    'live_date', b.live_date,
    'is_today', b.live_date = (now() at time zone 'America/New_York')::date,
    'payload', b.payload,
    'player_name', p.full_name,
    'truth_status', b.truth->>'status',
    'split', (
      select coalesce(jsonb_object_agg(s.verdict, s.n), '{}'::jsonb)
      from (
        select verdict, count(*)::int as n
        from votes where ballot_id = b.id group by verdict
      ) s
    )
  )
  from ballots b
  left join players p on p.id = b.player_id
  where b.ballot_number = p_ballot_number and b.type = 'career_hof'
    and b.live_date <= (now() at time zone 'America/New_York')::date
  limit 1;
$$;

-- Lightweight analytics logger.
create or replace function api_log_event(p_name text, p_device_id text, p_props jsonb)
returns void
language sql volatile security definer
set search_path = public
as $$
  insert into events (name, device_id, props)
  select p_name, p_device_id, p_props
  where p_name in ('ballot_view','vote','share_click','checkout_start','checkout_success','push_optin');
$$;

revoke all on function api_today_ballot() from public;
revoke all on function api_reveal(bigint, text) from public;
revoke all on function api_vote(bigint, text, text) from public;
revoke all on function api_ballot_share(int) from public;
revoke all on function api_log_event(text, text, jsonb) from public;

grant execute on function api_today_ballot() to anon, authenticated, service_role;
grant execute on function api_reveal(bigint, text) to anon, authenticated, service_role;
grant execute on function api_vote(bigint, text, text) to anon, authenticated, service_role;
grant execute on function api_ballot_share(int) to anon, authenticated, service_role;
grant execute on function api_log_event(text, text, jsonb) to anon, authenticated, service_role;
