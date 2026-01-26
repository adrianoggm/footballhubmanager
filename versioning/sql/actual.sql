-- v1__init_schema.sql
set foreign_key_checks = 0;

create table if not exists admin_accounts (
  id        int auto_increment primary key,
  username  varchar(50)  not null,
  password  varchar(255) not null,
  name      varchar(100) not null,
  unique key uq_admin_username (username)
) engine=innodb;

create table if not exists player_account (
  id        int auto_increment primary key,
  username  varchar(50)  not null,
  password  varchar(255) not null,
  name      varchar(100) not null,
  unique key uq_player_account_username (username)
) engine=innodb;

create table if not exists pena (
  id        int auto_increment primary key,
  name      varchar(100) not null,
  id_admin  int not null,
  key idx_pena_admin (id_admin),
  constraint fk_pena_admin
    foreign key (id_admin) references admin_accounts(id)
    on delete restrict on update cascade
) engine=innodb;

create table if not exists player (
  id                 int auto_increment primary key,
  name               varchar(100) not null,
  surname1           varchar(100) not null,
  surname2           varchar(100) null,
  nationality        varchar(80)  not null,
  id_player_account  int null,
  unique key uq_player_account (id_player_account),
  constraint fk_player_account
    foreign key (id_player_account) references player_account(id)
    on delete set null on update cascade
) engine=innodb;

create table if not exists season (
  id         int auto_increment primary key,
  id_pena    int not null,
  start_date date not null,
  end_date   date not null,
  key idx_season_pena (id_pena),
  constraint fk_season_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade
) engine=innodb;

create table if not exists `match` (
  id            int auto_increment primary key,
  id_home_team  int not null,
  id_away_team  int not null,
  match_date    date not null,
  id_season     int not null,
  key idx_match_season (id_season),
  key idx_match_home (id_home_team),
  key idx_match_away (id_away_team)
) engine=innodb;

create table if not exists team (
  id        int auto_increment primary key,
  name      varchar(100) not null,
  id_match  int null,
  key idx_team_match (id_match),
  constraint fk_team_match
    foreign key (id_match) references `match`(id)
    on delete set null on update cascade
) engine=innodb;

alter table `match`
  add constraint fk_match_home_team
    foreign key (id_home_team) references team(id)
    on delete restrict on update cascade,
  add constraint fk_match_away_team
    foreign key (id_away_team) references team(id)
    on delete restrict on update cascade,
  add constraint fk_match_season
    foreign key (id_season) references season(id)
    on delete cascade on update cascade;

create table if not exists pena_player (
  id         int auto_increment primary key,
  id_player  int not null,
  id_pena    int not null,
  nickname   varchar(80) null,
  position   varchar(50) null,
  unique key uq_player_pena (id_player, id_pena),
  key idx_penaplayer_pena (id_pena),
  constraint fk_penaplayer_player
    foreign key (id_player) references player(id)
    on delete cascade on update cascade,
  constraint fk_penaplayer_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade
) engine=innodb;

create table if not exists season_player (
  id_player      int not null,
  id_pena        int not null,
  id_season      int not null,
  wins           int not null default 0,
  losses         int not null default 0,
  draws          int not null default 0,
  quality_level  decimal(6,3) not null default 0.000,
  primary key (id_player, id_pena, id_season),
  key idx_seasonplayer_season (id_season),
  constraint fk_seasonplayer_player
    foreign key (id_player) references player(id)
    on delete cascade on update cascade,
  constraint fk_seasonplayer_pena
    foreign key (id_pena) references pena(id)
    on delete cascade on update cascade,
  constraint fk_seasonplayer_season
    foreign key (id_season) references season(id)
    on delete cascade on update cascade
) engine=innodb;

create table if not exists team_player (
  id_team   int not null,
  id_player int not null,
  goals     int not null default 0,
  assists   int not null default 0,
  rating    decimal(4,2) not null default 0.00,
  saves     int not null default 0,
  primary key (id_team, id_player),
  constraint fk_teamplayer_team
    foreign key (id_team) references team(id)
    on delete cascade on update cascade,
  constraint fk_teamplayer_player
    foreign key (id_player) references player(id)
    on delete cascade on update cascade
) engine=innodb;


create table if not exists schema_migrations (
  version            varchar(50)  not null,
  description        varchar(255) not null,
  checksum           char(64)     null,
  installed_by       varchar(100) not null default current_user(),
  installed_on       timestamp    not null default current_timestamp,
  execution_time_ms  int          null,
  success            tinyint(1)   not null default 1,
  primary key (version)
) engine=innodb;


set foreign_key_checks = 1;

insert into schema_migrations (version, description, success)
values ('1', 'init schema (lowercase tables)', 1)
on duplicate key update description=values(description), success=values(success);
