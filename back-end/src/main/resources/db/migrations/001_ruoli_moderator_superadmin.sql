-- =====================================================================
--  Migrazione 001: ruoli USER / MODERATOR / SUPERADMIN (al posto di USER / ADMIN)
--
--  Serve SOLO sui database creati prima di questa modifica (volume Docker
--  gia' esistente, database su Render). Un database nuovo prende gia' il
--  vincolo giusto da schema.sql.
--
--  Locale:  docker compose exec -T db psql -U postgres -d eventi < back-end/src/main/resources/db/migrations/001_ruoli_moderator_superadmin.sql
--           (oppure: incollare in pgAdmin > Query Tool)
--  Render:  psql "<External Database URL>" -f back-end/src/main/resources/db/migrations/001_ruoli_moderator_superadmin.sql
--
--  Si puo' eseguire piu' volte senza danni.
-- =====================================================================

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

-- Il vecchio ADMIN corrisponde al nuovo MODERATOR (stessi permessi sui contenuti).
UPDATE users SET role = 'MODERATOR' WHERE role = 'ADMIN';

ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('USER', 'MODERATOR', 'SUPERADMIN'));

COMMIT;
