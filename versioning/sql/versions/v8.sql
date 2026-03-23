-- v8__football_match_official_status_and_lineup_audit.sql
alter table football_match
  add column status varchar(16) not null default 'open' after id_season,
  add column lineup_change_count int not null default 0 after ended_at_epoch,
  add column lineup_updated_at_epoch bigint null after lineup_change_count;

update football_match fm
left join (
  select
    id_team,
    min(rating) as min_rating
  from team_player
  group by id_team
) home_stats on home_stats.id_team = fm.id_home_team
left join (
  select
    id_team,
    min(rating) as min_rating
  from team_player
  group by id_team
) away_stats on away_stats.id_team = fm.id_away_team
set fm.status = case
  when fm.ended_at_epoch is not null then 'closed'
  when coalesce(home_stats.min_rating, -1) >= 0 and coalesce(away_stats.min_rating, -1) >= 0
    then 'closed'
  else 'open'
end;

insert into schema_migrations (version, description, success)
values ('8', 'football match official status and lineup audit fields', 1)
on duplicate key update description=values(description), success=values(success);
