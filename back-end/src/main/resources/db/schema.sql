-- =====================================================================
--  Piattaforma di gestione eventi — schema PostgreSQL
--
--  Fonte di verità dello schema del database.
--  Eseguire in pgAdmin (Query Tool) su un database vuoto.
--  Le entity JPA devono rispecchiare queste tabelle:
--      spring.jpa.hibernate.ddl-auto=validate
--
--  Il perché di ogni scelta: docs/schema-database.md e docs/decisioni.md
--  Requisiti: PostgreSQL 13+ (gen_random_uuid() è integrato).
-- =====================================================================

-- Per ripartire da zero (ordine inverso alle dipendenze):
-- DROP TABLE IF EXISTS chat_messages, friendships, notifications, tickets,
--     event_markers, event_artists, artists, event_images, events,
--     verification_codes, users CASCADE;


-- ---------------------------------------------------------------------
-- 1. UTENTI E VERIFICA EMAIL  (Parte 1, 4, 7)
-- ---------------------------------------------------------------------

CREATE TABLE users (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL,                 -- minuscola, normalizzata dal backend (D05)
    password_hash       VARCHAR(100) NOT NULL,                 -- BCrypt
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    birth_date          DATE,                                  -- obbligatoria alla registrazione (validazione backend),
                                                               -- NULL dopo l'anonimizzazione; l'età si calcola (D03)
    address_street      VARCHAR(255),
    address_city        VARCHAR(100),
    address_postal_code VARCHAR(10),
    address_province    VARCHAR(2),
    address_country     VARCHAR(2)   DEFAULT 'IT',
    phone               VARCHAR(30),
    avatar_url          VARCHAR(500),
    role                VARCHAR(20)  NOT NULL DEFAULT 'USER',
    status              VARCHAR(30)  NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at   TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ  NOT NULL,                 -- accettazione privacy policy (Parte 7)
    anonymized_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email   UNIQUE (email),
    CONSTRAINT chk_users_role   CHECK (role IN ('USER', 'MODERATOR', 'SUPERADMIN')),
    CONSTRAINT chk_users_status CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'DEACTIVATED'))
);

CREATE TABLE verification_codes (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code       VARCHAR(6)  NOT NULL,                           -- 6 cifre, SecureRandom
    expires_at TIMESTAMPTZ NOT NULL,                           -- 15 minuti dalla creazione
    used_at    TIMESTAMPTZ,                                    -- monouso: valorizzato alla conferma o al reinvio
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_codes_user ON verification_codes (user_id);


-- ---------------------------------------------------------------------
-- 2. EVENTI  (Parte 2, 5)
-- ---------------------------------------------------------------------

CREATE TABLE events (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id         UUID             NOT NULL REFERENCES users (id),   -- NO ACTION: l'utente si anonimizza (D15)
    title            VARCHAR(150)     NOT NULL,
    description      TEXT,                                              -- testo finale, eventualmente migliorato dall'AI
    starts_at        TIMESTAMPTZ      NOT NULL,
    ends_at          TIMESTAMPTZ,
    venue_name       VARCHAR(150),
    address          VARCHAR(255)     NOT NULL,
    city             VARCHAR(100)     NOT NULL,
    province         VARCHAR(2),
    latitude         DOUBLE PRECISION NOT NULL,                         -- posizione sulla mappa pubblica (D14)
    longitude        DOUBLE PRECISION NOT NULL,
    max_participants INTEGER,                                           -- capienza facoltativa
    status           VARCHAR(20)      NOT NULL DEFAULT 'PUBLISHED',
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT now(),

    CONSTRAINT chk_events_status   CHECK (status IN ('PUBLISHED', 'CANCELLED')),
    CONSTRAINT chk_events_dates    CHECK (ends_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT chk_events_lat      CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT chk_events_lng      CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_events_capacity CHECK (max_participants IS NULL OR max_participants > 0)
);

CREATE INDEX idx_events_owner     ON events (owner_id);
CREATE INDEX idx_events_starts_at ON events (starts_at);

CREATE TABLE event_images (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    url         VARCHAR(500) NOT NULL,                     -- URL pubblico sullo storage esterno (D06)
    storage_key VARCHAR(255),                              -- id sullo storage (es. public_id Cloudinary) per cancellare il file
    sort_order  INTEGER      NOT NULL DEFAULT 0,           -- 0 = copertina
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_images_event ON event_images (event_id);

CREATE TABLE artists (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(150) NOT NULL,
    genre      VARCHAR(100),
    bio        TEXT,
    image_url  VARCHAR(500),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- find-or-create per nome, senza duplicati tipo "Caparezza" / "caparezza" (D07)
CREATE UNIQUE INDEX uq_artists_name_ci ON artists (lower(name));

-- Scaletta della serata: quali artisti, in che ordine, a che ora, con quale locandina.
CREATE TABLE event_artists (
    event_id           UUID         NOT NULL REFERENCES events  (id) ON DELETE CASCADE,
    artist_id          UUID         NOT NULL REFERENCES artists (id) ON DELETE CASCADE,
    performance_order  INTEGER      NOT NULL,              -- posizione in scaletta: 1 = apre la serata
    performance_start  TIMESTAMPTZ,                        -- orario di inizio dell'esibizione (facoltativo)
    performance_end    TIMESTAMPTZ,
    poster_url         VARCHAR(500),                       -- locandina dell'artista per questa serata (D06)
    poster_storage_key VARCHAR(255),                       -- public_id Cloudinary, per cancellare il file
    PRIMARY KEY (event_id, artist_id),

    -- DEFERRABLE: riordinare la scaletta scambia le posizioni dentro una transazione;
    -- l'unicita' si controlla solo al commit, non riga per riga.
    CONSTRAINT uq_event_artists_order UNIQUE (event_id, performance_order) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT chk_event_artists_order CHECK (performance_order > 0),
    CONSTRAINT chk_event_artists_times CHECK (
        performance_start IS NULL OR performance_end IS NULL OR performance_end >= performance_start)
);

CREATE TABLE event_markers (
    id        UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id  UUID             NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    kind      VARCHAR(20)      NOT NULL,                  -- ingresso / uscita / uscita di sicurezza (D08)
    label     VARCHAR(100),
    latitude  DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    CONSTRAINT chk_event_markers_kind CHECK (kind IN ('ENTRANCE', 'EXIT', 'EMERGENCY_EXIT')),
    CONSTRAINT chk_event_markers_lat  CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT chk_event_markers_lng  CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_event_markers_event ON event_markers (event_id);


-- ---------------------------------------------------------------------
-- 3. TICKET E NOTIFICHE  (Parte 2)
-- ---------------------------------------------------------------------

CREATE TABLE tickets (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users (id),
    code          VARCHAR(12) NOT NULL,                     -- codice leggibile sul ticket, es. EVT-7K3M9QA2
    status        VARCHAR(20) NOT NULL DEFAULT 'VALID',
    issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    email_sent_at TIMESTAMPTZ,                              -- NULL = email del ticket ancora da inviare / ritentare

    CONSTRAINT uq_tickets_event_user UNIQUE (event_id, user_id),  -- un ticket per utente per evento (D09)
    CONSTRAINT uq_tickets_code       UNIQUE (code),
    CONSTRAINT chk_tickets_status    CHECK (status IN ('VALID', 'CANCELLED'))
);

CREATE INDEX idx_tickets_user ON tickets (user_id);

CREATE TABLE notifications (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id     UUID         REFERENCES events (id) ON DELETE SET NULL,
    type         VARCHAR(30)  NOT NULL,
    title        VARCHAR(150) NOT NULL,
    body         TEXT         NOT NULL,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_notifications_type CHECK (type IN (
        'EVENT_UPDATED', 'EVENT_CANCELLED', 'OWNER_MESSAGE',
        'NEW_PARTICIPANT', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED'
    ))
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);


-- ---------------------------------------------------------------------
-- 4. AMICIZIE E CHAT  (Parte 3)
-- ---------------------------------------------------------------------

CREATE TABLE friendships (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID        NOT NULL REFERENCES users (id),
    addressee_id UUID        NOT NULL REFERENCES users (id),
    event_id     UUID        REFERENCES events (id) ON DELETE SET NULL,   -- evento in cui è nata la richiesta
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,

    CONSTRAINT chk_friendships_self   CHECK (requester_id <> addressee_id),
    CONSTRAINT chk_friendships_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED'))
);

-- una sola riga per coppia di utenti, in qualunque direzione (D12)
CREATE UNIQUE INDEX uq_friendships_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE INDEX idx_friendships_requester ON friendships (requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships (addressee_id, status);

CREATE TABLE chat_messages (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    friendship_id UUID          NOT NULL REFERENCES friendships (id) ON DELETE CASCADE,  -- chat solo dove c'è un'amicizia (D13)
    sender_id     UUID          NOT NULL REFERENCES users (id),
    content       VARCHAR(2000) NOT NULL,
    sent_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    read_at       TIMESTAMPTZ,

    CONSTRAINT chk_chat_messages_content CHECK (length(btrim(content)) > 0)
);

CREATE INDEX idx_chat_messages_friendship ON chat_messages (friendship_id, sent_at);


-- ---------------------------------------------------------------------
-- 5. SESSIONI  (Parte 6)
-- ---------------------------------------------------------------------
-- Le tabelle spring_session e spring_session_attributes sono create da
-- Spring Session JDBC (spring.session.jdbc.initialize-schema=always) e
-- non vanno definite qui, per non divergere dalla versione della libreria (D01).
