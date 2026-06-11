-- Dev helper (spec §4 seed asset c): fabricate a 25-vote history for a test
-- identity so the Voter Profile is testable locally without playing 25 days.
-- Run against a dev database:  psql "$DATABASE_URL" -f scripts/dev-seed-votes.sql
-- Cleanup:                     delete from votes where device_id = 'dev-test-device';

with career as (
  select id, truth->>'status' as status,
         row_number() over (order by ballot_number) as rn
  from ballots where type = 'career_hof' and attributes is not null limit 20
)
insert into votes (ballot_id, device_id, verdict)
select id, 'dev-test-device',
  -- A ring-respecting, slightly generous voter: agrees with history ~70%.
  case when (status = 'in') = (rn % 10 < 7) then
    case when status = 'in' then 'IN' else 'OUT' end
  else
    case when status = 'in' then 'OUT' else 'IN' end
  end
from career
on conflict (ballot_id, device_id) do nothing;

with seasons as (
  select id, truth->>'status' as status,
         row_number() over (order by id) as rn
  from ballots where type = 'season_allstar' limit 5
)
insert into votes (ballot_id, device_id, verdict)
select id, 'dev-test-device',
  case when (status = 'in') = (rn % 4 < 3)
    then case when status = 'in' then 'YES' else 'NO' end
    else case when status = 'in' then 'NO' else 'YES' end
  end
from seasons
on conflict (ballot_id, device_id) do nothing;
