# Frontend: piattaforma eventi

React 19 + TypeScript + Vite, Tailwind 4 + shadcn/ui (icone Phosphor), TanStack Query, react-hook-form + zod, react-router, react-leaflet, STOMP.

Regole di comunicazione col backend (sessione, CSRF, errori, upload, tempo reale): [`../docs/API.md`](../docs/API.md).
Endpoint: [`../docs/openapi.yaml`](../docs/openapi.yaml), da cui si generano i tipi in `src/lib/api-schema.ts`.

```bash
npm install
npm run dev        # http://localhost:5173 (backend su 8080: /api e /ws passano dal proxy)
npm run gen:api    # rigenera i tipi dopo ogni modifica agli endpoint
npm run lint && npm run typecheck && npm run test && npm run build
npm run coverage
```

## Dati demo

Per vedere l'app già piena, avviare il backend una volta con `SEED_DATA=true` su un database senza utenti:

```bash
cd back-end && SEED_DATA=true ./mvnw spring-boot:run
```

Crea 8 utenti, 10 artisti, 10 eventi in città italiane (con foto, scaletta, ingressi e uscite; uno annullato e uno passato), ticket, amicizie, chat e notifiche. Se il database ha già utenti non fa nulla. Password di tutti gli account: `Password123!` (variabile `SEED_PASSWORD`).

| Account | Ruolo | Da provare |
|---|---|---|
| `admin@eventi.dev` | SUPERADMIN | area admin, cambio ruoli |
| `moderatore@eventi.dev` | MODERATOR | moderazione account ed eventi |
| `marco.rinaldi@eventi.dev` | USER | organizzatore di 4 eventi (uno annullato, uno passato) |
| `luca.moretti@eventi.dev` | USER | ticket, notifiche, chat con Sara, richiesta di Elena da accettare |
| `sara.colombo@eventi.dev` | USER | due chat (Luca, Davide) |

## Struttura

- `src/lib/`: utility condivise (`api`, `csrf`, `errors`, `upload`, `upload-manager`, `dom` con `make()`, `format`, `query`, `roles`).
- `src/components/`: `ui/` (shadcn, generati), `auth/` (AuthProvider e guardie), `layout/`, `uploads/` (pannello degli upload), `feedback/`.
- `src/features/<nome>/`: una cartella per funzionalità con `api.ts`, `schemas.ts`, `hooks/`, `components/`, `pages/` e `routes.tsx`.
  Le rotte si dichiarano nel `routes.tsx` della feature, divise per guardia (`public`, `guest`, `auth`, `admin`).

## Regole (controllate da ESLint)

- Niente operatori ternari: calcolare il valore prima del JSX con `if/else`.
- Niente `innerHTML` / `dangerouslySetInnerHTML`: testo in `{valore}`, nodi DOM con `make()`.
- Niente `any` e niente `console.log`.
- Icone solo da `@phosphor-icons/react`.
- Upload sempre con `uploadManager.enqueue(...)`: coda asincrona con progresso, annulla e riprova; la UI non si blocca.
