-- v14.down.sql: reverts v14 (pena transaction debt applied, MO-02).
-- Drops the per-income applied debt; deleting a linked income afterwards falls back
-- to restoring its full amount as debt.
alter table pena_transaction
  drop column debt_applied_cents;
