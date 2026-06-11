-- Phase 2/3: identity, membership gating, and endless-mode serving.

-- Server-only key/value config (service role only — no policies).
create table app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;

insert into app_config (key, value) values
  ('admin_emails', 'ahmed@pipelinewithahmed.com'),
  ('site_url', 'https://ahmeda121291-me-git-claude-pensive-2f0588-ahmed-8960s-projects.vercel.app');

-- Mirror auth users into public.users.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Membership check. Admin allowlist emails are implicitly members.
create or replace function api_is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.is_member
        or u.email = any (string_to_array(
             coalesce((select value from app_config where key = 'admin_emails'), ''), ',')))
  );
$$;

-- Claim anonymous history on signup (spec §7: localStorage → account).
create or replace function api_claim_votes(p_device_id text)
returns int language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  update votes set user_id = auth.uid()
  where device_id = p_device_id and user_id is null;
  get diagnostics n = row_count;
  return n;
end; $$;

-- Endless-mode serving with no-repeat (spec §5.3): a ballot is never served
-- twice to the same identity until the mode pool is exhausted.
create or replace function api_next_season_ballot(p_mode text, p_device_id text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare result jsonb;
begin
  if p_mode not in ('season_allstar','season_allnba','season_mvp5','season_roy','season_max') then
    raise exception 'unknown mode';
  end if;
  if not api_is_member() then
    raise exception 'membership required';
  end if;

  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'scoring', b.scoring, 'payload', b.payload,
    'season_end_year', b.season_end_year)
  into result
  from ballots b
  where b.type = p_mode
    and not exists (
      select 1 from votes v where v.ballot_id = b.id
        and (v.device_id = p_device_id
          or (auth.uid() is not null and v.user_id = auth.uid())))
  order by random()
  limit 1;

  return result;
end; $$;

-- Mode pool sizes + how many this identity has played (locked-hub display).
create or replace function api_mode_counts(p_device_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(t.type, jsonb_build_object('total', t.total, 'played', t.played)), '{}'::jsonb)
  from (
    select b.type, count(*) as total,
      count(*) filter (where exists (
        select 1 from votes v where v.ballot_id = b.id
          and (v.device_id = p_device_id
            or (auth.uid() is not null and v.user_id = auth.uid())))) as played
    from ballots b
    where b.type like 'season_%'
    group by b.type
  ) t;
$$;

-- api_vote now records user_id for signed-in voters; api_reveal includes
-- ballot type + season for season-mode reveal copy.
create or replace function api_reveal(p_ballot_id bigint, p_device_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_verdict text;
  v_result jsonb;
begin
  select verdict into v_verdict
  from votes where ballot_id = p_ballot_id and device_id = p_device_id;

  if v_verdict is null then return null; end if;

  select jsonb_build_object(
    'ballot_id', b.id,
    'ballot_number', b.ballot_number,
    'type', b.type,
    'season_end_year', b.season_end_year,
    'your_verdict', v_verdict,
    'player_name', p.full_name,
    'truth', b.truth,
    'scoring', b.scoring,
    'case_for', b.case_for,
    'case_against', b.case_against,
    'split', (
      select coalesce(jsonb_object_agg(s.verdict, s.n), '{}'::jsonb)
      from (select verdict, count(*)::int as n from votes where ballot_id = b.id group by verdict) s
    ))
  into v_result
  from ballots b
  left join players p on p.id = b.player_id
  where b.id = p_ballot_id;

  return v_result;
end; $$;

create or replace function api_vote(p_ballot_id bigint, p_device_id text, p_verdict text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if p_verdict not in ('IN','OUT','YES','NO','1st','2nd','3rd','NONE') then
    raise exception 'invalid verdict';
  end if;
  if p_device_id is null or length(p_device_id) < 8 or length(p_device_id) > 64 then
    raise exception 'invalid device';
  end if;

  insert into votes (ballot_id, device_id, verdict, user_id)
  values (p_ballot_id, p_device_id, p_verdict, auth.uid())
  on conflict (ballot_id, device_id) do nothing;

  return api_reveal(p_ballot_id, p_device_id);
end; $$;

-- Account status for /me.
create or replace function api_me()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'email', (select email from public.users where id = auth.uid()),
    'is_member', api_is_member(),
    'member_since', (select member_since from public.users where id = auth.uid()),
    'has_stripe', (select stripe_customer_id is not null from public.users where id = auth.uid())
  ) end;
$$;

revoke all on function api_is_member() from public;
revoke all on function api_claim_votes(text) from public;
revoke all on function api_next_season_ballot(text, text) from public;
revoke all on function api_mode_counts(text) from public;
revoke all on function api_me() from public;

grant execute on function api_is_member() to anon, authenticated, service_role;
grant execute on function api_claim_votes(text) to authenticated, service_role;
grant execute on function api_next_season_ballot(text, text) to authenticated, service_role;
grant execute on function api_mode_counts(text) to anon, authenticated, service_role;
grant execute on function api_me() to authenticated, service_role;
