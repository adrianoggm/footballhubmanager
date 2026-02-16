-- Seed data for CI integration tests (queries/auth flows).

insert into admin_accounts (id, guid, username, password, name)
values
  (
    9001,
    '00000000-0000-0000-0000-000000009001',
    'ci_admin',
    'pbkdf2$sha256$260000$IjB3C4pwbbh-cJivB2Iiwg$WcNXPRmZMWIVehya8K7b6695vTTpPz3eZjXpksn77T8',
    'CI Admin'
  )
on duplicate key update
  password = values(password),
  name = values(name);

insert into pena (id, guid, name, id_admin)
values
  (9101, '00000000-0000-0000-0000-000000009101', 'CI Pena One', 9001),
  (9102, '00000000-0000-0000-0000-000000009102', 'CI Pena Two', 9001)
on duplicate key update
  name = values(name),
  id_admin = values(id_admin);

insert into season (id, guid, id_pena, start_date, end_date)
values
  (9151, '00000000-0000-0000-0000-000000009151', 9101, '2024-09-01', '2025-06-30'),
  (9152, '00000000-0000-0000-0000-000000009152', 9102, '2024-09-01', '2025-06-30')
on duplicate key update
  id_pena = values(id_pena),
  start_date = values(start_date),
  end_date = values(end_date);

insert into player_account (id, guid, username, password, name)
values
  (
    9201,
    '00000000-0000-0000-0000-000000009201',
    'ci_user',
    'pbkdf2$sha256$260000$AjdgpmpF0zhQELJT72ohSg$mSGumQ1LofD3UouNj3BiBdJNDvhOv9LK22GC_9N9w70',
    'CI User'
  )
on duplicate key update
  password = values(password),
  name = values(name);

insert into player (id, guid, name, surname1, surname2, nationality, id_player_account)
values
  (9301, '00000000-0000-0000-0000-000000009301', 'CI', 'Player', null, 'Spain', 9201)
on duplicate key update
  name = values(name),
  surname1 = values(surname1),
  surname2 = values(surname2),
  nationality = values(nationality),
  id_player_account = values(id_player_account);

insert into pena_player (id, guid, id_player, id_pena, nickname, position)
values
  (9401, '00000000-0000-0000-0000-000000009401', 9301, 9101, 'SeedNick', 'GK')
on duplicate key update
  nickname = values(nickname),
  position = values(position);
