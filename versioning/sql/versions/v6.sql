-- v6__match_timeline_tracking.sql
set foreign_key_checks = 0;

alter table football_match
  add column started_at_epoch bigint null,
  add column ended_at_epoch bigint null;

create table if not exists football_match_event (
  id                int auto_increment primary key,
  guid              char(36) not null default (uuid()),
  id_match          int not null,
  event_type        varchar(32) not null,
  team_side         varchar(16) not null,
  elapsed_seconds   int not null,
  id_player         int null,
  id_related_player int null,
  note              varchar(255) null,
  recorded_at_epoch bigint not null,
  unique key uq_football_match_event_guid (guid),
  key idx_football_match_event_match (id_match, elapsed_seconds, id),
  key idx_football_match_event_player (id_player),
  key idx_football_match_event_related_player (id_related_player),
  constraint fk_football_match_event_match
    foreign key (id_match) references football_match(id)
    on delete cascade on update cascade,
  constraint fk_football_match_event_player
    foreign key (id_player) references player(id)
    on delete set null on update cascade,
  constraint fk_football_match_event_related_player
    foreign key (id_related_player) references player(id)
    on delete set null on update cascade
) engine=innodb;

set foreign_key_checks = 1;

insert into schema_migrations (version, description, success)
values ('6', 'match timeline tracking', 1)
on duplicate key update description=values(description), success=values(success);
