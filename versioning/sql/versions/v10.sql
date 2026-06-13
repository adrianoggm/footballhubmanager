-- v10__football_match_goalkeeper_rotation.sql
-- Goalkeeper rotation alarm for live matches: `goalkeeper_rotation_seconds` is the
-- interval (in seconds) between goalkeeper rotation cycles. When the live clock
-- crosses a multiple of this interval the admin UI fires a short alarm prompting a
-- goalkeeper change. Default is 600s (10 minutes); 0 disables the alarm.
alter table football_match
  add column goalkeeper_rotation_seconds int not null default 600 after total_paused_seconds;
