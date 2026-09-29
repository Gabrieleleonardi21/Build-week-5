# Regole di sicurezza del progetto

Regole pratiche per chi scrive codice in questo repository. Valgono per ogni nuova
funzionalita' (eventi, ticket, chat, admin, frontend). In caso di dubbio: chiedere
prima di fare il merge.

Architettura di riferimento: sessione server-side (D01) con cookie `SESSION` httpOnly,
token CSRF, password con BCrypt. **Niente JWT.**

---

## 1. SQL injection

Oggi nessuna query del progetto e' vulnerabile. Resta cosi' solo se nessuno concatena
dati dell'utente dentro una query.

- Usare i **metodi derivati** di Spring Data (`findByEmail`, `existsByEmail`, ...) oppure
  `@Query` JPQL con **parametri con nome** (`:eventId`).
- **Mai** concatenare stringhe in `@Query`, `nativeQuery`, `JdbcTemplate` o `EntityManager`.

```java
// ❌ vulnerabile
@Query(value = "SELECT * FROM events WHERE city = '" + city + "'", nativeQuery = true)
jdbc.query("SELECT * FROM users WHERE email = '" + email + "'", mapper);

// ✅ sicuro
@Query("select e from Event e where e.city = :city")
jdbc.query("SELECT * FROM users WHERE email = ?", mapper, email);
```

- **Ricerche con LIKE**: `where lower(e.title) like lower(concat('%', :q, '%'))`.
- **Ordinamento dinamico** (`?sort=...`): whitelist dei campi ammessi. I nomi di
  colonna non si possono passare come parametro.
- **Paginazione**: limitare sempre `size` (es. `Math.min(size, 50)`), altrimenti
  `size=1000000` carica tutta la tabella.

## 2. Autenticazione e sessione

- Login, registrazione e verifica email stanno in `auth/AuthService` e `auth/AuthController`.
  Non creare altri endpoint di login.
- L'utente corrente si ottiene con `CurrentUsers.require(principal)`. Non leggere mai
  l'id utente dal body o dai parametri della richiesta.
- In sessione c'e' solo `security/AuthUser` (senza hash). **Non salvare entity JPA in sessione.**
- Password: sempre `PasswordEncoder` (BCrypt 12). Mai salvarle, loggarle o restituirle,
  nemmeno l'hash (`passwordHash` non deve mai finire in un DTO di risposta).
- Rotte pubbliche: si aggiungono **una per una** in `SecurityConfig`. Mai `permitAll()`
  su interi prefissi come `/api/auth/**`. Unica eccezione voluta: le letture `GET` di
  eventi e artisti (mappa pubblica, Parte 5); le scritture su quelle rotte restano protette.
- Se si disattiva un utente o gli si cambia il ruolo, le sue sessioni vanno cancellate
  (`FindByIndexNameSessionRepository`), altrimenti resta loggato con i vecchi permessi.

## 3. Autorizzazione (chi puo' fare cosa)

Il rischio piu' concreto in questa app e' l'**IDOR**: l'utente A modifica l'evento, il
ticket o la chat dell'utente B cambiando un UUID nell'URL. Essere autenticati non basta.

- Il controllo di proprieta' va **nel service**, per ogni operazione su una risorsa altrui:

```java
Event event = eventRepository.findById(id).orElseThrow(() -> new NotFoundException("Evento non trovato"));
if (!event.getOwner().getId().equals(me.getId()) && !me.getRole().isAtLeast(Role.MODERATOR)) {
	throw new ForbiddenException("Non sei il proprietario");
}
```

- Stessa regola per ticket (solo il titolare), messaggi di chat (solo i partecipanti),
  amicizie (solo i due utenti coinvolti), notifiche (solo il destinatario).
- Ruoli (`user/Role`), dal piu' basso: `USER` < `MODERATOR` < `SUPERADMIN`. Ogni ruolo ha
  anche i permessi di quelli sotto (`RoleHierarchy` in `SecurityConfig`, `Role.isAtLeast` nel codice):
  `hasRole('MODERATOR')` vale anche per un `SUPERADMIN`. Non esiste piu' `ADMIN`.
  - `USER`: crea e gestisce i propri eventi, cerca e vede gli altri utenti (`/api/users`,
    solo nome, cognome e avatar: mai email o altri dati personali).
  - `MODERATOR`: modera eventi e artisti di chiunque, disattiva/riattiva gli account `USER`.
  - `SUPERADMIN`: tutto, e in piu' e' l'unico che cambia i ruoli.
- Area admin sotto `/api/admin/**`: gia' riservata a `MODERATOR` e superiori; il cambio di ruolo
  a `SUPERADMIN`. Su un singolo metodo: `@PreAuthorize("hasRole('MODERATOR')")`.
- Nel service si confronta con `isAtLeast`, non con `==`: `me.getRole() == Role.MODERATOR`
  escluderebbe per errore i `SUPERADMIN`.
- Nessuno cambia il proprio ruolo o il proprio stato. Dopo un cambio di ruolo o una
  disattivazione si chiudono le sessioni dell'utente (`security/UserSessions`).
- Il primo `SUPERADMIN` si crea solo con `SUPERADMIN_EMAIL` (`security/SuperAdminBootstrap`);
  mai con un `UPDATE` a mano nel database di produzione.
- Ogni controllo di permesso va coperto da un test (vedi `NotificationServiceTest`:
  `markRead_notificationOfAnotherUser_throwsForbidden`).

## 4. Input e DTO

- Nei controller si ricevono sempre **DTO (record) con Bean Validation** e `@Valid`.
  **Mai** `@RequestBody User` o `@RequestBody Event`: il client potrebbe impostare
  `role`, `status`, `owner` (mass assignment).
- Campi come `role`, `status`, `owner`, `createdAt` li imposta solo il backend.
- Email sempre normalizzate (trim + minuscolo, D05) prima di salvarle o cercarle.
- URL forniti dall'utente (es. `avatarUrl`, link): accettare solo `http`/`https`,
  altrimenti `javascript:...` diventa XSS nel frontend.
- Upload su Cloudinary: controllare tipo (solo immagini) e dimensione massima.

## 5. CSRF e frontend

- Il CSRF e' attivo su tutte le richieste che modificano dati. **Non disattivarlo.**
- Il frontend deve:
  1. usare sempre `withCredentials: true`;
  2. prima di POST/PUT/PATCH/DELETE chiamare `GET /api/auth/csrf` e mandare il token
     nell'header `X-XSRF-TOKEN`;
  3. **rileggere il token dopo login e logout** (cambia);
  4. all'avvio chiamare `GET /api/auth/me` (200 = loggato, 401 = no).
- Il frame STOMP `CONNECT` del WebSocket deve contenere lo stesso header `X-XSRF-TOKEN`.
- Niente token, password o dati personali in `localStorage`/`sessionStorage`.

## 6. XSS

- React fa l'escape di tutto da solo. **Vietato `dangerouslySetInnerHTML`** con dati
  degli utenti (descrizioni eventi, messaggi di chat, nomi). Se un giorno serve testo
  formattato: DOMPurify.
- Template email (Thymeleaf): usare sempre `th:text`, **mai `th:utext`** con dati
  degli utenti (titolo evento, nome, messaggio del proprietario).
- Il testo generato dall'AI (OpenRouter) si tratta come input dell'utente: si mostra
  come testo, mai come HTML.

## 7. Errori e log

- Le eccezioni diventano risposte solo in `GlobalExceptionHandler` (ProblemDetail).
  Al client non arrivano mai stack trace, SQL o messaggi interni.
- Usare le eccezioni esistenti: `BadRequestException` (400), `ForbiddenException` (403),
  `NotFoundException` (404), `ConflictException` (409), `TooManyRequestsException` (429).
- **Mai loggare** password, hash, codici di verifica, cookie, token CSRF o il contenuto
  delle email.
- Messaggi di errore neutri sui dati sensibili: il login risponde sempre
  "Credenziali non valide", senza dire se l'email esiste.

## 8. Limite dei tentativi

- Ogni endpoint pubblico che si puo' ripetere all'infinito (login, codici, reinvii,
  e in futuro "password dimenticata") passa da `security/AttemptLimiter` e risponde 429.
- `AttemptLimiter` e' in memoria: va bene con **una sola istanza** del backend. Con piu'
  istanze serve una tabella o Redis condivisi.

## 9. Segreti e configurazione

- Segreti (SMTP, Cloudinary, OpenRouter, database) solo in variabili d'ambiente:
  `.env` in locale (escluso da git), dashboard di Render in produzione.
  **Mai nel codice, in `application.yml` o nei commit.**
- Aggiungendo una nuova variabile: documentarla in `.env.example` senza valore reale.
- In produzione il cookie di sessione e' `SameSite=None` + `Secure`
  (`SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE` in `render.yaml`): non cambiarli
  senza parlarne con il team.
- CORS: solo le origini esplicite di `ALLOWED_ORIGIN`, **mai `*`** (con i cookie non funzionerebbe
  e aprirebbe l'API a qualsiasi sito).

## 10. Checklist prima di aprire una PR

- [ ] Nessuna query costruita concatenando stringhe.
- [ ] Ogni endpoint nuovo e' protetto, o e' elencato esplicitamente tra quelli pubblici in `SecurityConfig`.
- [ ] Ogni operazione su una risorsa controlla che l'utente ne sia il proprietario (o `MODERATOR`/`SUPERADMIN`).
- [ ] Input tramite DTO con `@Valid`; risposte tramite DTO, mai entity.
- [ ] Nessun `dangerouslySetInnerHTML` o `th:utext` con dati degli utenti.
- [ ] Nessun segreto, password o codice nei log o nel repository.
- [ ] Test per i casi "utente non autorizzato" (401/403) oltre al caso che funziona.
