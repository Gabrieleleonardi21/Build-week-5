-- =====================================================================
--  Migrazione 002: stato REMOVED per le amicizie
--
--  Togliere un amico non cancella piu' la riga (e con lei, per ON DELETE CASCADE,
--  lo storico della chat): la riga passa a REMOVED e i messaggi restano.
--
--  Serve SOLO sui database creati prima di questa modifica (volume Docker
--  gia' esistente, database su Render). Un database nuovo prende gia' il
--  vincolo giusto da schema.sql.
--
--  Locale:  docker compose exec -T db psql -U postgres -d eventi < back-end/src/main/resources/db/migrations/002_amicizie_removed.sql
--           (oppure: incollare in pgAdmin > Query Tool)
--  Render:  psql "<External Database URL>" -f back-end/src/main/resources/db/migrations/002_amicizie_removed.sql
--
--  Si puo' eseguire piu' volte senza danni.
-- =====================================================================

BEGIN;

ALTER TABLE friendships DROP CONSTRAINT IF EXISTS chk_friendships_status;
ALTER TABLE friendships ADD CONSTRAINT chk_friendships_status
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'REMOVED'));

COMMIT;
