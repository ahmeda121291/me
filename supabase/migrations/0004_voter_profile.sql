-- Phase 4: the Voter Profile (spec §9) — deterministic spectrum math.
-- Spectrums are -100..+100. For each attribute x, pref(x) = avg(x | voted IN)
-- minus avg(x | all career cards seen): how much the voter's INs lean toward
-- that quality relative to their own ballot diet. Scaled and clamped.

create or replace function api_voter_profile(p_device_id text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  with mine as (
    select v.verdict, b.truth, b.scoring, b.type, b.attributes as a, b.id as ballot_id
    from votes v
    join ballots b on b.id = v.ballot_id
    where v.device_id = p_device_id
       or (auth.uid() is not null and v.user_id = auth.uid())
  ),
  matched as (
    select *,
      case
        when scoring <> 'truth' or truth->>'status' = 'pending' then null
        when type = 'season_allnba' then
          case when truth->>'status' = 'in' then verdict = (truth->'detail'->>'allnba_team')
               else verdict = 'NONE' end
        else
          (truth->>'status' = 'in') = (verdict in ('IN','YES'))
      end as correct
    from mine
  ),
  totals as (
    select count(*) as verdict_count,
      count(*) filter (where correct is not null) as resolved,
      count(*) filter (where correct) as right_calls
    from matched
  ),
  career as (
    select verdict = 'IN' as said_in,
      (a->>'rings')::numeric / 4.0 as rings_n,
      (a->>'scoring_index')::numeric as scoring_i,
      (a->>'playmaking_index')::numeric as playmaking_i,
      (a->>'defense_index')::numeric as defense_i,
      (a->>'peak_index')::numeric as peak_i,
      (a->>'longevity_index')::numeric as longevity_i,
      (a->>'era_decade')::int <= 1980 as old_era,
      truth->>'status' as status
    from matched
    where type = 'career_hof' and a is not null
  ),
  prefs as (
    select
      count(*) as n,
      avg(said_in::int)::numeric as in_rate,
      avg(rings_n) filter (where said_in) - avg(rings_n) as p_rings,
      avg(scoring_i) filter (where said_in) - avg(scoring_i) as p_scoring,
      avg(playmaking_i) filter (where said_in) - avg(playmaking_i) as p_playmaking,
      avg(defense_i) filter (where said_in) - avg(defense_i) as p_defense,
      avg(peak_i) filter (where said_in) - avg(peak_i) as p_peak,
      avg(longevity_i) filter (where said_in) - avg(longevity_i) as p_longevity,
      avg(said_in::int) filter (where old_era)
        - avg(said_in::int) filter (where not old_era) as era_lean,
      avg(((status = 'in') = said_in)::int) filter (where status in ('in','out')) as hall_agreement
    from career
  )
  select jsonb_build_object(
    'verdict_count', t.verdict_count,
    'resolved', t.resolved,
    'eligible', t.resolved >= 15,
    'accuracy', case when t.resolved > 0 then round(t.right_calls::numeric / t.resolved, 3) end,
    'career_sample', p.n,
    'hall_agreement', round(p.hall_agreement, 3),
    'spectrums', jsonb_build_object(
      'small_big',      greatest(-100, least(100, round((coalesce(p.in_rate, 0.5) - 0.5) * 280))),
      'rings_stats',    greatest(-100, least(100, round((coalesce(p.p_scoring,0) - coalesce(p.p_rings,0)) * 450))),
      'peak_longevity', greatest(-100, least(100, round((coalesce(p.p_longevity,0) - coalesce(p.p_peak,0)) * 450))),
      'era',            greatest(-100, least(100, round(-coalesce(p.era_lean, 0) * 220))),
      'offense_defense',greatest(-100, least(100, round((coalesce(p.p_defense,0)
                          - (coalesce(p.p_scoring,0) + coalesce(p.p_playmaking,0)) / 2) * 450)))
    ))
  into result
  from totals t, prefs p;

  return result;
end; $$;

-- The Famous Cases (spec §9): ten high-debatability real careers; the client
-- projects the member's philosophy onto their attributes. Member-gated.
create or replace function api_famous_cases()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not api_is_member() then null else (
    select jsonb_agg(jsonb_build_object(
      'name', p.full_name, 'attributes', b.attributes,
      'truth_status', b.truth->>'status') order by b.debatability desc nulls last)
    from (
      select * from ballots
      where type = 'career_hof' and attributes is not null and ballot_number is not null
      order by debatability desc nulls last limit 10
    ) b
    join players p on p.id = b.player_id
  ) end;
$$;

-- Narrative cache surface for the voter-narrative edge function.
create or replace function api_my_narrative()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else (
    select jsonb_build_object('narrative', narrative, 'archetype', archetype,
      'verdict_count', verdict_count, 'updated_at', updated_at)
    from user_profiles where user_id = auth.uid()
  ) end;
$$;

revoke all on function api_voter_profile(text) from public;
revoke all on function api_famous_cases() from public;
revoke all on function api_my_narrative() from public;
grant execute on function api_voter_profile(text) to anon, authenticated, service_role;
grant execute on function api_famous_cases() to authenticated, service_role;
grant execute on function api_my_narrative() to authenticated, service_role;
