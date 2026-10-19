-- v12__pena_transaction_unified_ledger.sql
-- Unify accountability into a single ledger table. Income and expense now live in
-- one table so the ledger list is a single indexed scan and every KPI is a single
-- aggregate, instead of UNION-ing two tables forever. Existing `pena_expense` rows
-- migrate in as `type='expense'`; existing member contributions migrate in as
-- `type='income'` rows so the computed balance stays consistent with the totals
-- admins already see. Apply by hand on a running DB (or `just db-reset`).
create table if not exists pena_transaction (
  id           int auto_increment primary key,
  guid         char(36) not null default (uuid()),
  id_pena      int not null,
  type         varchar(10) not null,
  amount_cents bigint not null default 0,
  entity       varchar(160) null,
  concept      varchar(160) not null,
  category     varchar(80) null,
  note         varchar(255) null,
  occurred_on  date not null,
  id_player    int null,
  created_at   timestamp not null default current_timestamp,
  updated_at   timestamp not null default current_timestamp on update current_timestamp,
  unique key uq_pena_transaction_guid (guid),
  key idx_pena_transaction_pena (id_pena),
  key idx_pena_transaction_date (id_pena, occurred_on),
  key idx_pena_transaction_type (id_pena, type),
  key idx_pena_transaction_player (id_player),
  constraint fk_pena_transaction_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade,
  constraint fk_pena_transaction_player
    foreign key (id_player) references player(id)
    on delete set null on update cascade
) engine=innodb;

-- Existing expenses -> expense-type transactions (preserve guid + timestamps).
insert into pena_transaction
  (guid, id_pena, type, amount_cents, entity, concept, category, note, occurred_on, created_at, updated_at)
select guid, id_pena, 'expense', amount_cents, null, title, category, note, occurred_on, created_at, updated_at
from pena_expense;

-- Existing member contributions -> income-type transactions linked to the member.
insert into pena_transaction
  (id_pena, type, amount_cents, entity, concept, category, note, occurred_on, id_player, created_at, updated_at)
select ma.id_pena,
       'income',
       ma.contribution_cents,
       nullif(trim(concat_ws(' ', p.name, p.surname1, coalesce(p.surname2, ''))), ''),
       'Membership contribution',
       'membership',
       'Migrated from member account',
       date(ma.updated_at),
       ma.id_player,
       ma.updated_at,
       ma.updated_at
from pena_member_account ma
join player p on p.id = ma.id_player
where ma.contribution_cents > 0;

drop table pena_expense;
