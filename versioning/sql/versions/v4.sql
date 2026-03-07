-- v4__season_player_role_label_snapshot.sql
set foreign_key_checks = 0;

alter table season_player
  add column if not exists role varchar(80) null;

update season_player sp
left join pena_role pr
  on pr.id = sp.id_role
left join player pl
  on pl.id = sp.id_player
set sp.role = case
  when sp.role is not null and trim(sp.role) <> '' then sp.role
  when pr.name is not null and trim(pr.name) <> '' then pr.name
  when pl.id_player_account is null then 'guest'
  else 'member'
end
where sp.role is null or trim(sp.role) = '';

set foreign_key_checks = 1;

insert into schema_migrations (version, description, success)
values ('4', 'season player role label snapshot', 1)
on duplicate key update description=values(description), success=values(success);
