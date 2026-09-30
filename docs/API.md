# Contratto API per il frontend

Regole valide per **tutte** le chiamate al backend. L'elenco completo degli endpoint, con i body di
richiesta e risposta, è in [`openapi.yaml`](openapi.yaml): aprilo in <https://editor.swagger.io>
(*File → Import file*) oppure incollane il contenuto.

- Base URL in locale: `http://localhost:8080`
- Base URL in produzione: l'URL del servizio backend su Render
- Formato: JSON, date in ISO 8601 con fuso (`2027-06-01T21:00:00+02:00`), id sempre UUID.

## 1. Sessione e cookie (niente JWT)

L'autenticazione è una **sessione server-side** (cookie `SESSION`, `HttpOnly`): il frontend non
vede e non salva nessun token di login.

**Ogni** richiesta deve mandare i cookie, anche le GET pubbliche:

```js
// fetch
fetch(`${API}/api/events`, { credentials: "include" });
// axios
axios.create({ baseURL: API, withCredentials: true });
```

Senza `credentials: "include"` / `withCredentials: true` ogni chiamata protetta risponde **401**.

## 2. CSRF (obbligatorio su POST / PUT / PATCH / DELETE)

1. All'avvio e **dopo il login** (il token cambia): `GET /api/auth/csrf` → `{ "headerName": "X-XSRF-TOKEN", "token": "…" }`.
2. Su ogni richiesta che modifica dati, header `X-XSRF-TOKEN: <token>`.

In produzione FE e BE sono su domini diversi: il cookie `XSRF-TOKEN` del backend **non** è leggibile da
JavaScript, quindi il token va preso sempre dal body di `/api/auth/csrf`.
Senza header, o con un token vecchio: **403**.

```js
let csrf = null;
async function refreshCsrf() {
  const r = await fetch(`${API}/api/auth/csrf`, { credentials: "include" });
  csrf = (await r.json()).token;
}
async function api(method, path, body) {
  const headers = {};
  if (method !== "GET") headers["X-XSRF-TOKEN"] = csrf;
  if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) payload = JSON.stringify(body);
  return fetch(`${API}${path}`, { method, headers, body: payload, credentials: "include" });
}
```

## 3. Flusso di autenticazione

| Passo | Chiamata | Esito |
|---|---|---|
| Registrazione | `POST /api/auth/register` | 201; arriva un'email con un codice di 6 cifre |
| Verifica email | `POST /api/auth/verify` `{ email, code }` | 204; ora si può fare login |
| Nuovo codice | `POST /api/auth/resend-code` `{ email }` | 204 anche se l'email non esiste (non si rivela chi è registrato); massimo 3 ogni 15 minuti, poi 429 |
| Login | `POST /api/auth/login` `{ email, password }` | 200 con l'utente; **poi rifare `GET /api/auth/csrf`** |
| Chi sono | `GET /api/auth/me` | 200 = loggato, 401 = non loggato (da chiamare all'avvio dell'app) |
| Logout | `POST /api/auth/logout` (con CSRF) | 204 |

Errori del login da gestire:

| Status | Quando | Cosa mostrare |
|---|---|---|
| 401 | email o password sbagliate (stesso messaggio per entrambe) | "Credenziali non valide" |
| 403 + `code: "EMAIL_NOT_VERIFIED"` | email non ancora verificata | form del codice + "reinvia codice" |
| 403 + `code: "ACCOUNT_DEACTIVATED"` | account disattivato da un moderatore | messaggio, nessuna azione |
| 429 + header `Retry-After` (secondi) | troppi tentativi (5 per email / 30 per IP in 15 minuti) | "Riprova tra N minuti" |

## 4. Ruoli

`USER` < `MODERATOR` < `SUPERADMIN` (ogni ruolo ha anche i permessi dei precedenti).

- `USER`: tutto sui propri eventi, ticket, amicizie, profilo.
- `MODERATOR`: modifica/annulla eventi di chiunque, gestisce artisti, attiva/disattiva account `USER` (`/api/admin/**`).
- `SUPERADMIN`: in più cambia i ruoli (`PATCH /api/admin/users/{id}/role`).

Il ruolo arriva in `role` di `/api/auth/me`. Nascondere i bottoni è solo comodità: i controlli veri li fa il backend (403).

## 5. Errori: sempre `ProblemDetail` (RFC 9457)

```json
{ "type": "about:blank", "title": "Bad Request", "status": 400,
  "detail": "La data di inizio deve essere nel futuro", "instance": "/api/events" }
```

- `detail` è già in italiano e si può mostrare all'utente così com'è.
- Validazione dei campi (400) → in più `errors`, campo → messaggio, da mostrare sotto ogni input:
  ```json
  { "status": 400, "detail": "Dati non validi",
    "errors": { "province": "La provincia e' una sigla di 2 lettere", "title": "<messaggio standard>" } }
  ```
  I messaggi scritti da noi sono in italiano; quelli standard di Bean Validation (campo vuoto, troppo lungo…)
  sono nella lingua del server (in inglese su Render): conviene usare `errors` per capire **quale** campo
  evidenziare e mostrare un testo del frontend per i casi comuni.

| Status | Significato |
|---|---|
| 400 | dati non validi o operazione non ammessa in quello stato (es. modificare un evento annullato) |
| 401 | non loggato |
| 403 | loggato ma senza permesso, oppure token CSRF mancante |
| 404 | risorsa inesistente, o che non puoi vedere |
| 409 | conflitto (es. già iscritto, evento con partecipanti che non si può cancellare) |
| 413 | file oltre i 5 MB |
| 429 | troppe richieste: leggere `Retry-After` |
| 503 | servizio esterno non disponibile (es. AI satura): mostrare "Riprova" |

## 6. Liste paginate

Parametri `page` (da 0) e `size` (massimo 50). Risposta sempre in questa forma:

```json
{ "content": [ … ], "page": { "size": 20, "number": 0, "totalElements": 42, "totalPages": 3 } }
```

Eccezione: `GET /api/events/map` restituisce un array semplice (segnaposto per la mappa, massimo 500).

## 7. Upload di immagini

`multipart/form-data` con un solo campo **`file`**; JPEG, PNG o WebP; massimo **5 MB**.
Non impostare a mano `Content-Type` (lo fa il browser con il boundary); l'header CSRF sì.

```js
const form = new FormData();
form.append("file", input.files[0]);
await api("POST", `/api/events/${id}/images`, form);
```

- Foto evento: `POST /api/events/{id}/images` (massimo 10; la prima, `sortOrder` 0, è la copertina).
- Locandina di un artista in scaletta: `POST /api/events/{id}/lineup/{artistId}/poster`.
- Avatar: `POST /api/me/avatar`.

## 8. Tempo reale (STOMP su WebSocket)

Endpoint: `ws(s)://<backend>/ws`. Serve essere loggati (il browser manda il cookie di sessione da solo) e
il token CSRF nell'header del frame `CONNECT`. Esempio con `@stomp/stompjs`:

```js
import { Client } from "@stomp/stompjs";

const stomp = new Client({
  brokerURL: API.replace(/^http/, "ws") + "/ws",
  connectHeaders: { "X-XSRF-TOKEN": csrf },   // token preso da GET /api/auth/csrf dopo il login
  reconnectDelay: 5000,
  onConnect: () => {
    stomp.subscribe("/user/queue/notifications", (m) => onNotification(JSON.parse(m.body)));
    stomp.subscribe("/user/queue/chat", (m) => onChatMessage(JSON.parse(m.body)));
    stomp.subscribe("/user/queue/errors", (m) => showError(m.body)); // testo semplice, non JSON
  },
});
stomp.activate();

// Inviare un messaggio in chat (solo tra amici con amicizia ACCEPTED)
stomp.publish({
  destination: "/app/chat.send",
  body: JSON.stringify({ friendshipId, content: "Ciao!" }),
});
```

| Canale | Contenuto | Quando |
|---|---|---|
| `/user/queue/notifications` | `NotificationResponse` | nuova notifica (evento modificato/annullato, nuovo partecipante, amicizia, messaggio del proprietario) |
| `/user/queue/chat` | `ChatMessageResponse` | messaggio ricevuto **e** copia del proprio messaggio inviato (usarla per confermare l'invio) |
| `/user/queue/errors` | stringa | errore sul proprio invio (es. "Messaggio vuoto o oltre 2000 caratteri", "Chat disponibile solo tra amici con account attivo") |

Per lo storico della chat (al primo caricamento) si usa la REST: `GET /api/chats/{id}/messages`.

## 9. Sicurezza nel frontend (obbligatorio)

- **Mai `innerHTML` / `dangerouslySetInnerHTML`** con dati del backend: titoli, descrizioni, nomi, messaggi di chat e
  la proposta dell'AI sono testo scritto da utenti o generato. In React basta `{valore}`; in JS puro `textContent`.
- Gli URL che arrivano dagli utenti (es. `imageUrl` di un artista) sono già limitati a `http`/`https` dal backend:
  usarli solo in `src`/`href`, mai costruendo HTML.
- Nessun segreto nel frontend: le chiavi di Cloudinary e OpenRouter restano nel backend.

## 10. Configurazione del frontend su Render

- Variabile del FE con l'URL del backend (es. `VITE_API_URL`).
- Sul **backend** vanno impostate: `ALLOWED_ORIGIN` = URL del FE (CORS), `FRONTEND_URL` = URL del FE (link nelle
  email), `SESSION_COOKIE_SAME_SITE=none` e `SESSION_COOKIE_SECURE=true` (già in `render.yaml`).
