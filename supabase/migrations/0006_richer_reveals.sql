-- Season-mode reveals get the full career dossier (the paid modes should
-- reveal MORE than the free daily, not less): career span, weighted line,
-- accolade counts, and Hall status, computed live from the open data.
-- Per-season rows can include a combined TOT row alongside team rows, so
-- aggregates take one row per season (highest GP = the combined line).

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
    ),
    'career', case when b.type like 'season_%' and p.id is not null then (
      select jsonb_build_object(
        'from_year', p.from_year,
        'to_year', p.to_year,
        'seasons', agg.seasons,
        'gp', agg.gp,
        'ppg', agg.ppg,
        'rpg', agg.rpg,
        'apg', agg.apg,
        'team', (
          select ps.team_abbr from player_seasons ps
          where ps.player_id = p.id and ps.season_end_year = b.season_end_year
            and ps.team_abbr not in ('', 'TOT', '2TM', '3TM', '4TM')
          order by ps.gp desc nulls last limit 1
        ),
        'allstar', aw.allstar,
        'allnba', aw.allnba,
        'mvp', aw.mvp,
        'dpoy', aw.dpoy,
        'roy', aw.roy,
        'hof', p.hof
      )
      from (
        select count(*) as seasons,
               coalesce(sum(d.gp), 0) as gp,
               round(coalesce(sum(d.ppg * d.gp) / nullif(sum(d.gp), 0), 0)::numeric, 1) as ppg,
               round(coalesce(sum(d.rpg * d.gp) / nullif(sum(d.gp), 0), 0)::numeric, 1) as rpg,
               round(coalesce(sum(d.apg * d.gp) / nullif(sum(d.gp), 0), 0)::numeric, 1) as apg
        from (
          select distinct on (ps.season_end_year) ps.gp, ps.ppg, ps.rpg, ps.apg
          from player_seasons ps
          where ps.player_id = p.id
          order by ps.season_end_year, ps.gp desc nulls last
        ) d
      ) agg,
      (
        select count(*) filter (where award = 'allstar') as allstar,
               count(*) filter (where award in ('allnba1','allnba2','allnba3')) as allnba,
               count(*) filter (where award = 'mvp') as mvp,
               count(*) filter (where award = 'dpoy') as dpoy,
               coalesce(bool_or(award = 'roy'), false) as roy
        from awards a where a.player_id = p.id
      ) aw
    ) end
  )
  into v_result
  from ballots b
  left join players p on p.id = b.player_id
  where b.id = p_ballot_id;

  return v_result;
end; $$;
