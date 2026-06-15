-- v11__pena_link_token_player_claim.sql
-- Targeted claim tokens: a link token can now be bound to a specific guest player
-- (`id_player`). When set, consuming the token attaches a brand-new account to that
-- existing guest player (adopting it) instead of creating a duplicate player profile.
-- A NULL `id_player` keeps the legacy behaviour (generic pena-wide join token).
alter table pena_link_token
  add column id_player int null after id_pena,
  add key idx_pena_link_token_player (id_player),
  add constraint fk_pena_link_token_player
    foreign key (id_player) references player(id)
    on delete cascade on update cascade;
