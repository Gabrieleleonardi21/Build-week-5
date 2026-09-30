-- =====================================================================
--  Migrazione 003: public_id Cloudinary dell'avatar
--
--  Con avatar_storage_key il file su Cloudinary si cancella quando l'utente
--  cambia avatar, lo toglie o elimina l'account (D15: niente foto di chi ha
--  chiesto la cancellazione). Gli avatar caricati prima restano senza chiave:
--  quei file vanno tolti a mano dalla Media Library, se serve.
--
--  Serve SOLO sui database creati prima di questa modifica (volume Docker
--  gia' esistente, database su Render). Un database nuovo prende gia' la
--  colonna da schema.sql.
--
--  Locale:  psql -U postgres -d eventi -f back-end/src/main/resources/db/migrations/003_avatar_storage_key.sql
--           (con Docker: docker compose exec -T db psql -U postgres -d eventi < back-end/src/main/resources/db/migrations/003_avatar_storage_key.sql)
--  Render:  psql "<External Database URL>" -f back-end/src/main/resources/db/migrations/003_avatar_storage_key.sql
--
--  Si puo' eseguire piu' volte senza danni.
-- =====================================================================

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_storage_key VARCHAR(255);

COMMIT;
