-- Audit pass (already applied live):
-- 1. create-or-replace resets function ACLs to default (PUBLIC execute), so
--    re-tighten grants on admin + account functions. The admin functions all
--    gate via is_admin() internally — defense-in-depth, not an open hole.
-- 2. Advisor lints: covering indexes for two foreign keys; RLS policies use
--    (select auth.uid()) so the call is planned once, not per row.

revoke all on function is_admin() from public, anon;
revoke all on function api_admin_calendar() from public, anon;
revoke all on function api_admin_pool() from public, anon;
revoke all on function api_admin_metrics() from public, anon;
revoke all on function api_admin_player_search(text) from public, anon;
revoke all on function api_admin_player_card(bigint) from public, anon;
revoke all on function api_admin_schedule_card(bigint, date, text, int, text, jsonb, text, text, numeric) from public, anon;
revoke all on function api_admin_resolve(bigint, text, jsonb) from public, anon;
revoke all on function api_claim_votes(text) from public, anon;
revoke all on function api_me() from public, anon;
revoke all on function api_my_narrative() from public, anon;
revoke all on function api_famous_cases() from public, anon;
grant execute on function is_admin() to authenticated, service_role;
grant execute on function api_admin_calendar() to authenticated, service_role;
grant execute on function api_admin_pool() to authenticated, service_role;
grant execute on function api_admin_metrics() to authenticated, service_role;
grant execute on function api_admin_player_search(text) to authenticated, service_role;
grant execute on function api_admin_player_card(bigint) to authenticated, service_role;
grant execute on function api_admin_schedule_card(bigint, date, text, int, text, jsonb, text, text, numeric) to authenticated, service_role;
grant execute on function api_admin_resolve(bigint, text, jsonb) to authenticated, service_role;
grant execute on function api_claim_votes(text) to authenticated, service_role;
grant execute on function api_me() to authenticated, service_role;
grant execute on function api_my_narrative() to authenticated, service_role;
grant execute on function api_famous_cases() to authenticated, service_role;

create index if not exists ballots_player_idx on ballots (player_id);
create index if not exists resolution_queue_ballot_idx on resolution_queue (ballot_id);
alter policy users_select_own on public.users using ((select auth.uid()) = id);
alter policy profiles_select_own on user_profiles using ((select auth.uid()) = user_id);
