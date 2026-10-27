-- v14__pena_transaction_debt_applied.sql
-- MO-02: record how much member debt each member-linked income actually paid down.
-- Debt is floored at 0, so an overpayment applies less than its amount; deleting
-- the income must restore only that part, otherwise it creates phantom debt.
-- Existing linked incomes are backfilled with their full amount, which is what the
-- previous reversal assumed (the real applied part was never stored).
-- Apply with `just db-migrate` (or `just db-reset`).
alter table pena_transaction
  add column debt_applied_cents bigint not null default 0 after id_player;

update pena_transaction
set debt_applied_cents = amount_cents
where type = 'income' and id_player is not null;
