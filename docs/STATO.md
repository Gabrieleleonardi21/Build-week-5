# Stato del progetto

Aggiornato al **30/09/2026**. Chi completa una parte aggiorna la sua riga nella stessa PR (c'è la voce nel modello della PR).

Legenda: ✅ fatto e su `main` · 🔀 fatto, PR da unire · ⏳ da fare

## Back-end

| Parte | Chi | Stato | Cosa c'è |
|---|---|---|---|
| Fondamenta: entity, schema, sicurezza, Docker, Render | Gabriele | ✅ | `schema.sql` + migrazioni `001`-`003`, sessione JDBC, CSRF, CORS, `EntityIdRulesTest` |
| Auth, ruoli, area admin | Luciano | ✅ | registrazione, verifica email, login/logout, limite tentativi, USER/MODERATOR/SUPERADMIN, `/api/admin/users`, ricerca utenti |
| Eventi e artisti | Cristian | ✅ | CRUD con scaletta e marker, mappa pubblica, artisti |
| Foto, locandine, AI | Gabriele | ✅ | upload Cloudinary asincrono, cartella per ambiente, AI con modelli gratuiti OpenRouter |
| Ticket | Cristian | ✅ | iscrizione, annullamento, partecipanti, i miei ticket |
| Amicizie e storico chat | Luciano | ✅ | richieste, accetta/rifiuta/rimuovi, inbox, letture |
| Profilo `/api/me` | Cristian | ✅ | dati, password, avatar, eliminazione account (D15) |
| Notifiche, email HTML, WebSocket, chat live | Gabriele | ✅ | contratti in `docs/API.md` §8 |
| Dati demo (`SEED_DATA=true`) | Gabriele | ✅ | 8 utenti, 10 eventi, ticket, amicizie, chat |

**Test:** 246 JUnit (2 richiedono Docker). **CI:** `Backend` e `Frontend` su ogni PR verso `main`.

## Front-end (`fe/`)

| Area | Traccia | Chi | Stato | Note |
|---|---|---|---|---|
| Fondamenta: client API, CSRF, errori, upload asincroni, guardie, layout | — | Gabriele | ✅ | `src/lib`, `src/components` |
| Design: token chiaro/scuro, accento, font, icone, componenti condivisi | — | Gabriele | ✅ | |
| Home Discover (pagina modello per le liste) | T2 | Gabriele | ✅ | `features/events/pages/DiscoverPage.tsx` |
| Dettaglio evento con mappa e marker | T2 | Gabriele | ✅ | spazi pronti per `JoinButton`, `ParticipantsList`, `OwnerActions` |
| Accesso, registrazione, verifica email | T1 | Gabriele | 🔀 | branch `Gabriele` |
| Mappa eventi `/map` | T2 | Gabriele | 🔀 | branch `Gabriele` |
| Artisti (lista, dettaglio, modifica MODERATOR) | T2 | | ⏳ | |
| Profilo, area admin | T1 | | ⏳ | |
| Crea/modifica evento, foto, locandine, AI, i miei eventi, azioni del proprietario | T3 | | ⏳ | usare `uploadManager` per le foto |
| Iscrizione (`JoinButton`), partecipanti, i miei ticket | T4 | | ⏳ | spazi già nel dettaglio evento |
| Notifiche, amici, chat | T4 | | ⏳ | |
| Tempo reale: `lib/stomp.ts`, `RealtimeProvider` | T4 | | ⏳ | contratto in `docs/API.md` §8 |

**Test:** 93 Vitest + MSW. Prima di aprire una PR: `npm run lint && npm run typecheck && npm run test && npm run build`.

## Deploy e qualità

| Cosa | Stato | Note |
|---|---|---|
| Backend su Render | ⏳ | lanciare le migrazioni `001`-`003` sul DB; variabili `CLOUDINARY_URL`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `OPENROUTER_API_KEY`, `SUPERADMIN_EMAIL`, `ALLOWED_ORIGIN`, `FRONTEND_URL` |
| Frontend su Render (servizio statico) | ⏳ | `VITE_API_URL` = URL del backend, rewrite `/*` → `/index.html` |
| Login provato su Render (Chrome e Safari) | ⏳ | cookie cross-site: `SESSION_COOKIE_SAME_SITE=none` è già in `render.yaml` |
| Test end-to-end Playwright | ⏳ | registrazione → verifica → login, crea evento con foto, iscrizione, chat |
| Controlli CI obbligatori su `main` | ⏳ | GitHub, *Settings → Branches*: `Backend / verify`, `Frontend / verify` |

## Da decidere insieme

- **Età minima alla registrazione:** oggi c'è solo "data nel passato", nessun limite di età.
- **Chi prende quale traccia del frontend** (colonna "Chi" vuota qui sopra).

## Avvio in locale

```bash
cd back-end && ./mvnw spring-boot:run      # prima volta su DB vuoto: SEED_DATA=true ./mvnw spring-boot:run
cd fe && npm install && npm run dev        # http://localhost:5173
```

Account demo (password `Password123!`): `luca.moretti@eventi.dev`, `marco.rinaldi@eventi.dev` (organizzatore), `admin@eventi.dev` (SUPERADMIN). Sono indirizzi inventati: per provare la registrazione usare un'email vera, con `MAIL_USERNAME`/`MAIL_PASSWORD` impostate nell'ambiente del backend.

Documenti: [`API.md`](API.md) (regole per il frontend), [`openapi.yaml`](openapi.yaml) (endpoint, da aprire in <https://editor.swagger.io>), [`../fe/README.md`](../fe/README.md) (struttura del frontend e pagina modello).
