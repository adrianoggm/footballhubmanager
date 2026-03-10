-- v3__season_player_role_position_snapshot.sql
set foreign_key_checks = 0;

alter table season_player
  add column if not exists id_role int null;

alter table season_player
  add column if not exists position varchar(50) null;

update season_player sp
join pena_player pp
  on pp.id_pena = sp.id_pena
 and pp.id_player = sp.id_player
set sp.id_role = pp.id_role
where sp.id_role is null and pp.id_role is not null;

update season_player sp
join pena_player pp
  on pp.id_pena = sp.id_pena
 and pp.id_player = sp.id_player
set sp.position = pp.position
where (sp.position is null or trim(sp.position) = '')
  and pp.position is not null
  and trim(pp.position) <> '';

set @has_idx_seasonplayer_role := (
  select count(*)
  from information_schema.statistics
  where table_schema = database()
    and table_name = 'season_player'
    and index_name = 'idx_seasonplayer_role'
);
set @sql_idx_seasonplayer_role := if(
  @has_idx_seasonplayer_role = 0,
  'alter table season_player add key idx_seasonplayer_role (id_role)',
  'select 1'
);
prepare stmt_idx_seasonplayer_role from @sql_idx_seasonplayer_role;
execute stmt_idx_seasonplayer_role;
deallocate prepare stmt_idx_seasonplayer_role;

set @has_fk_seasonplayer_role := (
  select count(*)
  from information_schema.table_constraints
  where constraint_schema = database()
    and table_name = 'season_player'
    and constraint_name = 'fk_seasonplayer_role'
    and constraint_type = 'FOREIGN KEY'
);
set @sql_fk_seasonplayer_role := if(
  @has_fk_seasonplayer_role = 0,
  'alter table season_player add constraint fk_seasonplayer_role foreign key (id_role) references pena_role(id) on delete set null on update cascade',
  'select 1'
);
prepare stmt_fk_seasonplayer_role from @sql_fk_seasonplayer_role;
execute stmt_fk_seasonplayer_role;
deallocate prepare stmt_fk_seasonplayer_role;

set foreign_key_checks = 1;

insert into schema_migrations (version, description, success)
values ('3', 'season player role/position snapshot', 1)
on duplicate key update description=values(description), success=values(success);
