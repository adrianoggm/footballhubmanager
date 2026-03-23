-- v7__match_event_value_delta.sql
alter table football_match_event
  add column value_delta int not null default 1 after elapsed_seconds;

insert into schema_migrations (version, description, success)
values ('7', 'match event signed deltas', 1)
on duplicate key update description=values(description), success=values(success);
