-- v9__football_match_clock_pause.sql
-- Pause/resume support for the live match clock: a running clock can be paused
-- (half-time, interruptions) without finishing the match. `paused_at_epoch` marks
-- an in-progress pause; `total_paused_seconds` accumulates completed pauses so
-- elapsed time excludes them.
alter table football_match
  add column paused_at_epoch bigint null after ended_at_epoch,
  add column total_paused_seconds int not null default 0 after paused_at_epoch;
