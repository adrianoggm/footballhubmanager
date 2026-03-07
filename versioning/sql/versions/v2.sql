-- v2__pena_roles_normalized.sql
set foreign_key_checks = 0;

alter table pena
  add column if not exists position_labels text null;

alter table pena
  add column if not exists position_label_colors text null;

create table if not exists pena_role (
  id         int auto_increment primary key,
  guid       char(36) not null default (uuid()),
  id_pena    int not null,
  name       varchar(80) not null,
  color      varchar(16) null,
  sort_order int not null default 0,
  unique key uq_pena_role_guid (guid),
  unique key uq_pena_role_name (id_pena, name),
  key idx_pena_role_pena (id_pena),
  constraint fk_pena_role_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade
) engine=innodb;

insert into pena_role (id_pena, name, sort_order)
select p.id, 'president', 0
from pena p
left join pena_role r
  on r.id_pena = p.id and lower(r.name) = 'president'
where r.id is null;

insert into pena_role (id_pena, name, sort_order)
select p.id, 'coordinator', 1
from pena p
left join pena_role r
  on r.id_pena = p.id and lower(r.name) = 'coordinator'
where r.id is null;

insert into pena_role (id_pena, name, sort_order)
select p.id, 'member', 2
from pena p
left join pena_role r
  on r.id_pena = p.id and lower(r.name) = 'member'
where r.id is null;

insert into pena_role (id_pena, name, sort_order)
select p.id, 'guest', 3
from pena p
left join pena_role r
  on r.id_pena = p.id and lower(r.name) = 'guest'
where r.id is null;

alter table pena_player
  add column if not exists role varchar(80) null;

alter table pena_player
  add column if not exists id_role int null;

update pena_player pp
join pena_role pr
  on pr.id_pena = pp.id_pena and lower(pr.name) = lower(pp.role)
set pp.id_role = pr.id
where pp.id_role is null and pp.role is not null;

update pena_player pp
join player pl
  on pl.id = pp.id_player
join pena_role pr
  on pr.id_pena = pp.id_pena
 and lower(pr.name) = case
   when pl.id_player_account is null then 'guest'
   else 'member'
 end
set pp.id_role = pr.id
where pp.id_role is null;

alter table pena_role
  add column if not exists color varchar(16) null;

update pena_role
set color = case lower(name)
  when 'president' then '#B45309'
  when 'coordinator' then '#1D4ED8'
  when 'member' then '#15803D'
  when 'guest' then '#64748B'
  else '#64748B'
end
where color is null or trim(color) = '';

update pena
set position_label_colors = '{"attacker":"#DC2626","defender":"#2563EB","midfielder":"#16A34A","polivalent":"#7C3AED","keeper":"#EA580C"}'
where position_label_colors is null or trim(position_label_colors) = '';

alter table pena_player
  add key idx_penaplayer_role (id_role);

alter table pena_player
  add constraint fk_penaplayer_role
    foreign key (id_role) references pena_role(id)
    on delete set null on update cascade;

alter table pena_player
  drop column if exists role;

alter table pena
  drop column if exists role_labels;

set foreign_key_checks = 1;

insert into schema_migrations (version, description, success)
values ('2', 'pena role normalization + position labels', 1)
on duplicate key update description=values(description), success=values(success);
