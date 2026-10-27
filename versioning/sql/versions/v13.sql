-- v13__account_email_and_tokens.sql
-- Password recovery by email (#154).
-- * `email` + `email_verified_at` on both account tables. Nullable because accounts
--   created before this version have no email. Registration requires it at the API
--   level. Emails are stored normalized (trimmed, lowercase) and are unique within
--   each account table (MySQL unique keys allow many NULLs).
-- * `account_token` holds single-use email-verification and password-reset tokens.
--   Only sha256(token) is stored, never the raw token. `created_at` / `expires_at`
--   are epoch seconds, like `user_session` and `pena_link_token`.
-- * `user_session (user_id, user_type)` index so a password reset can drop every
--   session of one account without a full scan.
-- Apply by hand on a running DB (or `just db-reset`).
alter table admin_accounts
  add column email varchar(254) null after name,
  add column email_verified_at bigint null after email,
  add unique key uq_admin_email (email);

alter table player_account
  add column email varchar(254) null after name,
  add column email_verified_at bigint null after email,
  add unique key uq_player_account_email (email);

create table if not exists account_token (
  token_hash   char(64) primary key,
  purpose      varchar(30) not null,
  account_type varchar(20) not null,
  account_id   int not null,
  email        varchar(254) null,
  expires_at   bigint not null,
  created_at   bigint not null,
  key idx_account_token_account (account_type, account_id, purpose),
  key idx_account_token_expires_at (expires_at)
) engine=innodb;

create index idx_user_session_user on user_session (user_id, user_type);
