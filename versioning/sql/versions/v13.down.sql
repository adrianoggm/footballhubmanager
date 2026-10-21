-- v13.down.sql: reverts v13 (account email and tokens, #154).
-- DATA LOSS: drops every stored account email, its verification state and all
-- pending verification / password-reset tokens. Back up before running.
drop index idx_user_session_user on user_session;

drop table if exists account_token;

alter table player_account
  drop index uq_player_account_email,
  drop column email_verified_at,
  drop column email;

alter table admin_accounts
  drop index uq_admin_email,
  drop column email_verified_at,
  drop column email;
