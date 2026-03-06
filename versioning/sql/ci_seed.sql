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

insert into pena (id, guid, name, position_labels, position_label_colors, id_admin)
values
  (
    9101,
    '00000000-0000-0000-0000-000000009101',
    'CI Pena One',
    '["attacker","defender","midfielder","polivalent","keeper"]',
    '{"attacker":"#DC2626","defender":"#2563EB","midfielder":"#16A34A","polivalent":"#7C3AED","keeper":"#EA580C"}',
    9001
  ),
  (
    9102,
    '00000000-0000-0000-0000-000000009102',
    'CI Pena Two',
    '["attacker","defender","midfielder","polivalent","keeper"]',
    '{"attacker":"#DC2626","defender":"#2563EB","midfielder":"#16A34A","polivalent":"#7C3AED","keeper":"#EA580C"}',
    9001
  )
on duplicate key update
  name = values(name),
  position_labels = values(position_labels),
  position_label_colors = values(position_label_colors),
  id_admin = values(id_admin);

insert into pena_role (id, guid, id_pena, name, color, sort_order)
values
  (9501, '00000000-0000-0000-0000-000000009501', 9101, 'president', '#B45309', 0),
  (9502, '00000000-0000-0000-0000-000000009502', 9101, 'coordinator', '#1D4ED8', 1),
  (9503, '00000000-0000-0000-0000-000000009503', 9101, 'member', '#15803D', 2),
  (9504, '00000000-0000-0000-0000-000000009504', 9101, 'guest', '#64748B', 3),
  (9511, '00000000-0000-0000-0000-000000009511', 9102, 'president', '#B45309', 0),
  (9512, '00000000-0000-0000-0000-000000009512', 9102, 'coordinator', '#1D4ED8', 1),
  (9513, '00000000-0000-0000-0000-000000009513', 9102, 'member', '#15803D', 2),
  (9514, '00000000-0000-0000-0000-000000009514', 9102, 'guest', '#64748B', 3)
on duplicate key update
  name = values(name),
  color = values(color),
  sort_order = values(sort_order);

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

insert into pena_player (id, guid, id_player, id_pena, nickname, id_role, position)
values
  (9401, '00000000-0000-0000-0000-000000009401', 9301, 9101, 'SeedNick', 9503, 'GK')
on duplicate key update
  nickname = values(nickname),
  id_role = values(id_role),
  position = values(position);
