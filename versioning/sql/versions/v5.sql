-- v5__pena_accountability.sql
set foreign_key_checks = 0;

create table if not exists pena_accountability (
  id_pena             int primary key,
  currency            varchar(12) not null default 'EUR',
  balance_cents       bigint not null default 0,
  reserve_cents       bigint not null default 0,
  budget_visibility   varchar(20) not null default 'summary',
  expenses_visibility varchar(20) not null default 'summary',
  updated_at          timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_pena_accountability_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade
) engine=innodb;

create table if not exists pena_member_account (
  id                 int auto_increment primary key,
  guid               char(36) not null default (uuid()),
  id_pena            int not null,
  id_player          int not null,
  debt_cents         bigint not null default 0,
  contribution_cents bigint not null default 0,
  note               varchar(255) null,
  updated_at         timestamp not null default current_timestamp on update current_timestamp,
  unique key uq_pena_member_account_guid (guid),
  unique key uq_pena_member_account_player (id_pena, id_player),
  key idx_pena_member_account_pena (id_pena),
  key idx_pena_member_account_player (id_player),
  constraint fk_pena_member_account_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade,
  constraint fk_pena_member_account_player
    foreign key (id_player) references player(id)
    on delete cascade on update cascade
) engine=innodb;

create table if not exists pena_expense (
  id           int auto_increment primary key,
  guid         char(36) not null default (uuid()),
  id_pena      int not null,
  title        varchar(160) not null,
  category     varchar(80) null,
  amount_cents bigint not null default 0,
  occurred_on  date not null,
  note         varchar(255) null,
  created_at   timestamp not null default current_timestamp,
  updated_at   timestamp not null default current_timestamp on update current_timestamp,
  unique key uq_pena_expense_guid (guid),
  key idx_pena_expense_pena (id_pena),
  key idx_pena_expense_date (occurred_on),
  constraint fk_pena_expense_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade
) engine=innodb;

insert into pena_accountability (
  id_pena,
  currency,
  balance_cents,
  reserve_cents,
  budget_visibility,
  expenses_visibility
)
select
  p.id,
  'EUR',
  0,
  0,
  'summary',
  'summary'
from pena p
left join pena_accountability pa
  on pa.id_pena = p.id
where pa.id_pena is null;

set foreign_key_checks = 1;

insert into schema_migrations (version, description, success)
values ('5', 'pena accountability', 1)
on duplicate key update description=values(description), success=values(success);
